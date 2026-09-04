import * as THREE from "three";
import {
  Genome,
  Agent,
  Archetype,
  MAX_POINTS,
  GEO_TYPES,
  PULSE_TARGETS,
  ARCHETYPES,
  MOVEMENT_TYPES,
  SpeciesLifecycleState,
} from "./SimulationTypes";
import {
  getWeightedAppendage,
  getRandomWeightedArchetype,
  formatGenomeName,
} from "./SimulationGenetics";
import type { SimulationEngine } from "./SimulationEngine";

export function generateRandomGenome(engine: SimulationEngine, baseName: string, forceArchetype?: any): Genome {
  const color = new THREE.Color().setHSL(Math.random(), 0.7 + Math.random() * 0.3, 0.4 + Math.random() * 0.4);
  const archetype = forceArchetype || getRandomWeightedArchetype();
  const movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];

  let thicknessBase: number, minThickness: number, thicknessDecay: number, bifurcationRate: number, stepSize: number, branchTendency: number;

  if (archetype === "bush") {
    thicknessBase = (2.20 + Math.random() * 0.6) * 0.7;
    minThickness = (0.35 + Math.random() * 0.15) * 0.7;
    thicknessDecay = 0.9993 + Math.random() * 0.0005;
    bifurcationRate = 0.32 + Math.random() * 0.10;
    stepSize = (0.45 + Math.random() * 0.15) * 0.7;
    branchTendency = Math.exp((Math.random() - 0.3) * engine.branchTendencyVar * 0.2) * (Math.random() > 0.5 ? 10.0 : 5.0);
  } else if (archetype === "tree") {
    thicknessBase = (5.2 + Math.random() * 2.0) * 0.7;
    minThickness = (0.15 + Math.random() * 0.25) * 0.7;
    thicknessDecay = 0.9996 + Math.random() * 0.0004;
    bifurcationRate = 0.024 + Math.random() * 0.016;
    stepSize = (0.80 + Math.random() * 0.25) * 0.7;
    branchTendency = Math.exp((Math.random() - 0.4) * engine.branchTendencyVar * 0.2) * (Math.random() > 0.5 ? 4.0 : 2.2);
  } else if (archetype === "snake") {
    thicknessBase = (4.8 + Math.random() * 2.2) * 0.7;
    minThickness = (2.4 + Math.random() * 1.2) * 0.7;
    thicknessDecay = 0.9998 + Math.random() * 0.0002;
    bifurcationRate = 0.003 + Math.random() * 0.006;
    stepSize = (1.8 + Math.random() * 0.8) * 0.7;
    branchTendency = Math.exp((Math.random() - 0.5) * engine.branchTendencyVar * 0.2) * (Math.random() > 0.9 ? 2.5 : 0.4);
  } else {
    // Rhizome (creeping slime-mold / tendrilled network: sleek, organic meandering runners)
    thicknessBase = (1.9 + Math.random() * 0.6) * 0.7;
    minThickness = (0.35 + Math.random() * 0.15) * 0.7;
    thicknessDecay = 0.9995 + Math.random() * 0.0004;
    bifurcationRate = 0.06 + Math.random() * 0.03;
    stepSize = (1.2 + Math.random() * 0.3) * 0.7;
    branchTendency = 2.5 + Math.random() * 1.0;
  }

  return {
    name: formatGenomeName(archetype),
    archetype: archetype,
    movementType: movementType,
    color: color,
    thicknessBase: thicknessBase,
    minThickness: minThickness,
    thicknessDecay: thicknessDecay,
    stepSize: stepSize,
    bifurcationRate: bifurcationRate,
    wanderIntensity: archetype === "rhizome" ? 0.35 + Math.random() * 0.25 : archetype === "bush" ? 0.8 + Math.random() * 0.5 : 0.01 + Math.random() * 0.05,
    branchTendency: branchTendency,
    wavingSpeed: Math.random() * 0.05,
    wavingAmplitude: Math.random() * 0.08,
    geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
    appendage: getWeightedAppendage(engine.traitProbs),
    multicolorAppendage: false,
    sameColorAppendage: Math.random() < engine.sameColorAppProb,
    stability: 0.8,
    pulseTarget: Math.random() < 0.05 ? PULSE_TARGETS[Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1] : "none",
    pulseSpeed: 0.003 + Math.random() * 0.007,
    gradientGrowth: Math.random() < (engine.traitProbs["gradient"] || 0.1),
    gradientType: 1 + Math.floor(Math.random() * 4),
    createdAt: engine.time,
    singleton: archetype === "snake" && Math.random() < 0.5,
    isGlowing: Math.random() < (engine.traitProbs.glow ?? 0.1),
    leafDivision: Math.random(),
    vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
    canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
    phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
    succulence: Math.random(),
    recessive: {
      archetype: ARCHETYPES.find((a) => a !== archetype) || ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)],
      movementType: MOVEMENT_TYPES.find((m) => m !== movementType) || MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)],
      geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
      appendage: getWeightedAppendage(engine.traitProbs),
      color: new THREE.Color().setHSL((color.getHSL({ h: 0, s: 0, l: 0 }).h + 0.5 + (Math.random() - 0.5) * 0.04 + 1.0) % 1.0, 0.68, 0.52),
      isGlowing: Math.random() < 0.3,
      vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
      canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
      phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
    },
  };
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

  const b = engine.boundarySize;
  const squash = engine.boundarySquash ?? 1.0;
  const bY = b * squash;
  let geo: THREE.BufferGeometry;
  if (engine.boundaryShape === "sphere") {
    // Generate clean, elegant meridian and parallel circle rings (no busy diagonal triangulation)
    const points: THREE.Vector3[] = [];
    const segments = 48;

    // 1. Horizontal Equator Ring (XZ plane at y=0)
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta1) * b, 0, Math.sin(theta1) * b),
        new THREE.Vector3(Math.cos(theta2) * b, 0, Math.sin(theta2) * b)
      );
    }

    // 2. Vertical XY Meridian Ring
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta1) * b, Math.sin(theta1) * bY, 0),
        new THREE.Vector3(Math.cos(theta2) * b, Math.sin(theta2) * bY, 0)
      );
    }

    // 3. Vertical YZ Meridian Ring
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(0, Math.sin(theta1) * bY, Math.cos(theta1) * b),
        new THREE.Vector3(0, Math.sin(theta2) * bY, Math.cos(theta2) * b)
      );
    }

    // 4. Upper and Lower Parallel Rings (at ±45° latitude)
    const latAngle = Math.PI / 4;
    const latR = b * Math.cos(latAngle);
    const latY = bY * Math.sin(latAngle);
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      // Upper ring
      points.push(
        new THREE.Vector3(Math.cos(theta1) * latR, latY, Math.sin(theta1) * latR),
        new THREE.Vector3(Math.cos(theta2) * latR, latY, Math.sin(theta2) * latR)
      );
      // Lower ring
      points.push(
        new THREE.Vector3(Math.cos(theta1) * latR, -latY, Math.sin(theta1) * latR),
        new THREE.Vector3(Math.cos(theta2) * latR, -latY, Math.sin(theta2) * latR)
      );
    }

    geo = new THREE.BufferGeometry().setFromPoints(points);
  } else {
    const boxGeo = new THREE.BoxGeometry(b * 2, bY * 2, b * 2);
    geo = new THREE.EdgesGeometry(boxGeo);
  }

  const mat = new THREE.LineBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.5 });
  engine.boundaryMesh = new THREE.LineSegments(geo, mat);
  engine.boundaryMesh.position.set(0, engine.creatureCenterY, 0);
  engine.scene.add(engine.boundaryMesh);
}

export function setupBoundarySquash(engine: SimulationEngine, val: number): void {
  if (engine.boundarySquash === val) return;
  engine.boundarySquash = val;
  engine.updateBoundaryMesh();
}

export function setupCameraProjection(engine: SimulationEngine, val: number): void {
  if (engine.cameraProjection === val) return;
  engine.cameraProjection = val;
  if (engine.camera && engine.controls) {
    const baseFOV = 45.0;
    const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, val));
    const distFactor = Math.tan((baseFOV * Math.PI) / 360) / Math.tan((targetFOV * Math.PI) / 360);
    const dir = new THREE.Vector3().subVectors(engine.camera.position, engine.controls.target).normalize();
    const baseDist = 137.42;
    const newDist = baseDist * distFactor;
    engine.camera.fov = targetFOV;
    engine.camera.position.copy(engine.controls.target).addScaledVector(dir, newDist);
    engine.camera.updateProjectionMatrix();

    if (engine.scene && engine.scene.fog && engine.scene.fog instanceof THREE.Fog) {
      engine.scene.fog.near = 120 * distFactor;
      engine.scene.fog.far = (engine.fogVisibility || 800) * distFactor;
    }
    if (engine.ambientLight) {
      engine.ambientLight.intensity = THREE.MathUtils.lerp(2.2, 1.2, val);
    }
    engine.controls.update();
  }
}

export function setupBoundarySize(engine: SimulationEngine, val: number): void {
  if (engine.boundarySize === val) return;
  engine.boundarySize = val;
  engine.updateBoundaryMesh();
  if (engine.camera && engine.controls) {
    const dir = new THREE.Vector3().subVectors(engine.camera.position, engine.controls.target).normalize();
    const baseFOV = 45.0;
    const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, engine.cameraProjection));
    const distFactor = Math.tan((baseFOV * Math.PI) / 360) / Math.tan((targetFOV * Math.PI) / 360);
    const baseDist = val * 2.7484;
    const newDist = baseDist * distFactor;
    engine.camera.position.copy(engine.controls.target).addScaledVector(dir, newDist);
    engine.camera.updateProjectionMatrix();
    engine.controls.update();
  }
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
    (engine.scene.fog as THREE.Fog).far = val;
    (engine.scene.fog as THREE.Fog).near = Math.max(10, val / 4);
  }
}

export function setupTheme(engine: SimulationEngine, val: number, manual: boolean = true): void {
  if (manual) engine.lastThemeMorphTime = engine.frameCount;
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

export function spawnNewSpecies(engine: SimulationEngine, forceArchetype?: Archetype): Genome {
  const archetypes: Archetype[] = ARCHETYPES;
  const arch = forceArchetype || archetypes[Math.floor(Math.random() * archetypes.length)];
  const familyNames = ["Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda"];
  const nameStr = `${familyNames[Math.floor(Math.random() * familyNames.length)]}-${Math.floor(Math.random() * 900 + 100)}`;
  const genome = generateRandomGenome(engine, nameStr, arch);
  genome.appendage = getWeightedAppendage(engine.traitProbs);
  const variance = 1.0 + (engine.widthVariance - 0.5) * 2.0;
  if (arch === "bush") {
    genome.thicknessBase = (0.6 + Math.random() * 1.2 * variance) * 0.7;
  } else if (arch === "tree") {
    genome.thicknessBase = (3.5 + Math.random() * 3.0 * variance) * 0.7;
  } else if (arch === "snake") {
    genome.thicknessBase = (1.2 + Math.random() * 2.0 * variance) * 0.7;
  }
  genome.color = new THREE.Color().setHSL(Math.random(), 0.9, 0.55);

  engine.genomeMap.set(genome.name, genome);
  initSpeciesLifecycle(engine, genome.name);

  const pos = new THREE.Vector3((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 80);
  const agent: Agent = {
    position: pos.clone(),
    lastPosition: pos.clone(),
    direction: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
    genome: genome,
    active: true,
    age: 0,
    thickness: genome.thicknessBase * 1.5,
    id: engine.nextAgentId++,
    cooldown: 200,
  };

  engine.agents.push(agent);
  engine.onLog(`🌱 Emergence of new species: ${genome.name} [${arch.toUpperCase()}] to maintain minimum 3 species.`);
  return genome;
}

export function setupInitialCreatures(engine: SimulationEngine): void {
  engine.agents = [];
  engine.biomassMap.clear();
  engine.pointCount = 0;
  engine.freeStemIndices = [];
  engine.segments = [];
  engine.hybridSegments = [];
  engine.hybridCount = 0;
  if (engine.dyingStrains) engine.dyingStrains.clear();
  if (engine.dyingStems) engine.dyingStems.clear();
  if (engine.suppressedStrains) engine.suppressedStrains.clear();
  if (engine.speciesAbove3Percent) engine.speciesAbove3Percent.clear();
  if (engine.speciesLifecycleMap) engine.speciesLifecycleMap.clear();
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

  const getArchetypeThickness = (arch: Archetype) => {
    const variance = 1.0 + (engine.widthVariance - 0.5) * 2.0;
    if (arch === "bush") {
      return (2.20 + Math.random() * 0.6 * variance) * 0.7;
    } else if (arch === "tree") {
      return (5.2 + Math.random() * 2.0 * variance) * 0.7;
    } else if (arch === "snake") {
      return (4.8 + Math.random() * 2.2 * variance) * 0.7;
    } else if (arch === "rhizome") {
      return (1.9 + Math.random() * 0.6 * variance) * 0.7;
    } else {
      return (2.2 + Math.random() * 1.0 * variance) * 0.7;
    }
  };

  if (engine.designerMode) {
    const arch: Archetype = engine.designerArchetype || "bush";
    const designerGenome = generateRandomGenome(engine, "Designer", arch);
    designerGenome.name = formatGenomeName(arch);
    designerGenome.appendage = getWeightedAppendage(engine.traitProbs);
    designerGenome.thicknessBase = getArchetypeThickness(arch);
    designerGenome.color = new THREE.Color().setHSL(0.55, 0.9, 0.52);
    designerGenome.vernationType = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
    designerGenome.phyllotaxisMode = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];

    engine.genomeMap.set(designerGenome.name, designerGenome);
    initSpeciesLifecycle(engine, designerGenome.name);

    // Fixed spot at bottom of view above dials, growing upwards
    const spawnPos = new THREE.Vector3(0, 0, 0);
    const spawnDir = new THREE.Vector3(0, 1, 0);

    engine.agents.push({
      id: engine.nextAgentId++,
      position: spawnPos.clone(),
      direction: spawnDir.clone(),
      genome: designerGenome,
      active: true,
      age: 0,
      lastPosition: spawnPos.clone(),
      thickness: designerGenome.thicknessBase * (arch === "rhizome" ? 1.3 : 2.0),
      cooldown: 0,
    });

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

  const alphaArchetype = getRandomWeightedArchetype();
  let betaArchetype = getRandomWeightedArchetype();
  while (betaArchetype === alphaArchetype) {
    betaArchetype = getRandomWeightedArchetype();
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
      betaGenome.archetype === alphaGenome.archetype ||
      betaGenome.canopyZone === alphaGenome.canopyZone)
  ) {
    attempts++;
    betaGenome = generateRandomGenome(engine, "Beta", betaArchetype);
    betaGenome.appendage = getWeightedAppendage(engine.traitProbs);
    betaGenome.genomeHash = getHashForFamilyAndRange(betaFamily, "beta");
  }

  alphaGenome.thicknessBase = getArchetypeThickness(alphaArchetype);
  betaGenome.thicknessBase = getArchetypeThickness(betaArchetype);

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

  engine.agents.push({
    position: new THREE.Vector3(-40, 0, 0),
    direction: new THREE.Vector3(1, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2).normalize(),
    genome: alphaGenome,
    id: engine.nextAgentId++,
    active: true,
    age: 0,
    lastPosition: new THREE.Vector3(-40, 0, 0),
    thickness: alphaGenome.thicknessBase * 2.0,
    cooldown: 180,
  });

  engine.agents.push({
    id: engine.nextAgentId++,
    position: new THREE.Vector3(40, 0, 0),
    direction: new THREE.Vector3(-1, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2).normalize(),
    genome: betaGenome,
    active: true,
    age: 0,
    lastPosition: new THREE.Vector3(40, 0, 0),
    thickness: betaGenome.thicknessBase * 2.0,
    cooldown: 180,
  });

  initSpeciesLifecycle(engine, alphaGenome.name);
  initSpeciesLifecycle(engine, betaGenome.name);

  engine.matingCount = 0;
  engine.feelerCount = 0;
  engine.hasAnyOrganismBred = false;
  if (engine.onInitOrganisms) {
    engine.onInitOrganisms({ alpha: alphaGenome, beta: betaGenome });
  }
}

export function resetCamera(engine: SimulationEngine): void {
  if (engine.camera && engine.controls) {
    const creatureCenterY = engine.designerMode ? 15.0 : (engine.creatureCenterY || 18.921075);
    const camZ = engine.designerMode ? -95.0 : 137.42;
    const wasAutoRotate = engine.controls.autoRotate;
    engine.controls.autoRotate = false;

    engine.controls.target.set(0, creatureCenterY, 0);
    engine.camera.position.set(0, creatureCenterY, camZ);
    engine.camera.up.set(0, 1, 0);
    engine.camera.lookAt(engine.controls.target);
    engine.camera.updateProjectionMatrix();

    engine.controls.saveState();
    engine.controls.reset();

    engine.camera.position.set(0, creatureCenterY, camZ);
    engine.controls.target.set(0, creatureCenterY, 0);
    engine.controls.update();

    engine.controls.autoRotate = wasAutoRotate;
    engine.setCameraProjection(engine.cameraProjection);
  }
}

export function executeReset(engine: SimulationEngine): void {
  engine.time = 0;
  engine.lastKioskTime = 0;
  engine.lastKioskRealTime = performance.now();
  engine.kioskFadeProgress = 0;
  engine.kioskFadingOut = false;
  engine.resetCamera();
  engine.initAgents();
}

export function initSpeciesLifecycle(engine: SimulationEngine, strainName: string): SpeciesLifecycleState {
  if (!engine.speciesLifecycleMap.has(strainName)) {
    engine.speciesLifecycleMap.set(strainName, {
      phase: "GROWING",
      createdAt: engine.unscaledTime,
      hasBred: false,
      matingCount: 0,
    });
  }
  return engine.speciesLifecycleMap.get(strainName)!;
}

export function killSpecies(engine: SimulationEngine, strainName: string, reason: string): void {
  const livingOrganisms = engine.getLivingOrganisms();
  const livingCount = livingOrganisms.size;
  if (livingCount < engine.minCreatures) {
    engine.onLog(`🛡️ Deletion blocked for ${strainName} (${reason}): living organisms (${livingCount}) has not reached minCreatures (${engine.minCreatures}).`);
    return;
  }

  if (livingCount - 1 < engine.minCreatures) {
    engine.onLog(`🛡️ Deletion blocked for ${strainName} (${reason}): deleting this creature would drop organisms below minCreatures (${livingCount} - 1 < ${engine.minCreatures}).`);
    return;
  }

  let state = engine.speciesLifecycleMap.get(strainName);
  if (!state) state = initSpeciesLifecycle(engine, strainName);
  if (state.phase === "END_OF_LIFE") return;

  state.phase = "END_OF_LIFE";
  state.deathStartTick = engine.unscaledTime;
  state.reason = reason;

  const remainingNames = Array.from(livingOrganisms).filter(n => n !== strainName).join(", ");
  engine.onLog(`⏳ Species ${strainName} entering end-of-life (${reason}) — ${livingCount} species present. Remaining: [${remainingNames}]`);

  for (const agent of engine.agents) {
    const isDirect = agent.genome.name === strainName;
    const isFeelerOfStrain = (agent.realGenome && agent.realGenome.name === strainName);
    const isChildOfStrain = (agent.parentAgent && (agent.parentAgent.genome.name === strainName || (agent.parentAgent.realGenome && agent.parentAgent.realGenome.name === strainName)));
    if (agent.active && (isDirect || isFeelerOfStrain || isChildOfStrain)) {
      agent.tapering = true;
      agent.forceTapering = true;
      agent.fadeAge = 0;
      agent.taperBudget = undefined;
    }
  }

  if (!engine.dyingStrains) engine.dyingStrains = new Set();
  engine.dyingStrains.add(strainName);
  engine.markStrainSegmentsDying(strainName);
  engine.onLog(`🔻 dyingStrains now: [${Array.from(engine.dyingStrains).join(", ")}]`);
}

export function spawnHybridArtifact(
  engine: SimulationEngine,
  pos: THREE.Vector3,
  color: THREE.Color,
  strainName?: string,
  strainBName?: string,
  agentAId?: number,
  agentBId?: number,
): void {
  if (engine.hybridMeshes.length === 0) return;
  const currentCount = engine.hybridCount % 2000;

  engine.dummy.position.copy(pos);
  engine.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  engine.dummy.scale.set(engine.hybridSize, engine.hybridSize, engine.hybridSize);
  engine.dummy.updateMatrix();

  const variant = Math.floor(Math.random() * engine.hybridMeshes.length);
  const mesh = engine.hybridMeshes[variant];
  mesh.setMatrixAt(currentCount, engine.dummy.matrix);
  mesh.setColorAt(currentCount, color);

  engine.hybridSegments[currentCount] = {
    index: currentCount,
    timestamp: engine.time,
    matrix: engine.dummy.matrix.clone(),
    thickness: engine.hybridSize,
    strainName: strainName || "hybrid",
    strainBName: strainBName || "hybrid",
    agentAId: agentAId,
    agentBId: agentBId,
    variant: variant,
    color: color.clone(),
  };

  engine.dyingHybrids.delete(currentCount);
  engine.hybridCount++;

  for (const m of engine.hybridMeshes) {
    m.count = 2000;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

export function updateGridHelpers(engine: SimulationEngine): void {
  if (engine.camera) {
    const camY = engine.camera.position.y;
    const bY = engine.boundarySize * (engine.boundarySquash ?? 1.0);
    const baseGap = bY + 2.0;
    const layerGapOffset = (engine.layerGap - 100) / 2;
    const floorY = engine.creatureCenterY - baseGap - layerGapOffset + engine.floorHeight;
    const ceilingY = engine.creatureCenterY + baseGap + layerGapOffset + engine.ceilingHeight;

    if (engine.floorGridMesh) {
      engine.floorGridMesh.position.x = engine.camera.position.x;
      engine.floorGridMesh.position.y = floorY;
      engine.floorGridMesh.position.z = engine.camera.position.z;
      engine.floorGridMesh.visible = camY > floorY;
    }
    if (engine.ceilingGridMesh) {
      engine.ceilingGridMesh.position.x = engine.camera.position.x;
      engine.ceilingGridMesh.position.y = ceilingY;
      engine.ceilingGridMesh.position.z = engine.camera.position.z;
      engine.ceilingGridMesh.visible = camY < ceilingY;
    }

    const floorAlpha = THREE.MathUtils.clamp((camY - floorY) / 25.0, 0.0, 1.0);
    const ceilingAlpha = THREE.MathUtils.clamp((ceilingY - camY) / 25.0, 0.0, 1.0);

    if (engine.floorGridMat && engine.floorGridMat.uniforms.planeOpacity) {
      engine.floorGridMat.uniforms.planeOpacity.value = floorAlpha;
    }
    if (engine.ceilingGridMat && engine.ceilingGridMat.uniforms.planeOpacity) {
      engine.ceilingGridMat.uniforms.planeOpacity.value = ceilingAlpha;
    }
    if (engine.floorGridMat && engine.floorGridMat.uniforms.cameraPos) {
      engine.floorGridMat.uniforms.cameraPos.value.copy(engine.controls ? engine.controls.target : engine.camera.position);
    }
    if (engine.ceilingGridMat && engine.ceilingGridMat.uniforms.cameraPos) {
      engine.ceilingGridMat.uniforms.cameraPos.value.copy(engine.controls ? engine.controls.target : engine.camera.position);
    }
  }
}

export function handleScreenFade(engine: SimulationEngine): void {
  if (engine.fadeState === "out") {
    engine.fadeProgress = Math.min(1.0, engine.fadeProgress + 0.08);
    if (engine.fadeProgress >= 1.0) {
      engine.executeReset();
      engine.fadeState = "in";
    }
  } else if (engine.fadeState === "in") {
    engine.fadeProgress = Math.max(0.0, engine.fadeProgress - 0.08);
    if (engine.fadeProgress <= 0.0) engine.fadeState = "idle";
  }
}

import { measureScreenFillSilhouette, ScreenFillData } from "./SimulationSilhouette";

let lastSilhouetteData: ScreenFillData | null = null;
let lastSilhouetteFrame = 0;

export function emitStateUpdate(engine: SimulationEngine): void {
  const strains: {
    name: string;
    color: string;
    color2: string;
    biomass: number;
    genome: any;
    archetype?: string;
    isDying?: boolean;
    matingCount?: number;
  }[] = [];
  engine.biomassMap.forEach((v, k) => {
    if (v > 0 && !k.startsWith("Feeler-")) {
      const genome = engine.genomeMap.get(k);
      if (genome) {
        const color2 = genome.gradientGrowth ? "#" + genome.color.clone().offsetHSL(0.5, 0, 0).getHexString() : "#" + genome.color.getHexString();
        const lifecycle = engine.speciesLifecycleMap?.get(k);
        strains.push({
          name: k,
          color: "#" + genome.color.getHexString(),
          color2,
          biomass: v,
          genome: genome,
          archetype: genome.archetype,
          isDying: engine.dyingStrains?.has(k),
          matingCount: lifecycle?.matingCount || 0,
        });
      }
    }
  });

  let activeCount = 0;
  for (let i = 0; i < engine.agents.length; i++) {
    if (engine.agents[i].active && !engine.agents[i].tapering && !engine.agents[i].isFeeler) activeCount++;
  }

  let totalActiveGeometries = 0;
  const stemLimit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < stemLimit; i++) {
    if (engine.segments[i] && !engine.dyingStems.has(i)) totalActiveGeometries++;
  }
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      if (app.segments[i] && !app.dyingSet.has(i)) totalActiveGeometries++;
    }
  }

  // Measure Downscaled GPU Silhouette Buffer every ~60 frames (1 sec)
  if (engine.frameCount - lastSilhouetteFrame >= 60 || !lastSilhouetteData) {
    lastSilhouetteFrame = engine.frameCount;
    lastSilhouetteData = measureScreenFillSilhouette(engine);
  }

  engine.onStateUpdate({
    geometryCount: totalActiveGeometries,
    totalAgents: activeCount,
    hybridCount: engine.totalHybridCount || 0,
    kioskFadeProgress: engine.kioskFadeProgress,
    strains: strains.sort((a, b) => b.biomass - a.biomass).slice(0, Math.max(30, engine.maxCreatures)),
    screenFill: lastSilhouetteData,
    tideValue: engine.tideValue,
    cameraPosition: {
      x: engine.camera.position.x,
      y: engine.camera.position.y,
      z: engine.camera.position.z,
      zoom: engine.camera.zoom,
    },
    theme: engine.theme,
    nextTheme: engine.nextTheme,
    themeProgress: engine.themeProgress,
    trackedPositions: engine.getTrackedPositions(),
  });
}

export function getTrackedPositions(engine: SimulationEngine): any {
  if (!engine.camera || !engine.width || !engine.height) return null;
  engine.camera.updateMatrixWorld();
  const projectPos = (pos: THREE.Vector3) => {
    const v = pos.clone();
    v.project(engine.camera);
    const x = (v.x * 0.5 + 0.5) * engine.width;
    const y = (-v.y * 0.5 + 0.5) * engine.height;
    return { x, y, isBehind: v.z > 1 };
  };
  const alphaPos = new THREE.Vector3(-40, 0, 0);
  const betaPos = new THREE.Vector3(40, 0, 0);

  return {
    org1: projectPos(alphaPos),
    org2: projectPos(betaPos),
    mating: engine.lastMatingWorldPos ? projectPos(engine.lastMatingWorldPos) : null,
    feeler: engine.lastFeelerWorldPos ? projectPos(engine.lastFeelerWorldPos) : null,
  };
}
