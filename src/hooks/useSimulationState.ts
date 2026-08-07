import { useState, useEffect } from "react";
import {
  DEFAULTS,
  DEFAULT_PALETTE,
  CURRENT_SCHEMA,
  getStoredFloat,
  getStoredBool,
  getStoredString,
  getStoredTimeScale,
  getStoredDialLimits,
  getStoredTraitProbs,
  checkSchemaVersion,
} from "./SimulationDefaults";

export { DEFAULTS, DEFAULT_PALETTE, CURRENT_SCHEMA };

export function useSimulationState() {
  checkSchemaVersion();

  const [snakeSpeed, setSnakeSpeed] = useState(() => getStoredFloat("snakeSpeed"));
  const [snakeStepSize, setSnakeStepSize] = useState(() => getStoredFloat("snakeStepSize"));
  const [snakeWander, setSnakeWander] = useState(() => getStoredFloat("snakeWander"));
  const [bushSpeed, setBushSpeed] = useState(() => getStoredFloat("bushSpeed"));
  const [treeSpeed, setTreeSpeed] = useState(() => getStoredFloat("treeSpeed"));
  const [rhizomeSpeed, setRhizomeSpeed] = useState(() => getStoredFloat("rhizomeSpeed"));
  const [bushStepSize, setBushStepSize] = useState(() => getStoredFloat("bushStepSize"));
  const [treeStepSize, setTreeStepSize] = useState(() => getStoredFloat("treeStepSize"));
  const [rhizomeStepSize, setRhizomeStepSize] = useState(() => getStoredFloat("rhizomeStepSize"));
  const [bushBranching, setBushBranching] = useState(() => getStoredFloat("bushBranching"));
  const [widthVariance, setWidthVariance] = useState(() => getStoredFloat("widthVariance"));
  const [branchGrowthBoost, setBranchGrowthBoost] = useState(() => getStoredFloat("branchGrowthBoost"));
  const [colorMutationShift, setColorMutationShift] = useState(() => getStoredFloat("colorMutationShift"));
  const [treeBranching, setTreeBranching] = useState(() => getStoredFloat("treeBranching"));
  const [snakeBranching, setSnakeBranching] = useState(() => getStoredFloat("snakeBranching"));
  const [rhizomeBranching, setRhizomeBranching] = useState(() => getStoredFloat("rhizomeBranching"));
  const [bushMinBranches, setBushMinBranches] = useState(() => getStoredFloat("bushMinBranches"));
  const [rhizomeMinBranches, setRhizomeMinBranches] = useState(() => getStoredFloat("rhizomeMinBranches"));
  const [treeMinBranches, setTreeMinBranches] = useState(() => getStoredFloat("treeMinBranches"));
  const [snakeMinBranches, setSnakeMinBranches] = useState(() => getStoredFloat("snakeMinBranches"));
  const [timeScale, setTimeScale] = useState(() => getStoredTimeScale());
  const [postMatingDieoff, setPostMatingDieoff] = useState(() => getStoredBool("postMatingDieoff", true));
  const [theme, setTheme] = useState(0); // Always start in normal theme
  const [themeMorphFreq, setThemeMorphFreq] = useState(() => getStoredFloat("themeMorphFreq"));
  const [themeMorphSpeed, setThemeMorphSpeed] = useState(() => getStoredFloat("themeMorphSpeed"));
  const [dialLimits, setDialLimits] = useState<Record<string, { min: number; max: number }>>(() => getStoredDialLimits());
  const [rotationSpeed, setRotationSpeed] = useState(() => getStoredFloat("rotationSpeed"));
  const [rotationSpeedY, setRotationSpeedY] = useState(() => getStoredFloat("rotationSpeedY", 0.0));
  const [gridHeight, setGridHeight] = useState(() => getStoredFloat("gridHeight"));
  const [layerGap, setLayerGap] = useState(() => getStoredFloat("layerGap"));
  const [floorHeight, setFloorHeight] = useState(() => getStoredFloat("floorHeight"));
  const [ceilingHeight, setCeilingHeight] = useState(() => getStoredFloat("ceilingHeight"));
  const [cameraProjection, setCameraProjection] = useState(() => getStoredFloat("cameraProjection"));
  const [showBoundaryBox, setShowBoundaryBox] = useState(() => getStoredBool("showBoundaryBox", false));
  const [magnetism, setMagnetism] = useState(() => getStoredFloat("magnetism"));
  const [seekAmount, setSeekAmount] = useState(() => getStoredFloat("seekAmount"));
  const [proximity, setProximity] = useState(() => getStoredFloat("proximity"));
  const [desperation, setDesperation] = useState(() => getStoredFloat("desperation"));
  const [despairAge, setDespairAge] = useState(() => getStoredFloat("despairAge"));
  const [maxMatings, setMaxMatings] = useState(() => getStoredFloat("maxMatings"));
  const [startColorMode, setStartColorMode] = useState<string>(() => getStoredString("startColorMode") || "complementary");
  const [flowerSize, setFlowerSize] = useState(() => getStoredFloat("flowerSize"));
  const [tideSpeed, setTideSpeed] = useState(() => getStoredFloat("tideSpeed"));
  const [tideColor, setTideColor] = useState(() => getStoredString("tideColor"));
  const [bgColor, setBgColor] = useState(() => getStoredString("bgColor"));
  const [fogColor, setFogColor] = useState(() => getStoredString("fogColor"));
  const [tideThickness, setTideThickness] = useState(() => getStoredFloat("tideThickness"));
  const [tideOpacity, setTideOpacity] = useState(() => getStoredFloat("tideOpacity"));
  const [tideSaturation, setTideSaturation] = useState(() => getStoredFloat("tideSaturation"));
  const [growthSpeed, setGrowthSpeed] = useState(() => getStoredFloat("growthSpeed"));
  const [widthGrowthEffect, setWidthGrowthEffect] = useState(() => getStoredFloat("widthGrowthEffect", 0.0));
  const [diebackRate, setDiebackRate] = useState(() => getStoredFloat("diebackRate"));
  const [allowBreeding, setAllowBreeding] = useState(() => getStoredBool("allowBreeding"));
  const [hybridCooldown, setHybridCooldown] = useState(() => getStoredFloat("hybridCooldown"));
  const [hybridStickiness, setHybridStickiness] = useState(() => getStoredFloat("hybridStickiness"));
  const [hybridSpinSpeed, setHybridSpinSpeed] = useState(() => getStoredFloat("hybridSpinSpeed"));
  const [branchTendencyVar, setBranchTendencyVar] = useState(() => getStoredFloat("branchTendencyVar"));
  const [ornamentFrequency, setOrnamentFrequency] = useState(() => getStoredFloat("ornamentFrequency"));
  const [branchingMultiplier, setBranchingMultiplier] = useState(() => getStoredFloat("branchingMultiplier"));
  const [branchBigger, setBranchBigger] = useState(() => getStoredFloat("branchBigger"));
  const [branchSplitSizeProb, setBranchSplitSizeProb] = useState(() => getStoredFloat("branchSplitSizeProb"));
  const [maxDOMs, setMaxDOMs] = useState(() => getStoredFloat("maxDOMs"));
  const [maxAgents, setMaxAgents] = useState(() => getStoredFloat("maxAgents"));
  const [maxSpecies, setMaxSpecies] = useState(() => getStoredFloat("maxSpecies"));
  const [ecoFade, setEcoFade] = useState(() => getStoredFloat("ecoFade"));
  const [desiccationSpeed, setDesiccationSpeed] = useState(() => getStoredFloat("desiccationSpeed"));
  const [minAgents, setMinAgents] = useState(() => getStoredFloat("minAgents"));
  const [boundarySize, setBoundarySize] = useState(() => getStoredFloat("boundarySize"));
  const [boundarySquash, setBoundarySquash] = useState(() => getStoredFloat("boundarySquash", 1.0));
  const [hybridSize, setHybridSize] = useState(() => getStoredFloat("hybridSize"));
  const [terminationProb, setTerminationProb] = useState(() => getStoredFloat("terminationProb"));
  const [termProbPostBranch, setTermProbPostBranch] = useState(() => getStoredFloat("termProbPostBranch"));
  const [segmentGap, setSegmentGap] = useState(() => getStoredFloat("segmentGap", 0.12));
  const [taperDuration, setTaperDuration] = useState(() => getStoredFloat("taperDuration"));
  const [diebackAgeBias, setDiebackAgeBias] = useState(() => getStoredFloat("diebackAgeBias"));
  const [enableGlow, setEnableGlow] = useState(() => getStoredBool("enableGlow"));
  const [glowSize, setGlowSize] = useState(() => getStoredFloat("glowSize"));
  const [fogVisibility, setFogVisibility] = useState(() => getStoredFloat("fogVisibility", 800));
  const [botanyRealism, setBotanyRealism] = useState(() => getStoredBool("botanyRealism"));
  const [windVelocity, setWindVelocity] = useState(() => getStoredFloat("windVelocity"));
  const [flutterIntensity, setFlutterIntensity] = useState(() => getStoredFloat("flutterIntensity"));
  const [leafScale, setLeafScale] = useState(() => getStoredFloat("leafScale"));
  const [leafDensity, setLeafDensity] = useState(() => getStoredFloat("leafDensity"));
  const [relativeLeafSizeDiff, setRelativeLeafSizeDiff] = useState(() => getStoredFloat("relativeLeafSizeDiff"));
  const [stemCurviness, setStemCurviness] = useState(() => getStoredFloat("stemCurviness"));
  const [veinStrength, setVeinStrength] = useState(() => getStoredFloat("veinStrength"));
  const [veinGlow, setVeinGlow] = useState(() => getStoredFloat("veinGlow"));
  const [leafGrowthSpeed, setLeafGrowthSpeed] = useState(() => getStoredFloat("leafGrowthSpeed"));
  const [phyllotaxisAngle, setPhyllotaxisAngle] = useState(() => getStoredFloat("phyllotaxisAngle"));
  const [leafProbability, setLeafProbability] = useState(() => getStoredFloat("leafProbability"));
  const [appendageSpawnRate, setAppendageSpawnRate] = useState(() => getStoredFloat("appendageSpawnRate"));
  const [glowProbability, setGlowProbability] = useState(() => getStoredFloat("glowProbability"));
  const [kioskMode, setKioskMode] = useState(() => getStoredBool("kioskMode", true));
  const [maxLineWidth, setMaxLineWidth] = useState(() => getStoredFloat("maxLineWidth"));
  const [globalPulseSpeed, setGlobalPulseSpeed] = useState(() => getStoredFloat("globalPulseSpeed"));
  const [multicolorAppProb, setMulticolorAppProb] = useState(() => getStoredFloat("multicolorAppProb"));
  const [sameColorAppProb, setSameColorAppProb] = useState(() => getStoredFloat("sameColorAppProb"));
  const [maxSaturation, setMaxSaturation] = useState(() => getStoredFloat("maxSaturation"));
  const [colorClamp, setColorClamp] = useState(() => getStoredFloat("colorClamp", 0.75));
  const [feelerFade, setFeelerFade] = useState(() => getStoredFloat("feelerFade"));
  const [cullRate, setCullRate] = useState(() => getStoredFloat("cullRate"));
  const [glowTraitIntensity, setGlowTraitIntensity] = useState(() => getStoredFloat("glowTraitIntensity"));
  const [glowTraitDistance, setGlowTraitDistance] = useState(() => getStoredFloat("glowTraitDistance"));
  const [glowTraitReflect, setGlowTraitReflect] = useState(() => getStoredFloat("glowTraitReflect"));
  const [traitProbs, setTraitProbs] = useState<Record<string, number>>(() => getStoredTraitProbs());

  useEffect(() => {
    localStorage.setItem("snakeSpeed", snakeSpeed.toString());
    localStorage.setItem("snakeStepSize", snakeStepSize.toString());
    localStorage.setItem("snakeWander", snakeWander.toString());
    localStorage.setItem("bushSpeed", bushSpeed.toString());
    localStorage.setItem("treeSpeed", treeSpeed.toString());
    localStorage.setItem("rhizomeSpeed", rhizomeSpeed.toString());
    localStorage.setItem("bushStepSize", bushStepSize.toString());
    localStorage.setItem("treeStepSize", treeStepSize.toString());
    localStorage.setItem("rhizomeStepSize", rhizomeStepSize.toString());
    localStorage.setItem("bushBranching", bushBranching.toString());
    localStorage.setItem("treeBranching", treeBranching.toString());
    localStorage.setItem("snakeBranching", snakeBranching.toString());
    localStorage.setItem("rhizomeBranching", rhizomeBranching.toString());
    localStorage.setItem("bushMinBranches", bushMinBranches.toString());
    localStorage.setItem("rhizomeMinBranches", rhizomeMinBranches.toString());
    localStorage.setItem("treeMinBranches", treeMinBranches.toString());
    localStorage.setItem("snakeMinBranches", snakeMinBranches.toString());
    localStorage.setItem("widthVariance", widthVariance.toString());
    localStorage.setItem("branchGrowthBoost", branchGrowthBoost.toString());
    localStorage.setItem("colorMutationShift", colorMutationShift.toString());
    localStorage.setItem("timeScale", timeScale.toString());
    localStorage.setItem("slowMotion", timeScale.toString());
    localStorage.setItem("postMatingDieoff", postMatingDieoff.toString());
    localStorage.setItem("themeMorphFreq", themeMorphFreq.toString());
    localStorage.setItem("themeMorphSpeed", themeMorphSpeed.toString());
    localStorage.setItem("rotationSpeed", rotationSpeed.toString());
    localStorage.setItem("rotationSpeedY", rotationSpeedY.toString());
    localStorage.setItem("magnetism", magnetism.toString());
    localStorage.setItem("seekAmount", seekAmount.toString());
    localStorage.setItem("proximity", proximity.toString());
    localStorage.setItem("desperation", desperation.toString());
    localStorage.setItem("despairAge", despairAge.toString());
    localStorage.setItem("maxMatings", maxMatings.toString());
    localStorage.setItem("startColorMode", startColorMode);
    localStorage.setItem("flowerSize", flowerSize.toString());
    localStorage.setItem("tideSpeed", tideSpeed.toString());
    localStorage.setItem("tideColor", tideColor);
    localStorage.setItem("bgColor", bgColor);
    localStorage.setItem("tideThickness", tideThickness.toString());
    localStorage.setItem("tideOpacity", tideOpacity.toString());
    localStorage.setItem("tideSaturation", tideSaturation.toString());
    localStorage.setItem("growthSpeed", growthSpeed.toString());
    localStorage.setItem("widthGrowthEffect", widthGrowthEffect.toString());
    localStorage.setItem("diebackRate", diebackRate.toString());
    localStorage.setItem("allowBreeding", allowBreeding.toString());
    localStorage.setItem("hybridCooldown", hybridCooldown.toString());
    localStorage.setItem("hybridStickiness", hybridStickiness.toString());
    localStorage.setItem("hybridSpinSpeed", hybridSpinSpeed.toString());
    localStorage.setItem("branchTendencyVar", branchTendencyVar.toString());
    localStorage.setItem("ornamentFrequency", ornamentFrequency.toString());
    localStorage.setItem("branchingMultiplier", branchingMultiplier.toString());
    localStorage.setItem("branchBigger", branchBigger.toString());
    localStorage.setItem("branchSplitSizeProb", branchSplitSizeProb.toString());
    localStorage.setItem("maxDOMs", maxDOMs.toString());
    localStorage.setItem("maxAgents", maxAgents.toString());
    localStorage.setItem("maxSpecies", maxSpecies.toString());
    localStorage.setItem("ecoFade", ecoFade.toString());
    localStorage.setItem("minAgents", minAgents.toString());
    localStorage.setItem("boundarySize", boundarySize.toString());
    localStorage.setItem("boundarySquash", boundarySquash.toString());
    localStorage.setItem("desiccationSpeed", desiccationSpeed.toString());
    localStorage.setItem("hybridSize", hybridSize.toString());
    localStorage.setItem("terminationProb", terminationProb.toString());
    localStorage.setItem("termProbPostBranch", termProbPostBranch.toString());
    localStorage.setItem("segmentGap", segmentGap.toString());
    localStorage.setItem("taperDuration", taperDuration.toString());
    localStorage.setItem("diebackAgeBias", diebackAgeBias.toString());
    localStorage.setItem("kioskMode", kioskMode.toString());
    localStorage.setItem("enableGlow", enableGlow.toString());
    localStorage.setItem("glowSize", glowSize.toString());
    localStorage.setItem("fogVisibility", fogVisibility.toString());
    localStorage.setItem("botanyRealism", botanyRealism.toString());
    localStorage.setItem("windVelocity", windVelocity.toString());
    localStorage.setItem("flutterIntensity", flutterIntensity.toString());
    localStorage.setItem("leafScale", leafScale.toString());
    localStorage.setItem("leafDensity", leafDensity.toString());
    localStorage.setItem("relativeLeafSizeDiff", relativeLeafSizeDiff.toString());
    localStorage.setItem("leafGrowthSpeed", leafGrowthSpeed.toString());
    localStorage.setItem("phyllotaxisAngle", phyllotaxisAngle.toString());
    localStorage.setItem("leafProbability", leafProbability.toString());
    localStorage.setItem("appendageSpawnRate", appendageSpawnRate.toString());
    localStorage.setItem("glowProbability", glowProbability.toString());
    localStorage.setItem("stemCurviness", stemCurviness.toString());
    localStorage.setItem("veinStrength", veinStrength.toString());
    localStorage.setItem("veinGlow", veinGlow.toString());
    localStorage.setItem("fogColor", fogColor);
    localStorage.setItem("maxLineWidth", maxLineWidth.toString());
    localStorage.setItem("globalPulseSpeed", globalPulseSpeed.toString());
    localStorage.setItem("multicolorAppProb", multicolorAppProb.toString());
    localStorage.setItem("sameColorAppProb", sameColorAppProb.toString());
    localStorage.setItem("maxSaturation", maxSaturation.toString());
    localStorage.setItem("colorClamp", colorClamp.toString());
    localStorage.setItem("feelerFade", feelerFade.toString());
    localStorage.setItem("cullRate", cullRate.toString());
    localStorage.setItem("glowTraitIntensity", glowTraitIntensity.toString());
    localStorage.setItem("glowTraitDistance", glowTraitDistance.toString());
    localStorage.setItem("glowTraitReflect", glowTraitReflect.toString());
    localStorage.setItem("traitProbs", JSON.stringify(traitProbs));
    localStorage.setItem("dialLimits", JSON.stringify(dialLimits));
  }, [
    rotationSpeed,
    rotationSpeedY,
    magnetism,
    seekAmount,
    proximity,
    desperation,
    despairAge,
    maxMatings,
    startColorMode,
    flowerSize,
    tideSpeed,
    tideColor,
    bgColor,
    fogColor,
    tideThickness,
    tideOpacity,
    tideSaturation,
    growthSpeed,
    widthGrowthEffect,
    diebackRate,
    hybridCooldown,
    hybridStickiness,
    hybridSpinSpeed,
    branchTendencyVar,
    ornamentFrequency,
    branchingMultiplier,
    branchBigger,
    branchSplitSizeProb,
    maxDOMs,
    maxAgents,
    maxSpecies,
    ecoFade,
    minAgents,
    boundarySize,
    boundarySquash,
    desiccationSpeed,
    enableGlow,
    glowSize,
    fogVisibility,
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
    traitProbs,
    dialLimits,
    hybridSize,
    terminationProb,
    termProbPostBranch,
    segmentGap,
    taperDuration,
    diebackAgeBias,
    maxLineWidth,
    globalPulseSpeed,
    multicolorAppProb,
    sameColorAppProb,
    maxSaturation,
    feelerFade,
    cullRate,
    glowTraitIntensity,
    glowTraitDistance,
    glowTraitReflect,
    dialLimits,
  ]);

  return {
    state: {
      kioskMode,
      themeMorphSpeed,
      themeMorphFreq,
      theme,
      timeScale,
      postMatingDieoff,
      rhizomeSpeed,
      treeSpeed,
      bushSpeed,
      bushStepSize,
      treeStepSize,
      rhizomeStepSize,
      bushBranching,
      widthVariance,
      branchGrowthBoost,
      colorMutationShift,
      treeBranching,
      snakeBranching,
      rhizomeBranching,
      bushMinBranches,
      rhizomeMinBranches,
      treeMinBranches,
      snakeMinBranches,
      snakeWander,
      snakeStepSize,
      snakeSpeed,
      rotationSpeed,
      rotationSpeedY,
      magnetism,
      seekAmount,
      proximity,
      desperation,
      despairAge,
      maxMatings,
      startColorMode,
      flowerSize,
      tideSpeed,
      tideColor,
      bgColor,
      fogColor,
      tideThickness,
      tideOpacity,
      tideSaturation,
      growthSpeed,
      widthGrowthEffect,
      diebackRate,
      allowBreeding,
      hybridCooldown,
      hybridStickiness,
      hybridSpinSpeed,
      branchTendencyVar,
      ornamentFrequency,
      branchingMultiplier,
      branchBigger,
      branchSplitSizeProb,
      maxDOMs,
      maxAgents,
      maxSpecies,
      ecoFade,
      minAgents,
      boundarySize,
      boundarySquash,
      desiccationSpeed,
      hybridSize,
      terminationProb,
      termProbPostBranch,
      segmentGap,
      taperDuration,
      diebackAgeBias,
      enableGlow,
      glowSize,
      fogVisibility,
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
      traitProbs,
      maxLineWidth,
      globalPulseSpeed,
      multicolorAppProb,
      sameColorAppProb,
      maxSaturation,
      colorClamp,
      gridHeight,
      layerGap,
      floorHeight,
      ceilingHeight,
      cameraProjection,
      showBoundaryBox,
      feelerFade,
      cullRate,
      glowTraitIntensity,
      glowTraitDistance,
      glowTraitReflect,
      dialLimits,
      version: DEFAULTS.version || "0.3.1",
    },
    setters: {
      setThemeMorphSpeed,
      setThemeMorphFreq,
      setTheme,
      setTimeScale,
      setRhizomeSpeed,
      setTreeSpeed,
      setBushSpeed,
      setBushStepSize,
      setTreeStepSize,
      setRhizomeStepSize,
      setBushBranching,
      setWidthVariance,
      setBranchGrowthBoost,
      setColorMutationShift,
      setTreeBranching,
      setSnakeBranching,
      setRhizomeBranching,
      setSnakeWander,
      setSnakeStepSize,
      setSnakeSpeed,
      setRotationSpeed,
      setRotationSpeedY,
      setMagnetism,
      setSeekAmount,
      setProximity,
      setDesperation,
      setDespairAge,
      setMaxMatings,
      setStartColorMode,
      setFlowerSize: (v: number) => {
        setFlowerSize(v);
        setLeafScale(v);
      },
      setTideSpeed,
      setTideColor,
      setBgColor,
      setFogColor,
      setTideThickness,
      setTideOpacity,
      setTideSaturation,
      setGrowthSpeed,
      setWidthGrowthEffect,
      setDiebackRate,
      setAllowBreeding,
      setHybridCooldown,
      setHybridStickiness,
      setBranchTendencyVar,
      setOrnamentFrequency,
      setBranchingMultiplier,
      setBranchBigger,
      setBranchSplitSizeProb,
      setBushMinBranches,
      setRhizomeMinBranches,
      setTreeMinBranches,
      setSnakeMinBranches,
      setMaxDOMs,
      setMaxAgents,
      setMaxSpecies,
      setEcoFade,
      setMinAgents,
      setBoundarySize,
      setBoundarySquash,
      setDesiccationSpeed,
      setHybridSize,
      setHybridSpinSpeed,
      setTerminationProb,
      setTermProbPostBranch,
      setSegmentGap,
      setTaperDuration,
      setDiebackAgeBias,
      setEnableGlow,
      setGlowSize,
      setFogVisibility,
      setBotanyRealism,
      setWindVelocity,
      setFlutterIntensity,
      setLeafScale,
      setLeafDensity,
      setRelativeLeafSizeDiff,
      setStemCurviness,
      setVeinStrength,
      setVeinGlow,
      setLeafGrowthSpeed,
      setPhyllotaxisAngle,
      setLeafProbability,
      setAppendageSpawnRate,
      setGlowProbability,
      setTraitProbs,
      setMaxLineWidth,
      setGlobalPulseSpeed,
      setMulticolorAppProb,
      setSameColorAppProb,
      setPostMatingDieoff,
      setMaxSaturation,
      setColorClamp: (v: number) => {
        setColorClamp(v);
        setMaxSaturation(v);
      },
      setGridHeight,
      setLayerGap,
      setFloorHeight,
      setCeilingHeight,
      setCameraProjection,
      setShowBoundaryBox: (val: boolean) => {
        setShowBoundaryBox(val);
        localStorage.setItem("showBoundaryBox", val ? "true" : "false");
      },
      setFeelerFade,
      setCullRate,
      setGlowTraitIntensity,
      setGlowTraitDistance,
      setGlowTraitReflect,
      setKioskMode,
      setDialLimits,
      resetToDefaults: () => {
        try {
          localStorage.clear();
        } catch (e) {
          console.warn("Could not clear localStorage", e);
        }
        setKioskMode(DEFAULTS.kioskMode);
        setThemeMorphSpeed(DEFAULTS.themeMorphSpeed);
        setThemeMorphFreq(DEFAULTS.themeMorphFreq);
        setTheme(DEFAULTS.theme);
        setTimeScale(DEFAULTS.timeScale);
        setPostMatingDieoff(DEFAULTS.postMatingDieoff);
        setRhizomeSpeed(DEFAULTS.rhizomeSpeed);
        setTreeSpeed(DEFAULTS.treeSpeed);
        setBushSpeed(DEFAULTS.bushSpeed);
        setBushStepSize(DEFAULTS.bushStepSize);
        setTreeStepSize(DEFAULTS.treeStepSize);
        setRhizomeStepSize(DEFAULTS.rhizomeStepSize);
        setBushBranching(DEFAULTS.bushBranching);
        setWidthVariance(DEFAULTS.widthVariance);
        setBranchGrowthBoost(DEFAULTS.branchGrowthBoost);
        setColorMutationShift(DEFAULTS.colorMutationShift);
        setTreeBranching(DEFAULTS.treeBranching);
        setSnakeBranching(DEFAULTS.snakeBranching);
        setRhizomeBranching(DEFAULTS.rhizomeBranching);
        setBushMinBranches(DEFAULTS.bushMinBranches);
        setRhizomeMinBranches(DEFAULTS.rhizomeMinBranches);
        setTreeMinBranches(DEFAULTS.treeMinBranches);
        setSnakeMinBranches(DEFAULTS.snakeMinBranches);
        setSnakeWander(DEFAULTS.snakeWander);
        setSnakeStepSize(DEFAULTS.snakeStepSize);
        setSnakeSpeed(DEFAULTS.snakeSpeed);
        setRotationSpeed(DEFAULTS.rotationSpeed);
        setRotationSpeedY(DEFAULTS.rotationSpeedY);
        setMagnetism(DEFAULTS.magnetism);
        setSeekAmount(DEFAULTS.seekAmount);
        setProximity(DEFAULTS.proximity);
        setDesperation(DEFAULTS.desperation);
        setDespairAge(DEFAULTS.despairAge);
        setMaxMatings(DEFAULTS.maxMatings);
        setStartColorMode(DEFAULTS.startColorMode);
        setFlowerSize(DEFAULTS.flowerSize);
        setTideSpeed(DEFAULTS.tideSpeed);
        setTideColor(DEFAULTS.tideColor);
        setBgColor(DEFAULTS.bgColor);
        setFogColor(DEFAULTS.fogColor);
        setTideThickness(DEFAULTS.tideThickness);
        setTideOpacity(DEFAULTS.tideOpacity);
        setTideSaturation(DEFAULTS.tideSaturation);
        setGrowthSpeed(DEFAULTS.growthSpeed);
        setWidthGrowthEffect(DEFAULTS.widthGrowthEffect);
        setDiebackRate(DEFAULTS.diebackRate);
        setAllowBreeding(DEFAULTS.allowBreeding);
        setGridHeight(DEFAULTS.gridHeight);
        setLayerGap(DEFAULTS.layerGap);
        setFloorHeight(DEFAULTS.floorHeight);
        setCeilingHeight(DEFAULTS.ceilingHeight);
        setCameraProjection(DEFAULTS.cameraProjection);
        setShowBoundaryBox(DEFAULTS.showBoundaryBox);
        setMaxSaturation(DEFAULTS.maxSaturation);
        setColorClamp(DEFAULTS.colorClamp);
        setHybridCooldown(DEFAULTS.hybridCooldown);
        setHybridStickiness(DEFAULTS.hybridStickiness);
        setHybridSpinSpeed(DEFAULTS.hybridSpinSpeed);
        setBranchTendencyVar(DEFAULTS.branchTendencyVar);
        setOrnamentFrequency(DEFAULTS.ornamentFrequency);
        setBranchingMultiplier(DEFAULTS.branchingMultiplier);
        setBranchBigger(DEFAULTS.branchBigger);
        setBranchSplitSizeProb(DEFAULTS.branchSplitSizeProb);
        setMaxDOMs(DEFAULTS.maxDOMs);
        setMaxAgents(DEFAULTS.maxAgents);
        setMaxSpecies(DEFAULTS.maxSpecies);
        setEcoFade(DEFAULTS.ecoFade);
        setMinAgents(DEFAULTS.minAgents);
        setBoundarySize(DEFAULTS.boundarySize);
        setBoundarySquash(DEFAULTS.boundarySquash);
        setDesiccationSpeed(DEFAULTS.desiccationSpeed);
        setHybridSize(DEFAULTS.hybridSize);
        setTerminationProb(DEFAULTS.terminationProb);
        setTermProbPostBranch(DEFAULTS.termProbPostBranch);
        setSegmentGap(DEFAULTS.segmentGap);
        setTaperDuration(DEFAULTS.taperDuration);
        setDiebackAgeBias(DEFAULTS.diebackAgeBias);
        setEnableGlow(DEFAULTS.enableGlow);
        setGlowSize(DEFAULTS.glowSize);
        setFogVisibility(DEFAULTS.fogVisibility);
        setBotanyRealism(DEFAULTS.botanyRealism);
        setWindVelocity(DEFAULTS.windVelocity);
        setFlutterIntensity(DEFAULTS.flutterIntensity);
        setLeafScale(DEFAULTS.leafScale);
        setLeafDensity(DEFAULTS.leafDensity);
        setRelativeLeafSizeDiff(DEFAULTS.relativeLeafSizeDiff);
        setStemCurviness(DEFAULTS.stemCurviness);
        setVeinStrength(DEFAULTS.veinStrength);
        setVeinGlow(DEFAULTS.veinGlow);
        setLeafGrowthSpeed(DEFAULTS.leafGrowthSpeed);
        setPhyllotaxisAngle(DEFAULTS.phyllotaxisAngle);
        setLeafProbability(DEFAULTS.leafProbability);
        setAppendageSpawnRate(DEFAULTS.appendageSpawnRate);
        setGlowProbability(DEFAULTS.glowProbability);
        setTraitProbs(DEFAULTS.traitProbs);
        setMaxLineWidth(DEFAULTS.maxLineWidth);
        setGlobalPulseSpeed(DEFAULTS.globalPulseSpeed);
        setMulticolorAppProb(DEFAULTS.multicolorAppProb);
        setSameColorAppProb(DEFAULTS.sameColorAppProb);
        setFeelerFade(DEFAULTS.feelerFade);
        setCullRate(DEFAULTS.cullRate);
        setGlowTraitIntensity(DEFAULTS.glowTraitIntensity);
        setGlowTraitDistance(DEFAULTS.glowTraitDistance);
        setGlowTraitReflect(DEFAULTS.glowTraitReflect);
        setDialLimits(DEFAULTS.dialLimits);
      },
    },
  };
}
