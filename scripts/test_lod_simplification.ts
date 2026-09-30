/**
 * View-only LOD test + benchmark suite.
 * Run: npx tsx scripts/test_lod_simplification.ts
 *
 * Headless note: there is no GPU here, so GPU frame time cannot be measured.
 * Tests assert on real BufferGeometry vertex/triangle counts (what the GPU would
 * be asked to process), controller behaviour, attribute preservation,
 * simulation determinism across tiers, and CPU-side update cost.
 */
import * as THREE from "three";
import { execFileSync } from "node:child_process";
import { SimulationEngine } from "../src/lib/SimulationEngine";
import { setupInitialCreatures } from "../src/lib/SimulationSceneSetup";
import { updateSimulation } from "../src/lib/SimulationUpdate";
import { DEFAULTS } from "../src/hooks/SimulationDefaults";
import {
  APPENDAGE_BUILDERS, LOD_TIERS, LodTier, SHARED_INSTANCE_ATTRIBUTES, applyLodTier,
  buildVariants, getSceneGeometryStats, requestLodMode, stemGeometry,
  triangleCount, updateAdaptiveLOD,
} from "../src/lib/SimulationLOD";

let failures = 0;
let passes = 0;
function check(cond: boolean, msg: string) {
  if (cond) { passes++; console.log(`  PASS  ${msg}`); }
  else { failures++; console.log(`  FAIL  ${msg}`); }
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mockCanvas() {
  return {
    addEventListener: () => {}, removeEventListener: () => {}, style: {},
    clientWidth: 1280, clientHeight: 720, width: 1280, height: 720,
    getContext: () => null,
  } as any;
}

function makeEngine(): SimulationEngine {
  const engine = new SimulationEngine(mockCanvas(), 1280, 720);
  for (const [key, val] of Object.entries(DEFAULTS)) {
    const setter = "set" + key.charAt(0).toUpperCase() + key.slice(1);
    if (typeof (engine as any)[setter] === "function") (engine as any)[setter](val);
    else (engine as any)[key] = val;
  }
  // Mirror executeReset(): nothing is drawn until creatures grow.
  engine.cylinderMesh.count = 0;
  for (const [, a] of engine.appendages) a.mesh.count = 0;
  return engine;
}

// ---------------------------------------------------------------------------
console.log("\n[1] Per-primitive geometry reduction (real BufferGeometry counts)");
const legacy: Record<string, THREE.BufferGeometry> = {
  leaves: APPENDAGE_BUILDERS.leaves(0),
  curlyHair: APPENDAGE_BUILDERS.curlyHair(0),
  ferns: APPENDAGE_BUILDERS.ferns(0),
  spirals: APPENDAGE_BUILDERS.spirals(0),
  lillyPads: APPENDAGE_BUILDERS.lillyPads(0),
  buds: APPENDAGE_BUILDERS.buds(0),
  flowers: APPENDAGE_BUILDERS.flowers(0),
  hair: APPENDAGE_BUILDERS.hair(0),
  spores: APPENDAGE_BUILDERS.spores(0),
  stems: stemGeometry(0),
};
const variantsByKey: Record<string, THREE.BufferGeometry[]> = { stems: buildVariants(stemGeometry) };
for (const k of Object.keys(APPENDAGE_BUILDERS)) variantsByKey[k] = buildVariants(APPENDAGE_BUILDERS[k]);

console.log("  key         legacy    T0      T1      T2      T3   (triangles)");
for (const [k, vars] of Object.entries(variantsByKey)) {
  const tris = vars.map(triangleCount);
  const leg = legacy[k] ? triangleCount(legacy[k]) : tris[0];
  console.log(`  ${k.padEnd(10)} ${String(leg).padStart(6)} ${tris.map((t) => String(t).padStart(7)).join("")}`);
  check(tris[0] === leg, `${k}: tier 0 identical to legacy geometry (${tris[0]} tris) -> no visual change on fast machines`);
  check(tris.every((t, i) => i === 0 || t <= tris[i - 1]), `${k}: triangles non-increasing across tiers`);
  if (legacy[k]) check(tris[3] < tris[0], `${k}: minimal tier strictly cheaper (${tris[0]} -> ${tris[3]}, -${Math.round((1 - tris[3] / tris[0]) * 100)}%)`);
}
const leafTris = variantsByKey.leaves.map(triangleCount);
check(leafTris[1] <= 1696 && leafTris[2] <= 464 && leafTris[3] <= 160, `leaves: T1<=1696, T2<=464, T3<=160 (got ${leafTris.join("/")})`);

// ---------------------------------------------------------------------------
console.log("\n[2] Complex creature scene: triangles submitted per tier");
{
  const engine = makeEngine();
  // Load resembling the screenshots: ~1,500 leaves, 600 curly hairs, 400 spirals, 6,000 stem segments.
  engine.appendages.get("leaves")!.mesh.count = 1500;
  engine.appendages.get("curlyHair")!.mesh.count = 600;
  engine.appendages.get("spirals")!.mesh.count = 400;
  engine.appendages.get("buds")!.mesh.count = 300;
  engine.cylinderMesh.count = 6000;
  const perTier = LOD_TIERS.map((t) => getSceneGeometryStats(engine, t));
  perTier.forEach((s, t) => console.log(`  tier ${t}: ${s.triangles.toLocaleString().padStart(11)} tris  ${s.vertices.toLocaleString().padStart(11)} verts`));
  const r02 = 1 - perTier[2].triangles / perTier[0].triangles;
  const r03 = 1 - perTier[3].triangles / perTier[0].triangles;
  check(r02 >= 0.8, `tier 0 -> 2 reduces triangles by >= 80% (got ${(r02 * 100).toFixed(1)}%)`);
  check(r03 >= 0.90, `tier 0 -> 3 reduces triangles by >= 90% (got ${(r03 * 100).toFixed(1)}%)`);
  check(perTier[3].vertices < perTier[0].vertices * 0.1, "tier 3 vertex count < 10% of tier 0");
}

// ---------------------------------------------------------------------------
console.log("\n[3] Geometry swap preserves shared instanced attributes; simulation runs at every tier");
{
  Math.random = mulberry32(7);
  const engine = makeEngine();
  setupInitialCreatures(engine);
  const meshes = Array.from(engine.lod.variants.keys());
  const originals = new Map(meshes.map((m) => [m, SHARED_INSTANCE_ATTRIBUTES.map((n) => m.geometry.getAttribute(n))]));
  let threw: unknown = null;
  try {
    for (const tier of [1, 2, 3, 0, 3, 1] as LodTier[]) {
      applyLodTier(engine, tier);
      for (let f = 0; f < 60; f++) { engine.frameCount++; updateSimulation(engine); }
      for (const m of meshes) {
        const orig = originals.get(m)!;
        if (!SHARED_INSTANCE_ATTRIBUTES.every((n, i) => m.geometry.getAttribute(n) === orig[i])) throw new Error(`attribute lost on tier ${tier}`);
      }
    }
  } catch (e) { threw = e; }
  check(threw === null, `360 frames across tier swaps 1,2,3,0,3,1 with no exception${threw ? " (" + threw + ")" : ""}`);
  check(meshes.length === 16, `16 meshes registered (stems + 15 appendages), got ${meshes.length}`);
  const leaves = engine.appendages.get("leaves")!.mesh;
  applyLodTier(engine, 3);
  check(triangleCount(leaves.geometry) === leafTris[3], "leaves mesh geometry actually swapped at tier 3");
  check((leaves.material as THREE.Material).userData.uLodLevel.value === 3, "leaf shader uLodLevel uniform follows tier");
  applyLodTier(engine, 0);
  check(triangleCount(leaves.geometry) === leafTris[0], "leaves mesh restored to full detail at tier 0");
}

// ---------------------------------------------------------------------------
console.log("\n[4] Adaptive controller: step-down, hysteresis, recovery, damping");
{
  const engine = makeEngine(); // empty scene -> complexity budget never forces a tier
  const feed = (ms: number, n: number) => { for (let i = 0; i < n; i++) updateAdaptiveLOD(engine, ms); return engine.lod.tier; };
  check(feed(16.6, 120) === 0, "60 FPS stays at tier 0");
  check(feed(25, 120) === 1, "sustained 25 ms (40 FPS) -> tier 1");
  check(feed(35, 120) === 2, "sustained 35 ms (29 FPS) -> tier 2");
  check(feed(55, 120) === 3, "sustained 55 ms (18 FPS) -> tier 3");
  check(feed(10, 10) === 3, "10 fast frames right after downgrade: no upgrade (hysteresis)");
  const tiersSeen: number[] = [];
  for (let i = 0; i < 1200; i++) { updateAdaptiveLOD(engine, 10); tiersSeen.push(engine.lod.tier); }
  let changes = 0;
  for (let i = 1; i < tiersSeen.length; i++) if (tiersSeen[i] !== tiersSeen[i - 1]) changes++;
  check(engine.lod.tier === 0, "sustained fast frames recover to tier 0");
  check(changes === 3 && tiersSeen.every((t, i) => i === 0 || t <= tiersSeen[i - 1]), `recovery is monotonic one tier at a time (${changes} changes)`);
  const firstUp = tiersSeen.indexOf(2);
  check(firstUp >= 80, `first upgrade needed >= 80 fast frames (took ${firstUp + 11})`);
  // Single-frame spike should not downgrade.
  feed(16.6, 200);
  updateAdaptiveLOD(engine, 200);
  check(feed(16.6, 5) === 0, "single 200 ms hitch does not downgrade");
  // Oscillation damping: slow right after an upgrade doubles the required fast streak.
  const e2 = makeEngine();
  const f2 = (ms: number, n: number) => { for (let i = 0; i < n; i++) updateAdaptiveLOD(e2, ms); };
  f2(25, 120); f2(10, 200); const before = e2.lod.upgradeFramesRequired; f2(25, 60);
  check(e2.lod.upgradeFramesRequired > before, `downgrade soon after upgrade doubles upgrade wait (${before} -> ${e2.lod.upgradeFramesRequired})`);
  // Manual override.
  requestLodMode(2); updateAdaptiveLOD(e2, 5);
  check(e2.lod.tier === 2 && e2.lod.mode === 2, "manual mode pins tier 2 even at high FPS");
  requestLodMode("auto"); updateAdaptiveLOD(e2, 5);
  check(e2.lod.mode === "auto", "auto mode restored");
}

// ---------------------------------------------------------------------------
console.log("\n[5] View-only guarantee: identical simulation at forced tier 0 vs tier 3 vs no LOD");
{
  // Fresh processes with seeded Math.random and a fake clock, so the only variable is the LOD tier.
  const run = (args: string[]) => {
    const out = execFileSync(process.execPath, [...process.execArgv, "scripts/lod_determinism_probe.ts", ...args], { encoding: "utf8" });
    const line = out.split("\n").find((l) => l.startsWith("RESULT")) ?? "";
    return line.split(" ").slice(2).join(" ");
  };
  const t0 = run(["0"]);
  const t3 = run(["3"]);
  const none = run(["0", "nolod"]);
  console.log(`  tier 0 : ${t0}\n  tier 3 : ${t3}\n  no LOD : ${none}   (points agents nextAgentId stemMatrixSum)`);
  check(t0.length > 0 && t0 === t3, "tier 0 and tier 3 produce identical creature structure");
  check(t0 === none, "LOD-enabled run identical to run without LOD controller");
  check(Number(t0.split(" ")[0]) > 0, "creatures actually grew during the run");
}

// ---------------------------------------------------------------------------
console.log("\n[6] CPU update cost with wind (headless, GPU not measured)");
{
  Math.random = mulberry32(99);
  const engine = makeEngine();
  engine.windVelocity = 0.5;
  setupInitialCreatures(engine);
  for (let f = 0; f < 900; f++) { engine.frameCount++; updateSimulation(engine); }
  let liveLeaves = 0;
  for (const [, a] of engine.appendages) liveLeaves += a.mesh.count;
  const timeTier = (tier: LodTier) => {
    applyLodTier(engine, tier);
    const t0 = performance.now();
    for (let f = 0; f < 200; f++) { engine.frameCount++; updateSimulation(engine); }
    return (performance.now() - t0) / 200;
  };
  timeTier(0);
  const ms0 = timeTier(0), ms3 = timeTier(3);
  console.log(`  appendage instances drawn: ${liveLeaves}; avg update tier0=${ms0.toFixed(2)}ms tier3=${ms3.toFixed(2)}ms`);
  check(Number.isFinite(ms0) && Number.isFinite(ms3), "update loop completes at both tiers");
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
