import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SimulationEngine } from "../lib/SimulationEngine";

interface Props {
  onLog: (msg: string) => void;
  onStateUpdate: (state: any) => void;
  onConfigChange?: (config: any) => void;
  stats?: any;
}

export function SimulationView({
  onLog,
  onStateUpdate,
  stats,
  restartTrigger,
  randomizeTrigger,
  rotationSpeed,
  magnetism,
  proximity,
  desperation,
  despairAge,
  flowerSize,
  entropyThreshold,
  tideSpeed,
  minAgents,
  boundarySize,
  tideColor,
  bgColor,
  fogColor,
  tideThickness,
  tideOpacity,
  tideSaturation,
  growthSpeed,
  diebackRate,
  hybridCooldown,
  hybridStickiness,
  branchTendencyVar,
  ornamentFrequency,
  branchingMultiplier,
  branchBigger,
  branchSplitSizeProb,
  maxDOMs,
  maxAgents,
  maxSpecies,
  ecoFade,
  desiccationSpeed,
  enableGlow,
  glowSize,
  fogVisibility,
  traitProbs,
  hybridSize,
  terminationProb,
  termProbPostBranch,
  taperDuration,
  diebackAgeBias,
  branchMutationRate,
  maxLineWidth,
  globalPulseSpeed,
  multicolorAppProb,
  sameColorAppProb,
  maxSaturation,
  feelerFade,
  cullRate,
  snakeSpeed,
  snakeStepSize,
  snakeWander,
  bushSpeed,
  treeSpeed,
  gingerSpeed,
  timeScale,
  theme,
  themeMorphFreq,
  themeMorphSpeed,
  glowTraitIntensity,
  glowTraitDistance,
  glowTraitReflect,
  botanyRealism,
  windVelocity,
  flutterIntensity,
  leafScale,
  leafDensity,
  relativeLeafSizeDiff,
  leafGrowthSpeed,
  phyllotaxisAngle,
  leafProbability,
  appendageSpawnRate,
  glowProbability,
  stemCurviness,
  veinStrength,
  veinGlow,
  onConfigChange,
}: Props & {
  restartTrigger?: number;
  randomizeTrigger?: number;
  rotationSpeed?: number;
  magnetism?: number;
  proximity?: number;
  desperation?: number;
  despairAge?: number;
  flowerSize?: number;
  entropyThreshold?: number;
  tideSpeed?: number;
  minAgents?: number;
  boundarySize?: number;
  tideColor?: string;
  bgColor?: string;
  fogColor?: string;
  tideThickness?: number;
  tideOpacity?: number;
  tideSaturation?: number;
  growthSpeed?: number;
  diebackRate?: number;
  hybridCooldown?: number;
  hybridStickiness?: number;
  branchTendencyVar?: number;
  ornamentFrequency?: number;
  branchingMultiplier?: number;
  branchBigger?: number;
  branchSplitSizeProb?: number;
  maxDOMs?: number;
  maxAgents?: number;
  maxSpecies?: number;
  ecoFade?: number;
  desiccationSpeed?: number;
  enableGlow?: boolean;
  glowSize?: number;
  fogVisibility?: number;
  traitProbs?: Record<string, number>;
  hybridSize?: number;
  terminationProb?: number;
  termProbPostBranch?: number;
  taperDuration?: number;
  diebackAgeBias?: number;
  branchMutationRate?: number;
  maxLineWidth?: number;
  globalPulseSpeed?: number;
  multicolorAppProb?: number;
  sameColorAppProb?: number;
  maxSaturation?: number;
  feelerFade?: number;
  cullRate?: number;
  snakeSpeed?: number;
  snakeStepSize?: number;
  snakeWander?: number;
  bushSpeed?: number;
  treeSpeed?: number;
  gingerSpeed?: number;
  timeScale?: number;
  theme?: number;
  themeMorphFreq?: number;
  themeMorphSpeed?: number;
  glowTraitIntensity?: number;
  glowTraitDistance?: number;
  glowTraitReflect?: number;
  botanyRealism?: boolean;
  windVelocity?: number;
  flutterIntensity?: number;
  leafScale?: number;
  leafDensity?: number;
  relativeLeafSizeDiff?: number;
  leafGrowthSpeed?: number;
  phyllotaxisAngle?: number;
  leafProbability?: number;
  appendageSpawnRate?: number;
  glowProbability?: number;
  stemCurviness?: number;
  veinStrength?: number;
  veinGlow?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const [hoveredStrainName, setHoveredStrainName] = useState<string | null>(null);
  const [hoveredAgentInfo, setHoveredAgentInfo] = useState<{ age: number; tapering: boolean } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastRaycastTime = useRef<number>(0);
  const pointerDownStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (
      engineRef.current &&
      randomizeTrigger !== undefined &&
      randomizeTrigger > 0
    ) {
      engineRef.current.randomizeColors();
    }
  }, [randomizeTrigger]);

  useEffect(() => {
    if (engineRef.current && theme !== undefined) {
      engineRef.current.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (engineRef.current && themeMorphFreq !== undefined) {
      engineRef.current.themeMorphFreq = themeMorphFreq;
    }
  }, [themeMorphFreq]);

  useEffect(() => {
    if (engineRef.current && themeMorphSpeed !== undefined) {
      engineRef.current.themeMorphSpeed = themeMorphSpeed;
    }
  }, [themeMorphSpeed]);

  useEffect(() => {
    if (engineRef.current && rotationSpeed !== undefined) {
      engineRef.current.setRotationSpeed(rotationSpeed);
    }
  }, [rotationSpeed]);

  useEffect(() => {
    if (engineRef.current && magnetism !== undefined) {
      engineRef.current.setMagnetism(magnetism);
    }
  }, [magnetism]);

  useEffect(() => {
    if (engineRef.current && proximity !== undefined) {
      engineRef.current.setProximity(proximity);
    }
  }, [proximity]);

  useEffect(() => {
    if (engineRef.current && desperation !== undefined) {
      engineRef.current.setDesperation(desperation);
    }
  }, [desperation]);

  useEffect(() => {
    if (engineRef.current && despairAge !== undefined) {
      engineRef.current.setDespairAge(despairAge);
    }
  }, [despairAge]);

  useEffect(() => {
    if (engineRef.current && flowerSize !== undefined) {
      engineRef.current.setFlowerSize(flowerSize);
    }
  }, [flowerSize]);

  useEffect(() => {
    if (engineRef.current && minAgents !== undefined) {
      engineRef.current.setMinAgents(minAgents);
    }
  }, [minAgents]);

  useEffect(() => {
    if (engineRef.current && boundarySize !== undefined) {
      engineRef.current.setBoundarySize(boundarySize);
    }
  }, [boundarySize]);

  useEffect(() => {
    if (engineRef.current && entropyThreshold !== undefined) {
      engineRef.current.setEntropyThreshold(entropyThreshold);
    }
  }, [entropyThreshold]);

  useEffect(() => {
    if (engineRef.current && tideSpeed !== undefined) {
      engineRef.current.setTideSpeed(tideSpeed);
    }
  }, [tideSpeed]);

  useEffect(() => {
    if (engineRef.current && cullRate !== undefined) {
      engineRef.current.setCullRate(cullRate);
    }
  }, [cullRate]);

  useEffect(() => {
    if (engineRef.current && snakeSpeed !== undefined) {
      engineRef.current.setSnakeSpeed(snakeSpeed);
    }
  }, [snakeSpeed]);

  useEffect(() => {
    if (engineRef.current && snakeStepSize !== undefined) {
      engineRef.current.setSnakeStepSize(snakeStepSize);
    }
  }, [snakeStepSize]);

  useEffect(() => {
    if (engineRef.current && snakeWander !== undefined) {
      engineRef.current.setSnakeWander(snakeWander);
    }
  }, [snakeWander]);

  useEffect(() => {
    if (engineRef.current && bushSpeed !== undefined) {
      engineRef.current.setBushSpeed(bushSpeed);
    }
  }, [bushSpeed]);

  useEffect(() => {
    if (engineRef.current && treeSpeed !== undefined) {
      engineRef.current.setTreeSpeed(treeSpeed);
    }
  }, [treeSpeed]);

  useEffect(() => {
    if (engineRef.current && gingerSpeed !== undefined) {
      engineRef.current.setGingerSpeed(gingerSpeed);
    }
  }, [gingerSpeed]);

  useEffect(() => {
    if (engineRef.current && timeScale !== undefined) {
      engineRef.current.setTimeScale(timeScale);
    }
  }, [timeScale]);

  useEffect(() => {
    if (engineRef.current) {
      if (tideColor !== undefined) engineRef.current.setTideColor(tideColor);
      if (bgColor !== undefined) engineRef.current.setBgColor(bgColor);
      if (fogColor !== undefined) engineRef.current.setFogColor(fogColor);
      if (tideThickness !== undefined)
        engineRef.current.tideThickness = tideThickness;
      if (tideOpacity !== undefined)
        engineRef.current.tideOpacity = tideOpacity;
      if (tideSaturation !== undefined)
        engineRef.current.tideSaturation = tideSaturation;
      if (growthSpeed !== undefined)
        engineRef.current.growthSpeed = growthSpeed;
      if (diebackRate !== undefined)
        engineRef.current.diebackRate = diebackRate;
      if (hybridCooldown !== undefined)
        engineRef.current.setHybridCooldown(hybridCooldown);
      if (hybridStickiness !== undefined)
        engineRef.current.setHybridStickiness(hybridStickiness);
      if (branchTendencyVar !== undefined)
        engineRef.current.setBranchTendencyVar(branchTendencyVar);
      if (ornamentFrequency !== undefined)
        engineRef.current.ornamentFrequency = ornamentFrequency;
      if (branchingMultiplier !== undefined)
        engineRef.current.branchingMultiplier = branchingMultiplier;
      if (branchBigger !== undefined)
        engineRef.current.branchBigger = branchBigger;
      if (branchSplitSizeProb !== undefined)
        engineRef.current.setBranchSplitSizeProb(branchSplitSizeProb);
      if (maxDOMs !== undefined) engineRef.current.setMaxDOMs(maxDOMs);
      if (maxAgents !== undefined) engineRef.current.setMaxAgents(maxAgents);
      if (minAgents !== undefined) engineRef.current.setMinAgents(minAgents);
      if (boundarySize !== undefined) engineRef.current.setBoundarySize(boundarySize);
      if (maxSpecies !== undefined) engineRef.current.setMaxSpecies(maxSpecies);
      if (ecoFade !== undefined) engineRef.current.setEcoFade(ecoFade);
      if (desiccationSpeed !== undefined)
        engineRef.current.setDesiccationSpeed(desiccationSpeed);
      if (enableGlow !== undefined) engineRef.current.setEnableGlow(enableGlow);
      if (glowSize !== undefined) engineRef.current.setGlowSize(glowSize);
      if (fogVisibility !== undefined)
        engineRef.current.setFogVisibility(fogVisibility);
      if (traitProbs !== undefined) engineRef.current.setTraitProbs(traitProbs);
      if (hybridSize !== undefined) engineRef.current.setHybridSize(hybridSize);
      if (terminationProb !== undefined)
        engineRef.current.setTerminationProb(terminationProb);
      if (termProbPostBranch !== undefined)
        engineRef.current.setTermProbPostBranch(termProbPostBranch);
      if (taperDuration !== undefined)
        engineRef.current.setTaperDuration(taperDuration);
      if (diebackAgeBias !== undefined)
        engineRef.current.setDiebackAgeBias(diebackAgeBias);
      if (branchMutationRate !== undefined)
        engineRef.current.setBranchMutationRate(branchMutationRate);
      if (maxLineWidth !== undefined)
        engineRef.current.setMaxLineWidth(maxLineWidth);
      if (globalPulseSpeed !== undefined)
        engineRef.current.setGlobalPulseSpeed(globalPulseSpeed);
      if (multicolorAppProb !== undefined)
        engineRef.current.setMulticolorAppProb(multicolorAppProb);
      if (sameColorAppProb !== undefined)
        engineRef.current.setSameColorAppProb(sameColorAppProb);
      if (maxSaturation !== undefined)
        engineRef.current.setMaxSaturation(maxSaturation);
      if (feelerFade !== undefined)
        engineRef.current.setFeelerFade(feelerFade);
      if (cullRate !== undefined)
        engineRef.current.setCullRate(cullRate);
      if (snakeSpeed !== undefined)
        engineRef.current.setSnakeSpeed(snakeSpeed);
      if (snakeStepSize !== undefined)
        engineRef.current.setSnakeStepSize(snakeStepSize);
      if (snakeWander !== undefined)
        engineRef.current.setSnakeWander(snakeWander);
      if (bushSpeed !== undefined)
        engineRef.current.setBushSpeed(bushSpeed);
      if (treeSpeed !== undefined)
        engineRef.current.setTreeSpeed(treeSpeed);
      if (gingerSpeed !== undefined)
        engineRef.current.setGingerSpeed(gingerSpeed);
      if (timeScale !== undefined)
        engineRef.current.setTimeScale(timeScale);
      if (theme !== undefined)
        engineRef.current.setTheme(theme);
      if (themeMorphFreq !== undefined)
        engineRef.current.themeMorphFreq = themeMorphFreq;
      if (themeMorphSpeed !== undefined)
        engineRef.current.themeMorphSpeed = themeMorphSpeed;
      if (glowTraitIntensity !== undefined)
        engineRef.current.glowTraitIntensity = glowTraitIntensity;
      if (glowTraitDistance !== undefined)
        engineRef.current.glowTraitDistance = glowTraitDistance;
      if (glowTraitReflect !== undefined)
        engineRef.current.glowTraitReflect = glowTraitReflect;
      if (botanyRealism !== undefined)
        engineRef.current.setBotanyRealism(botanyRealism);
      if (windVelocity !== undefined)
        engineRef.current.setWindVelocity(windVelocity);
      if (flutterIntensity !== undefined)
        engineRef.current.setFlutterIntensity(flutterIntensity);
      if (leafScale !== undefined)
        engineRef.current.setLeafScale(leafScale);
      if (leafDensity !== undefined)
        engineRef.current.setLeafDensity(leafDensity);
      if (relativeLeafSizeDiff !== undefined)
        engineRef.current.setRelativeLeafSizeDiff(relativeLeafSizeDiff);
      if (leafGrowthSpeed !== undefined)
        engineRef.current.setLeafGrowthSpeed(leafGrowthSpeed);
      if (phyllotaxisAngle !== undefined)
        engineRef.current.setPhyllotaxisAngle(phyllotaxisAngle);
      if (leafProbability !== undefined)
        engineRef.current.setLeafProbability(leafProbability);
      if (appendageSpawnRate !== undefined)
        engineRef.current.setAppendageSpawnRate(appendageSpawnRate);
      if (glowProbability !== undefined)
        engineRef.current.setGlowProbability(glowProbability);
      if (stemCurviness !== undefined)
        engineRef.current.setStemCurviness(stemCurviness);
      if (veinStrength !== undefined)
        engineRef.current.setVeinStrength(veinStrength);
      if (veinGlow !== undefined)
        engineRef.current.setVeinGlow(veinGlow);
    }
  }, [
    tideColor,
    bgColor,
    fogColor,
    tideThickness,
    tideOpacity,
    tideSaturation,
    growthSpeed,
    diebackRate,
    hybridCooldown,
    hybridStickiness,
    branchTendencyVar,
    ornamentFrequency,
    branchingMultiplier,
    branchBigger,
    branchSplitSizeProb,
    maxDOMs,
    maxAgents,
    maxSpecies,
    ecoFade,
    desiccationSpeed,
    enableGlow,
    glowSize,
    fogVisibility,
    traitProbs,
    hybridSize,
    terminationProb,
    termProbPostBranch,
    taperDuration,
    diebackAgeBias,
    branchMutationRate,
    maxLineWidth,
    globalPulseSpeed,
    multicolorAppProb,
    sameColorAppProb,
    maxSaturation,
    feelerFade,
    cullRate,
    snakeSpeed,
    snakeStepSize,
    snakeWander,
    bushSpeed,
    treeSpeed,
    gingerSpeed,
    timeScale,
    theme,
    themeMorphFreq,
    themeMorphSpeed,
    glowTraitIntensity,
    glowTraitDistance,
    glowTraitReflect,
    botanyRealism,
    windVelocity,
    flutterIntensity,
    leafScale,
    leafDensity,
    relativeLeafSizeDiff,
    leafGrowthSpeed,
    phyllotaxisAngle,
    leafProbability,
    appendageSpawnRate,
    glowProbability,
    stemCurviness,
    veinStrength,
    veinGlow,
  ]);

  useEffect(() => {
    if (engineRef.current && restartTrigger !== undefined) {
      engineRef.current.restart();
    }
  }, [restartTrigger]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const engine = new SimulationEngine(canvasRef.current, width, height);
    engine.onLog = onLog;
    engine.onStateUpdate = onStateUpdate;
    if (onConfigChange) {
      engine.onConfigChange = onConfigChange;
      onConfigChange({ bgColor: engine.bgColor });
    }
    engineRef.current = engine;

    // Apply initial settings immediately so they are never ignored
    if (rotationSpeed !== undefined) engine.setRotationSpeed(rotationSpeed);
    if (magnetism !== undefined) engine.setMagnetism(magnetism);
    if (proximity !== undefined) engine.setProximity(proximity);
    if (desperation !== undefined) engine.setDesperation(desperation);
    if (despairAge !== undefined) engine.setDespairAge(despairAge);
    if (flowerSize !== undefined) engine.setFlowerSize(flowerSize);
    if (entropyThreshold !== undefined)
      engine.setEntropyThreshold(entropyThreshold);
    if (minAgents !== undefined) engine.setMinAgents(minAgents);
    if (boundarySize !== undefined) engine.setBoundarySize(boundarySize);
    if (tideSpeed !== undefined) engine.setTideSpeed(tideSpeed);

    if (tideColor !== undefined) engine.setTideColor(tideColor);
    if (bgColor !== undefined) engine.setBgColor(bgColor);
    if (fogColor !== undefined) engine.setFogColor(fogColor);
    if (tideThickness !== undefined) engine.tideThickness = tideThickness;
    if (tideOpacity !== undefined) engine.tideOpacity = tideOpacity;
    if (tideSaturation !== undefined) engine.tideSaturation = tideSaturation;
    if (growthSpeed !== undefined) engine.growthSpeed = growthSpeed;
    if (diebackRate !== undefined) engine.diebackRate = diebackRate;
    if (hybridCooldown !== undefined) engine.setHybridCooldown(hybridCooldown);
    if (hybridStickiness !== undefined)
      engine.setHybridStickiness(hybridStickiness);
    if (branchTendencyVar !== undefined)
      engine.setBranchTendencyVar(branchTendencyVar);
    if (ornamentFrequency !== undefined)
      engine.ornamentFrequency = ornamentFrequency;
    if (branchingMultiplier !== undefined)
      engine.branchingMultiplier = branchingMultiplier;
    if (branchBigger !== undefined) engine.branchBigger = branchBigger;
    if (branchSplitSizeProb !== undefined)
      engine.setBranchSplitSizeProb(branchSplitSizeProb);
    if (maxDOMs !== undefined) engine.setMaxDOMs(maxDOMs);
    if (maxAgents !== undefined) engine.setMaxAgents(maxAgents);
    if (maxSpecies !== undefined) engine.setMaxSpecies(maxSpecies);
    if (ecoFade !== undefined) engine.setEcoFade(ecoFade);
    if (desiccationSpeed !== undefined)
      engine.setDesiccationSpeed(desiccationSpeed);
    if (enableGlow !== undefined) engine.setEnableGlow(enableGlow);
    if (glowSize !== undefined) engine.setGlowSize(glowSize);
    if (fogVisibility !== undefined) engine.setFogVisibility(fogVisibility);
    if (traitProbs !== undefined) engine.setTraitProbs(traitProbs);
    if (hybridSize !== undefined) engine.setHybridSize(hybridSize);
    if (terminationProb !== undefined)
      engine.setTerminationProb(terminationProb);
    if (termProbPostBranch !== undefined)
      engine.setTermProbPostBranch(termProbPostBranch);
    if (taperDuration !== undefined) engine.setTaperDuration(taperDuration);
    if (diebackAgeBias !== undefined) engine.setDiebackAgeBias(diebackAgeBias);
    if (branchMutationRate !== undefined)
      engine.setBranchMutationRate(branchMutationRate);
    if (maxLineWidth !== undefined) engine.setMaxLineWidth(maxLineWidth);
    if (globalPulseSpeed !== undefined)
      engine.setGlobalPulseSpeed(globalPulseSpeed);
    if (multicolorAppProb !== undefined)
      engine.setMulticolorAppProb(multicolorAppProb);
    if (sameColorAppProb !== undefined)
      engine.setSameColorAppProb(sameColorAppProb);
    if (feelerFade !== undefined)
      engine.setFeelerFade(feelerFade);
    if (cullRate !== undefined)
      engine.setCullRate(cullRate);
    if (snakeSpeed !== undefined)
      engine.setSnakeSpeed(snakeSpeed);
    if (snakeStepSize !== undefined)
      engine.setSnakeStepSize(snakeStepSize);
    if (snakeWander !== undefined)
      engine.setSnakeWander(snakeWander);
    if (bushSpeed !== undefined)
      engine.setBushSpeed(bushSpeed);
    if (treeSpeed !== undefined)
      engine.setTreeSpeed(treeSpeed);
    if (gingerSpeed !== undefined)
      engine.setGingerSpeed(gingerSpeed);
    if (timeScale !== undefined)
      engine.setTimeScale(timeScale);
    if (theme !== undefined)
      engine.setTheme(theme);
    if (glowTraitIntensity !== undefined)
      engine.glowTraitIntensity = glowTraitIntensity;
    if (glowTraitDistance !== undefined)
      engine.glowTraitDistance = glowTraitDistance;
    if (glowTraitReflect !== undefined)
      engine.glowTraitReflect = glowTraitReflect;
    if (botanyRealism !== undefined) engine.setBotanyRealism(botanyRealism);
    if (windVelocity !== undefined) engine.setWindVelocity(windVelocity);
    if (flutterIntensity !== undefined) engine.setFlutterIntensity(flutterIntensity);
    if (leafScale !== undefined) engine.setLeafScale(leafScale);
    if (leafDensity !== undefined) engine.setLeafDensity(leafDensity);
    if (relativeLeafSizeDiff !== undefined) engine.setRelativeLeafSizeDiff(relativeLeafSizeDiff);
    if (leafGrowthSpeed !== undefined) engine.setLeafGrowthSpeed(leafGrowthSpeed);
    if (phyllotaxisAngle !== undefined) engine.setPhyllotaxisAngle(phyllotaxisAngle);
    if (leafProbability !== undefined) engine.setLeafProbability(leafProbability);
    if (appendageSpawnRate !== undefined) engine.setAppendageSpawnRate(appendageSpawnRate);
    if (glowProbability !== undefined) engine.setGlowProbability(glowProbability);
    if (stemCurviness !== undefined) engine.setStemCurviness(stemCurviness);
    if (veinStrength !== undefined) engine.setVeinStrength(veinStrength);
    if (veinGlow !== undefined) engine.setVeinGlow(veinGlow);

    // Spawn initial creatures NOW, after all user settings have been applied.
    engine.initAgents();
    engine.start();

    const handleResize = () => {
      if (containerRef.current && engineRef.current) {
        engineRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.renderer.dispose();
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (pointerDownStart.current) {
      const dx = e.clientX - pointerDownStart.current.x;
      const dy = e.clientY - pointerDownStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pointerDownStart.current = null;
      if (dist > 5) return;
    }

    if (!containerRef.current || !engineRef.current) return;
    const engine = engineRef.current;
    if (!engine.camera || !engine.cylinderMesh) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, engine.camera);

    const intersects = raycaster.intersectObject(engine.cylinderMesh, true);
    
    let targetStrainName: string | null = null;

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && engine.segments[instanceId]) {
        targetStrainName = engine.segments[instanceId].strainName;
      }
    }

    if (!targetStrainName && engine.agents.length > 0) {
      let nearestAgent: any = null;
      let minDistSq = Infinity;
      const clickRay = raycaster.ray;

      engine.agents.forEach(agent => {
        if (agent.active && !agent.isFeeler) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minDistSq && distSq < 8000) {
            minDistSq = distSq;
            nearestAgent = agent;
          }
        }
      });

      if (nearestAgent) {
        targetStrainName = nearestAgent.genome.name;
      }
    }

    if (targetStrainName) {
      let boosted = 0;
      engine.agents.forEach(agent => {
        if (agent.active && agent.genome.name === targetStrainName) {
          agent.growthBoost = 16.0;
          agent.thickness = Math.min(agent.thickness * 1.5, agent.genome.thicknessBase * 3.0);
          agent.cooldown = 0;
          boosted++;
        }
      });

      if (boosted > 0) {
        engine.onLog(`🌟 Growth spurt triggered for ${targetStrainName.split(' ')[0]}!`);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!containerRef.current || !engineRef.current) return;
    const now = performance.now();
    if (now - lastRaycastTime.current < 40) return;
    lastRaycastTime.current = now;

    const engine = engineRef.current;
    if (!engine.camera || !engine.cylinderMesh) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, engine.camera);

    const intersects = raycaster.intersectObject(engine.cylinderMesh, true);
    
    let targetStrainName: string | null = null;

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && engine.segments[instanceId]) {
        const sName = engine.segments[instanceId].strainName;
        if (sName !== "hybrid") {
          targetStrainName = sName;
        }
      }
    }

    if (!targetStrainName && engine.agents.length > 0) {
      let nearestAgent: any = null;
      let minDistSq = Infinity;
      const clickRay = raycaster.ray;

      engine.agents.forEach(agent => {
        if (agent.active && !agent.isFeeler) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minDistSq && distSq < 300) {
            minDistSq = distSq;
            nearestAgent = agent;
          }
        }
      });

      if (nearestAgent) {
        targetStrainName = nearestAgent.genome.name;
      }
    }

    if (targetStrainName) {
      let matchingAgent: any = null;
      let minD = Infinity;
      const clickRay = raycaster.ray;
      engine.agents.forEach(agent => {
        if (agent.active && !agent.isFeeler && agent.genome.name === targetStrainName) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minD) {
            minD = distSq;
            matchingAgent = agent;
          }
        }
      });
      if (!matchingAgent) {
        matchingAgent = engine.agents.find(a => a.active && !a.isFeeler && a.genome.name === targetStrainName);
      }
      if (matchingAgent) {
        setHoveredAgentInfo({ age: matchingAgent.age, tapering: !!matchingAgent.tapering });
      } else {
        setHoveredAgentInfo(null);
      }
    } else {
      setHoveredAgentInfo(null);
    }

    engine.hoveredStrainName = targetStrainName;
    setHoveredStrainName(targetStrainName);
  };

  const hoveredStrain = hoveredStrainName && stats?.strains ? stats.strains.find((s: any) => s.name === hoveredStrainName) : null;
  const totalBiomass = stats?.strains ? stats.strains.reduce((acc: number, s: any) => acc + s.biomass, 0) || 1 : 1;
  const biomassPercent = hoveredStrain ? (hoveredStrain.biomass / totalBiomass) * 100 : 0;

  let textStyle = {};
  let barStyle = {};
  if (hoveredStrain) {
    const hasGradient = hoveredStrain.color2 && hoveredStrain.color2 !== hoveredStrain.color;
    textStyle = hasGradient
      ? {
          backgroundImage: `linear-gradient(to right, ${hoveredStrain.color}, ${hoveredStrain.color2})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }
      : { color: hoveredStrain.color };
    barStyle = hasGradient
      ? {
          width: `${biomassPercent}%`,
          backgroundImage: `linear-gradient(to right, ${hoveredStrain.color}, ${hoveredStrain.color2})`,
        }
      : { width: `${biomassPercent}%`, backgroundColor: hoveredStrain.color };
  }

  let lifespanPercent = 100;
  let lifespanColor = "bg-green-500";
  let lifespanText = "Optimal";
  if (hoveredAgentInfo) {
    const remaining = Math.max(5, Math.min(100, 100 - (hoveredAgentInfo.age / 400) * 100));
    lifespanPercent = remaining;
    if (hoveredAgentInfo.tapering) {
      lifespanColor = "bg-gray-500";
      lifespanText = "Deleting";
    } else if (remaining <= 15 || hoveredAgentInfo.age >= 380) {
      lifespanColor = "bg-red-500 animate-pulse";
      lifespanText = "End of Life";
    } else if (remaining <= 50) {
      lifespanColor = "bg-yellow-500";
      lifespanText = "Maturing";
    } else {
      lifespanColor = "bg-green-500";
      lifespanText = "Flourishing";
    }
  }

  const popupLeft = mousePos.x + 180 > window.innerWidth ? mousePos.x - 170 : mousePos.x + 15;
  const popupTop = mousePos.y + 140 > window.innerHeight ? mousePos.y - 130 : mousePos.y + 15;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          if (engineRef.current) engineRef.current.hoveredStrainName = null;
          setHoveredStrainName(null);
          setHoveredAgentInfo(null);
        }}
        className="block w-full h-full cursor-pointer pointer-events-auto"
      />
      {hoveredStrain && (
        <div
          className="fixed z-[9999] pointer-events-none bg-[#001220]/95 border border-[#87CEEB]/50 p-3 shadow-2xl text-[#87CEEB] text-[10px] rounded min-w-[160px] max-w-[220px]"
          style={{ top: popupTop, left: popupLeft }}
        >
          <div className="flex justify-between items-center mb-1 font-bold pb-1 border-b border-[#87CEEB]/30">
            <span className="truncate mr-2" style={textStyle}>
              {hoveredStrain.name}
            </span>
            {hoveredStrain.isDying && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
            )}
          </div>
          <div className="flex justify-between mb-1 gap-2">
            <span>Archetype:</span>
            <span className="capitalize">{hoveredStrain.archetype || "unknown"}</span>
          </div>
          <div className="flex justify-between mb-1 gap-2">
            <span>Biomass:</span>
            <span>{biomassPercent.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded mt-1.5 mb-2">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={barStyle as React.CSSProperties}
            />
          </div>
          <div className="flex justify-between mb-1 gap-2 border-t border-[#87CEEB]/20 pt-2">
            <span>Lifespan:</span>
            <span>{lifespanText}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded mt-1">
            <div
              className={`h-full transition-all duration-300 ease-out ${lifespanColor}`}
              style={{ width: `${lifespanPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
