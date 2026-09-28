/**
 * Quantitative verification suite for Rhizome Dendritic River-Map Architecture.
 *
 * Verifies:
 * 1. Multi-order dendritic branching: segments across >= 5 distinct branch depth orders (0..4+)
 *    and >= 40 branch/tributary agents per rhizome organism.
 * 2. Omnidirectional 3D dispersion: segments populate all 4 XZ quadrants (each >= 10%)
 *    and both +Y and -Y vertical hemispheres (each >= 20%).
 * 3. Distal river-map branching: >= 35% of child branch spawn positions occur at radial
 *    distance > 12 units from organism root origin.
 * 4. All 5 botanical habits (oak, elm, pine, willow, rhizome_web) generate valid finite
 *    geometry with zero NaN coordinates.
 *
 * Usage:
 *   npx tsx scripts/test_rhizome_river_map.ts
 */

import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as THREE from "three";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

async function runTests() {
  console.log("=== STARTING RHIZOME DENDRITIC RIVER-MAP VERIFICATION SUITE ===\n");

  const origRandom = Math.random;
  Math.random = mulberry32(424242);

  const { SimulationEngine } = await import(
    pathToFileURL(path.join(ROOT, "src/lib/SimulationEngine.ts")).href
  );
  const { DEFAULTS } = await import(
    pathToFileURL(path.join(ROOT, "src/hooks/SimulationDefaults.ts")).href
  );
  const { updateSimulation } = await import(
    pathToFileURL(path.join(ROOT, "src/lib/SimulationUpdate.ts")).href
  );

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testId}: ${desc}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testId}: ${desc}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  function setupEngine(designerMode: boolean) {
    const engine: any = new SimulationEngine(createMockCanvas(), 1280, 720);
    const merged = {
      ...DEFAULTS,
      timeScale: 1.0,
      kioskMode: false,
      soundEnabled: false,
      designerMode,
    };
    for (const [key, val] of Object.entries(merged)) {
      if (val === undefined) continue;
      const setter = "set" + key.charAt(0).toUpperCase() + key.slice(1);
      if (typeof engine[setter] === "function") engine[setter](val);
      else engine[key] = val;
    }
    engine.designerMode = designerMode;
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
    return engine;
  }

  // =========================================================================
  // TEST SECTION 1: Designer Mode Rhizome River-Map Architecture
  // =========================================================================
  console.log("--- TEST SECTION 1: Designer Mode Rhizome River-Map ---");
  {
    const engine = setupEngine(true);
    const rootPos = new THREE.Vector3(0, engine.creatureCenterY || 18.92, 0);

    const genome = {
      name: "Rhizome-River-01",
      archetype: "rhizome",
      movementType: "straight",
      geometryType: "cylinder",
      appendage: "none",
      color: new THREE.Color(0x33cc88),
      thicknessBase: 3.5,
      thicknessDecay: 0.98,
      minThickness: 0.05,
      stepSize: 1.2,
      bifurcationRate: 1.0,
      wanderIntensity: 0.3,
      branchTendency: 1.0,
      wavingSpeed: 1.0,
      wavingAmplitude: 0.0,
      stability: 1.0,
      multicolorAppendage: false,
      sameColorAppendage: true,
      pulseTarget: "none",
      pulseSpeed: 1.0,
      leafDivision: 1,
      vernationType: "circinate",
      canopyZone: "wholeBody",
      phyllotaxisMode: "spiral",
      succulence: 1.0,
      growthHabit: "rhizome_web",
      createdAt: 0,
    };

    const initialAgent = {
      position: rootPos.clone(),
      lastPosition: rootPos.clone(),
      direction: new THREE.Vector3(0, 1, 0),
      genome,
      active: true,
      age: 0,
      thickness: genome.thicknessBase * 0.52,
      cooldown: 0,
      id: engine.nextAgentId++,
      branchDepth: 0,
    };

    engine.agents = [initialAgent];
    engine.genomeMap.set(genome.name, genome);

    // Track spawn positions and branch depths
    const agentDepths = new Map<number, number>();
    agentDepths.set(initialAgent.id, 0);
    const childSpawnPositions: THREE.Vector3[] = [];
    const allSpawnedAgents: any[] = [initialAgent];

    // Intercept engine nextAgentId / agent additions by tracking active agents
    const prevIds = new Set<number>([initialAgent.id]);

    // Tick simulation for 400 frames (equivalent to 260 frames at speed 1.0 now that rhizomeSpeed = treeSpeed = 0.65)
    for (let f = 0; f < 400; f++) {
      updateSimulation(engine);

      for (const a of engine.agents) {
        if (!prevIds.has(a.id)) {
          prevIds.add(a.id);
          allSpawnedAgents.push(a);
          agentDepths.set(a.id, a.branchDepth || 0);
          if ((a.branchDepth || 0) >= 1) {
            childSpawnPositions.push(a.position.clone());
          }
        }
      }
    }

    // Inspect generated segments
    const depthsPresent = new Set<number>();
    let segCount = 0;
    let quadPP = 0; // +X +Z
    let quadNP = 0; // -X +Z
    let quadNN = 0; // -X -Z
    let quadPN = 0; // +X -Z
    let hemiPosY = 0; // Y > rootPos.y
    let hemiNegY = 0; // Y <= rootPos.y

    for (let i = 0; i < engine.pointCount; i++) {
      const seg = engine.segments[i];
      if (!seg) continue;
      segCount++;
      const depth = agentDepths.get(seg.agentId) ?? 0;
      depthsPresent.add(depth);

      const m = seg.matrix.elements;
      const x = m[12] - rootPos.x;
      const y = m[13] - rootPos.y;
      const z = m[14] - rootPos.z;

      if (x >= 0 && z >= 0) quadPP++;
      else if (x < 0 && z >= 0) quadNP++;
      else if (x < 0 && z < 0) quadNN++;
      else quadPN++;

      if (y >= 0) hemiPosY++;
      else hemiNegY++;
    }

    const pctPP = (quadPP / Math.max(1, segCount)) * 100;
    const pctNP = (quadNP / Math.max(1, segCount)) * 100;
    const pctNN = (quadNN / Math.max(1, segCount)) * 100;
    const pctPN = (quadPN / Math.max(1, segCount)) * 100;
    const pctPosY = (hemiPosY / Math.max(1, segCount)) * 100;
    const pctNegY = (hemiNegY / Math.max(1, segCount)) * 100;

    // Distal branching check (> 12 units from root)
    let distalSpawns = 0;
    for (const pos of childSpawnPositions) {
      if (pos.distanceTo(rootPos) > 12.0) {
        distalSpawns++;
      }
    }
    const distalPct =
      childSpawnPositions.length > 0
        ? (distalSpawns / childSpawnPositions.length) * 100
        : 0;

    // Assertions for Designer Mode
    assert(
      depthsPresent.size >= 5,
      "DES-RHIZ-01",
      "Multi-order dendritic branching across >= 5 distinct branch depth orders",
      `Depths present: [${Array.from(depthsPresent).sort((a,b)=>a-b).join(", ")}] (count: ${depthsPresent.size})`,
    );

    assert(
      allSpawnedAgents.length >= 40,
      "DES-RHIZ-02",
      "Spawns >= 40 branch/tributary agents per rhizome organism",
      `Spawned agents: ${allSpawnedAgents.length}`,
    );

    assert(
      pctPP >= 10 && pctNP >= 10 && pctNN >= 10 && pctPN >= 10,
      "DES-RHIZ-03",
      "Omnidirectional 3D horizontal dispersion across all 4 XZ quadrants (each >= 10%)",
      `Quadrants: +X+Z=${pctPP.toFixed(1)}%, -X+Z=${pctNP.toFixed(1)}%, -X-Z=${pctNN.toFixed(1)}%, +X-Z=${pctPN.toFixed(1)}%`,
    );

    assert(
      pctPosY >= 20 && pctNegY >= 20,
      "DES-RHIZ-04",
      "Vertical dispersion across both +Y and -Y hemispheres (each >= 20%)",
      `Vertical: +Y=${pctPosY.toFixed(1)}%, -Y=${pctNegY.toFixed(1)}%`,
    );

    assert(
      distalPct >= 35.0,
      "DES-RHIZ-05",
      "Distal river-map branching (>= 35% of child spawns occur at distance > 12 units from root)",
      `Distal spawns: ${distalSpawns}/${childSpawnPositions.length} (${distalPct.toFixed(1)}%)`,
    );
  }

  // =========================================================================
  // TEST SECTION 2: Ecosystem Mode Rhizome Continuous River Growth
  // =========================================================================
  console.log("\n--- TEST SECTION 2: Ecosystem Mode Rhizome River-Map ---");
  {
    const engine = setupEngine(false); // Ecosystem mode: zero-g, bud bank, reiteration shoots
    const rootPos = new THREE.Vector3(15, engine.creatureCenterY || 18.92, -10);

    const genome = {
      name: "Rhizome-Eco-02",
      archetype: "rhizome",
      movementType: "straight",
      geometryType: "cylinder",
      appendage: "hair",
      color: new THREE.Color(0x22aacc),
      thicknessBase: 3.2,
      thicknessDecay: 0.98,
      minThickness: 0.05,
      stepSize: 1.2,
      bifurcationRate: 1.0,
      wanderIntensity: 0.35,
      branchTendency: 1.0,
      wavingSpeed: 1.0,
      wavingAmplitude: 0.0,
      stability: 1.0,
      multicolorAppendage: false,
      sameColorAppendage: true,
      pulseTarget: "none",
      pulseSpeed: 1.0,
      leafDivision: 1,
      vernationType: "circinate",
      canopyZone: "wholeBody",
      phyllotaxisMode: "spiral",
      succulence: 1.0,
      growthHabit: "rhizome_web",
      createdAt: 0,
    };

    const initialAgent = {
      position: rootPos.clone(),
      lastPosition: rootPos.clone(),
      direction: new THREE.Vector3(0.5, 0.7, 0.5).normalize(),
      genome,
      active: true,
      age: 0,
      thickness: genome.thicknessBase * 0.52,
      cooldown: 0,
      id: engine.nextAgentId++,
      branchDepth: 0,
    };

    engine.agents = [initialAgent];
    engine.genomeMap.set(genome.name, genome);

    const depthsPresent = new Set<number>([initialAgent.branchDepth || 0]);
    const prevIds = new Set<number>([initialAgent.id]);
    let totalAgentsSpawned = 1;

    for (let f = 0; f < 900; f++) {
      updateSimulation(engine);
      for (const a of engine.agents) {
        depthsPresent.add(a.branchDepth || 0);
        if (!prevIds.has(a.id)) {
          prevIds.add(a.id);
          totalAgentsSpawned++;
        }
      }
    }

    assert(
      depthsPresent.size >= 5,
      "ECO-RHIZ-01",
      "Ecosystem continuous growth achieves >= 5 branch depth orders via bud queue",
      `Depths present: [${Array.from(depthsPresent).sort((a,b)=>a-b).join(", ")}]`,
    );

    assert(
      totalAgentsSpawned >= 40,
      "ECO-RHIZ-02",
      "Ecosystem continuous growth spawns >= 40 river tributary agents",
      `Total agents spawned: ${totalAgentsSpawned}`,
    );

    assert(
      engine.pointCount >= 100,
      "ECO-RHIZ-03",
      "Ecosystem mode successfully generates >= 100 river segments",
      `Total segments: ${engine.pointCount}`,
    );
  }

  // =========================================================================
  // TEST SECTION 3: All 5 Botanical Habits Finite Geometry Check
  // =========================================================================
  console.log("\n--- TEST SECTION 3: All 5 Botanical Habits Finite Geometry ---");
  const habits = ["oak", "elm", "pine", "willow", "rhizome_web"] as const;

  for (const habit of habits) {
    const engine = setupEngine(true);
    const arch = habit === "rhizome_web" ? "rhizome" : habit === "willow" ? "bush" : "tree";
    const genome = {
      name: `HabitTest-${habit}`,
      archetype: arch,
      movementType: "straight",
      geometryType: "cylinder",
      appendage: "hair",
      color: new THREE.Color(0x44bb77),
      thicknessBase: 3.5,
      thicknessDecay: 0.98,
      minThickness: 0.05,
      stepSize: 1.0,
      bifurcationRate: 1.0,
      wanderIntensity: 0.3,
      branchTendency: 1.0,
      wavingSpeed: 1.0,
      wavingAmplitude: 0.0,
      stability: 1.0,
      multicolorAppendage: false,
      sameColorAppendage: true,
      pulseTarget: "none",
      pulseSpeed: 1.0,
      leafDivision: 1,
      vernationType: "circinate",
      canopyZone: "wholeBody",
      phyllotaxisMode: "spiral",
      succulence: 1.0,
      growthHabit: habit,
      createdAt: 0,
    };

    const initialAgent = {
      position: new THREE.Vector3(0, engine.creatureCenterY || 18.92, 0),
      lastPosition: new THREE.Vector3(0, engine.creatureCenterY || 18.92, 0),
      direction: new THREE.Vector3(0, 1, 0),
      genome,
      active: true,
      age: 0,
      thickness: genome.thicknessBase * 0.52,
      cooldown: 0,
      id: engine.nextAgentId++,
      branchDepth: 0,
    };

    engine.agents = [initialAgent];
    engine.genomeMap.set(genome.name, genome);

    let hasNaN = false;
    for (let f = 0; f < 120; f++) {
      updateSimulation(engine);
    }

    let segCount = 0;
    for (let i = 0; i < engine.pointCount; i++) {
      const seg = engine.segments[i];
      if (!seg) continue;
      segCount++;
      for (let e = 0; e < 16; e++) {
        if (!Number.isFinite(seg.matrix.elements[e])) {
          hasNaN = true;
          break;
        }
      }
    }

    assert(
      !hasNaN && segCount > 0,
      `HABIT-${habit.toUpperCase()}`,
      `Habit '${habit}' generates valid finite geometry with zero NaN/Inf coordinates`,
      `Segments generated: ${segCount}, hasNaN: ${hasNaN}`,
    );
  }

  // =========================================================================
  // TEST SECTION 4: Speed Parity & Continuous Twig Growth (Rhizome & Tree)
  // =========================================================================
  console.log("\n--- TEST SECTION 4: Speed Parity & Continuous Twig Growth ---");
  {
    assert(
      DEFAULTS.rhizomeSpeed === DEFAULTS.treeSpeed && DEFAULTS.rhizomeStepSize === DEFAULTS.treeStepSize,
      "SPEED-MATCH-01",
      "Rhizome and Tree have identical default speed and step size",
      `rhizomeSpeed=${DEFAULTS.rhizomeSpeed}, treeSpeed=${DEFAULTS.treeSpeed}, rhizomeStepSize=${DEFAULTS.rhizomeStepSize}, treeStepSize=${DEFAULTS.treeStepSize}`,
    );

    for (const arch of ["rhizome", "tree"] as const) {
      const engine = setupEngine(false);
      const genome = {
        name: `ContGrowth-${arch}`,
        archetype: arch,
        movementType: "straight",
        geometryType: "cylinder",
        appendage: "none",
        color: new THREE.Color(0x66cc44),
        thicknessBase: 3.2,
        thicknessDecay: 0.98,
        minThickness: 0.05,
        stepSize: 0.6,
        bifurcationRate: 1.0,
        wanderIntensity: 0.3,
        branchTendency: 1.0,
        wavingSpeed: 1.0,
        wavingAmplitude: 0.0,
        stability: 1.0,
        multicolorAppendage: false,
        sameColorAppendage: true,
        pulseTarget: "none",
        pulseSpeed: 1.0,
        leafDivision: 1,
        vernationType: "circinate",
        canopyZone: "wholeBody",
        phyllotaxisMode: "spiral",
        succulence: 1.0,
        growthHabit: arch === "rhizome" ? "rhizome_web" : "oak",
        createdAt: 0,
      };
      const rootPos = new THREE.Vector3(0, engine.creatureCenterY || 18.92, 0);
      const initialAgent = {
        position: rootPos.clone(),
        lastPosition: rootPos.clone(),
        direction: new THREE.Vector3(0, 1, 0),
        genome,
        active: true,
        age: 0,
        thickness: genome.thicknessBase * 0.4,
        cooldown: 0,
        id: engine.nextAgentId++,
        branchDepth: 0,
      };
      engine.agents = [initialAgent];
      engine.genomeMap.set(genome.name, genome);

      for (let f = 0; f < 400; f++) updateSimulation(engine);
      const segsAt400 = engine.pointCount;

      for (let f = 400; f < 900; f++) updateSimulation(engine);
      const segsAt900 = engine.pointCount;
      const activeTwigsAt900 = engine.agents.filter(
        (a: any) => a.active && !a.tapering && !a.isFeeler && a.genome.name === genome.name,
      ).length;

      assert(
        segsAt900 > segsAt400 && activeTwigsAt900 >= 1,
        `CONT-GROWTH-${arch.toUpperCase()}`,
        `${arch.toUpperCase()} continues adding segments (400->900 ticks) and keeps active seeker twigs alive`,
        `segs@400=${segsAt400}, segs@900=${segsAt900}, activeTwigs@900=${activeTwigsAt900}`,
      );
    }
  }

  // =========================================================================
  // TEST SECTION 5: Partner Seeking & Feeler Emission (Spread = 78.4, spd = 0.11)
  // =========================================================================
  console.log("\n--- TEST SECTION 5: Partner Seeking & Feeler Emission ---");
  {
    const engine = setupEngine(false);
    engine.growthSpeed = 0.11;
    engine.boundarySize = 60;
    engine.minCreatures = 3;
    engine.maxCreatures = 14;
    engine.feelerDelay = 6.0;
    engine.feelerProb = 0.65;
    engine.allowBreeding = true;

    const centerY = engine.creatureCenterY || 18.92;
    const posTree = new THREE.Vector3(-39.2, centerY, 0);
    const posRhiz = new THREE.Vector3(39.2, centerY, 0);

    const treeGenome = {
      name: "Tree-Spirophis",
      archetype: "tree",
      movementType: "straight",
      geometryType: "cylinder",
      appendage: "leaves",
      color: new THREE.Color(0x55aa33),
      thicknessBase: 3.4,
      thicknessDecay: 0.98,
      minThickness: 0.05,
      stepSize: 0.6,
      bifurcationRate: 1.0,
      wanderIntensity: 0.25,
      branchTendency: 1.0,
      wavingSpeed: 1.0,
      wavingAmplitude: 0.0,
      stability: 1.0,
      multicolorAppendage: false,
      sameColorAppendage: true,
      pulseTarget: "none",
      pulseSpeed: 1.0,
      leafDivision: 1,
      vernationType: "circinate",
      canopyZone: "wholeBody",
      phyllotaxisMode: "spiral",
      succulence: 1.0,
      growthHabit: "oak",
      createdAt: 0,
      birthPos: posTree.clone(),
    };

    const rhizGenome = {
      name: "Rhizome-Dendronaut",
      archetype: "rhizome",
      movementType: "straight",
      geometryType: "cylinder",
      appendage: "hair",
      color: new THREE.Color(0xddee44),
      thicknessBase: 3.2,
      thicknessDecay: 0.98,
      minThickness: 0.05,
      stepSize: 0.6,
      bifurcationRate: 1.0,
      wanderIntensity: 0.3,
      branchTendency: 1.0,
      wavingSpeed: 1.0,
      wavingAmplitude: 0.0,
      stability: 1.0,
      multicolorAppendage: false,
      sameColorAppendage: true,
      pulseTarget: "none",
      pulseSpeed: 1.0,
      leafDivision: 1,
      vernationType: "circinate",
      canopyZone: "wholeBody",
      phyllotaxisMode: "spiral",
      succulence: 1.0,
      growthHabit: "rhizome_web",
      createdAt: 0,
      birthPos: posRhiz.clone(),
    };

    const treeRootAgent = {
      position: posTree.clone(),
      lastPosition: posTree.clone(),
      direction: new THREE.Vector3(0, 1, 0),
      genome: treeGenome,
      active: true,
      age: 0,
      thickness: treeGenome.thicknessBase * 0.22,
      cooldown: 0,
      id: engine.nextAgentId++,
      branchDepth: 0,
    };

    const rhizRootAgent = {
      position: posRhiz.clone(),
      lastPosition: posRhiz.clone(),
      direction: new THREE.Vector3(0, 1, 0),
      genome: rhizGenome,
      active: true,
      age: 0,
      thickness: rhizGenome.thicknessBase * 0.52,
      cooldown: 0,
      id: engine.nextAgentId++,
      branchDepth: 0,
    };

    engine.agents = [treeRootAgent, rhizRootAgent];
    engine.genomeMap.set(treeGenome.name, treeGenome);
    engine.genomeMap.set(rhizGenome.name, rhizGenome);
    engine.speciesLifecycleMap.set(treeGenome.name, { birthTime: 0, birthPos: posTree.clone(), matingCount: 0 });
    engine.speciesLifecycleMap.set(rhizGenome.name, { birthTime: 0, birthPos: posRhiz.clone(), matingCount: 0 });

    let feelersObserved = 0;
    let minGapDistance = posTree.distanceTo(posRhiz);

    for (let f = 0; f < 1100; f++) {
      updateSimulation(engine);
      const currentFeelers = engine.agents.filter((a: any) => a.active && a.isFeeler).length;
      if (currentFeelers > 0 || engine.feelerCount > 0) {
        feelersObserved = Math.max(feelersObserved, currentFeelers, engine.feelerCount);
      }
      const treeTips = engine.agents.filter((a: any) => a.active && !a.isFeeler && a.genome.name === treeGenome.name);
      const rhizTips = engine.agents.filter((a: any) => a.active && !a.isFeeler && a.genome.name === rhizGenome.name);
      for (const t of treeTips) {
        for (const r of rhizTips) {
          const d = t.position.distanceTo(r.position);
          if (d < minGapDistance) minGapDistance = d;
        }
      }
    }

    const activeTreeEnd = engine.agents.filter(
      (a: any) => a.active && !a.tapering && !a.isFeeler && a.genome.name === treeGenome.name,
    ).length;
    const activeRhizEnd = engine.agents.filter(
      (a: any) => a.active && !a.tapering && !a.isFeeler && a.genome.name === rhizGenome.name,
    ).length;

    assert(
      minGapDistance < 74.0,
      "SEEK-FEELER-01",
      "Tree and Rhizome twigs grow and steer closer to each other from 78.4-unit initial separation",
      `Initial gap=78.4, minimum inter-twig distance=${minGapDistance.toFixed(1)}`,
    );

    assert(
      feelersObserved >= 1 || engine.feelerCount >= 1 || engine.hasAnyOrganismBred,
      "SEEK-FEELER-02",
      "Organisms organically emit feelers across the 78.4-unit arena separation after feelerDelay",
      `feelersObserved=${feelersObserved}, engine.feelerCount=${engine.feelerCount}, bred=${engine.hasAnyOrganismBred}`,
    );

    assert(
      activeTreeEnd >= 1 && activeRhizEnd >= 1,
      "SEEK-FEELER-03",
      "Both Tree and Rhizome maintain active growing twigs at tick 1100",
      `activeTreeTwigs=${activeTreeEnd}, activeRhizomeTwigs=${activeRhizEnd}`,
    );
  }

  // Restore Math.random
  Math.random = origRandom;

  console.log(`\n===============================================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR in test_rhizome_river_map:", err);
  process.exit(1);
});
