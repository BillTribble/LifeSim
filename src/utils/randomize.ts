export const triggerRandomize = (
  setters: any,
  state: any,
  setRandomizeKey?: any,
  handleRestart?: () => void
) => {
  const r = () => Math.random();
  const rRange = (min: number, max: number) => min + r() * (max - min);

  // Core parameters
  if (setters.setMagnetism) setters.setMagnetism(rRange(0, 0.1));
  if (setters.setProximity) setters.setProximity(rRange(1, 2000));
  if (setters.setDesperation) setters.setDesperation(rRange(1, 10));
  if (setters.setDespairAge) setters.setDespairAge(rRange(100, 5000));
  // Note: flowerSize, hybridSize, and growthSpeed are intentionally excluded from randomize
  if (setters.setDiebackRate) setters.setDiebackRate(rRange(0.0, 10.0));

  // Tides & Environment
  if (setters.setTideSpeed) setters.setTideSpeed(rRange(0.1, 5.0));
  if (setters.setTideThickness) setters.setTideThickness(rRange(10, 500));
  if (setters.setTideOpacity) setters.setTideOpacity(rRange(0.0, 1.0));
  if (setters.setTideSaturation) setters.setTideSaturation(rRange(0.0, 1.0));
  if (setters.setFogVisibility) setters.setFogVisibility(rRange(750, 850));
  if (setters.setDesiccationSpeed) setters.setDesiccationSpeed(rRange(0.1, 15.0));
  if (setters.setGlobalPulseSpeed) setters.setGlobalPulseSpeed(rRange(0.1, 1.0));
  if (setters.setMaxSaturation) setters.setMaxSaturation(rRange(0.0, 1.0));
  if (setters.setMaxLineWidth) setters.setMaxLineWidth(rRange(1.0, 20.0));

  // Hybrids & Branching
  if (setters.setHybridCooldown) setters.setHybridCooldown(rRange(10, 2000));
  if (setters.setHybridStickiness) setters.setHybridStickiness(rRange(1, 50));
  if (setters.setBranchTendencyVar) setters.setBranchTendencyVar(rRange(1, 50));
  if (setters.setOrnamentFrequency) setters.setOrnamentFrequency(rRange(0.1, 10));
  if (setters.setBranchingMultiplier) setters.setBranchingMultiplier(rRange(0.1, 500));
  if (setters.setBranchBigger) setters.setBranchBigger(rRange(0.0, 1.0));
  if (setters.setBranchSplitSizeProb) setters.setBranchSplitSizeProb(rRange(0.0, 1.0));
  if (setters.setTermProbPostBranch) setters.setTermProbPostBranch(rRange(0.5, 10.0));
  if (setters.setPruningStrength) setters.setPruningStrength(rRange(0.3, 1.5));
  if (setters.setMaxBranchDepth) setters.setMaxBranchDepth(Math.floor(rRange(2, 6)));
  if (setters.setMaxBranchesPerSpecies) setters.setMaxBranchesPerSpecies(Math.floor(rRange(8, 36)));

  // Limits
  if (setters.setMaxAgents) setters.setMaxAgents(Math.floor(rRange(1, 200)));
  if (setters.setMaxSpecies) setters.setMaxSpecies(Math.floor(rRange(1, 20)));
  if (setters.setMinAgents) setters.setMinAgents(Math.floor(rRange(2, 20)));
  if (setters.setEcoFade) setters.setEcoFade(rRange(0.0, 1.0));
  if (setters.setTerminationProb) setters.setTerminationProb(rRange(0.0, 1.0));
  if (setters.setTaperDuration) setters.setTaperDuration(rRange(0.5, 3.0));
  if (setters.setDiebackAgeBias) setters.setDiebackAgeBias(rRange(0.5, 5.0));
  if (setters.setMulticolorAppProb) setters.setMulticolorAppProb(rRange(0.0, 1.0));
  if (setters.setSameColorAppProb) setters.setSameColorAppProb(rRange(0.0, 1.0));

  // Colors
  const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  if (setters.setTideColor) setters.setTideColor(randomHex());
  if (setters.setBgColor) setters.setBgColor(randomHex());
  if (setters.setFogColor) setters.setFogColor('#000000');

  // Maintain NORMAL theme (0) — theme is excluded from randomization
  if (setters.setTheme) {
    setters.setTheme(0);
  }

  // Trait Probs
  if (setters.setTraitProbs && state.traitProbs) {
    const newTraits: Record<string, number> = {};
    Object.keys(state.traitProbs).forEach((key) => {
      newTraits[key] = rRange(0.0, 1.0);
    });
    setters.setTraitProbs(newTraits);
  }

  if (setRandomizeKey) {
    setRandomizeKey((prev: number) => prev + 1);
  }
  if (handleRestart) {
    handleRestart();
  }
};
