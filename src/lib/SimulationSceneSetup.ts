import * as THREE from "three";
import {
  Genome, Agent, Archetype, MAX_POINTS, GEO_TYPES, PULSE_TARGETS,
  ARCHETYPES, MOVEMENT_TYPES, SpeciesLifecycleState,
} from "./SimulationTypes";
import { getWeightedAppendage, getRandomWeightedArchetype, formatGenomeName } from "./SimulationGenetics";
import { ensureUniqueStrainName } from "./SimulationGenomeGenerators";
import { getHybridCooldownTicks, setSpeciesCooldown } from "./SimulationSeekRamp";
import {
  buildBoundaryGeometry, applyResponsiveBoundaryCameraDistance,
  getEffectiveBoundaryExtents, clampInsideBounds,
} from "./SimulationBoundary";
import { assignGenomeMorphology, pickMorphModeForArchetype, computeInitialTrunkThickness } from "./SimulationMorphology";
import {
  resetCamera, executeReset, initSpeciesLifecycle, killSpecies,
  spawnHybridArtifact, updateGridHelpers, handleScreenFade,
  emitStateUpdate, getTrackedPositions,
} from "./SimulationLifecycleAndTelemetry";
import { createBasalTwinAgent } from "./SimulationBipolarGrowth";
import type { SimulationEngine } from "./SimulationEngine";

export {
  resetCamera,
  executeReset,
  initSpeciesLifecycle,
  killSpecies,
  spawnHybridArtifact,
  updateGridHelpers,
  handleScreenFade,
  emitStateUpdate,
  getTrackedPositions,
};

/** Gives every newly spawned organism the same organic 3D heading biased toward open space (matching tree axis init). */
function initialCreatureDirection(engine: SimulationEngine, pos: THREE.Vector3): THREE.Vector3 {
  const centre = new THREE.Vector3(0, engine.creatureCenterY || 18.921075, 0);
  const toCentre = centre.sub(pos);
  const dist = toCentre.length();
  const biasScalar = dist > 28 ? 0.22 : 0.05;
  const bias = dist > 1 ? toCentre.normalize().multiplyScalar(biasScalar) : toCentre.set(0, 0, 0);
  return new THREE.Vector3().randomDirection().add(bias).normalize();
}

export function generateRandomGenome(engine: SimulationEngine, baseName: string, forceArchetype?: any): Genome {
  const color = new THREE.Color().setHSL(Math.random(), 0.7 + Math.random() * 0.3, 0.4 + Math.random() * 0.4);
  const archetype = forceArchetype || getRandomWeightedArchetype();
  const movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];

  let thicknessBase: number, minThickness: number, thicknessDecay: number, bifurcationRate: number, stepSize: number, branchTendency: number, wanderIntensity: number;

  if (archetype === "bush") {
    thicknessBase = (2.20 + Math.random() * 0.6) * 0.7;
    minThickness = (0.40 + Math.random() * 0.15) * 0.7;
    thicknessDecay = 0.9993 + Math.random() * 0.0005;
    bifurcationRate = 0.32 + Math.random() * 0.10;
    stepSize = (0.45 + Math.random() * 0.15) * 0.7;
    branchTendency = Math.exp((Math.random() - 0.3) * engine.branchTendencyVar * 0.2) * (Math.random() > 0.5 ? 10.0 : 5.0);
    wanderIntensity = 0.8 + Math.random() * 0.5;
  } else if (archetype === "tree") {
    thicknessBase = (4.2 + Math.random() * 1.6) * 0.7;
    minThickness = (0.36 + Math.random() * 0.20) * 0.7;
    thicknessDecay = 0.9996 + Math.random() * 0.0004;
    bifurcationRate = 0.042 + Math.random() * 0.025;
    stepSize = (0.72 + Math.random() * 0.22) * 0.7;
    branchTendency = Math.exp((Math.random() - 0.4) * engine.branchTendencyVar * 0.2) * (Math.random() > 0.5 ? 4.2 : 2.6);
    wanderIntensity = 0.18 + Math.random() * 0.20;
  } else if (archetype === "snake") {
    thicknessBase = (3.4 + Math.random() * 1.4) * 0.7;
    minThickness = (0.85 + Math.random() * 0.45) * 0.7;
    thicknessDecay = 0.9995 + Math.random() * 0.0003;
    bifurcationRate = 0.055 + Math.random() * 0.035;
    stepSize = (1.1 + Math.random() * 0.3) * 0.7;
    branchTendency = 2.4 + Math.random() * 1.2;
    wanderIntensity = 0.22 + Math.random() * 0.20;
  } else {
    // Rhizome (creeping slime-mold / tendrilled network: sleek, organic meandering runners)
    thicknessBase = (2.1 + Math.random() * 0.6) * 0.7;
    minThickness = (0.40 + Math.random() * 0.15) * 0.7;
    thicknessDecay = 0.9995 + Math.random() * 0.0004;
    bifurcationRate = 0.08 + Math.random() * 0.04;
    stepSize = (1.0 + Math.random() * 0.25) * 0.7;
    branchTendency = 2.8 + Math.random() * 1.2;
    wanderIntensity = 0.35 + Math.random() * 0.25;
  }

  const genome: Genome = {
    name: formatGenomeName(archetype),
    archetype: archetype,
    movementType: movementType,
    color: color,
    thicknessBase: thicknessBase,
    minThickness: minThickness,
    thicknessDecay: thicknessDecay,
    stepSize: stepSize,
    bifurcationRate: bifurcationRate,
    wanderIntensity: wanderIntensity,
    branchTendency: branchTendency,
    wavingSpeed: Math.random() * 0.05,
    wavingAmplitude: Math.random() * 0.08,
    geometryType: archetype === "tree" ? "cylinder" : GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
    appendage: getWeightedAppendage(engine.traitProbs),
    multicolorAppendage: false,
    sameColorAppendage: Math.random() < engine.sameColorAppProb,
    stability: 0.8,
    pulseTarget: Math.random() < 0.05 ? PULSE_TARGETS[Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1] : "none",
    pulseSpeed: 0.003 + Math.random() * 0.007,
    gradientGrowth: Math.random() < (engine.traitProbs["gradient"] || 0.1),
    gradientType: 1 + Math.floor(Math.random() * 4),
    createdAt: engine.time,
    singleton: false,
    isGlowing: Math.random() < (engine.traitProbs.glow ?? 0.1),
    leafDivision: Math.random(),
    vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
    canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
    phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
    succulence: Math.random(),
    windStyle: archetype === "tree" ? "stiff" : (Math.random() < 0.5 ? "seaweed" : "stiff"),
    recessive: {
      archetype: getRandomWeightedArchetype(),
      movementType: MOVEMENT_TYPES.find((m) => m !== movementType) || MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)],
      geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
      appendage: getWeightedAppendage(engine.traitProbs),
      color: new THREE.Color().setHSL((color.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5 + (Math.random() - 0.5) * 0.04 + 1.0) % 1.0, 0.68, 0.52),
      isGlowing: Math.random() < 0.3,
      vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
      canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
      phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
      windStyle: Math.random() < 0.5 ? "seaweed" : "stiff",
    },
  };
  return assignGenomeMorphology(genome);
}

export function randomizeColors(engine: SimulationEngine): void {
  const uniqueGenomes = new Set<Genome>();
  engine.agents.forEach((a) => uniqueGenomes.add(a.genome));
  const genomesList = Array.from(uniqueGenomes);
  const alphaGenome = genomesList[0];
  const betaGenome = genomesList[1];
  const colorMap = new Map<string, THREE.Color>();

  if (alphaGenome) {
    const bgHue = Math.random();
    // Alpha is complementary to the background color (180° / 0.5 hue offset)
    const alphaHue = (bgHue + 0.5) % 1.0;
    if (engine.theme !== 1) {
      alphaGenome.color.setHSL(alphaHue, 0.9, 0.52);
      if (betaGenome) {
        let betaOffset = 0.5;
        if (engine.startColorMode === "analogous") {
          const sign = Math.random() < 0.5 ? 1 : -1;
          const matingShift = engine.colorMutationShift || 0.06;
          betaOffset = sign * matingShift * (0.8 + Math.random() * 0.4);
        } else {
          betaOffset = 0.5;
        }
        const betaHue = ((alphaHue + betaOffset) % 1.0 + 1.0) % 1.0;
        betaGenome.color.setHSL(betaHue, 0.9, 0.52);
      }
    }
    colorMap.set(alphaGenome.name, alphaGenome.color.clone());
    if (betaGenome) {
      colorMap.set(betaGenome.name, betaGenome.color.clone());
    }
    const bgColorObj = new THREE.Color().setHSL(bgHue, 0.4, 0.08);
    const bgHex = "#" + bgColorObj.getHexString();
    engine.setBgColor(bgHex);
    if (engine.onConfigChange) engine.onConfigChange({ bgColor: bgHex });
  }

  genomesList.slice(2).forEach((g) => {
    const newColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
    g.color.copy(newColor);
    colorMap.set(g.name, newColor);
  });

  if (engine.cylinderMesh.instanceColor) {
    for (let i = 0; i < MAX_POINTS; i++) {
      const seg = engine.segments[i];
      if (seg) {
        const newColor = colorMap.get(seg.strainName);
        if (newColor) engine.cylinderMesh.setColorAt(i, newColor);
      }
    }
    engine.cylinderMesh.instanceColor.needsUpdate = true;
  }
}

export function updateBoundaryMesh(engine: SimulationEngine): void {
  if (!engine.scene) return;
  if (engine.boundaryMesh) {
    engine.scene.remove(engine.boundaryMesh);
    if (engine.boundaryMesh.geometry) engine.boundaryMesh.geometry.dispose();
    if (engine.boundaryMesh.material) {
      if (Array.isArray(engine.boundaryMesh.material)) {
        engine.boundaryMesh.material.forEach((m) => m.dispose());
      } else {
        engine.boundaryMesh.material.dispose();
      }
    }
    engine.boundaryMesh = undefined;
  }
  if (!engine.showBoundaryBox) return;

  const geo = buildBoundaryGeometry(engine);

  const mat = new THREE.LineBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.5 });
  engine.boundaryMesh = new THREE.LineSegments(geo, mat);
  engine.boundaryMesh.position.set(0, engine.creatureCenterY, 0);
  engine.scene.add(engine.boundaryMesh);
}

export function setupBoundarySquash(engine: SimulationEngine, val: number): void {
  (engine as any)._userBoundarySquash = val;
  if (engine.boundarySquash === val) return;
  engine.boundarySquash = val;
  engine.updateBoundaryMesh();
}

export function setupCameraProjection(engine: SimulationEngine, val: number): void {
  if (engine.cameraProjection === val) return;
  engine.cameraProjection = val;
  if (engine.ambientLight) {
    engine.ambientLight.intensity = THREE.MathUtils.lerp(2.2, 1.2, val);
  }
  applyResponsiveBoundaryCameraDistance(engine);
}

export function setupBoundarySize(engine: SimulationEngine, val: number): void {
  if (engine.boundarySize === val) return;
  engine.boundarySize = val;
  engine.updateBoundaryMesh();
  applyResponsiveBoundaryCameraDistance(engine);
}

export function setupSceneBackground(engine: SimulationEngine, c: string): void {
  engine.bgColor = c;
  const color = new THREE.Color(c);
  engine.scene.background = color;
  if (engine.scene.fog) engine.scene.fog.color.copy(color);
  if (engine.floorGridMat && engine.floorGridMat.uniforms.fogColor) {
    engine.floorGridMat.uniforms.fogColor.value.copy(color);
  }
  if (engine.ceilingGridMat && engine.ceilingGridMat.uniforms.fogColor) {
    engine.ceilingGridMat.uniforms.fogColor.value.copy(color);
  }
}

export function setupFogColor(engine: SimulationEngine, c: string): void {
  const color = new THREE.Color(c);
  if (engine.scene.fog) engine.scene.fog.color.copy(color);
  if (engine.floorGridMat && engine.floorGridMat.uniforms.fogColor) {
    engine.floorGridMat.uniforms.fogColor.value.copy(color);
  }
  if (engine.ceilingGridMat && engine.ceilingGridMat.uniforms.fogColor) {
    engine.ceilingGridMat.uniforms.fogColor.value.copy(color);
  }
}

export function setupFogVisibility(engine: SimulationEngine, val: number): void {
  engine.fogVisibility = val;
  if (engine.scene.fog) {
    const dist = engine.camera && engine.controls
      ? engine.camera.position.distanceTo(engine.controls.target)
      : 137.42;
    const fogScale = Math.max(1.0, dist / 137.42);
    (engine.scene.fog as THREE.Fog).far = val * fogScale;
    (engine.scene.fog as THREE.Fog).near = Math.max(10, val / 4) * fogScale;
  }
}

export function setupTheme(engine: SimulationEngine, val: number, manual: boolean = true): void {
  if (manual) engine.lastThemeMorphTime = engine.frameCount;
  if (engine.sound) engine.sound.syncThemeEnvironment(val);
  if (engine.nextTheme !== val) {
    if (engine.themeProgress < 1.0) {
      engine.theme = engine.nextTheme;
      engine.themeColor1 = engine.nextThemeColor1;
      engine.themeColor2 = engine.nextThemeColor2;
    }
    engine.nextTheme = val;
    engine.themeProgress = 0.0;
    engine.manualThemeTransition = manual;
    const tc1 = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
    const tc2 = new THREE.Color().setHSL((tc1.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5) % 1.0, 0.8, 0.5);
    engine.nextThemeColor1 = "#" + tc1.getHexString();
    engine.nextThemeColor2 = "#" + tc2.getHexString();
  }
}

/**
 * Chooses a spawn position for a spontaneously emerging organism.
 *
 * New organisms must join the existing colony rather than materialising detached in empty
 * space. Previously this was a flat `(Math.random() - 0.5) * 80` box sample, completely
 * unrelated to where life actually was, so an emergent organism could appear on the far side
 * of the world with nothing around it.
 *
 * We anchor to a randomly chosen piece of living tissue and step a short distance away from it,
 * far enough that the newcomer does not grow straight through its neighbour. If the world is
 * genuinely empty (first seeding, or full extinction recovery) we fall back to the origin region.
 */
export function pickEmergencePosition(engine: SimulationEngine): THREE.Vector3 {
  const anchors: THREE.Vector3[] = [];

  for (let i = 0; i < engine.agents.length; i++) {
    const a = engine.agents[i];
    if (a.active && !a.tapering && !a.isFeeler) {
      anchors.push(a.position);
    }
  }

  // Fall back to standing tissue if every growth tip has already stopped.
  if (anchors.length === 0) {
    const limit = Math.min(engine.pointCount, engine.maxDOMs);
    for (let i = 0; i < limit; i++) {
      const seg = engine.segments[i];
      if (seg && !seg.dyingStart && !seg.isFeeler && !seg.strainName.startsWith("Feeler-")) {
        const m = seg.matrix.elements;
        anchors.push(new THREE.Vector3(m[12], m[13], m[14]));
      }
    }
  }

  const centerY = engine.creatureCenterY || 0;
  const { bX: effBX, bY: effBY } = getEffectiveBoundaryExtents(engine);
  const effSquash = effBY / Math.max(1, effBX);
  if (anchors.length === 0) {
    // Genuinely empty world — nothing to anchor to.
    const halfBox = Math.min(36, effBX * 0.85);
    return clampInsideBounds(
      engine,
      new THREE.Vector3(
        (Math.random() - 0.5) * halfBox,
        centerY + (Math.random() - 0.5) * halfBox * 0.65 * effSquash,
        (Math.random() - 0.5) * halfBox,
      ),
      3,
    );
  }

  const anchor = anchors[Math.floor(Math.random() * anchors.length)];
  const offset = new THREE.Vector3(
    Math.random() - 0.5,
    (Math.random() - 0.5) * 0.85 * effSquash,
    Math.random() - 0.5,
  );
  if (offset.lengthSq() < 1e-6) offset.set(1, 0, 0);
  const b = effBX * 0.72;
  const bY = Math.max(4, effBY * 0.72);
  if (engine.boundaryShape === "sphere") {
    const nx = anchor.x / b;
    const ny = (anchor.y - centerY) / bY;
    const nz = anchor.z / b;
    if (nx * nx + ny * ny + nz * nz > 1.0) {
      offset.set(-anchor.x, -(anchor.y - centerY) * effSquash, -anchor.z);
    }
  } else {
    if (Math.abs(anchor.x) > b) offset.x = -Math.sign(anchor.x) * Math.abs(offset.x);
    if (Math.abs(anchor.y - centerY) > bY) offset.y = -Math.sign(anchor.y - centerY) * Math.abs(offset.y);
    if (Math.abs(anchor.z) > b) offset.z = -Math.sign(anchor.z) * Math.abs(offset.z);
  }
  offset.normalize().multiplyScalar(Math.min(effBX * 0.52, 12 + Math.random() * 14));

  return clampInsideBounds(engine, anchor.clone().add(offset), 3);
}

export function spawnNewSpecies(engine: SimulationEngine, forceArchetype?: Archetype): Genome {
  let arch: Archetype;
  if (forceArchetype) {
    arch = forceArchetype;
  } else {
    const candidateArchs: Archetype[] = ["tree", "bush", "rhizome"];
    const livingStrainsByArch = new Map<Archetype, Set<string>>();
    for (const ca of candidateArchs) livingStrainsByArch.set(ca, new Set<string>());

    for (let i = 0; i < engine.agents.length; i++) {
      const a = engine.agents[i];
      if (a.active && !a.tapering && !a.isFeeler && a.genome) {
        const aArch = a.genome.archetype;
        const set = livingStrainsByArch.get(aArch);
        if (set) {
          set.add(a.genome.name);
        }
      }
    }

    let minCount = Infinity;
    for (const ca of candidateArchs) {
      const count = livingStrainsByArch.get(ca)!.size;
      if (count < minCount) minCount = count;
    }
    const leastRepresented = candidateArchs.filter(
      (ca) => livingStrainsByArch.get(ca)!.size === minCount,
    );
    const rng = (engine as any).prng ? (engine as any).prng() : Math.random();
    arch = leastRepresented[Math.floor(rng * leastRepresented.length)];
  }
  const familyNames = ["Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda"];
  const nameStr = `${familyNames[Math.floor(Math.random() * familyNames.length)]}-${Math.floor(Math.random() * 900 + 100)}`;
  const genome = generateRandomGenome(engine, nameStr, arch);
  genome.appendage = getWeightedAppendage(engine.traitProbs);
  assignGenomeMorphology(genome);
  const variance = 1.0 + (engine.widthVariance - 0.5) * 0.4;
  genome.thicknessBase *= variance;
  genome.color = new THREE.Color().setHSL(Math.random(), 0.9, 0.55);
  const conceptMode = (engine as any).botanicalConcept || "auto";
  const treeHabits = ["oak", "elm", "pine"];
  const bushHabits = ["willow", "oak", "elm"];
  genome.growthHabit =
    conceptMode !== "auto"
      ? conceptMode
      : arch === "rhizome"
        ? "rhizome_web"
        : arch === "tree"
          ? treeHabits[Math.floor(Math.random() * treeHabits.length)]
          : bushHabits[Math.floor(Math.random() * bushHabits.length)];

  // Claim a unique strain name: the organism census and culling are keyed by name, so a
  // collision with an existing strain would make this organism invisible to the population dials.
  genome.name = ensureUniqueStrainName(engine, genome.name);

  const initialCooldown = getHybridCooldownTicks(engine);
  engine.genomeMap.set(genome.name, genome);
  initSpeciesLifecycle(engine, genome.name);
  setSpeciesCooldown(engine, genome.name, genome, initialCooldown);

  const pos = pickEmergencePosition(engine);
  genome.birthPos = pos.clone();
  const agent: Agent = {
    position: pos.clone(),
    lastPosition: pos.clone(),
    direction: initialCreatureDirection(engine, pos),
    genome: genome,
    active: true,
    age: 0,
    thickness: computeInitialTrunkThickness(genome, !engine.designerMode),
    id: engine.nextAgentId++,
    cooldown: initialCooldown,
  };

  engine.agents.push(agent);
  const twin = createBasalTwinAgent(engine, agent);
  if (twin) engine.agents.push(twin);
  engine.spawnHybridArtifact(pos, genome.color, genome.name, genome.name, agent.id, agent.id, genome.name);
  if (engine.sound) {
    engine.sound.onSpeciesBorn(genome, pos, engine.camera);
  }
  // Record where it emerged and how far the nearest living neighbour is, so a detached
  // spawn is immediately obvious in the logs rather than only visible on screen.
  let nearestDist = Infinity;
  for (let i = 0; i < engine.agents.length; i++) {
    const a = engine.agents[i];
    if (a === agent || !a.active || a.tapering || a.isFeeler) continue;
    const d = a.position.distanceTo(pos);
    if (d < nearestDist) nearestDist = d;
  }
  const nearestTxt = nearestDist === Infinity ? "none" : nearestDist.toFixed(1);
  engine.onLog(
    `🌱 Emergence of new species: ${genome.name} [${arch.toUpperCase()}] at ` +
      `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) — nearest living neighbour ${nearestTxt}.`,
  );
  return genome;
}

export function setupInitialCreatures(engine: SimulationEngine): void {
  engine.agents = [];
  engine.biomassMap.clear();
  engine.pointCount = 0;
  engine.freeStemIndices = [];
  if (engine.growingStems) engine.growingStems.clear();
  engine.lastStemIndex = 0;
  if (engine.lastAgentStemIndex) engine.lastAgentStemIndex.clear();
  engine.segments = [];
  engine.hybridSegments = [];
  engine.hybridCount = 0;
  if (engine.dyingStrains) engine.dyingStrains.clear();
  if (engine.dyingStems) engine.dyingStems.clear();
  if (engine.suppressedStrains) engine.suppressedStrains.clear();
  if (engine.speciesAbove3Percent) engine.speciesAbove3Percent.clear();
  if (engine.speciesLifecycleMap) engine.speciesLifecycleMap.clear();
  if (engine.genomeMap) engine.genomeMap.clear();
  (engine as any)._tissueIndex = undefined;
  (engine as any)._lastBirthTime = undefined;
  (engine as any)._lastSenescenceDeathTime = undefined;
  engine.hasReachedMinCreatures = false;
  engine.time = 0;
  engine.frameCount = 0;
  const idm = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  for (let i = 0; i < MAX_POINTS; i++) {
    engine.cylinderMesh.setMatrixAt(i, idm);
  }
  const cylPackAAttr = engine.cylinderMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
  if (cylPackAAttr) {
    for (let i = 0; i < MAX_POINTS; i++) {
      cylPackAAttr.setZ(i, 0.0);
    }
    cylPackAAttr.needsUpdate = true;
  }

  for (const app of engine.appendages.values()) {
    for (let i = 0; i < app.mesh.count; i++) {
      app.mesh.setMatrixAt(i, idm);
    }
    const appPackAAttr = app.mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (appPackAAttr) {
      for (let i = 0; i < app.mesh.count; i++) {
        appPackAAttr.setZ(i, 0.0);
      }
      appPackAAttr.needsUpdate = true;
    }
    app.mesh.instanceMatrix.needsUpdate = true;
    app.mesh.count = 0;
    app.segments = [];
    app.dyingSet.clear();
    app.count = 0;
  }

  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const mesh of engine.hybridMeshes) {
    for (let i = 0; i < 2000; i++) {
      mesh.setMatrixAt(i, zeroMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = 0;
  }

  engine.cylinderMesh.instanceMatrix.needsUpdate = true;
  engine.cylinderMesh.count = 0;

  if (engine.designerMode) {
    const arch: Archetype = engine.designerArchetype || "bush";
    const designerGenome = generateRandomGenome(engine, "Designer", arch);
    designerGenome.name = formatGenomeName(arch);
    designerGenome.appendage = getWeightedAppendage(engine.traitProbs);
    assignGenomeMorphology(designerGenome);
    designerGenome.color = new THREE.Color().setHSL(0.55, 0.9, 0.52);
    designerGenome.vernationType = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
    designerGenome.phyllotaxisMode = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
    const activeConcept = (engine as any).botanicalConcept || "auto";
    designerGenome.growthHabit = activeConcept !== "auto"
      ? activeConcept
      : (arch === "rhizome" ? "rhizome_web" : arch === "bush" ? "willow" : "oak");

    engine.genomeMap.set(designerGenome.name, designerGenome);
    initSpeciesLifecycle(engine, designerGenome.name);

    // Fixed spot at bottom of view above dials, growing upwards
    const spawnPos = new THREE.Vector3(0, 0, 0);
    const spawnDir = new THREE.Vector3(0, 1, 0);
    const designerId = engine.nextAgentId++;

    const designerAgent: Agent = {
      id: designerId,
      position: spawnPos.clone(),
      direction: spawnDir.clone(),
      genome: designerGenome,
      active: true,
      age: 0,
      lastPosition: spawnPos.clone(),
      thickness: designerGenome.archetype === "tree" ? computeInitialTrunkThickness(designerGenome, false) : designerGenome.thicknessBase * (designerGenome.archetype === "bush" ? 1.05 : 1.5),
      cooldown: 0,
    };
    engine.agents.push(designerAgent);
    const designerTwin = createBasalTwinAgent(engine, designerAgent);
    if (designerTwin) engine.agents.push(designerTwin);
    engine.spawnHybridArtifact(spawnPos, designerGenome.color, designerGenome.name, designerGenome.name, designerId, designerId, designerGenome.name);

    engine.matingCount = 0;
    engine.feelerCount = 0;
    engine.hasAnyOrganismBred = false;

    if (engine.camera && engine.controls) {
      engine.controls.target.set(0, 15, 0);
      engine.camera.position.set(0, 15, -95);
      engine.camera.up.set(0, 1, 0);
      engine.camera.lookAt(engine.controls.target);
      engine.camera.updateProjectionMatrix();
      engine.controls.update();
    }

    if (engine.onDesignerStrainName) {
      engine.onDesignerStrainName(designerGenome.name);
    }
    return;
  }

  const forcedArch = typeof window !== "undefined" ? (localStorage.getItem("forceArchetype") as Archetype | null) : null;
  const forceBoth = typeof window !== "undefined" && localStorage.getItem("forceBothArchetypes") === "true";
  let alphaArchetype = forcedArch || getRandomWeightedArchetype();
  let betaArchetype = (forceBoth && forcedArch) ? forcedArch : getRandomWeightedArchetype();
  while (!forceBoth && betaArchetype === alphaArchetype) {
    betaArchetype = getRandomWeightedArchetype();
  }
  if (!forcedArch && alphaArchetype !== "tree" && betaArchetype !== "tree") {
    alphaArchetype = "tree";
  }

  const getHashForFamilyAndRange = (family: number, range: "alpha" | "beta"): number => {
    const targetSelector = family === 5 ? 0.8 + Math.random() * 0.2 : family * 0.16 + Math.random() * 0.16;
    const hMin = range === "alpha" ? 0.0 : 0.5;
    const hMax = range === "alpha" ? 0.5 : 1.0;
    const kMin = Math.ceil(hMin * 7.3 - targetSelector);
    const kMax = Math.floor(hMax * 7.3 - targetSelector);
    const k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
    return (k + targetSelector) / 7.3;
  };

  const alphaFamily = Math.floor(Math.random() * 6);
  let betaFamily = Math.floor(Math.random() * 6);
  while (betaFamily === alphaFamily) {
    betaFamily = Math.floor(Math.random() * 6);
  }

  const alphaGenome = generateRandomGenome(engine, "Alpha", alphaArchetype);
  alphaGenome.appendage = getWeightedAppendage(engine.traitProbs);
  alphaGenome.genomeHash = getHashForFamilyAndRange(alphaFamily, "alpha");

  let betaGenome = generateRandomGenome(engine, "Beta", betaArchetype);
  betaGenome.appendage = getWeightedAppendage(engine.traitProbs);
  betaGenome.genomeHash = getHashForFamilyAndRange(betaFamily, "beta");

  let attempts = 0;
  while (
    attempts < 50 &&
    (betaGenome.geometryType === alphaGenome.geometryType ||
      betaGenome.movementType === alphaGenome.movementType ||
      betaGenome.appendage === alphaGenome.appendage ||
      (!forceBoth && betaGenome.archetype === alphaGenome.archetype) ||
      betaGenome.canopyZone === alphaGenome.canopyZone)
  ) {
    attempts++;
    betaGenome = generateRandomGenome(engine, "Beta", betaArchetype);
    betaGenome.appendage = getWeightedAppendage(engine.traitProbs);
    betaGenome.genomeHash = getHashForFamilyAndRange(betaFamily, "beta");
  }

  assignGenomeMorphology(alphaGenome);
  assignGenomeMorphology(betaGenome, pickMorphModeForArchetype(betaArchetype, alphaGenome.morphMode));

  alphaGenome.vernationType = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
  let betaVern = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
  while (betaVern === alphaGenome.vernationType) {
    betaVern = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
  }
  betaGenome.vernationType = betaVern;

  alphaGenome.phyllotaxisMode = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
  let betaPhyllo = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
  while (betaPhyllo === alphaGenome.phyllotaxisMode) {
    betaPhyllo = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
  }
  betaGenome.phyllotaxisMode = betaPhyllo;
  alphaGenome.windStyle = alphaGenome.archetype === "tree" ? "stiff" : (Math.random() < 0.5 ? "seaweed" : "stiff");
  betaGenome.windStyle = betaGenome.archetype === "tree" ? "stiff" : (alphaGenome.windStyle === "seaweed" ? "stiff" : "seaweed");

  let alphaHue = alphaGenome.color.getHSL({ h: 0, s: 0, l: 0 }).h;
  if (engine.theme === 1) {
    alphaGenome.color.setHSL(0.1, 0.02, 0.95);
    betaGenome.color.setHSL(0.55, 1.0, 0.55);
  } else {
    // Pick a new random background hue for each new ecosystem
    const bgHue = Math.random();

    // Starting color for Alpha is complementary to the background color (180° / 0.5 hue offset)
    alphaHue = (bgHue + 0.5) % 1.0;
    alphaGenome.color.setHSL(alphaHue, 0.9, 0.52);

    let betaOffset = 0.5; // Default: Opposite complementary (+180°)
    if (engine.startColorMode === "analogous") {
      const sign = Math.random() < 0.5 ? 1 : -1;
      const matingShift = engine.colorMutationShift || 0.06;
      betaOffset = sign * matingShift * (0.8 + Math.random() * 0.4); // Same close distance as creature mating
    } else {
      betaOffset = 0.5; // Opposite complementary (+180°)
    }

    const betaHue = ((alphaHue + betaOffset) % 1.0 + 1.0) % 1.0;
    betaGenome.color.setHSL(betaHue, 0.9, 0.52);

    const bgColorObj = new THREE.Color().setHSL(bgHue, 0.4, 0.08);
    const bgHex = "#" + bgColorObj.getHexString();
    engine.setBgColor(bgHex);
    if (engine.onConfigChange) engine.onConfigChange({ bgColor: bgHex });
  }

  const tc1 = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
  const tc2 = new THREE.Color().setHSL((tc1.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5) % 1.0, 0.8, 0.5);
  engine.themeColor1 = "#" + tc1.getHexString();
  engine.themeColor2 = "#" + tc2.getHexString();
  engine.nextThemeColor1 = engine.themeColor1;
  engine.nextThemeColor2 = engine.themeColor2;
  engine.nextTheme = engine.theme;
  engine.themeProgress = 1.0;
  engine.lastThemeMorphTime = 0;

  if (alphaGenome.gradientGrowth) {
    betaGenome.gradientGrowth = false;
    betaGenome.multicolorAppendage = false;
    betaGenome.sameColorAppendage = true;
  } else if (betaGenome.gradientGrowth) {
    alphaGenome.multicolorAppendage = false;
    alphaGenome.sameColorAppendage = true;
    betaGenome.multicolorAppendage = false;
    betaGenome.sameColorAppendage = true;
  } else if (alphaGenome.multicolorAppendage) {
    betaGenome.multicolorAppendage = false;
    betaGenome.sameColorAppendage = true;
  }
  alphaGenome.createdAt = engine.time;
  betaGenome.createdAt = engine.time;

  const initialCooldown = getHybridCooldownTicks(engine);
  const centerY = engine.creatureCenterY || 0;
  const span = Math.min(15, (engine.boundarySize || 36) * 0.42);
  const yOffset = 5 * Math.min(1.0, engine.boundarySquash ?? 1.0);
  const alphaStart = new THREE.Vector3(-span, centerY - yOffset, -span * 0.75);
  const betaStart = new THREE.Vector3(span, centerY + yOffset, span * 0.75);
  alphaGenome.birthPos = alphaStart.clone();
  betaGenome.birthPos = betaStart.clone();
  (engine as any).alphaStrainName = alphaGenome.name;
  (engine as any).betaStrainName = betaGenome.name;
  (engine as any).alphaBirthPos = alphaStart.clone();
  (engine as any).betaBirthPos = betaStart.clone();

  engine.genomeMap.set(alphaGenome.name, alphaGenome);
  engine.genomeMap.set(betaGenome.name, betaGenome);
  const alphaId = engine.nextAgentId++;
  const betaId = engine.nextAgentId++;
  const alphaAgent: Agent = {
    position: alphaStart.clone(),
    direction: initialCreatureDirection(engine, alphaStart),
    genome: alphaGenome,
    id: alphaId,
    active: true,
    age: 0,
    lastPosition: alphaStart.clone(),
    rootOrigin: alphaStart.clone(),
    thickness: computeInitialTrunkThickness(alphaGenome, !engine.designerMode),
    cooldown: initialCooldown,
  };
  engine.agents.push(alphaAgent);
  const alphaTwin = createBasalTwinAgent(engine, alphaAgent);
  if (alphaTwin) engine.agents.push(alphaTwin);
  engine.spawnHybridArtifact(alphaStart, alphaGenome.color, alphaGenome.name, alphaGenome.name, alphaId, alphaId, alphaGenome.name);

  const betaAgent: Agent = {
    id: betaId,
    position: betaStart.clone(),
    direction: initialCreatureDirection(engine, betaStart),
    genome: betaGenome,
    active: true,
    age: 0,
    lastPosition: betaStart.clone(),
    rootOrigin: betaStart.clone(),
    thickness: computeInitialTrunkThickness(betaGenome, !engine.designerMode),
    cooldown: initialCooldown,
  };
  engine.agents.push(betaAgent);
  const betaTwin = createBasalTwinAgent(engine, betaAgent);
  if (betaTwin) engine.agents.push(betaTwin);
  engine.spawnHybridArtifact(betaStart, betaGenome.color, betaGenome.name, betaGenome.name, betaId, betaId, betaGenome.name);

  initSpeciesLifecycle(engine, alphaGenome.name);
  initSpeciesLifecycle(engine, betaGenome.name);
  setSpeciesCooldown(engine, alphaGenome.name, alphaGenome, initialCooldown);
  setSpeciesCooldown(engine, betaGenome.name, betaGenome, initialCooldown);

  engine.matingCount = 0;
  engine.feelerCount = 0;
  engine.hasAnyOrganismBred = false;
  if (engine.onInitOrganisms) {
    engine.onInitOrganisms({ alpha: alphaGenome, beta: betaGenome });
  }
  if (engine.onStateUpdate && engine.lod && typeof engine.getTrackedPositions === "function") {
    emitStateUpdate(engine);
  }
}

