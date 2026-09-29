import * as THREE from "three";
import { SpeciesLifecycleState } from "./SimulationTypes";
import { NOTE_NAMES } from "./SimulationSound";
import { measureScreenFillSilhouette, ScreenFillData } from "./SimulationSilhouette";
import type { SimulationEngine } from "./SimulationEngine";

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
  state.segsAtDeath = engine.markStrainSegmentsDying(strainName);
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
  childStrainName?: string,
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
  const packAAttr = mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
  if (packAAttr) {
    packAAttr.setZ(currentCount, 0.0);
    packAAttr.needsUpdate = true;
  }
  const rootAnchorAttr = mesh.geometry.getAttribute("instanceRootAnchor") as THREE.InstancedBufferAttribute;
  if (rootAnchorAttr) {
    rootAnchorAttr.setXYZW(currentCount, pos.x, pos.y, pos.z, 0.0);
    rootAnchorAttr.needsUpdate = true;
  }
  const branchAnchorAttr = mesh.geometry.getAttribute("instanceBranchAnchor") as THREE.InstancedBufferAttribute;
  if (branchAnchorAttr) {
    branchAnchorAttr.setXYZW(currentCount, pos.x, pos.y, pos.z, 0.0);
    branchAnchorAttr.needsUpdate = true;
  }

  engine.hybridSegments[currentCount] = {
    index: currentCount,
    timestamp: engine.time,
    matrix: engine.dummy.matrix.clone(),
    thickness: engine.hybridSize,
    strainName: strainName || "hybrid",
    strainBName: strainBName || "hybrid",
    childStrainName: childStrainName,
    agentAId: agentAId,
    agentBId: agentBId,
    variant: variant,
    color: color.clone(),
    countsForBiomass: false,
  };

  engine.dyingHybrids.delete(currentCount);
  engine.hybridCount++;

  const drawCount = Math.min(2000, Math.max(engine.hybridCount, currentCount + 1));
  for (const m of engine.hybridMeshes) {
    m.count = Math.max(m.count, drawCount);
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

  if (engine.frameCount - lastSilhouetteFrame >= 60 || !lastSilhouetteData) {
    lastSilhouetteFrame = engine.frameCount;
    lastSilhouetteData = measureScreenFillSilhouette(engine);
  }

  engine.onStateUpdate({
    geometryCount: totalActiveGeometries,
    perf: {
      fps: Math.round(engine.lod.fps),
      frameMs: Math.round(engine.lod.emaFrameMs * 10) / 10,
      lodTier: engine.lod.tier,
      lodMode: engine.lod.mode,
      triangles: engine.lod.activeTriangles,
      trianglesAtHigh: engine.lod.activeTrianglesTier0,
    },
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
    soundInfo: engine.sound ? {
      enabled: engine.sound.enabled,
      environment: engine.sound.currentEnvironment,
      key: NOTE_NAMES[engine.sound.key],
      mode: engine.sound.mode,
      colour: engine.sound.colour,
      tension: engine.sound.tension,
      degree: engine.sound.deg,
      activeVoices: engine.sound.active,
      lastBanner: engine.sound.lastModBanner,
      masterVolume: engine.sound.masterVolume,
      space: engine.sound.space,
      autoCycle: engine.sound.autoCycleEnvironments,
      syncWithThemes: engine.sound.syncWithThemes,
    } : null,
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
  const alphaPos = new THREE.Vector3(-20, 0, 0);
  const betaPos = new THREE.Vector3(20, 0, 0);

  return {
    org1: projectPos(alphaPos),
    org2: projectPos(betaPos),
    mating: engine.lastMatingWorldPos ? projectPos(engine.lastMatingWorldPos) : null,
    feeler: engine.lastFeelerWorldPos ? projectPos(engine.lastFeelerWorldPos) : null,
  };
}
