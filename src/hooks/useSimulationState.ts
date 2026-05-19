import { useState, useEffect } from "react";

export const DEFAULTS = {
  "themeMorphSpeed": 5,
  "themeMorphFreq": 0.8,
  "theme": 0,
  "timeScale": 0.5,
  "gingerSpeed": 1,
  "treeSpeed": 1,
  "bushSpeed": 1,
  "snakeWander": 1,
  "snakeStepSize": 1,
  "snakeSpeed": 1,
  "rotationSpeed": 0.1,
  "magnetism": 10,
  "proximity": 40,
  "desperation": 9.5,
  "despairAge": 1000,
  "flowerSize": 0.25,
  "entropyThreshold": 1,
  "tideSpeed": 0.1,
  "tideColor": "#643707",
  "bgColor": "#5e503e",
  "fogColor": "#000000",
  "tideThickness": 330,
  "tideOpacity": 0.1,
  "tideSaturation": 0.4,
  "growthSpeed": 0.1,
  "diebackRate": 7.42,
  "hybridCooldown": 200,
  "hybridStickiness": 0.05,
  "branchTendencyVar": 50,
  "ornamentFrequency": 3.2,
  "branchingMultiplier": 3,
  "branchBigger": 0.75,
  "branchSplitSizeProb": 0.95,
  "maxDOMs": 341000,
  "maxAgents": 50,
  "maxSpecies": 4,
  "ecoFade": 1,
  "minAgents": 4,
  "boundarySize": 120,
  "desiccationSpeed": 1.1,
  "hybridSize": 2,
  "terminationProb": 0.9051,
  "termProbPostBranch": 1.5,
  "taperDuration": 1,
  "diebackAgeBias": 5,
  "branchMutationRate": 0,
  "enableGlow": false,
  "glowSize": 0.5,
  "fogVisibility": 800,
  "traitProbs": {
    "flowers": 0.45,
    "leaves": 0.5,
    "petals": 0.45,
    "needles": 0.5,
    "thorns": 0.4,
    "hair": 0.6000000000000001,
    "curlyHair": 0.5,
    "crystals": 0.6000000000000001,
    "spores": 0.5,
    "scales": 0.5,
    "spirals": 0.5
  },
  "maxLineWidth": 12,
  "globalPulseSpeed": 0.1,
  "multicolorAppProb": 0.05,
  "sameColorAppProb": 0.9,
  "maxSaturation": 0.8,
  "feelerFade": 10,
  "cullRate": 48.87,
  "dialLimits": {
    "DEATH RATE": {
      "min": 0,
      "max": 10
    },
    "MAGNET": {
      "min": 0,
      "max": 10
    },
    "BUDGET": {
      "min": 500,
      "max": 1000000
    },
    "HYBRID_DECAY": {
      "min": 0,
      "max": 1
    },
    "SLOW_MO": {
      "min": 0.1,
      "max": 50
    }
  } as Record<string, {min: number, max: number}>,
  "cameraPosition": {
    "x": 338.3537304509371,
    "y": 66.42053119728962,
    "z": -33.24253488237013,
    "zoom": 1.916305230244903
  },
  "version": "1.0"
};

export function useSimulationState() {
    const [snakeSpeed, setSnakeSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeSpeed") || DEFAULTS.snakeSpeed.toString(),
    ),
  );
  const [snakeStepSize, setSnakeStepSize] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeStepSize") || DEFAULTS.snakeStepSize.toString(),
    ),
  );
  const [snakeWander, setSnakeWander] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeWander") || DEFAULTS.snakeWander.toString(),
    ),
  );
  const [bushSpeed, setBushSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("bushSpeed") || DEFAULTS.bushSpeed.toString(),
    ),
  );
  const [treeSpeed, setTreeSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("treeSpeed") || DEFAULTS.treeSpeed.toString(),
    ),
  );
  const [gingerSpeed, setGingerSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("gingerSpeed") || DEFAULTS.gingerSpeed.toString(),
    ),
  );
  const [timeScale, setTimeScale] = useState(() =>
    parseFloat(
      localStorage.getItem("timeScale") || DEFAULTS.timeScale.toString(),
    ),
  );
  const [theme, setTheme] = useState(2); // Always start in complementary theme
  const [themeMorphFreq, setThemeMorphFreq] = useState(() =>
    parseFloat(
      localStorage.getItem("themeMorphFreq") || DEFAULTS.themeMorphFreq.toString(),
    ),
  );
  const [themeMorphSpeed, setThemeMorphSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("themeMorphSpeed") || DEFAULTS.themeMorphSpeed.toString(),
    ),
  );
const [dialLimits, setDialLimits] = useState<Record<string, {min: number, max: number}>>(() => {
    try {
      const stored = localStorage.getItem("dialLimits");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Object.keys(parsed).length > 0) return parsed;
      }
      return DEFAULTS.dialLimits;
    } catch {
      return DEFAULTS.dialLimits;
    }
  });

  const [rotationSpeed, setRotationSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("rotationSpeed") ||
        DEFAULTS.rotationSpeed.toString(),
    ),
  );
  const [magnetism, setMagnetism] = useState(() =>
    parseFloat(
      localStorage.getItem("magnetism") || DEFAULTS.magnetism.toString(),
    ),
  );
  const [proximity, setProximity] = useState(() =>
    parseFloat(
      localStorage.getItem("proximity") || DEFAULTS.proximity.toString(),
    ),
  );
  const [desperation, setDesperation] = useState(() =>
    parseFloat(
      localStorage.getItem("desperation") || DEFAULTS.desperation.toString(),
    ),
  );
  const [despairAge, setDespairAge] = useState(() =>
    parseFloat(
      localStorage.getItem("despairAge") || DEFAULTS.despairAge.toString(),
    ),
  );
  const [flowerSize, setFlowerSize] = useState(() =>
    parseFloat(
      localStorage.getItem("flowerSize") || DEFAULTS.flowerSize.toString(),
    ),
  );
  const [entropyThreshold, setEntropyThreshold] = useState(() =>
    parseFloat(
      localStorage.getItem("entropyThreshold") ||
        DEFAULTS.entropyThreshold.toString(),
    ),
  );
  const [tideSpeed, setTideSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("tideSpeed") || DEFAULTS.tideSpeed.toString(),
    ),
  );
  const [tideColor, setTideColor] = useState(
    () => localStorage.getItem("tideColor") || DEFAULTS.tideColor,
  );
  const [bgColor, setBgColor] = useState(
    () => localStorage.getItem("bgColor") || DEFAULTS.bgColor,
  );
  const [fogColor, setFogColor] = useState(
    () => localStorage.getItem("fogColor") || DEFAULTS.fogColor,
  );
  const [tideThickness, setTideThickness] = useState(() =>
    parseFloat(
      localStorage.getItem("tideThickness") ||
        DEFAULTS.tideThickness.toString(),
    ),
  );
  const [tideOpacity, setTideOpacity] = useState(() =>
    parseFloat(
      localStorage.getItem("tideOpacity") || DEFAULTS.tideOpacity.toString(),
    ),
  );
  const [tideSaturation, setTideSaturation] = useState(() =>
    parseFloat(
      localStorage.getItem("tideSaturation") ||
        DEFAULTS.tideSaturation.toString(),
    ),
  );
  const [growthSpeed, setGrowthSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("growthSpeed") || DEFAULTS.growthSpeed.toString(),
    ),
  );
  const [diebackRate, setDiebackRate] = useState(() =>
    parseFloat(
      localStorage.getItem("diebackRate") || DEFAULTS.diebackRate.toString(),
    ),
  );
  const [hybridCooldown, setHybridCooldown] = useState(() =>
    parseFloat(
      localStorage.getItem("hybridCooldown") ||
        DEFAULTS.hybridCooldown.toString(),
    ),
  );
  const [hybridStickiness, setHybridStickiness] = useState(() =>
    parseFloat(
      localStorage.getItem("hybridStickiness") ||
        DEFAULTS.hybridStickiness.toString(),
    ),
  );
  const [branchTendencyVar, setBranchTendencyVar] = useState(() =>
    parseFloat(
      localStorage.getItem("branchTendencyVar") ||
        DEFAULTS.branchTendencyVar.toString(),
    ),
  );
  const [ornamentFrequency, setOrnamentFrequency] = useState(() =>
    parseFloat(
      localStorage.getItem("ornamentFrequency") ||
        DEFAULTS.ornamentFrequency.toString(),
    ),
  );
  const [branchingMultiplier, setBranchingMultiplier] = useState(() =>
    parseFloat(
      localStorage.getItem("branchingMultiplier") ||
        DEFAULTS.branchingMultiplier.toString(),
    ),
  );
  const [branchBigger, setBranchBigger] = useState(() =>
    parseFloat(
      localStorage.getItem("branchBigger") || DEFAULTS.branchBigger.toString(),
    ),
  );
  const [branchSplitSizeProb, setBranchSplitSizeProb] = useState(() =>
    parseFloat(
      localStorage.getItem("branchSplitSizeProb") ||
        DEFAULTS.branchSplitSizeProb.toString(),
    ),
  );
  const [maxDOMs, setMaxDOMs] = useState(() =>
    parseFloat(localStorage.getItem("maxDOMs") || DEFAULTS.maxDOMs.toString()),
  );
  const [maxAgents, setMaxAgents] = useState(() =>
    parseFloat(
      localStorage.getItem("maxAgents") || DEFAULTS.maxAgents.toString(),
    ),
  );
  const [maxSpecies, setMaxSpecies] = useState(() =>
    parseFloat(
      localStorage.getItem("maxSpecies") || DEFAULTS.maxSpecies.toString(),
    ),
  );
  const [ecoFade, setEcoFade] = useState(() =>
    parseFloat(
      localStorage.getItem("ecoFade") || DEFAULTS.ecoFade.toString(),
    ),
  );
  const [desiccationSpeed, setDesiccationSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("desiccationSpeed") ||
        DEFAULTS.desiccationSpeed.toString(),
    ),
  );
  const [minAgents, setMinAgents] = useState(() =>
    parseFloat(
      localStorage.getItem("minAgents") || DEFAULTS.minAgents.toString(),
    ),
  );
  const [boundarySize, setBoundarySize] = useState(() =>
    parseFloat(
      localStorage.getItem("boundarySize") || DEFAULTS.boundarySize.toString(),
    ),
  );
  const [hybridSize, setHybridSize] = useState(() =>
    parseFloat(
      localStorage.getItem("hybridSize") || DEFAULTS.hybridSize.toString(),
    ),
  );
  const [terminationProb, setTerminationProb] = useState(() =>
    parseFloat(
      localStorage.getItem("terminationProb") ||
        DEFAULTS.terminationProb.toString(),
    ),
  );
  const [termProbPostBranch, setTermProbPostBranch] = useState(() =>
    parseFloat(
      localStorage.getItem("termProbPostBranch") ||
        DEFAULTS.termProbPostBranch.toString(),
    ),
  );
  const [taperDuration, setTaperDuration] = useState(() =>
    parseFloat(
      localStorage.getItem("taperDuration") ||
        DEFAULTS.taperDuration.toString(),
    ),
  );
  const [diebackAgeBias, setDiebackAgeBias] = useState(() =>
    parseFloat(
      localStorage.getItem("diebackAgeBias") ||
        DEFAULTS.diebackAgeBias.toString(),
    ),
  );
  const [branchMutationRate, setBranchMutationRate] = useState(() =>
    parseFloat(
      localStorage.getItem("branchMutationRate") ||
        DEFAULTS.branchMutationRate.toString(),
    ),
  );
  const [enableGlow, setEnableGlow] = useState(() => {
    const stored = localStorage.getItem("enableGlow");
    return stored !== null ? stored === "true" : DEFAULTS.enableGlow;
  });
  const [glowSize, setGlowSize] = useState(() =>
    parseFloat(
      localStorage.getItem("glowSize") || DEFAULTS.glowSize.toString(),
    ),
  );
  const [fogVisibility, setFogVisibility] = useState(() =>
    parseFloat(localStorage.getItem("fogVisibility") || "800"),
  );

  const [maxLineWidth, setMaxLineWidth] = useState(() =>
    parseFloat(
      localStorage.getItem("maxLineWidth") || DEFAULTS.maxLineWidth.toString(),
    ),
  );
  const [globalPulseSpeed, setGlobalPulseSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("globalPulseSpeed") ||
        DEFAULTS.globalPulseSpeed.toString(),
    ),
  );
  const [multicolorAppProb, setMulticolorAppProb] = useState(() =>
    parseFloat(
      localStorage.getItem("multicolorAppProb") ||
        DEFAULTS.multicolorAppProb.toString(),
    ),
  );
  const [sameColorAppProb, setSameColorAppProb] = useState(() =>
    parseFloat(
      localStorage.getItem("sameColorAppProb") ||
        DEFAULTS.sameColorAppProb.toString(),
    ),
  );
  const [maxSaturation, setMaxSaturation] = useState(() =>
    parseFloat(
      localStorage.getItem("maxSaturation") ||
        DEFAULTS.maxSaturation.toString(),
    ),
  );

  const [feelerFade, setFeelerFade] = useState(() =>
    parseFloat(
      localStorage.getItem("feelerFade") ||
        DEFAULTS.feelerFade.toString(),
    ),
  );

  const [cullRate, setCullRate] = useState(() =>
    parseFloat(
      localStorage.getItem("cullRate") ||
        DEFAULTS.cullRate.toString(),
    ),
  );

  const [traitProbs, setTraitProbs] = useState<Record<string, number>>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("traitProbs") || "null") ||
        DEFAULTS.traitProbs
      );
    } catch {
      return DEFAULTS.traitProbs;
    }
  });

  useEffect(() => {
    localStorage.setItem("snakeSpeed", snakeSpeed.toString());
    localStorage.setItem("snakeStepSize", snakeStepSize.toString());
    localStorage.setItem("snakeWander", snakeWander.toString());
    localStorage.setItem("bushSpeed", bushSpeed.toString());
    localStorage.setItem("treeSpeed", treeSpeed.toString());
    localStorage.setItem("gingerSpeed", gingerSpeed.toString());
    localStorage.setItem("timeScale", timeScale.toString());
    localStorage.setItem("themeMorphFreq", themeMorphFreq.toString());
    localStorage.setItem("themeMorphSpeed", themeMorphSpeed.toString());
    localStorage.setItem("rotationSpeed", rotationSpeed.toString());
    localStorage.setItem("magnetism", magnetism.toString());
    localStorage.setItem("proximity", proximity.toString());
    localStorage.setItem("desperation", desperation.toString());
    localStorage.setItem("despairAge", despairAge.toString());
    localStorage.setItem("flowerSize", flowerSize.toString());
    localStorage.setItem("entropyThreshold", entropyThreshold.toString());
    localStorage.setItem("tideSpeed", tideSpeed.toString());
    localStorage.setItem("tideColor", tideColor);
    localStorage.setItem("bgColor", bgColor);
    localStorage.setItem("tideThickness", tideThickness.toString());
    localStorage.setItem("tideOpacity", tideOpacity.toString());
    localStorage.setItem("tideSaturation", tideSaturation.toString());
    localStorage.setItem("growthSpeed", growthSpeed.toString());
    localStorage.setItem("diebackRate", diebackRate.toString());
    localStorage.setItem("hybridCooldown", hybridCooldown.toString());
    localStorage.setItem("hybridStickiness", hybridStickiness.toString());
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
    localStorage.setItem("desiccationSpeed", desiccationSpeed.toString());
    localStorage.setItem("hybridSize", hybridSize.toString());
    localStorage.setItem("terminationProb", terminationProb.toString());
    localStorage.setItem("termProbPostBranch", termProbPostBranch.toString());
    localStorage.setItem("taperDuration", taperDuration.toString());
    localStorage.setItem("diebackAgeBias", diebackAgeBias.toString());
    localStorage.setItem("branchMutationRate", branchMutationRate.toString());
    localStorage.setItem("enableGlow", enableGlow.toString());
    localStorage.setItem("glowSize", glowSize.toString());
    localStorage.setItem("fogVisibility", fogVisibility.toString());
    localStorage.setItem("fogColor", fogColor);
    localStorage.setItem("maxLineWidth", maxLineWidth.toString());
    localStorage.setItem("globalPulseSpeed", globalPulseSpeed.toString());
    localStorage.setItem("multicolorAppProb", multicolorAppProb.toString());
    localStorage.setItem("sameColorAppProb", sameColorAppProb.toString());
    localStorage.setItem("maxSaturation", maxSaturation.toString());
    localStorage.setItem("feelerFade", feelerFade.toString());
    localStorage.setItem("cullRate", cullRate.toString());
    localStorage.setItem("traitProbs", JSON.stringify(traitProbs));
    localStorage.setItem("dialLimits", JSON.stringify(dialLimits));
  }, [
    rotationSpeed,
    magnetism,
    proximity,
    desperation,
    despairAge,
    flowerSize,
    entropyThreshold,
    tideSpeed,
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
    minAgents,
    boundarySize,
    desiccationSpeed,
    enableGlow,
    glowSize,
    fogVisibility,
    traitProbs,
    dialLimits,
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
    dialLimits,
  ]);

  return {
    state: {
      themeMorphSpeed,
      themeMorphFreq,
      theme,
      timeScale,
      gingerSpeed,
      treeSpeed,
      bushSpeed,
      snakeWander,
      snakeStepSize,
      snakeSpeed,
      rotationSpeed,
      magnetism,
      proximity,
    desperation,
    despairAge,
      flowerSize,
      entropyThreshold,
      tideSpeed,
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
      minAgents,
      boundarySize,
      desiccationSpeed,
      hybridSize,
      terminationProb,
      termProbPostBranch,
      taperDuration,
      diebackAgeBias,
      branchMutationRate,
      enableGlow,
      glowSize,
      fogVisibility,
      traitProbs,
      maxLineWidth,
      globalPulseSpeed,
      multicolorAppProb,
      sameColorAppProb,
      maxSaturation,
      feelerFade,
      cullRate,
      dialLimits,
    },
    setters: {
      setThemeMorphSpeed,
      setThemeMorphFreq,
      setTheme,
      setTimeScale,
      setGingerSpeed,
      setTreeSpeed,
      setBushSpeed,
      setSnakeWander,
      setSnakeStepSize,
      setSnakeSpeed,
      setRotationSpeed,
      setMagnetism,
      setProximity,
      setDesperation,
      setDespairAge,
      setFlowerSize,
      setEntropyThreshold,
      setTideSpeed,
      setTideColor,
      setBgColor,
      setFogColor,
      setTideThickness,
      setTideOpacity,
      setTideSaturation,
      setGrowthSpeed,
      setDiebackRate,
      setHybridCooldown,
      setHybridStickiness,
      setBranchTendencyVar,
      setOrnamentFrequency,
      setBranchingMultiplier,
      setBranchBigger,
      setBranchSplitSizeProb,
      setMaxDOMs,
      setMaxAgents,
      setMaxSpecies,
      setEcoFade,
      setMinAgents,
      setBoundarySize,
      setDesiccationSpeed,
      setHybridSize,
      setTerminationProb,
      setTermProbPostBranch,
      setTaperDuration,
      setDiebackAgeBias,
      setBranchMutationRate,
      setEnableGlow,
      setGlowSize,
      setFogVisibility,
      setTraitProbs,
      setMaxLineWidth,
      setGlobalPulseSpeed,
      setMulticolorAppProb,
      setSameColorAppProb,
      setMaxSaturation,
      setFeelerFade,
      setCullRate,
      setDialLimits,
    },
  };
}
