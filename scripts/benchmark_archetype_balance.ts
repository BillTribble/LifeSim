import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { Archetype, Genome, Agent } from '../src/lib/SimulationTypes';
import { setupInitialCreatures, generateRandomGenome } from '../src/lib/SimulationSceneSetup';
import { updateSimulation } from '../src/lib/SimulationUpdate';

interface ArchetypeStats {
  archetype: Archetype;
  samples: number;
  totalFillPct: number;
  avgFillPct: number;
  avgBiomass: number;
  avgSegments: number;
}

// 128x72 2D Screen-space Silhouette Rasterizer
function computeScreenSpaceFill(engine: SimulationEngine, width = 128, height = 72) {
  const camera = engine.camera;
  camera.updateMatrixWorld();
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

  const grid = new Uint8Array(width * height);
  const archetypeGrid = new Array<string | null>(width * height).fill(null);
  const archetypePixelCounts: Record<string, number> = {
    bush: 0,
    tree: 0,
    snake: 0,
    rhizome: 0,
  };

  const p1Proj = new THREE.Vector3();
  const p2Proj = new THREE.Vector3();

  for (let i = 0; i < engine.pointCount; i++) {
    const seg = engine.segments[i];
    if (!seg || engine.dyingStems.has(i)) continue;

    // Segment world position from matrix
    const mat = seg.matrix;
    const p1 = new THREE.Vector3().setFromMatrixPosition(mat);
    p1Proj.copy(p1).project(camera);

    // If point is behind camera, skip
    if (p1Proj.z > 1.0) continue;

    const screenX = Math.round(((p1Proj.x + 1) * 0.5) * width);
    const screenY = Math.round(((1 - p1Proj.y) * 0.5) * height);

    // Compute screen pixel radius based on distance & thickness
    const distToCam = Math.max(1, p1.distanceTo(camera.position));
    const radiusPx = Math.min(25, Math.max(1, Math.round((seg.thickness * height) / (distToCam * 0.8))));

    const genome = engine.genomeMap.get(seg.strainName);
    const arch = genome?.archetype || 'unknown';

    // Rasterize circle on low-res grid
    for (let dy = -radiusPx; dy <= radiusPx; dy++) {
      const y = screenY + dy;
      if (y < 0 || y >= height) continue;
      for (let dx = -radiusPx; dx <= radiusPx; dx++) {
        if (dx * dx + dy * dy <= radiusPx * radiusPx) {
          const x = screenX + dx;
          if (x < 0 || x >= width) continue;
          const idx = y * width + x;
          if (!grid[idx]) {
            grid[idx] = 1;
            archetypeGrid[idx] = arch;
            if (archetypePixelCounts[arch] !== undefined) {
              archetypePixelCounts[arch]++;
            }
          }
        }
      }
    }
  }

  const totalPixels = width * height;
  let totalOccupied = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (grid[i]) totalOccupied++;
  }

  return {
    totalFillPct: (totalOccupied / totalPixels) * 100,
    archetypePixelCounts,
    archetypeFillPct: {
      bush: (archetypePixelCounts.bush / totalPixels) * 100,
      tree: (archetypePixelCounts.tree / totalPixels) * 100,
      snake: (archetypePixelCounts.snake / totalPixels) * 100,
      rhizome: (archetypePixelCounts.rhizome / totalPixels) * 100,
    },
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

export function run100BatchBenchmark(batchCount = 100): Record<Archetype, ArchetypeStats> {
  const archetypes: Archetype[] = ['bush', 'tree', 'snake', 'rhizome'];
  const results: Record<Archetype, { totalFill: number; totalBio: number; totalSegs: number; count: number }> = {
    bush: { totalFill: 0, totalBio: 0, totalSegs: 0, count: 0 },
    tree: { totalFill: 0, totalBio: 0, totalSegs: 0, count: 0 },
    snake: { totalFill: 0, totalBio: 0, totalSegs: 0, count: 0 },
    rhizome: { totalFill: 0, totalBio: 0, totalSegs: 0, count: 0 },
  };

  const canvas = createMockCanvas();
  const engine = new SimulationEngine(canvas, 1280, 720);
  engine.width = 1280;
  engine.height = 720;
  engine.camera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 5000);
  engine.camera.position.set(0, 18.9, -137.42);
  engine.camera.lookAt(0, 18.9, 0);

  for (let b = 0; b < batchCount; b++) {
    // Pick two distinct purebred archetypes for this batch
    const arch1 = archetypes[b % 4];
    const arch2 = archetypes[(b + 1 + Math.floor(b / 4)) % 4];

    // Reset engine state
    engine.agents = [];
    engine.segments = [];
    engine.pointCount = 0;
    if (engine.cylinderMesh) engine.cylinderMesh.count = 0;
    for (const app of engine.appendages.values()) {
      app.segments = [];
      app.dyingSet.clear();
      app.count = 0;
      if (app.mesh) app.mesh.count = 0;
    }
    engine.biomassMap.clear();
    engine.genomeMap.clear();
    engine.speciesLifecycleMap.clear();
    engine.dyingStems.clear();
    engine.dyingStrains.clear();
    engine.time = 0;
    engine.frameCount = 0;
    engine.unscaledTime = 0;
    engine.nextAgentId = 1;

    // Spawn Founder 1
    const g1 = generateRandomGenome(engine, `Founder_${arch1}`, arch1);
    engine.genomeMap.set(g1.name, g1);
    engine.agents.push({
      position: new THREE.Vector3(-25, 18.9, 0),
      lastPosition: new THREE.Vector3(-25, 18.9, 0),
      direction: new THREE.Vector3(0.5, 0.5, 0.2).normalize(),
      genome: g1,
      active: true,
      age: 0,
      thickness: g1.thicknessBase * 1.5,
      id: engine.nextAgentId++,
      cooldown: 100,
    });

    // Spawn Founder 2
    const g2 = generateRandomGenome(engine, `Founder_${arch2}`, arch2);
    engine.genomeMap.set(g2.name, g2);
    engine.agents.push({
      position: new THREE.Vector3(25, 18.9, 0),
      lastPosition: new THREE.Vector3(25, 18.9, 0),
      direction: new THREE.Vector3(-0.5, 0.5, -0.2).normalize(),
      genome: g2,
      active: true,
      age: 0,
      thickness: g2.thicknessBase * 1.5,
      id: engine.nextAgentId++,
      cooldown: 100,
    });

    // Run simulation until first breeding event occurs or max initial growth phase (350 ticks)
    let mated = false;
    engine.onMatingEvent = () => {
      mated = true;
    };

    const maxTicks = 350;
    for (let tick = 0; tick < maxTicks; tick++) {
      engine.time += 1;
      engine.frameCount += 1;
      engine.unscaledTime += 1;
      updateSimulation(engine);
      if (mated) break;
    }

    const fillResult = computeScreenSpaceFill(engine);

    // Record stats for arch1
    const bio1 = engine.biomassMap.get(g1.name) || 0;
    const segs1 = engine.segments.filter(s => s && s.strainName === g1.name).length;
    results[arch1].totalFill += fillResult.archetypeFillPct[arch1];
    results[arch1].totalBio += bio1;
    results[arch1].totalSegs += segs1;
    results[arch1].count += 1;

    // Record stats for arch2
    const bio2 = engine.biomassMap.get(g2.name) || 0;
    const segs2 = engine.segments.filter(s => s && s.strainName === g2.name).length;
    results[arch2].totalFill += fillResult.archetypeFillPct[arch2];
    results[arch2].totalBio += bio2;
    results[arch2].totalSegs += segs2;
    results[arch2].count += 1;
  }

  const finalStats: Record<Archetype, ArchetypeStats> = {} as any;
  for (const arch of archetypes) {
    const r = results[arch];
    finalStats[arch] = {
      archetype: arch,
      samples: r.count,
      totalFillPct: r.totalFill,
      avgFillPct: r.count > 0 ? r.totalFill / r.count : 0,
      avgBiomass: r.count > 0 ? r.totalBio / r.count : 0,
      avgSegments: r.count > 0 ? r.totalSegs / r.count : 0,
    };
  }

  return finalStats;
}

console.log('=== RUNNING 100-BATCH ARCHETYPE BALANCE BENCHMARK ===\n');
const stats = run100BatchBenchmark(100);
console.table(stats);
