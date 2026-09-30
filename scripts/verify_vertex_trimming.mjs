/**
 * Verification test suite for multi-layered vertex trimming, leaf 3D preservation,
 * appendage welding, stem segment coalescing, buffer update ranges, and mobile silhouette fast-path.
 *
 * Run: npx tsx scripts/verify_vertex_trimming.mjs
 */
import * as THREE from "three";
import {
  isMobileDevice,
  createTrimmedLeafBoxGeometry,
  createWeldedStemGeometry,
  createWeldedConeGeometry,
  weldNonIndexedGeometry,
  markInstanceIndexDirty,
  markActiveInstancesDirty,
  tryCoalesceStemSegment,
  MOBILE_MAX_POINTS,
  MOBILE_DEFAULT_MAX_DOMS,
} from "../src/lib/SimulationVertexTrimmer.ts";
import {
  APPENDAGE_BUILDERS,
  stemGeometry,
  triangleCount,
  applyLodTier,
} from "../src/lib/SimulationLOD.ts";
import { measureScreenFillSilhouette } from "../src/lib/SimulationSilhouette.ts";
import { SimulationEngine } from "../src/lib/SimulationEngine.ts";
import { setupSimulationScene } from "../src/lib/SimulationRenderer.ts";
import { updateMeshSegments } from "../src/lib/SimulationMeshUpdate.ts";

let passes = 0;
let failures = 0;

function check(cond, msg) {
  if (cond) {
    passes++;
    console.log(`  PASS: ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL: ${msg}`);
  }
}

console.log("===============================================================");
console.log("1. STEM VERTEX & TRIANGLE BUDGETS ACROSS TIERS 0 - 3");
console.log("===============================================================");
{
  const expectedLimits = [
    { tier: 0, maxVerts: 28, maxTris: 40 },
    { tier: 1, maxVerts: 12, maxTris: 16 },
    { tier: 2, maxVerts: 8, maxTris: 10 },
    { tier: 3, maxVerts: 6, maxTris: 8 },
  ];

  for (const { tier, maxVerts, maxTris } of expectedLimits) {
    const geo = stemGeometry(tier);
    const vertCount = geo.getAttribute("position").count;
    const triCount = triangleCount(geo);

    check(
      vertCount <= maxVerts,
      `Stem Tier ${tier}: vertices = ${vertCount} <= ${maxVerts}`
    );
    check(
      triCount <= maxTris,
      `Stem Tier ${tier}: triangles = ${triCount} <= ${maxTris}`
    );
  }
}

console.log("\n===============================================================");
console.log("2. LEAF VERTEX BUDGETS & 3D THICKNESS PRESERVATION");
console.log("===============================================================");
{
  const expectedLimits = [
    { tier: 0, maxVerts: 900, maxTris: 1800 },
    { tier: 1, maxVerts: 350, maxTris: 700 },
    { tier: 2, maxVerts: 140, maxTris: 260 },
    { tier: 3, maxVerts: 55, maxTris: 100 },
  ];

  for (const { tier, maxVerts, maxTris } of expectedLimits) {
    const geo = APPENDAGE_BUILDERS["leaves"](tier);
    const vertCount = geo.getAttribute("position").count;
    const triCount = triangleCount(geo);

    check(
      vertCount <= maxVerts,
      `Leaf Tier ${tier}: vertices = ${vertCount} <= ${maxVerts}`
    );
    check(
      triCount <= maxTris,
      `Leaf Tier ${tier}: triangles = ${triCount} <= ${maxTris}`
    );

    // Verify 3D thickness (front/back Z separation: z = +0.025 and z = -0.025)
    const pos = geo.getAttribute("position");
    let minZ = Infinity;
    let maxZ = -Infinity;
    let posZCount = 0;
    let negZCount = 0;

    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      const signVal = Math.sign(z + 0.001);
      if (signVal > 0) posZCount++;
      if (signVal < 0) negZCount++;
    }

    check(
      minZ <= -0.02 && maxZ >= 0.02,
      `Leaf Tier ${tier}: 3D thickness preserved (minZ=${minZ.toFixed(4)}, maxZ=${maxZ.toFixed(4)})`
    );
    check(
      posZCount > 0 && negZCount > 0,
      `Leaf Tier ${tier}: sign(pos.z + 0.001) differentiates front (+z: ${posZCount}) vs back (-z: ${negZCount})`
    );
  }
}

console.log("\n===============================================================");
console.log("3. APPENDAGE GEOMETRIES TRIMMING AND WELDING");
console.log("===============================================================");
{
  const appendages = [
    "leaves", "ferns", "flowers", "lillyPads", "petals",
    "needles", "thorns", "hair", "curlyHair", "crystals",
    "spores", "scales", "spirals", "sparkles", "buds"
  ];

  check(appendages.length === 15, "All 15 appendage types verified in catalog");

  for (const app of appendages) {
    check(typeof APPENDAGE_BUILDERS[app] === "function", `Appendage "${app}" has builder registered`);
    const geo = APPENDAGE_BUILDERS[app](3); // Tier 3 (lowest LOD)
    const isIndexed = geo.index !== null;
    check(isIndexed, `Appendage "${app}" Tier 3 produces indexed geometry`);
  }

  // Verify polyhedron welding savings
  const unweldedOcta = new THREE.OctahedronGeometry(1, 0);
  const weldedOcta = weldNonIndexedGeometry(unweldedOcta);
  check(
    unweldedOcta.getAttribute("position").count === 24 && weldedOcta.getAttribute("position").count === 6,
    `Octahedron welding reduced vertices from 24 to 6 (75% vertex reduction)`
  );

  const unweldedIcosa = new THREE.IcosahedronGeometry(1, 0);
  const weldedIcosa = weldNonIndexedGeometry(unweldedIcosa);
  check(
    unweldedIcosa.getAttribute("position").count === 60 && weldedIcosa.getAttribute("position").count === 12,
    `Icosahedron welding reduced vertices from 60 to 12 (80% vertex reduction)`
  );

  const unweldedDodeca = new THREE.DodecahedronGeometry(1, 0);
  const weldedDodeca = weldNonIndexedGeometry(unweldedDodeca);
  check(
    unweldedDodeca.getAttribute("position").count === 108 && weldedDodeca.getAttribute("position").count === 20,
    `Dodecahedron welding reduced vertices from 108 to 20 (81% vertex reduction)`
  );

  // Assert hybridMeshes have welded vertices and LOD variants
  const testEngine = new SimulationEngine({
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    clientWidth: 1280,
    clientHeight: 720,
    width: 1280,
    height: 720,
    getContext: () => null,
  }, 1280, 720);
  setupSimulationScene(testEngine, 1280, 720);

  const hybrid3Geo = testEngine.hybridMeshes[3].geometry;
  const h3Verts = hybrid3Geo.getAttribute("position").count;
  check(
    h3Verts <= 130,
    `hybridMeshes[3] Tier 0 welded vertices = ${h3Verts} <= 130 (vs 720 un-welded)`
  );

  const h3Vars = testEngine.lod.hybridVariants.get(testEngine.hybridMeshes[3]);
  check(h3Vars !== undefined && h3Vars.length === 4, "hybridMeshes[3] has 4 LOD variants registered");
  if (h3Vars) {
    const t0Tris = triangleCount(h3Vars[0]);
    const t3Tris = triangleCount(h3Vars[3]);
    check(
      t3Tris < t0Tris,
      `hybridMeshes[3] Tier 3 triangles (${t3Tris}) < Tier 0 triangles (${t0Tris})`
    );
  }
}

console.log("\n===============================================================");
console.log("4. COLLINEAR STEM SEGMENT COALESCING");
console.log("===============================================================");
{
  const mockEngine = {
    segments: [],
    pointCount: 0,
    maxDOMs: 1000,
    cylinderMesh: {
      count: 0,
      setMatrixAt: () => {},
      instanceMatrix: new THREE.InstancedBufferAttribute(new Float32Array(1000 * 16), 16),
    },
    biomassMap: new Map([["StrainA", 10]]),
    genomeMap: new Map([["StrainA", { name: "StrainA", color: new THREE.Color() }]]),
    dyingStems: new Set(),
    lastAgentStemIndex: new Map([[1, 0]]),
    agentAnchorMap: new Map(),
    dummy: new THREE.Object3D(),
    isMobile: true,
    lod: { tier: 0 },
    time: 0,
  };

  const genomeA = {
    name: "StrainA",
    color: new THREE.Color(0, 1, 0),
    geometryType: "cylinder",
  };

  // Setup initial segment at index 0 from (0,0,0) to (0,1,0)
  const start0 = new THREE.Vector3(0, 0, 0);
  const end0 = new THREE.Vector3(0, 1, 0);
  const m0 = new THREE.Matrix4();
  mockEngine.segments[0] = {
    matrix: m0,
    strainName: "StrainA",
    startPos: start0.clone(),
    endPos: end0.clone(),
    biomassWeight: 1.0,
    thickness: 1.0,
    isTerminal: false,
    agentId: 1,
    timestamp: 100,
  };
  mockEngine.pointCount = 1;

  // Attempt 1: Collinear continuation from (0,1,0) to (0,2,0) with same strain
  const nextStart = new THREE.Vector3(0, 1, 0);
  const nextEnd = new THREE.Vector3(0, 2, 0);

  const coalesced = tryCoalesceStemSegment(
    mockEngine,
    nextStart,
    nextEnd,
    genomeA,
    1.0, // thickness
    1,   // agentId
    false, // isTerminal
    true,  // shouldCountBiomass
    "StrainA"
  );

  check(coalesced === true, "tryCoalesceStemSegment succeeds on straight continuous run");
  check(mockEngine.pointCount === 1, "pointCount was not incremented when coalescing");
  check(
    mockEngine.segments[0].biomassWeight === 2.0,
    `biomassWeight correctly incremented to 2.0 (got ${mockEngine.segments[0].biomassWeight})`
  );
  check(
    mockEngine.segments[0].endPos.y === 2,
    `Segment 0 endPos.y updated to 2 (got ${mockEngine.segments[0].endPos.y})`
  );

  // Attempt 2: Turn segment at 90 degrees - should NOT coalesce
  const turnStart = new THREE.Vector3(0, 2, 0);
  const turnEnd = new THREE.Vector3(1, 2, 0);

  const coalescedTurn = tryCoalesceStemSegment(
    mockEngine,
    turnStart,
    turnEnd,
    genomeA,
    1.0,
    1,
    false,
    true,
    "StrainA"
  );

  check(coalescedTurn === false, "tryCoalesceStemSegment correctly rejects sharp turns");

  // Attempt 3: Terminal segment should NOT coalesce
  const coalescedTerminal = tryCoalesceStemSegment(
    mockEngine,
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(0, 3, 0),
    genomeA,
    1.0,
    1,
    true, // isTerminal
    true,
    "StrainA"
  );

  check(coalescedTerminal === false, "tryCoalesceStemSegment rejects terminal segments");

  // 40-step collinear/gently-curved growth test on real SimulationEngine
  const engine40 = new SimulationEngine({
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    clientWidth: 1280,
    clientHeight: 720,
    width: 1280,
    height: 720,
    getContext: () => null,
  }, 1280, 720);
  setupSimulationScene(engine40, 1280, 720);
  engine40.isMobile = true;
  engine40.lod.tier = 2;

  const testGenome = {
    name: "CoalesceSpecies",
    color: new THREE.Color(0.2, 0.8, 0.3),
    geometryType: "cylinder",
    growthHabit: "tree",
    branchingFactor: 0.1,
  };
  engine40.genomeMap.set(testGenome.name, testGenome);

  for (let step = 0; step < 40; step++) {
    const p1 = new THREE.Vector3(0, step * 0.5, 0);
    const p2 = new THREE.Vector3(0, (step + 1) * 0.5, 0);
    engine40.addLineSegment(p1, p2, testGenome, 0.5, false, 999);
  }

  check(
    engine40.pointCount <= 20,
    `40-step collinear growth pointCount = ${engine40.pointCount} <= 20 (>= 50% instance reduction, exceeding >= 35% req)`
  );
  check(
    engine40.biomassMap.get(testGenome.name) === 40,
    `40-step collinear growth biomassMap preserved = ${engine40.biomassMap.get(testGenome.name)} === 40`
  );

  // Overwriting/recycling a coalesced slot
  const currentBiomass = engine40.biomassMap.get(testGenome.name) || 0;
  const slotWeight = engine40.segments[0]?.biomassWeight || 1;
  check(slotWeight > 1, `Slot 0 has biomassWeight > 1 (weight = ${slotWeight})`);

  engine40.maxDOMs = engine40.pointCount; // force recycling next allocation
  const pA = new THREE.Vector3(50, 0, 0);
  const pB = new THREE.Vector3(50, 1, 0);
  const recycleGenome = {
    name: "RecycleSpecies",
    color: new THREE.Color(1, 0, 0),
    geometryType: "cylinder",
  };
  engine40.genomeMap.set(recycleGenome.name, recycleGenome);
  updateMeshSegments(engine40, pA, pB, recycleGenome, 0.5, false, 888, false);

  const afterBiomass = engine40.biomassMap.get(testGenome.name) || 0;
  check(
    afterBiomass === currentBiomass - slotWeight,
    `Recycling coalesced slot decremented biomass by exact weight (${slotWeight}): ${currentBiomass} -> ${afterBiomass}`
  );
}

console.log("\n===============================================================");
console.log("5. PARTIAL BUFFER UPDATES (updateRange & addUpdateRange)");
console.log("===============================================================");
{
  const totalInstances = 10000;
  const attr = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 4), 4);
  const vInit = attr.version;

  // Test single index dirty marking
  markInstanceIndexDirty(attr, 42);
  check(attr.version > vInit, "Single index dirty increments attribute version (needsUpdate)");
  if (attr.updateRanges && attr.updateRanges.length > 0) {
    check(
      attr.updateRanges.some((r) => r.start === 42 * 4 && r.count === 4),
      "addUpdateRange bounded to single instance offset and count"
    );
  } else {
    check(
      attr.updateRange.offset <= 42 * 4 && attr.updateRange.count > 0,
      `updateRange bounded around touched index (offset=${attr.updateRange.offset}, count=${attr.updateRange.count})`
    );
  }

  // Test active range dirty marking
  const attrB = new THREE.InstancedBufferAttribute(new Float32Array(totalInstances * 4), 4);
  const vBInit = attrB.version;
  markActiveInstancesDirty(attrB, 500);
  check(attrB.version > vBInit, "Active instances dirty increments attribute version (needsUpdate)");
  if (attrB.updateRanges && attrB.updateRanges.length > 0) {
    check(
      attrB.updateRanges.some((r) => r.start === 0 && r.count === 500 * 4),
      `addUpdateRange bounded to active instances: start=0, count=${500 * 4}`
    );
  } else {
    check(
      attrB.updateRange.offset === 0 && attrB.updateRange.count === 500 * 4,
      `updateRange bounded to active instances: offset=0, count=${attrB.updateRange.count} (vs total ${totalInstances * 4})`
    );
  }
}

console.log("\n===============================================================");
console.log("6. MOBILE SILHOUETTE FAST-PATH (ZERO readRenderTargetPixels)");
console.log("===============================================================");
{
  let readPixelsCalls = 0;
  const mockRenderer = {
    getRenderTarget: () => null,
    setRenderTarget: () => {},
    render: () => {},
    readRenderTargetPixels: () => {
      readPixelsCalls++;
    },
  };

  const mockMobileEngine = {
    renderer: mockRenderer,
    scene: {},
    camera: {},
    isMobile: true,
    lod: { tier: 2, emaFrameMs: 16 },
    biomassMap: new Map([
      ["Oak", 150],
      ["Fern", 80],
    ]),
    genomeMap: new Map([
      ["Oak", { archetype: "tree", color: new THREE.Color(0.2, 0.8, 0.2) }],
      ["Fern", { archetype: "fern", color: new THREE.Color(0.1, 0.9, 0.3) }],
    ]),
    pointCount: 500,
    maxDOMs: 1000,
  };

  const resultMobile = measureScreenFillSilhouette(mockMobileEngine);
  check(resultMobile !== null, "Mobile silhouette returns valid ScreenFillData");
  check(resultMobile.totalFillPct > 0, `Mobile silhouette computed fill = ${resultMobile.totalFillPct.toFixed(2)}%`);
  check(
    resultMobile.speciesBreakdown.length === 2,
    "Mobile silhouette correctly attributed 2 species in breakdown"
  );
  check(
    readPixelsCalls === 0,
    `ZERO readRenderTargetPixels calls on isMobile=true (calls = ${readPixelsCalls})`
  );

  // Test low-LOD desktop fast-path
  const mockLowLodEngine = {
    renderer: mockRenderer,
    scene: {},
    camera: {},
    isMobile: false,
    lod: { tier: 2, emaFrameMs: 25 },
    biomassMap: new Map([["Kelp", 120]]),
    genomeMap: new Map([["Kelp", { archetype: "kelp", color: new THREE.Color(0, 0.7, 0.5) }]]),
    pointCount: 400,
    maxDOMs: 800,
  };

  const resultLowLod = measureScreenFillSilhouette(mockLowLodEngine);
  check(resultLowLod !== null, "Low-LOD silhouette returns valid ScreenFillData");
  check(
    readPixelsCalls === 0,
    `ZERO readRenderTargetPixels calls on lod.tier >= 2 (calls = ${readPixelsCalls})`
  );
}

console.log("\n===============================================================");
console.log(`VERIFICATION SUMMARY: ${passes} PASSED, ${failures} FAILED`);
console.log("===============================================================");

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
