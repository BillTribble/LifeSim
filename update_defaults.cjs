const fs = require("fs");

const newDefaults = {
  "kioskMode": true,
  "themeMorphSpeed": 5,
  "themeMorphFreq": 0.8,
  "theme": 0,
  "timeScale": 0.7,
  "gingerSpeed": 1,
  "treeSpeed": 1,
  "bushSpeed": 1,
  "snakeWander": 1,
  "snakeStepSize": 1,
  "snakeSpeed": 1,
  "rotationSpeed": 0.1,
  "magnetism": 0.01674453139194959,
  "proximity": 80.62478258463184,
  "desperation": 8.659824757074798,
  "despairAge": 2005.5339943951117,
  "flowerSize": 0.25,
  "entropyThreshold": 0.95,
  "tideSpeed": 3.381581873622713,
  "tideColor": "#56e025",
  "bgColor": "#435e3e",
  "fogColor": "#000000",
  "tideThickness": 268.6983249575498,
  "tideOpacity": 0.3458378903884015,
  "tideSaturation": 0.7961707798008151,
  "growthSpeed": 1.0,
  "diebackRate": 5.0,
  "hybridCooldown": 976.8983528433891,
  "hybridStickiness": 4.185099627445749,
  "branchTendencyVar": 30.582749834324215,
  "ornamentFrequency": 2.162335974046962,
  "branchingMultiplier": 109.08822074866077,
  "branchBigger": 0.32733758582809547,
  "branchSplitSizeProb": 0.7529685020565647,
  "maxDOMs": 341000,
  "maxAgents": 103,
  "maxSpecies": 19,
  "ecoFade": 0.09835534619763375,
  "minAgents": 11,
  "boundarySize": 58.8,
  "desiccationSpeed": 10.562491679923507,
  "hybridSize": 2,
  "terminationProb": 0.3373915948495838,
  "termProbPostBranch": 4.197484913107235,
  "taperDuration": 2.8319689168338855,
  "diebackAgeBias": 2.2591955721722714,
  "branchMutationRate": 0.012,
  "enableGlow": false,
  "glowSize": 0.5,
  "fogVisibility": 842.5548245648578,
  "botanyRealism": true,
  "windVelocity": 0.2,
  "flutterIntensity": 0.5,
  "leafScale": 3.0,
  "leafDensity": 0.35000000000000003,
  "relativeLeafSizeDiff": 0.2,
  "leafGrowthSpeed": 0.0045000000000000005,
  "phyllotaxisAngle": 137.5,
  "leafProbability": 0.65,
  "appendageSpawnRate": 1.0,
  "glowProbability": 0.1,
  "stemCurviness": 3,
  "veinStrength": 15,
  "veinGlow": 0.5,
  "traitProbs": {
    "flowers": 0.5,
    "lillyPads": 0.5,
    "leaves": 0.8,
    "petals": 0.5,
    "needles": 0.5,
    "thorns": 0.5,
    "hair": 0.5,
    "curlyHair": 0.5,
    "crystals": 0.5,
    "spores": 0.5,
    "scales": 0.5,
    "spirals": 0.5
  },
  "maxLineWidth": 7.191209283996436,
  "globalPulseSpeed": 0.9291218050541217,
  "multicolorAppProb": 0.6822955192543154,
  "sameColorAppProb": 0.43101827682151894,
  "maxSaturation": 0.09829768810495365,
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
  "appendageSize": 3.0,
  "hybridDecay": 4.185099627445749,
  "deathRate": 5.0,
  "slowMotion": 0.7,
  "rotationVelocity": 0.1,
  "swarmCohesion": 0.01674453139194959,
  "detectionRange": 80.62478258463184,
  "populationLimit": 0.95,
  "extrusionSpeed": 1.0,
  "fadeSpeed": 20.0,
  "pulseSpeed": 0.9291218050541217,
  "saturation": 0.09829768810495365,
  "cameraPosition": {
    "x": 85.63730363681164,
    "y": 181.12416818756873,
    "z": -282.595626158962,
    "zoom": 1.7917714317777194
  },
  "version": "1.0"
};

let content = fs.readFileSync("src/hooks/useSimulationState.ts", "utf8");

const startStr = "export const DEFAULTS = {";
const startIdx = content.indexOf(startStr);
const endStr = "export function useSimulationState()";
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  let defaultsStr = "export const DEFAULTS: Record<string, any> = " + JSON.stringify(newDefaults, null, 2);
  content = content.slice(0, startIdx) + defaultsStr + ";\n\n" + content.slice(endIdx);
}

fs.writeFileSync("src/hooks/useSimulationState.ts", content);
console.log("Updated DEFAULTS cleanly in useSimulationState.ts");
