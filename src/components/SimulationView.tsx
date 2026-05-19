import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SimulationEngine } from "../lib/SimulationEngine";

interface Props {
  onLog: (msg: string) => void;
  onStateUpdate: (state: any) => void;
  onConfigChange?: (config: any) => void;
}

export function SimulationView({
  onLog,
  onStateUpdate,
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
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

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

  const handleClick = (e: React.MouseEvent) => {
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
          agent.growthAccumulator = (agent.growthAccumulator || 0) + 40;
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

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} onClick={handleClick} className="block w-full h-full cursor-pointer pointer-events-auto" />
    </div>
  );
}
