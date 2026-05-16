import { useState, useEffect } from "react";

export const DEFAULTS = {
  rotationSpeed: 0.40615340987509785,
  magnetism: 0.1,
  proximity: 113,
  flowerSize: 0.42,
  entropyThreshold: 0.2,
  tideSpeed: 3,
  tideColor: "#643707",
  bgColor: "#073464",
  fogColor: "#000000",
  tideThickness: 110,
  tideOpacity: 0.25,
  tideSaturation: 1,
  growthSpeed: 0.7000000000000001,
  diebackRate: 0.59,
  hybridCooldown: 200,
  hybridStickiness: 47,
  branchTendencyVar: 50,
  ornamentFrequency: 3.2,
  branchingMultiplier: 884.4000000000001,
  branchBigger: 0.75,
  branchSplitSizeProb: 0.9500000000000001,
  maxDOMs: 121600,
  maxAgents: 50,
  maxSpecies: 3,
  ecoFade: 1,
  minAgents: 4,
  desiccationSpeed: 5.7,
  hybridSize: 3.1,
  terminationProb: 0.71,
  termProbPostBranch: 2.5,
  taperDuration: 1,
  diebackAgeBias: 5,
  branchMutationRate: 0.04,
  enableGlow: false,
  glowSize: 0.5,
  fogVisibility: 750,
  traitProbs: {
    flowers: 0.45,
    leaves: 0.45,
    petals: 0.45,
    needles: 0.4,
    thorns: 0.4,
    hair: 0.6000000000000001,
    curlyHair: 0.45,
    crystals: 0.6000000000000001,
    spores: 0.45,
    scales: 0.5,
    spirals: 0.45,
  },
  maxLineWidth: 12,
  globalPulseSpeed: 0.6000000000000001,
  multicolorAppProb: 0.05,
  sameColorAppProb: 0.8500000000000001,
};

export function useSimulationState() {
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
  const [enableGlow, setEnableGlow] = useState(
    () => localStorage.getItem("enableGlow") === "true" || DEFAULTS.enableGlow,
  );
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
    localStorage.setItem("rotationSpeed", rotationSpeed.toString());
    localStorage.setItem("magnetism", magnetism.toString());
    localStorage.setItem("proximity", proximity.toString());
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
    localStorage.setItem("traitProbs", JSON.stringify(traitProbs));
  }, [
    rotationSpeed,
    magnetism,
    proximity,
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

  return {
    state: {
      rotationSpeed,
      magnetism,
      proximity,
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
    },
    setters: {
      setRotationSpeed,
      setMagnetism,
      setProximity,
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
    },
  };
}
