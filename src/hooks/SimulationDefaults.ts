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
  "snakeSpeed": 0.5,
  "widthVariance": 0.5,
  "branchGrowthBoost": 1.0,
  "colorMutationShift": 0.06,
  "rotationSpeed": 0.13,
  "magnetism": 0.08361988738043864,
  "proximity": 1538.23896997661,
  "desperation": 4.333947682994568,
  "despairAge": 3185.029905594175,
  "flowerSize": 1.8,
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
  "boundarySize": 80,
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
  "leafScale": 0.3,
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
  "appendageSize": 1.8,
  "hybridSpinSpeed": 0.2,
  "hybridDecay": 48.44796525279812,
  "deathRate": 5.50616330309604,
  "slowMotion": 1,
  "rotationVelocity": 0.7,
  "swarmCohesion": 0.08361988738043864,
  "detectionRange": 1538.23896997661,
  "extrusionSpeed": 0.11,
  "fadeSpeed": 12.842754552113087,
  "pulseSpeed": 0.8637093147800061,
  "saturation": 0.3135869032532054,
  "cameraPosition": {
    "x": 0,
    "y": 18.921075000000005,
    "z": 137.42,
    "zoom": 1
  },
  "version": "1.1"
};

export const DEFAULT_PALETTE: string[] = [
  "#0b939c",
  "#3e5e50",
  "#000000",
  "#4a90e2",
  "#50e3c2",
  "#b8e986",
  "#f8e71c",
  "#f5a623",
  "#d0021b",
  "#9013fe",
];

export const CURRENT_SCHEMA = "2026-08-04-v22";

export function getStoredFloat(key: string, fallback?: number): number {
  const stored = localStorage.getItem(key);
  if (stored !== null && stored !== "") {
    const val = parseFloat(stored);
    if (!isNaN(val)) return val;
  }
  return fallback !== undefined ? fallback : DEFAULTS[key];
}

export function getStoredBool(key: string, fallback?: boolean): boolean {
  const stored = localStorage.getItem(key);
  return stored !== null
    ? stored === "true"
    : fallback !== undefined
      ? fallback
      : DEFAULTS[key];
}

export function getStoredString(key: string, fallback?: string): string {
  return (
    localStorage.getItem(key) ||
    (fallback !== undefined ? fallback : DEFAULTS[key])
  );
}

export function getStoredTimeScale(): number {
  const savedTs =
    localStorage.getItem("timeScale") || localStorage.getItem("slowMotion");
  if (savedTs !== null) {
    const val = parseFloat(savedTs);
    if (!isNaN(val)) return val;
  }
  return DEFAULTS.timeScale;
}

export function getStoredDialLimits(): Record<string, { min: number; max: number }> {
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
}

export function getStoredTraitProbs(): Record<string, number> {
  try {
    const stored = JSON.parse(localStorage.getItem("traitProbs") || "null");
    if (stored && typeof stored === "object" && stored.leaves === 0.8) {
      return stored;
    }
    return DEFAULTS.traitProbs;
  } catch {
    return DEFAULTS.traitProbs;
  }
}

export function checkSchemaVersion(): void {
  if (typeof window !== "undefined") {
    if (localStorage.getItem("lifesim_schema_ver") !== CURRENT_SCHEMA) {
      try {
        localStorage.clear();
      } catch (e) {}
      localStorage.setItem("lifesim_schema_ver", CURRENT_SCHEMA);
    }
  }
}
