import { useState, useEffect } from "react";

export const DEFAULTS: Record<string, any> = {
  "kioskMode": true,
  "themeMorphSpeed": 5,
  "themeMorphFreq": 1,
  "theme": 0,
  "timeScale": 1,
  "postMatingDieoff": true,
  "rhizomeSpeed": 1,
  "treeSpeed": 1,
  "bushSpeed": 1,
  "bushBranching": 8,
  "treeBranching": 1,
  "snakeBranching": 1,
  "rhizomeBranching": 1,
  "snakeWander": 1,
  "snakeStepSize": 1,
  "snakeSpeed": 1,
  "rotationSpeed": 0.13,
  "magnetism": 0.08361988738043864,
  "proximity": 1538.23896997661,
  "desperation": 4.333947682994568,
  "despairAge": 3185.029905594175,
  "flowerSize": 1.3,
  "tideSpeed": 1.2393635516813024,
  "tideColor": "#0b939c",
  "bgColor": "#3e5e50",
  "fogColor": "#000000",
  "tideThickness": 74.92111043533596,
  "tideOpacity": 0.12871529096468015,
  "tideSaturation": 0.0162554822004225,
  "growthSpeed": 0.11,
  "diebackRate": 5.50616330309604,
  "allowBreeding": true,
  "hybridCooldown": 926.4522288567662,
  "hybridStickiness": 48.44796525279812,
  "branchTendencyVar": 11.779000158227072,
  "ornamentFrequency": 9.525004244851067,
  "branchingMultiplier": 163.34538034535345,
  "branchBigger": 0.9929495875268578,
  "branchSplitSizeProb": 0.7936089206087223,
  "maxDOMs": 341000,
  "maxAgents": 107,
  "maxSpecies": 14,
  "ecoFade": 0.8944272063480259,
  "minAgents": 3,
  "boundarySize": 50,
  "desiccationSpeed": 12.842754552113087,
  "hybridSize": 2,
  "terminationProb": 0.0462143068937545,
  "termProbPostBranch": 2.0392659736659366,
  "taperDuration": 1.4271648309574363,
  "diebackAgeBias": 4.4091254750620505,
  "enableGlow": false,
  "glowSize": 0.5,
  "fogVisibility": 826.8761838338102,
  "botanyRealism": true,
  "windVelocity": 0.2,
  "flutterIntensity": 0.5,
  "leafScale": 0.14,
  "leafDensity": 0.35,
  "relativeLeafSizeDiff": 0.2,
  "leafGrowthSpeed": 0.0045,
  "phyllotaxisAngle": 137.5,
  "leafProbability": 1,
  "appendageSpawnRate": 1,
  "glowProbability": 0.1,
  "stemCurviness": 3,
  "veinStrength": 15,
  "veinGlow": 0.5,
  "traitProbs": {
    "flowers": 0.25308343649782206,
    "lillyPads": 0.22658594313832736,
    "leaves": 0.6861914211625996,
    "petals": 0.17734982544932287,
    "needles": 0.652656691289245,
    "thorns": 0.02097595552862941,
    "hair": 0.20011696648365407,
    "curlyHair": 0.5951412197911187,
    "crystals": 0.2358742561569518,
    "spores": 0.30771523305963355,
    "scales": 0.9933893114828062,
    "spirals": 0.15350714077951655
  },
  "maxLineWidth": 1.5,
  "globalPulseSpeed": 0.8637093147800061,
  "multicolorAppProb": 0.3155126730950826,
  "sameColorAppProb": 0.4968205547416572,
  "maxSaturation": 0.3135869032532054,
  "colorClamp": 1,
  "gridHeight": 80,
  "layerGap": 166,
  "floorHeight": 6,
  "ceilingHeight": -38,
  "cameraProjection": 1,
  "showBoundaryBox": false,
  "feelerFade": 10,
  "cullRate": 48.87,
  "glowTraitIntensity": 1.5,
  "glowTraitDistance": 50,
  "glowTraitReflect": 1,
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
    },
    "GLOW_INTENSITY": {
      "min": 0.1,
      "max": 10
    },
    "GLOW_DIST": {
      "min": 5,
      "max": 200
    },
    "GLOW_REFLECT": {
      "min": 0,
      "max": 5
    }
  },
  "appendageSize": 1.3,
  "hybridDecay": 48.44796525279812,
  "deathRate": 5.50616330309604,
  "slowMotion": 1,
  "rotationVelocity": 0.13,
  "swarmCohesion": 0.08361988738043864,
  "detectionRange": 1538.23896997661,
  "extrusionSpeed": 0.11,
  "fadeSpeed": 12.842754552113087,
  "pulseSpeed": 0.8637093147800061,
  "saturation": 0.3135869032532054,
  "cameraPosition": {
    "x": 102.79425496529767,
    "y": 18.921075000000005,
    "z": -91.20086373565351,
    "zoom": 1
  },
  "version": "1.0"
};

export function useSimulationState() {
  if (typeof window !== "undefined") {
    const CURRENT_SCHEMA = "2026-07-30-v15";
    if (localStorage.getItem("lifesim_schema_ver") !== CURRENT_SCHEMA) {
      try {
        localStorage.clear();
      } catch (e) {}
      localStorage.setItem("lifesim_schema_ver", CURRENT_SCHEMA);
    }
  }

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
  const [rhizomeSpeed, setRhizomeSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("rhizomeSpeed") || DEFAULTS.rhizomeSpeed.toString(),
    ),
  );
  const [bushBranching, setBushBranching] = useState(() =>
    parseFloat(
      localStorage.getItem("bushBranching") || DEFAULTS.bushBranching.toString(),
    ),
  );
  const [treeBranching, setTreeBranching] = useState(() =>
    parseFloat(
      localStorage.getItem("treeBranching") || DEFAULTS.treeBranching.toString(),
    ),
  );
  const [snakeBranching, setSnakeBranching] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeBranching") || DEFAULTS.snakeBranching.toString(),
    ),
  );
  const [rhizomeBranching, setRhizomeBranching] = useState(() =>
    parseFloat(
      localStorage.getItem("rhizomeBranching") || DEFAULTS.rhizomeBranching.toString(),
    ),
  );
  const [timeScale, setTimeScale] = useState(() => {
    const savedTs = localStorage.getItem("timeScale") || localStorage.getItem("slowMotion");
    if (savedTs !== null) {
      const val = parseFloat(savedTs);
      if (!isNaN(val)) return val;
    }
    return DEFAULTS.timeScale;
  });
  const [postMatingDieoff, setPostMatingDieoff] = useState(() => {
    const saved = localStorage.getItem("postMatingDieoff");
    return saved !== null ? saved === "true" : true;
  });
  const [theme, setTheme] = useState(0); // Always start in normal theme
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
  const [gridHeight, setGridHeight] = useState(() =>
    parseFloat(
      localStorage.getItem("gridHeight") || DEFAULTS.gridHeight.toString(),
    ),
  );
  const [layerGap, setLayerGap] = useState(() =>
    parseFloat(
      localStorage.getItem("layerGap") || DEFAULTS.layerGap.toString(),
    ),
  );
  const [floorHeight, setFloorHeight] = useState(() =>
    parseFloat(
      localStorage.getItem("floorHeight") || DEFAULTS.floorHeight.toString(),
    ),
  );
  const [ceilingHeight, setCeilingHeight] = useState(() =>
    parseFloat(
      localStorage.getItem("ceilingHeight") || DEFAULTS.ceilingHeight.toString(),
    ),
  );
  const [cameraProjection, setCameraProjection] = useState(() =>
    parseFloat(
      localStorage.getItem("cameraProjection") || DEFAULTS.cameraProjection.toString(),
    ),
  );
  const [showBoundaryBox, setShowBoundaryBox] = useState(() =>
    localStorage.getItem("showBoundaryBox") === "true",
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
  const [allowBreeding, setAllowBreeding] = useState(() =>
    localStorage.getItem("allowBreeding") !== null
      ? localStorage.getItem("allowBreeding") === "true"
      : DEFAULTS.allowBreeding,
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

  const [botanyRealism, setBotanyRealism] = useState(() => {
    const stored = localStorage.getItem("botanyRealism");
    return stored !== null ? stored === "true" : DEFAULTS.botanyRealism;
  });
  const [windVelocity, setWindVelocity] = useState(() =>
    parseFloat(
      localStorage.getItem("windVelocity") || DEFAULTS.windVelocity.toString(),
    ),
  );
  const [flutterIntensity, setFlutterIntensity] = useState(() =>
    parseFloat(
      localStorage.getItem("flutterIntensity") || DEFAULTS.flutterIntensity.toString(),
    ),
  );
  const [leafScale, setLeafScale] = useState(() =>
    parseFloat(
      localStorage.getItem("leafScale") || DEFAULTS.leafScale.toString(),
    ),
  );
  const [leafDensity, setLeafDensity] = useState(() =>
    parseFloat(
      localStorage.getItem("leafDensity") || DEFAULTS.leafDensity.toString(),
    ),
  );
  const [relativeLeafSizeDiff, setRelativeLeafSizeDiff] = useState(() =>
    parseFloat(
      localStorage.getItem("relativeLeafSizeDiff") || DEFAULTS.relativeLeafSizeDiff.toString(),
    ),
  );
  const [stemCurviness, setStemCurviness] = useState(() =>
    parseFloat(
      localStorage.getItem("stemCurviness") || DEFAULTS.stemCurviness.toString(),
    ),
  );
  const [veinStrength, setVeinStrength] = useState(() =>
    parseFloat(
      localStorage.getItem("veinStrength") || DEFAULTS.veinStrength.toString(),
    ),
  );
  const [veinGlow, setVeinGlow] = useState(() =>
    parseFloat(
      localStorage.getItem("veinGlow") || DEFAULTS.veinGlow.toString(),
    ),
  );
  const [leafGrowthSpeed, setLeafGrowthSpeed] = useState(() =>
    parseFloat(
      localStorage.getItem("leafGrowthSpeed") || DEFAULTS.leafGrowthSpeed.toString(),
    ),
  );
  const [phyllotaxisAngle, setPhyllotaxisAngle] = useState(() =>
    parseFloat(
      localStorage.getItem("phyllotaxisAngle") || DEFAULTS.phyllotaxisAngle.toString(),
    ),
  );
  const [leafProbability, setLeafProbability] = useState(() =>
    parseFloat(
      localStorage.getItem("leafProbability") || DEFAULTS.leafProbability.toString(),
    ),
  );
  const [appendageSpawnRate, setAppendageSpawnRate] = useState(() =>
    parseFloat(
      localStorage.getItem("appendageSpawnRate") || DEFAULTS.appendageSpawnRate.toString(),
    ),
  );
  const [glowProbability, setGlowProbability] = useState(() =>
    parseFloat(
      localStorage.getItem("glowProbability") || DEFAULTS.glowProbability.toString(),
    ),
  );

  const [kioskMode, setKioskMode] = useState(() => {
    const item = localStorage.getItem("kioskMode");
    return item !== null ? item === "true" : true;
  });

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
  const [colorClamp, setColorClamp] = useState(() =>
    parseFloat(
      localStorage.getItem("colorClamp") ||
        (DEFAULTS.colorClamp !== undefined ? DEFAULTS.colorClamp : 0.75).toString(),
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

  const [glowTraitIntensity, setGlowTraitIntensity] = useState(() =>
    parseFloat(localStorage.getItem("glowTraitIntensity") || DEFAULTS.glowTraitIntensity.toString()),
  );
  const [glowTraitDistance, setGlowTraitDistance] = useState(() =>
    parseFloat(localStorage.getItem("glowTraitDistance") || DEFAULTS.glowTraitDistance.toString()),
  );
  const [glowTraitReflect, setGlowTraitReflect] = useState(() =>
    parseFloat(localStorage.getItem("glowTraitReflect") || DEFAULTS.glowTraitReflect.toString()),
  );

  const [traitProbs, setTraitProbs] = useState<Record<string, number>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("traitProbs") || "null");
      if (stored && typeof stored === "object" && stored.leaves === 0.8) {
        return stored;
      }
      return DEFAULTS.traitProbs;
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
    localStorage.setItem("rhizomeSpeed", rhizomeSpeed.toString());
    localStorage.setItem("bushBranching", bushBranching.toString());
    localStorage.setItem("treeBranching", treeBranching.toString());
    localStorage.setItem("snakeBranching", snakeBranching.toString());
    localStorage.setItem("rhizomeBranching", rhizomeBranching.toString());
    localStorage.setItem("timeScale", timeScale.toString());
    localStorage.setItem("slowMotion", timeScale.toString());
    localStorage.setItem("postMatingDieoff", postMatingDieoff.toString());
    localStorage.setItem("themeMorphFreq", themeMorphFreq.toString());
    localStorage.setItem("themeMorphSpeed", themeMorphSpeed.toString());
    localStorage.setItem("rotationSpeed", rotationSpeed.toString());
    localStorage.setItem("magnetism", magnetism.toString());
    localStorage.setItem("proximity", proximity.toString());
    localStorage.setItem("desperation", desperation.toString());
    localStorage.setItem("despairAge", despairAge.toString());
    localStorage.setItem("flowerSize", flowerSize.toString());
    localStorage.setItem("tideSpeed", tideSpeed.toString());
    localStorage.setItem("tideColor", tideColor);
    localStorage.setItem("bgColor", bgColor);
    localStorage.setItem("tideThickness", tideThickness.toString());
    localStorage.setItem("tideOpacity", tideOpacity.toString());
    localStorage.setItem("tideSaturation", tideSaturation.toString());
    localStorage.setItem("growthSpeed", growthSpeed.toString());
    localStorage.setItem("diebackRate", diebackRate.toString());
    localStorage.setItem("allowBreeding", allowBreeding.toString());
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
    magnetism,
    proximity,
    desperation,
    despairAge,
    flowerSize,
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
      bushBranching,
      treeBranching,
      snakeBranching,
      rhizomeBranching,
      snakeWander,
      snakeStepSize,
      snakeSpeed,
      rotationSpeed,
      magnetism,
      proximity,
    desperation,
    despairAge,
      flowerSize,
      tideSpeed,
      tideColor,
      bgColor,
      fogColor,
      tideThickness,
      tideOpacity,
      tideSaturation,
      growthSpeed,
      diebackRate,
      allowBreeding,
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
    },
    setters: {
      setThemeMorphSpeed,
      setThemeMorphFreq,
      setTheme,
      setTimeScale,
      setRhizomeSpeed,
      setTreeSpeed,
      setBushSpeed,
      setBushBranching,
      setTreeBranching,
      setSnakeBranching,
      setRhizomeBranching,
      setSnakeWander,
      setSnakeStepSize,
      setSnakeSpeed,
      setRotationSpeed,
      setMagnetism,
      setProximity,
      setDesperation,
      setDespairAge,
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
      setDiebackRate,
      setAllowBreeding,
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
        setBushBranching(DEFAULTS.bushBranching);
        setTreeBranching(DEFAULTS.treeBranching);
        setSnakeBranching(DEFAULTS.snakeBranching);
        setRhizomeBranching(DEFAULTS.rhizomeBranching);
        setSnakeWander(DEFAULTS.snakeWander);
        setSnakeStepSize(DEFAULTS.snakeStepSize);
        setSnakeSpeed(DEFAULTS.snakeSpeed);
        setRotationSpeed(DEFAULTS.rotationSpeed);
        setMagnetism(DEFAULTS.magnetism);
        setProximity(DEFAULTS.proximity);
        setDesperation(DEFAULTS.desperation);
        setDespairAge(DEFAULTS.despairAge);
        setFlowerSize(DEFAULTS.flowerSize);
        setTideSpeed(DEFAULTS.tideSpeed);
        setTideColor(DEFAULTS.tideColor);
        setBgColor(DEFAULTS.bgColor);
        setFogColor(DEFAULTS.fogColor);
        setTideThickness(DEFAULTS.tideThickness);
        setTideOpacity(DEFAULTS.tideOpacity);
        setTideSaturation(DEFAULTS.tideSaturation);
        setGrowthSpeed(DEFAULTS.growthSpeed);
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
        setDesiccationSpeed(DEFAULTS.desiccationSpeed);
        setHybridSize(DEFAULTS.hybridSize);
        setTerminationProb(DEFAULTS.terminationProb);
        setTermProbPostBranch(DEFAULTS.termProbPostBranch);
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
