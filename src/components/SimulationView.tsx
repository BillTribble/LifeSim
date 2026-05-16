import React, { useEffect, useRef, useState } from "react";
import { SimulationEngine } from "../lib/SimulationEngine";

interface Props {
  onLog: (msg: string) => void;
  onStateUpdate: (state: any) => void;
}

export function SimulationView({
  onLog,
  onStateUpdate,
  restartTrigger,
  randomizeTrigger,
  rotationSpeed,
  magnetism,
  proximity,
  flowerSize,
  entropyThreshold,
  tideSpeed,
  minAgents,
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
}: Props & {
  restartTrigger?: number;
  randomizeTrigger?: number;
  rotationSpeed?: number;
  magnetism?: number;
  proximity?: number;
  flowerSize?: number;
  entropyThreshold?: number;
  tideSpeed?: number;
  minAgents?: number;
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
    engineRef.current = engine;

    // Apply initial settings immediately so they are never ignored
    if (rotationSpeed !== undefined) engine.setRotationSpeed(rotationSpeed);
    if (magnetism !== undefined) engine.setMagnetism(magnetism);
    if (proximity !== undefined) engine.setProximity(proximity);
    if (flowerSize !== undefined) engine.setFlowerSize(flowerSize);
    if (entropyThreshold !== undefined)
      engine.setEntropyThreshold(entropyThreshold);
    if (minAgents !== undefined) engine.setMinAgents(minAgents);
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

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
