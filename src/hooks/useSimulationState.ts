import { useState } from "react";
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
  getStoredSoundMixer,
  checkSchemaVersion,
} from "./SimulationDefaults";
import {
  useSimulationPersistence,
  resetSimulationToDefaults,
} from "./SimulationStatePersistence";
import { computeViewportBoundarySquash } from "../lib/SimulationBoundary";

export { DEFAULTS, DEFAULT_PALETTE, CURRENT_SCHEMA };

export function useSimulationState() {
  checkSchemaVersion();
  if (!localStorage.getItem("lifesim_wind_v9_ready")) {
    localStorage.setItem("shimmer", String(DEFAULTS.shimmer));
    localStorage.setItem("wavy", String(DEFAULTS.wavy));
    localStorage.setItem("branchMovement", String(DEFAULTS.branchMovement));
    localStorage.setItem("overallMovement", String(DEFAULTS.overallMovement));
    localStorage.setItem("movementLfoSpeed", String(DEFAULTS.movementLfoSpeed));
    localStorage.setItem("movementLfoDepth", String(DEFAULTS.movementLfoDepth));
    localStorage.setItem("movementLfoPeak", String(DEFAULTS.movementLfoPeak));
    localStorage.setItem("movementLfoRandom", String(DEFAULTS.movementLfoRandom));
    localStorage.setItem("minCreatures", String(DEFAULTS.minCreatures));
    localStorage.setItem("maxCreatures", String(DEFAULTS.maxCreatures));
    localStorage.setItem("showBoundaryBox", String(DEFAULTS.showBoundaryBox));
    localStorage.removeItem("dialLimits");
    localStorage.setItem("lifesim_wind_v9_ready", "true");
  }

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
  const [treeBranchDelay, setTreeBranchDelay] = useState(() => getStoredFloat("treeBranchDelay"));
  const [bushTaper, setBushTaper] = useState(() => getStoredFloat("bushTaper"));
  const [treeTaper, setTreeTaper] = useState(() => getStoredFloat("treeTaper"));
  const [rhizomeTaper, setRhizomeTaper] = useState(() => getStoredFloat("rhizomeTaper"));
  const [snakeBranching, setSnakeBranching] = useState(() => getStoredFloat("snakeBranching"));
  const [rhizomeBranching, setRhizomeBranching] = useState(() => getStoredFloat("rhizomeBranching"));
  const [bushMinBranches, setBushMinBranches] = useState(() => getStoredFloat("bushMinBranches"));
  const [rhizomeMinBranches, setRhizomeMinBranches] = useState(() => getStoredFloat("rhizomeMinBranches"));
  const [treeMinBranches, setTreeMinBranches] = useState(() => getStoredFloat("treeMinBranches"));
  const [snakeMinBranches, setSnakeMinBranches] = useState(() => getStoredFloat("snakeMinBranches"));
  const [timeScale, setTimeScale] = useState(() => getStoredTimeScale());
  const [postMatingDieoff, setPostMatingDieoff] = useState(() => getStoredBool("postMatingDieoff"));
  const [theme, setTheme] = useState(0); // Always start in normal theme
  const [themeMorphFreq, setThemeMorphFreq] = useState(() => getStoredFloat("themeMorphFreq"));
  const [themeMorphSpeed, setThemeMorphSpeed] = useState(() => getStoredFloat("themeMorphSpeed"));
  const [dialLimits, setDialLimits] = useState<Record<string, { min: number; max: number }>>(() => getStoredDialLimits());
  const [rotationSpeed, setRotationSpeed] = useState(() => getStoredFloat("rotationSpeed"));
  const [rotationSpeedY, setRotationSpeedY] = useState(() => getStoredFloat("rotationSpeedY"));
  const [gridHeight, setGridHeight] = useState(() => getStoredFloat("gridHeight"));
  const [layerGap, setLayerGap] = useState(() => getStoredFloat("layerGap"));
  const [floorHeight, setFloorHeight] = useState(() => getStoredFloat("floorHeight"));
  const [ceilingHeight, setCeilingHeight] = useState(() => getStoredFloat("ceilingHeight"));
  const [cameraProjection, setCameraProjection] = useState(() => getStoredFloat("cameraProjection"));
  const [showBoundaryBox, setShowBoundaryBox] = useState(() => getStoredBool("showBoundaryBox"));
  const [magnetism, setMagnetism] = useState(() => getStoredFloat("magnetism"));
  const [seekAmount, setSeekAmount] = useState(() => getStoredFloat("seekAmount"));
  const [proximity, setProximity] = useState(() => getStoredFloat("proximity"));
  const [desperation, setDesperation] = useState(() => getStoredFloat("desperation"));
  const [despairAge, setDespairAge] = useState(() => getStoredFloat("despairAge"));
  const [maxMatings, setMaxMatings] = useState(() => getStoredFloat("maxMatings"));
  const [startColorMode, setStartColorMode] = useState<string>(() => getStoredString("startColorMode"));
  const [flowerSize, setFlowerSize] = useState(() => getStoredFloat("flowerSize"));
  const [tideSpeed, setTideSpeed] = useState(() => getStoredFloat("tideSpeed"));
  const [tideColor, setTideColor] = useState(() => getStoredString("tideColor"));
  const [bgColor, setBgColor] = useState(() => getStoredString("bgColor"));
  const [fogColor, setFogColor] = useState(() => getStoredString("fogColor"));
  const [tideThickness, setTideThickness] = useState(() => getStoredFloat("tideThickness"));
  const [tideOpacity, setTideOpacity] = useState(() => getStoredFloat("tideOpacity"));
  const [tideSaturation, setTideSaturation] = useState(() => getStoredFloat("tideSaturation"));
  const [growthSpeed, setGrowthSpeed] = useState(() => getStoredFloat("growthSpeed"));
  const [widthGrowthEffect, setWidthGrowthEffect] = useState(() => getStoredFloat("widthGrowthEffect"));
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
  const [pruningStrength, setPruningStrength] = useState(() => getStoredFloat("pruningStrength"));
  const [maxBranchDepth, setMaxBranchDepth] = useState(() => getStoredFloat("maxBranchDepth"));
  const [maxBranchesPerSpecies, setMaxBranchesPerSpecies] = useState(() => getStoredFloat("maxBranchesPerSpecies"));
  const [maxDOMs, setMaxDOMs] = useState(() => getStoredFloat("maxDOMs"));
  const [maxAgents, setMaxAgents] = useState(() => getStoredFloat("maxAgents"));
  const [maxCreatures, setMaxCreatures] = useState(() => getStoredFloat("maxCreatures"));
  const [ecoFade, setEcoFade] = useState(() => getStoredFloat("ecoFade"));
  const [desiccationSpeed, setDesiccationSpeed] = useState(() => getStoredFloat("desiccationSpeed"));
  const [minCreatures, setMinCreatures] = useState(() => getStoredFloat("minCreatures"));
  const [boundarySize, setBoundarySize] = useState(() => getStoredFloat("boundarySize"));
  const [boundarySquash, setBoundarySquash] = useState(() =>
    computeViewportBoundarySquash(
      typeof window !== "undefined" ? window.innerWidth : 1280,
      typeof window !== "undefined" ? window.innerHeight : 800,
    ),
  );
  const [hybridSize, setHybridSize] = useState(() => getStoredFloat("hybridSize"));
  const [terminationProb, setTerminationProb] = useState(() => getStoredFloat("terminationProb"));
  const [termProbPostBranch, setTermProbPostBranch] = useState(() => getStoredFloat("termProbPostBranch"));
  const [segmentGap, setSegmentGap] = useState(() => getStoredFloat("segmentGap"));
  const [taperDuration, setTaperDuration] = useState(() => getStoredFloat("taperDuration"));
  const [diebackAgeBias, setDiebackAgeBias] = useState(() => getStoredFloat("diebackAgeBias"));
  const [enableGlow, setEnableGlow] = useState(() => getStoredBool("enableGlow"));
  const [glowSize, setGlowSize] = useState(() => getStoredFloat("glowSize"));
  const [fogVisibility, setFogVisibility] = useState(() => getStoredFloat("fogVisibility"));
  const [botanyRealism, setBotanyRealism] = useState(() => getStoredBool("botanyRealism"));
  const [windVelocity, setWindVelocity] = useState(() => getStoredFloat("windVelocity"));
  const [flutterIntensity, setFlutterIntensity] = useState(() => getStoredFloat("flutterIntensity"));
  const [shimmer, setShimmer] = useState(() => getStoredFloat("shimmer", DEFAULTS.shimmer));
  const [wavy, setWavy] = useState(() => getStoredFloat("wavy", DEFAULTS.wavy));
  const [branchMovement, setBranchMovement] = useState(() => getStoredFloat("branchMovement", DEFAULTS.branchMovement));
  const [overallMovement, setOverallMovement] = useState(() => getStoredFloat("overallMovement", DEFAULTS.overallMovement));
  const [movementLfoSpeed, setMovementLfoSpeed] = useState(() => getStoredFloat("movementLfoSpeed", DEFAULTS.movementLfoSpeed));
  const [movementLfoDepth, setMovementLfoDepth] = useState(() => getStoredFloat("movementLfoDepth", DEFAULTS.movementLfoDepth));
  const [movementLfoPeak, setMovementLfoPeak] = useState(() => getStoredFloat("movementLfoPeak", DEFAULTS.movementLfoPeak));
  const [movementLfoRandom, setMovementLfoRandom] = useState(() => getStoredFloat("movementLfoRandom", DEFAULTS.movementLfoRandom));
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
  const [feelerDelay, setFeelerDelay] = useState(() => getStoredFloat("feelerDelay", DEFAULTS.feelerDelay ?? 6.0));
  const [cullRate, setCullRate] = useState(() => getStoredFloat("cullRate"));
  const [glowTraitIntensity, setGlowTraitIntensity] = useState(() => getStoredFloat("glowTraitIntensity"));
  const [glowTraitDistance, setGlowTraitDistance] = useState(() => getStoredFloat("glowTraitDistance"));
  const [glowTraitReflect, setGlowTraitReflect] = useState(() => getStoredFloat("glowTraitReflect"));
  const [traitProbs, setTraitProbs] = useState<Record<string, number>>(() => getStoredTraitProbs());

  // Always start muted on every load/refresh; never persist soundEnabled across refreshes
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundVolume, setSoundVolume] = useState(() => getStoredFloat("soundVolume", DEFAULTS.soundVolume));
  const [soundSpace, setSoundSpace] = useState(() => getStoredFloat("soundSpace", DEFAULTS.soundSpace));
  const [soundEnvironment, setSoundEnvironment] = useState<string>(() => getStoredString("soundEnvironment") || DEFAULTS.soundEnvironment);
  const [soundAutoCycle, setSoundAutoCycle] = useState(() => getStoredBool("soundAutoCycle", DEFAULTS.soundAutoCycle));
  const [soundSyncThemes, setSoundSyncThemes] = useState(() => getStoredBool("soundSyncThemes", DEFAULTS.soundSyncThemes));
  const [soundMovement, setSoundMovement] = useState(() => getStoredBool("soundMovement", DEFAULTS.soundMovement));
  const [soundWeather, setSoundWeather] = useState(() => getStoredBool("soundWeather", DEFAULTS.soundWeather));
  const [soundMixer, setSoundMixer] = useState<Record<string, { vol: number; rev: number; oct?: number }>>(() => getStoredSoundMixer());
  const [soundReverbDecay, setSoundReverbDecay] = useState(() => getStoredFloat("soundReverbDecay", DEFAULTS.soundReverbDecay));
  const [soundReverbDamping, setSoundReverbDamping] = useState(() => getStoredFloat("soundReverbDamping", DEFAULTS.soundReverbDamping));
  const [soundReverbPreDelay, setSoundReverbPreDelay] = useState(() => getStoredFloat("soundReverbPreDelay", DEFAULTS.soundReverbPreDelay));
  const [soundStepCadence, setSoundStepCadence] = useState(() => getStoredFloat("soundStepCadence", DEFAULTS.soundStepCadence));

  const state = {
    soundEnabled,
    soundVolume,
    soundSpace,
    soundEnvironment,
    soundAutoCycle,
    soundSyncThemes,
    soundMovement,
    soundWeather,
    soundMixer,
    soundReverbDecay,
    soundReverbDamping,
    soundReverbPreDelay,
    soundStepCadence,
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
    treeBranchDelay,
    bushTaper,
    treeTaper,
    rhizomeTaper,
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
    pruningStrength,
    maxBranchDepth,
    maxBranchesPerSpecies,
    maxDOMs,
    maxAgents,
    maxCreatures,
    ecoFade,
    minCreatures,
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
    shimmer,
    wavy,
    branchMovement,
    overallMovement,
    movementLfoSpeed,
    movementLfoDepth,
    movementLfoPeak,
    movementLfoRandom,
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
    feelerDelay,
    cullRate,
    glowTraitIntensity,
    glowTraitDistance,
    glowTraitReflect,
    dialLimits,
    version: DEFAULTS.version || "0.3.1",
  };

  useSimulationPersistence(state);

  const setters: Record<string, any> = {
    setSoundEnabled,
    setSoundVolume,
    setSoundSpace,
    setSoundEnvironment,
    setSoundAutoCycle,
    setSoundSyncThemes,
    setSoundMovement,
    setSoundWeather,
    setSoundMixer,
    setSoundReverbDecay,
    setSoundReverbDamping,
    setSoundReverbPreDelay,
    setSoundStepCadence,
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
    setTreeBranchDelay,
    setBushTaper,
    setTreeTaper,
    setRhizomeTaper,
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
    setFlowerSize: (v: number) => { setFlowerSize(v); setLeafScale(v); },
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
    setPruningStrength,
    setMaxBranchDepth,
    setMaxBranchesPerSpecies,
    setBushMinBranches,
    setRhizomeMinBranches,
    setTreeMinBranches,
    setSnakeMinBranches,
    setMaxDOMs,
    setMaxAgents,
    setMaxCreatures,
    setEcoFade,
    setMinCreatures,
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
    setShimmer: (v: number) => {
      setShimmer(v);
      if (v > 0.001 && overallMovement <= 0.001) setOverallMovement(DEFAULTS.overallMovement);
    },
    setWavy: (v: number) => {
      setWavy(v);
      if (v > 0.001 && overallMovement <= 0.001) setOverallMovement(DEFAULTS.overallMovement);
    },
    setBranchMovement: (v: number) => {
      setBranchMovement(v);
      if (v > 0.001 && overallMovement <= 0.001) setOverallMovement(DEFAULTS.overallMovement);
    },
    setOverallMovement: (v: number) => {
      setOverallMovement(v);
      if (v > 0.001 && shimmer <= 0.001 && wavy <= 0.001 && branchMovement <= 0.001) {
        setShimmer(DEFAULTS.shimmer);
        setWavy(DEFAULTS.wavy);
        setBranchMovement(DEFAULTS.branchMovement);
      }
    },
    setMovementLfoSpeed,
    setMovementLfoDepth,
    setMovementLfoPeak,
    setMovementLfoRandom,
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
    setColorClamp: (v: number) => { setColorClamp(v); setMaxSaturation(v); },
    setGridHeight,
    setLayerGap,
    setFloorHeight,
    setCeilingHeight,
    setCameraProjection,
    setShowBoundaryBox: (val: boolean) => { setShowBoundaryBox(val); localStorage.setItem("showBoundaryBox", val ? "true" : "false"); },
    setFeelerFade,
    setFeelerDelay,
    setCullRate,
    setGlowTraitIntensity,
    setGlowTraitDistance,
    setGlowTraitReflect,
    setKioskMode,
    setDialLimits,
    resetToDefaults: () => resetSimulationToDefaults(setters),
  };

  return { state, setters };
}
