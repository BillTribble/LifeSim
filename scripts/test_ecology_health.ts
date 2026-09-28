/**
 * Headless ecology-health regression check.
 *
 * Usage:
 *   npx tsx scripts/test_ecology_health.ts [simSeconds=90] [speeds=1,20] [seed=12345]
 *   LIFESIM_ROOT=/path/to/other/checkout npx tsx scripts/test_ecology_health.ts ...
 *
 * "Seconds" are simulated wall seconds at 60 frames per second (frame count / 60), so
 * births/min is comparable with the per-minute rates computed from simulation.log.
 *
 * Everything is measured directly from engine state or from engine.onLog lines that exist
 * in both the baseline and the patched code, so the same script can be pointed at the
 * baseline worktree via LIFESIM_ROOT. Metrics that only exist in the patched logs
 * (via=, [FEELER_END], [GHOST]) are reported as "n/a" when absent.
 */
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT =
  process.env.LIFESIM_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMockCanvas() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    clientWidth: 1280,
    clientHeight: 720,
    width: 1280,
    height: 720,
    getContext: () => ({
      getExtension: () => null,
      getParameter: () => 0,
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      clearColor: () => {},
      clearDepth: () => {},
      clearStencil: () => {},
      enable: () => {},
      disable: () => {},
      depthFunc: () => {},
      blendEquationSeparate: () => {},
      blendFuncSeparate: () => {},
      viewport: () => {},
      scissor: () => {},
    }),
  } as any;
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pct(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

/** Ghost strains: own live non-dying stem segments, have no active agent (incl. feelers via realGenome), not dying. */
function measureGeometry(engine: any) {
  const liveSegsByStrain = new Map<string, number>();
  const centroidAcc = new Map<string, { x: number; y: number; z: number; n: number }>();
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (!seg || seg.dyingStart || engine.dyingStems.has(i)) continue;
    const n = seg.strainName || "unknown";
    liveSegsByStrain.set(n, (liveSegsByStrain.get(n) || 0) + 1);
    const m = seg.matrix.elements;
    const c = centroidAcc.get(n) || { x: 0, y: 0, z: 0, n: 0 };
    c.x += m[12];
    c.y += m[13];
    c.z += m[14];
    c.n++;
    centroidAcc.set(n, c);
  }
  const activeOwners = new Set<string>();
  for (const a of engine.agents) {
    if (!a.active) continue;
    activeOwners.add(a.genome.name);
    if (a.realGenome?.name) activeOwners.add(a.realGenome.name);
    if (a.genome.parentStrainName) activeOwners.add(a.genome.parentStrainName);
  }
  let ghostStrains = 0;
  let ghostSegs = 0;
  for (const [name, count] of liveSegsByStrain) {
    if (!activeOwners.has(name) && !(engine.dyingStrains && engine.dyingStrains.has(name))) {
      ghostStrains++;
      ghostSegs += count;
    }
  }
  const living: Set<string> = engine.getLivingOrganisms();
  const cents: { x: number; y: number; z: number }[] = [];
  let sizeSum = 0;
  for (const name of living) {
    const c = centroidAcc.get(name);
    sizeSum += liveSegsByStrain.get(name) || 0;
    if (c && c.n > 0) cents.push({ x: c.x / c.n, y: c.y / c.n, z: c.z / c.n });
  }
  let nnSum = 0;
  for (let i = 0; i < cents.length; i++) {
    let best = Infinity;
    for (let j = 0; j < cents.length; j++) {
      if (i === j) continue;
      const dx = cents[i].x - cents[j].x, dy = cents[i].y - cents[j].y, dz = cents[i].z - cents[j].z;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    if (Number.isFinite(best)) nnSum += best;
  }
  const spread = cents.length > 1 ? nnSum / cents.length : 0;
  return {
    ghostStrains,
    ghostSegs,
    liveStrainsWithSegs: liveSegsByStrain.size,
    living: living.size,
    spread,
    meanSize: living.size > 0 ? sizeSum / living.size : 0,
  };
}

async function runOnce(speed: number, simSeconds: number, seed: number) {
  Math.random = mulberry32(seed);
  const { SimulationEngine } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationEngine.ts")).href);
  const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, "src/hooks/SimulationDefaults.ts")).href);
  const { updateSimulation } = await import(pathToFileURL(path.join(ROOT, "src/lib/SimulationUpdate.ts")).href);

  const engine: any = new SimulationEngine(createMockCanvas(), 1280, 720);
  const apply = () => {
    const merged = { ...DEFAULTS, timeScale: speed, kioskMode: false, soundEnabled: false };
    for (const [key, val] of Object.entries(merged)) {
      if (val === undefined) continue;
      const setter = "set" + key.charAt(0).toUpperCase() + key.slice(1);
      if (typeof engine[setter] === "function") engine[setter](val);
      else engine[key] = val;
    }
  };
  apply();
  engine.agents = [];
  engine.segments = [];
  engine.pointCount = 0;
  engine.biomassMap.clear();
  engine.genomeMap.clear();
  engine.speciesLifecycleMap.clear();
  engine.dyingStems.clear();
  engine.dyingStrains.clear();
  engine.time = 0;
  engine.frameCount = 0;
  engine.unscaledTime = 0;
  engine.kioskMode = false;
  engine.initAgents();
  apply();

  let frame = 0;
  const births = new Map<string, number>();
  const eol = new Map<string, number>();
  const lifespansEol: number[] = [];
  const lifespansErad: number[] = [];
  const birthFrames: number[] = [];
  let feelerEmits = 0;
  let feelerToFeeler = 0;
  let viaFeeler = 0;
  let viaBody = 0;
  let viaSeen = false;
  const feelerEnd: Record<string, number> = {};
  const feelerEndLens: number[] = [];
  let ghostSweeps = 0;
  let ghostSwept = 0;
  let healthLines = 0;
  const eradAgeSteps: number[] = [];
  const eradSegs: number[] = [];

  engine.onLog = (msg: string) => {
    let m: RegExpMatchArray | null;
    if ((m = msg.match(/💖 Offspring (.+?) \[[A-Z]+\] spawned/))) {
      births.set(m[1], frame);
      birthFrames.push(frame);
      const v = msg.match(/via=(feeler|body)/);
      if (v) {
        viaSeen = true;
        if (v[1] === "feeler") viaFeeler++;
        else viaBody++;
      }
    } else if ((m = msg.match(/⏳ Species (.+?) entering end-of-life/))) {
      eol.set(m[1], frame);
      const b = births.get(m[1]);
      if (b !== undefined) lifespansEol.push((frame - b) / 60);
    } else if ((m = msg.match(/☠️ Species (.+?) \[[A-Z]+\] was fully eradicated/))) {
      const b = births.get(m[1]);
      if (b !== undefined) lifespansErad.push((frame - b) / 60);
      const a = msg.match(/ageSteps=(\d+)/);
      const s = msg.match(/segs=(\d+)/);
      if (a && b !== undefined) eradAgeSteps.push(parseInt(a[1], 10));
      if (s && b !== undefined) eradSegs.push(parseInt(s[1], 10));
    } else if (msg.includes("📡") || msg.includes("seeking hybridization partner") || msg.includes("extended sensory feeler")) {
      feelerEmits++;
      if (/toward Feeler-/.test(msg)) feelerToFeeler++;
    } else if ((m = msg.match(/\[FEELER_END\] len=([\d.]+) reason=(\w+)/))) {
      feelerEnd[m[2]] = (feelerEnd[m[2]] || 0) + 1;
      feelerEndLens.push(parseFloat(m[1]));
    } else if ((m = msg.match(/\[GHOST\] swept (\d+)/))) {
      ghostSweeps++;
      ghostSwept += parseInt(m[1], 10);
    } else if (msg.includes("[HEALTH]")) {
      healthLines++;
    }
  };

  // Independent feeler path-length tracking (works on baseline too)
  const feelerLen = new Map<any, { last: { x: number; y: number; z: number }; len: number }>();
  let maxFeelerLen = 0;
  let maxGhost = 0;
  let maxLiveStrains = 0;
  const spreadSamples: number[] = [];
  const sizeSamples: number[] = [];
  const t0 = performance.now();
  const totalFrames = Math.round(simSeconds * 60);
  let last: ReturnType<typeof measureGeometry> | null = null;

  for (frame = 1; frame <= totalFrames; frame++) {
    updateSimulation(engine);
    for (const a of engine.agents) {
      if (!a.isFeeler) continue;
      let rec = feelerLen.get(a);
      if (!rec) {
        rec = { last: { x: a.position.x, y: a.position.y, z: a.position.z }, len: 0 };
        feelerLen.set(a, rec);
      } else {
        const dx = a.position.x - rec.last.x, dy = a.position.y - rec.last.y, dz = a.position.z - rec.last.z;
        rec.len += Math.sqrt(dx * dx + dy * dy + dz * dz);
        rec.last = { x: a.position.x, y: a.position.y, z: a.position.z };
        if (rec.len > maxFeelerLen) maxFeelerLen = rec.len;
      }
    }
    if (frame % 180 === 0) {
      last = measureGeometry(engine);
      maxGhost = Math.max(maxGhost, last.ghostStrains);
      maxLiveStrains = Math.max(maxLiveStrains, last.liveStrainsWithSegs);
      spreadSamples.push(last.spread);
      sizeSamples.push(last.meanSize);
    }
  }
  const wallMs = performance.now() - t0;
  last = measureGeometry(engine);
  const minutes = simSeconds / 60;
  const intervals: number[] = [];
  for (let i = 1; i < birthFrames.length; i++) intervals.push((birthFrames[i] - birthFrames[i - 1]) / 60);

  return {
    speed,
    simSeconds,
    msPerFrame: +(wallMs / totalFrames).toFixed(2),
    births: birthFrames.length,
    birthsPerMin: +(birthFrames.length / minutes).toFixed(1),
    medianBirthIntervalS: +median(intervals).toFixed(2),
    lifespanBirthToEolMedianS: +median(lifespansEol).toFixed(2),
    lifespanBirthToEolP90S: +pct(lifespansEol, 0.9).toFixed(2),
    lifespanN: lifespansEol.length,
    lifespanBirthToEradMedianS: +median(lifespansErad).toFixed(2),
    eradAgeStepsMedian: eradAgeSteps.length ? median(eradAgeSteps) : "n/a",
    eradSegsMedian: eradSegs.length ? median(eradSegs) : "n/a",
    ghostStrainsEnd: last.ghostStrains,
    ghostSegsEnd: last.ghostSegs,
    ghostStrainsMax: maxGhost,
    liveStrainsWithSegsEnd: last.liveStrainsWithSegs,
    liveStrainsWithSegsMax: maxLiveStrains,
    livingEnd: last.living,
    spreadEnd: +last.spread.toFixed(1),
    spreadMedian: +median(spreadSamples).toFixed(1),
    meanSizeEnd: +last.meanSize.toFixed(1),
    meanSizeMedian: +median(sizeSamples).toFixed(1),
    feelerEmits,
    feelerToFeeler,
    maxFeelerLen: +maxFeelerLen.toFixed(1),
    viaFeeler: viaSeen ? viaFeeler : "n/a",
    viaBody: viaSeen ? viaBody : "n/a",
    feelerEndReasons: Object.keys(feelerEnd).length ? feelerEnd : "n/a",
    feelerEndLenMax: feelerEndLens.length ? +Math.max(...feelerEndLens).toFixed(1) : "n/a",
    ghostSweeps: `${ghostSweeps} (${ghostSwept} strains)`,
    healthLines,
  };
}

async function main() {
  const simSeconds = parseFloat(process.argv[2] || "90");
  const speeds = (process.argv[3] || "1,20").split(",").map(Number);
  const seed = parseInt(process.argv[4] || "12345", 10);
  console.log(`ROOT=${ROOT} simSeconds=${simSeconds} speeds=${speeds.join(",")} seed=${seed}`);
  for (const s of speeds) {
    const r = await runOnce(s, simSeconds, seed);
    console.log(JSON.stringify(r, null, 1));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
