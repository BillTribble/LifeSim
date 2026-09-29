import { useEffect } from "react";
import { DEFAULTS } from "./SimulationDefaults";

export function useSimulationPersistence(state: Record<string, any>) {
  useEffect(() => {
    try {
      localStorage.removeItem("soundEnabled");
      localStorage.setItem("soundVolume", state.soundVolume.toString());
      localStorage.setItem("soundSpace", state.soundSpace.toString());
      localStorage.setItem("soundEnvironment", state.soundEnvironment);
      localStorage.setItem("soundAutoCycle", state.soundAutoCycle.toString());
      localStorage.setItem("soundSyncThemes", state.soundSyncThemes.toString());
      localStorage.setItem("soundMovement", state.soundMovement.toString());
      localStorage.setItem("soundWeather", state.soundWeather.toString());
      localStorage.setItem("soundMixer", JSON.stringify(state.soundMixer));
      localStorage.setItem("soundReverbDecay", state.soundReverbDecay.toString());
      localStorage.setItem("soundReverbDamping", state.soundReverbDamping.toString());
      localStorage.setItem("soundReverbPreDelay", state.soundReverbPreDelay.toString());
      localStorage.setItem("soundStepCadence", state.soundStepCadence.toString());
      localStorage.setItem("snakeSpeed", state.snakeSpeed.toString());
      localStorage.setItem("snakeStepSize", state.snakeStepSize.toString());
      localStorage.setItem("snakeWander", state.snakeWander.toString());
      localStorage.setItem("bushSpeed", state.bushSpeed.toString());
      localStorage.setItem("treeSpeed", state.treeSpeed.toString());
      localStorage.setItem("rhizomeSpeed", state.rhizomeSpeed.toString());
      localStorage.setItem("bushStepSize", state.bushStepSize.toString());
      localStorage.setItem("treeStepSize", state.treeStepSize.toString());
      localStorage.setItem("rhizomeStepSize", state.rhizomeStepSize.toString());
      localStorage.setItem("bushBranching", state.bushBranching.toString());
      localStorage.setItem("treeBranching", state.treeBranching.toString());
      localStorage.setItem("treeBranchDelay", state.treeBranchDelay.toString());
      localStorage.setItem("bushTaper", state.bushTaper.toString());
      localStorage.setItem("treeTaper", state.treeTaper.toString());
      localStorage.setItem("rhizomeTaper", state.rhizomeTaper.toString());
      localStorage.setItem("snakeBranching", state.snakeBranching.toString());
      localStorage.setItem("rhizomeBranching", state.rhizomeBranching.toString());
      localStorage.setItem("bushMinBranches", state.bushMinBranches.toString());
      localStorage.setItem("rhizomeMinBranches", state.rhizomeMinBranches.toString());
      localStorage.setItem("treeMinBranches", state.treeMinBranches.toString());
      localStorage.setItem("snakeMinBranches", state.snakeMinBranches.toString());
      localStorage.setItem("widthVariance", state.widthVariance.toString());
      localStorage.setItem("branchGrowthBoost", state.branchGrowthBoost.toString());
      localStorage.setItem("colorMutationShift", state.colorMutationShift.toString());
      localStorage.setItem("speed", state.timeScale.toString());
      localStorage.setItem("timeScale", state.timeScale.toString());
      localStorage.setItem("slowMotion", state.timeScale.toString());
      localStorage.setItem("postMatingDieoff", state.postMatingDieoff.toString());
      localStorage.setItem("themeMorphFreq", state.themeMorphFreq.toString());
      localStorage.setItem("themeMorphSpeed", state.themeMorphSpeed.toString());
      localStorage.setItem("rotationSpeed", state.rotationSpeed.toString());
      localStorage.setItem("rotationSpeedY", state.rotationSpeedY.toString());
      localStorage.setItem("magnetism", state.magnetism.toString());
      localStorage.setItem("seekAmount", state.seekAmount.toString());
      localStorage.setItem("proximity", state.proximity.toString());
      localStorage.setItem("desperation", state.desperation.toString());
      localStorage.setItem("despairAge", state.despairAge.toString());
      localStorage.setItem("maxMatings", state.maxMatings.toString());
      localStorage.setItem("startColorMode", state.startColorMode);
      localStorage.setItem("flowerSize", state.flowerSize.toString());
      localStorage.setItem("tideSpeed", state.tideSpeed.toString());
      localStorage.setItem("tideColor", state.tideColor);
      localStorage.setItem("bgColor", state.bgColor);
      localStorage.setItem("tideThickness", state.tideThickness.toString());
      localStorage.setItem("tideOpacity", state.tideOpacity.toString());
      localStorage.setItem("tideSaturation", state.tideSaturation.toString());
      localStorage.setItem("growthSpeed", state.growthSpeed.toString());
      localStorage.setItem("widthGrowthEffect", state.widthGrowthEffect.toString());
      localStorage.setItem("diebackRate", state.diebackRate.toString());
      localStorage.setItem("allowBreeding", state.allowBreeding.toString());
      localStorage.setItem("hybridCooldown", state.hybridCooldown.toString());
      localStorage.setItem("hybridStickiness", state.hybridStickiness.toString());
      localStorage.setItem("hybridSpinSpeed", state.hybridSpinSpeed.toString());
      localStorage.setItem("branchTendencyVar", state.branchTendencyVar.toString());
      localStorage.setItem("ornamentFrequency", state.ornamentFrequency.toString());
      localStorage.setItem("branchingMultiplier", state.branchingMultiplier.toString());
      localStorage.setItem("branchBigger", state.branchBigger.toString());
      localStorage.setItem("branchSplitSizeProb", state.branchSplitSizeProb.toString());
      localStorage.setItem("pruningStrength", state.pruningStrength.toString());
      localStorage.setItem("maxBranchDepth", state.maxBranchDepth.toString());
      localStorage.setItem("maxBranchesPerSpecies", state.maxBranchesPerSpecies.toString());
      localStorage.setItem("maxDOMs", state.maxDOMs.toString());
      localStorage.setItem("maxAgents", state.maxAgents.toString());
      localStorage.setItem("maxCreatures", state.maxCreatures.toString());
      localStorage.setItem("ecoFade", state.ecoFade.toString());
      localStorage.setItem("minCreatures", state.minCreatures.toString());
      localStorage.setItem("boundarySize", state.boundarySize.toString());
      localStorage.setItem("boundarySquash", state.boundarySquash.toString());
      localStorage.setItem("desiccationSpeed", state.desiccationSpeed.toString());
      localStorage.setItem("hybridSize", state.hybridSize.toString());
      localStorage.setItem("terminationProb", state.terminationProb.toString());
      localStorage.setItem("termProbPostBranch", state.termProbPostBranch.toString());
      localStorage.setItem("segmentGap", state.segmentGap.toString());
      localStorage.setItem("taperDuration", state.taperDuration.toString());
      localStorage.setItem("diebackAgeBias", state.diebackAgeBias.toString());
      localStorage.setItem("kioskMode", state.kioskMode.toString());
      localStorage.setItem("enableGlow", state.enableGlow.toString());
      localStorage.setItem("glowSize", state.glowSize.toString());
      localStorage.setItem("fogVisibility", state.fogVisibility.toString());
      localStorage.setItem("botanyRealism", state.botanyRealism.toString());
      localStorage.setItem("windVelocity", state.windVelocity.toString());
      localStorage.setItem("flutterIntensity", state.flutterIntensity.toString());
      localStorage.setItem("shimmer", state.shimmer.toString());
      localStorage.setItem("wavy", state.wavy.toString());
      localStorage.setItem("branchMovement", state.branchMovement.toString());
      localStorage.setItem("overallMovement", state.overallMovement.toString());
      localStorage.setItem("movementLfoSpeed", state.movementLfoSpeed.toString());
      localStorage.setItem("movementLfoDepth", state.movementLfoDepth.toString());
      localStorage.setItem("movementLfoRandom", state.movementLfoRandom.toString());
      localStorage.setItem("leafScale", state.leafScale.toString());
      localStorage.setItem("leafDensity", state.leafDensity.toString());
      localStorage.setItem("relativeLeafSizeDiff", state.relativeLeafSizeDiff.toString());
      localStorage.setItem("leafGrowthSpeed", state.leafGrowthSpeed.toString());
      localStorage.setItem("phyllotaxisAngle", state.phyllotaxisAngle.toString());
      localStorage.setItem("leafProbability", state.leafProbability.toString());
      localStorage.setItem("appendageSpawnRate", state.appendageSpawnRate.toString());
      localStorage.setItem("glowProbability", state.glowProbability.toString());
      localStorage.setItem("stemCurviness", state.stemCurviness.toString());
      localStorage.setItem("veinStrength", state.veinStrength.toString());
      localStorage.setItem("veinGlow", state.veinGlow.toString());
      localStorage.setItem("fogColor", state.fogColor);
      localStorage.setItem("maxLineWidth", state.maxLineWidth.toString());
      localStorage.setItem("globalPulseSpeed", state.globalPulseSpeed.toString());
      localStorage.setItem("multicolorAppProb", state.multicolorAppProb.toString());
      localStorage.setItem("sameColorAppProb", state.sameColorAppProb.toString());
      localStorage.setItem("maxSaturation", state.maxSaturation.toString());
      localStorage.setItem("colorClamp", state.colorClamp.toString());
      localStorage.setItem("feelerFade", state.feelerFade.toString());
      localStorage.setItem("feelerDelay", state.feelerDelay.toString());
      localStorage.setItem("gridHeight", state.gridHeight.toString());
      localStorage.setItem("layerGap", state.layerGap.toString());
      localStorage.setItem("floorHeight", state.floorHeight.toString());
      localStorage.setItem("ceilingHeight", state.ceilingHeight.toString());
      localStorage.setItem("cameraProjection", state.cameraProjection.toString());
      localStorage.setItem("showBoundaryBox", state.showBoundaryBox ? "true" : "false");
      localStorage.setItem("cullRate", state.cullRate.toString());
      localStorage.setItem("glowTraitIntensity", state.glowTraitIntensity.toString());
      localStorage.setItem("glowTraitDistance", state.glowTraitDistance.toString());
      localStorage.setItem("glowTraitReflect", state.glowTraitReflect.toString());
      localStorage.setItem("traitProbs", JSON.stringify(state.traitProbs));
      localStorage.setItem("dialLimits", JSON.stringify(state.dialLimits));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }, [
    state.soundEnabled, state.soundVolume, state.soundSpace, state.soundEnvironment,
    state.soundAutoCycle, state.soundSyncThemes, state.soundMovement, state.soundWeather,
    state.soundMixer, state.soundReverbDecay, state.soundReverbDamping, state.soundReverbPreDelay,
    state.soundStepCadence, state.snakeSpeed, state.snakeStepSize, state.snakeWander,
    state.bushSpeed, state.treeSpeed, state.rhizomeSpeed, state.bushStepSize,
    state.treeStepSize, state.rhizomeStepSize, state.bushBranching, state.treeBranching,
    state.treeBranchDelay, state.bushTaper, state.treeTaper, state.rhizomeTaper,
    state.snakeBranching, state.rhizomeBranching, state.bushMinBranches, state.rhizomeMinBranches,
    state.treeMinBranches, state.snakeMinBranches, state.widthVariance, state.branchGrowthBoost,
    state.colorMutationShift, state.timeScale, state.postMatingDieoff, state.themeMorphFreq,
    state.themeMorphSpeed, state.rotationSpeed, state.rotationSpeedY, state.magnetism,
    state.seekAmount, state.proximity, state.desperation, state.despairAge, state.maxMatings,
    state.startColorMode, state.flowerSize, state.tideSpeed, state.tideColor, state.bgColor,
    state.tideThickness, state.tideOpacity, state.tideSaturation, state.growthSpeed,
    state.widthGrowthEffect, state.diebackRate, state.allowBreeding, state.hybridCooldown,
    state.hybridStickiness, state.hybridSpinSpeed, state.branchTendencyVar, state.ornamentFrequency,
    state.branchingMultiplier, state.branchBigger, state.branchSplitSizeProb, state.pruningStrength,
    state.maxBranchDepth, state.maxBranchesPerSpecies, state.maxDOMs, state.maxAgents,
    state.maxCreatures, state.ecoFade, state.minCreatures, state.boundarySize,
    state.boundarySquash, state.desiccationSpeed, state.enableGlow, state.glowSize,
    state.fogVisibility, state.botanyRealism, state.windVelocity, state.flutterIntensity,
    state.shimmer, state.wavy, state.branchMovement, state.overallMovement,
    state.movementLfoSpeed, state.movementLfoDepth, state.movementLfoRandom,
    state.leafScale, state.leafDensity, state.relativeLeafSizeDiff, state.leafGrowthSpeed,
    state.phyllotaxisAngle, state.leafProbability, state.appendageSpawnRate, state.glowProbability,
    state.stemCurviness, state.veinStrength, state.veinGlow, state.traitProbs, state.dialLimits,
    state.hybridSize, state.terminationProb, state.termProbPostBranch, state.segmentGap,
    state.taperDuration, state.diebackAgeBias, state.maxLineWidth, state.globalPulseSpeed,
    state.multicolorAppProb, state.sameColorAppProb, state.maxSaturation, state.colorClamp,
    state.feelerFade, state.feelerDelay, state.cullRate, state.glowTraitIntensity,
    state.glowTraitDistance, state.glowTraitReflect, state.gridHeight, state.layerGap,
    state.floorHeight, state.ceilingHeight, state.cameraProjection, state.showBoundaryBox,
    state.kioskMode,
  ]);
}

export function resetSimulationToDefaults(setters: Record<string, any>) {
  try {
    localStorage.clear();
  } catch (e) {
    console.warn("Could not clear localStorage", e);
  }
  setters.setKioskMode(DEFAULTS.kioskMode);
  setters.setSoundEnabled(DEFAULTS.soundEnabled);
  setters.setSoundVolume(DEFAULTS.soundVolume);
  setters.setSoundSpace(DEFAULTS.soundSpace);
  setters.setSoundEnvironment(DEFAULTS.soundEnvironment);
  setters.setSoundAutoCycle(DEFAULTS.soundAutoCycle);
  setters.setSoundSyncThemes(DEFAULTS.soundSyncThemes);
  setters.setSoundMovement(DEFAULTS.soundMovement);
  setters.setSoundWeather(DEFAULTS.soundWeather);
  setters.setSoundMixer(DEFAULTS.soundMixer);
  setters.setSoundReverbDecay(DEFAULTS.soundReverbDecay);
  setters.setSoundReverbDamping(DEFAULTS.soundReverbDamping);
  setters.setSoundReverbPreDelay(DEFAULTS.soundReverbPreDelay);
  setters.setSoundStepCadence(DEFAULTS.soundStepCadence);
  setters.setThemeMorphSpeed(DEFAULTS.themeMorphSpeed);
  setters.setThemeMorphFreq(DEFAULTS.themeMorphFreq);
  setters.setTheme(DEFAULTS.theme);
  setters.setTimeScale(DEFAULTS.timeScale);
  setters.setPostMatingDieoff(DEFAULTS.postMatingDieoff);
  setters.setRhizomeSpeed(DEFAULTS.rhizomeSpeed);
  setters.setTreeSpeed(DEFAULTS.treeSpeed);
  setters.setBushSpeed(DEFAULTS.bushSpeed);
  setters.setBushStepSize(DEFAULTS.bushStepSize);
  setters.setTreeStepSize(DEFAULTS.treeStepSize);
  setters.setRhizomeStepSize(DEFAULTS.rhizomeStepSize);
  setters.setBushBranching(DEFAULTS.bushBranching);
  setters.setWidthVariance(DEFAULTS.widthVariance);
  setters.setBranchGrowthBoost(DEFAULTS.branchGrowthBoost);
  setters.setColorMutationShift(DEFAULTS.colorMutationShift);
  setters.setTreeBranching(DEFAULTS.treeBranching);
  setters.setTreeBranchDelay(DEFAULTS.treeBranchDelay);
  setters.setBushTaper(DEFAULTS.bushTaper);
  setters.setTreeTaper(DEFAULTS.treeTaper);
  setters.setRhizomeTaper(DEFAULTS.rhizomeTaper);
  setters.setSnakeBranching(DEFAULTS.snakeBranching);
  setters.setRhizomeBranching(DEFAULTS.rhizomeBranching);
  setters.setBushMinBranches(DEFAULTS.bushMinBranches);
  setters.setRhizomeMinBranches(DEFAULTS.rhizomeMinBranches);
  setters.setTreeMinBranches(DEFAULTS.treeMinBranches);
  setters.setSnakeMinBranches(DEFAULTS.snakeMinBranches);
  setters.setSnakeWander(DEFAULTS.snakeWander);
  setters.setSnakeStepSize(DEFAULTS.snakeStepSize);
  setters.setSnakeSpeed(DEFAULTS.snakeSpeed);
  setters.setRotationSpeed(DEFAULTS.rotationSpeed);
  setters.setRotationSpeedY(DEFAULTS.rotationSpeedY);
  setters.setMagnetism(DEFAULTS.magnetism);
  setters.setSeekAmount(DEFAULTS.seekAmount);
  setters.setProximity(DEFAULTS.proximity);
  setters.setDesperation(DEFAULTS.desperation);
  setters.setDespairAge(DEFAULTS.despairAge);
  setters.setMaxMatings(DEFAULTS.maxMatings);
  setters.setStartColorMode(DEFAULTS.startColorMode);
  setters.setFlowerSize(DEFAULTS.flowerSize);
  setters.setTideSpeed(DEFAULTS.tideSpeed);
  setters.setTideColor(DEFAULTS.tideColor);
  setters.setBgColor(DEFAULTS.bgColor);
  setters.setFogColor(DEFAULTS.fogColor);
  setters.setTideThickness(DEFAULTS.tideThickness);
  setters.setTideOpacity(DEFAULTS.tideOpacity);
  setters.setTideSaturation(DEFAULTS.tideSaturation);
  setters.setGrowthSpeed(DEFAULTS.growthSpeed);
  setters.setWidthGrowthEffect(DEFAULTS.widthGrowthEffect);
  setters.setDiebackRate(DEFAULTS.diebackRate);
  setters.setAllowBreeding(DEFAULTS.allowBreeding);
  setters.setGridHeight(DEFAULTS.gridHeight);
  setters.setLayerGap(DEFAULTS.layerGap);
  setters.setFloorHeight(DEFAULTS.floorHeight);
  setters.setCeilingHeight(DEFAULTS.ceilingHeight);
  setters.setCameraProjection(DEFAULTS.cameraProjection);
  setters.setShowBoundaryBox(DEFAULTS.showBoundaryBox);
  setters.setMaxSaturation(DEFAULTS.maxSaturation);
  setters.setColorClamp(DEFAULTS.colorClamp);
  setters.setHybridCooldown(DEFAULTS.hybridCooldown);
  setters.setHybridStickiness(DEFAULTS.hybridStickiness);
  setters.setHybridSpinSpeed(DEFAULTS.hybridSpinSpeed);
  setters.setBranchTendencyVar(DEFAULTS.branchTendencyVar);
  setters.setOrnamentFrequency(DEFAULTS.ornamentFrequency);
  setters.setBranchingMultiplier(DEFAULTS.branchingMultiplier);
  setters.setBranchBigger(DEFAULTS.branchBigger);
  setters.setBranchSplitSizeProb(DEFAULTS.branchSplitSizeProb);
  setters.setPruningStrength(DEFAULTS.pruningStrength);
  setters.setMaxBranchDepth(DEFAULTS.maxBranchDepth);
  setters.setMaxBranchesPerSpecies(DEFAULTS.maxBranchesPerSpecies);
  setters.setMaxDOMs(DEFAULTS.maxDOMs);
  setters.setMaxAgents(DEFAULTS.maxAgents);
  setters.setMaxCreatures(DEFAULTS.maxCreatures);
  setters.setEcoFade(DEFAULTS.ecoFade);
  setters.setMinCreatures(DEFAULTS.minCreatures);
  setters.setBoundarySize(DEFAULTS.boundarySize);
  setters.setBoundarySquash(DEFAULTS.boundarySquash);
  setters.setDesiccationSpeed(DEFAULTS.desiccationSpeed);
  setters.setHybridSize(DEFAULTS.hybridSize);
  setters.setTerminationProb(DEFAULTS.terminationProb);
  setters.setTermProbPostBranch(DEFAULTS.termProbPostBranch);
  setters.setSegmentGap(DEFAULTS.segmentGap);
  setters.setTaperDuration(DEFAULTS.taperDuration);
  setters.setDiebackAgeBias(DEFAULTS.diebackAgeBias);
  setters.setEnableGlow(DEFAULTS.enableGlow);
  setters.setGlowSize(DEFAULTS.glowSize);
  setters.setFogVisibility(DEFAULTS.fogVisibility);
  setters.setBotanyRealism(DEFAULTS.botanyRealism);
  setters.setWindVelocity(DEFAULTS.windVelocity);
  setters.setFlutterIntensity(DEFAULTS.flutterIntensity);
  setters.setShimmer(DEFAULTS.shimmer);
  setters.setWavy(DEFAULTS.wavy);
  setters.setBranchMovement(DEFAULTS.branchMovement);
  setters.setOverallMovement(DEFAULTS.overallMovement);
  setters.setMovementLfoSpeed(DEFAULTS.movementLfoSpeed);
  setters.setMovementLfoDepth(DEFAULTS.movementLfoDepth);
  setters.setMovementLfoRandom(DEFAULTS.movementLfoRandom);
  setters.setLeafScale(DEFAULTS.leafScale);
  setters.setLeafDensity(DEFAULTS.leafDensity);
  setters.setRelativeLeafSizeDiff(DEFAULTS.relativeLeafSizeDiff);
  setters.setStemCurviness(DEFAULTS.stemCurviness);
  setters.setVeinStrength(DEFAULTS.veinStrength);
  setters.setVeinGlow(DEFAULTS.veinGlow);
  setters.setLeafGrowthSpeed(DEFAULTS.leafGrowthSpeed);
  setters.setPhyllotaxisAngle(DEFAULTS.phyllotaxisAngle);
  setters.setLeafProbability(DEFAULTS.leafProbability);
  setters.setAppendageSpawnRate(DEFAULTS.appendageSpawnRate);
  setters.setGlowProbability(DEFAULTS.glowProbability);
  setters.setTraitProbs(DEFAULTS.traitProbs);
  setters.setMaxLineWidth(DEFAULTS.maxLineWidth);
  setters.setGlobalPulseSpeed(DEFAULTS.globalPulseSpeed);
  setters.setMulticolorAppProb(DEFAULTS.multicolorAppProb);
  setters.setSameColorAppProb(DEFAULTS.sameColorAppProb);
  setters.setFeelerFade(DEFAULTS.feelerFade);
  setters.setFeelerDelay(DEFAULTS.feelerDelay);
  setters.setCullRate(DEFAULTS.cullRate);
  setters.setGlowTraitIntensity(DEFAULTS.glowTraitIntensity);
  setters.setGlowTraitDistance(DEFAULTS.glowTraitDistance);
  setters.setGlowTraitReflect(DEFAULTS.glowTraitReflect);
  setters.setDialLimits(DEFAULTS.dialLimits);
}
