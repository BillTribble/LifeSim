const fs = require("fs");

const newDefaults = {
  "theme": 1,
  "themeMorphFreq": 0.61,
  "themeMorphSpeed": 5,
  "rotationSpeed": 0.1,
  "magnetism": 10,
  "proximity": 40,
  "desperation": 7.7,
  "despairAge": 1800,
  "flowerSize": 0.41,
  "entropyThreshold": 0.7,
  "tideSpeed": 0.30000000000000004,
  "tideColor": "#643707",
  "bgColor": "#3e5e41",
  "fogColor": "#000000",
  "tideThickness": 300,
  "tideOpacity": 0.15000000000000002,
  "tideSaturation": 0.4,
  "growthSpeed": 0.30000000000000004,
  "diebackRate": 86.07000000000001,
  "hybridCooldown": 200,
  "hybridStickiness": 7,
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
  "boundarySize": 200,
  "desiccationSpeed": 1.1,
  "hybridSize": 2,
  "terminationProb": 0.02,
  "termProbPostBranch": 1.5,
  "taperDuration": 1,
  "diebackAgeBias": 1.5,
  "branchMutationRate": 0,
  "enableGlow": false,
  "glowSize": 0.5,
  "fogVisibility": 1250,
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
  "snakeSpeed": 1.5,
  "bushSpeed": 1,
  "treeSpeed": 1,
  "gingerSpeed": 1,
  "timeScale": 2.12,
  "dialLimits": {
    "DEATH RATE": {
      "min": 0,
      "max": 1
    },
    "MAGNET": {
      "min": 0,
      "max": 10
    },
    "BUDGET": {
      "min": 500,
      "max": 1000000
    }
  },
  "cameraPosition": {
    "x": -26.126347506251534,
    "y": 199.99999999999997,
    "z": 281.6334745124995,
    "zoom": 1
  },
  "version": "1.0",
  "snakeStepSize": 1.0,
  "snakeWander": 1.0
};

let content = fs.readFileSync("src/hooks/useSimulationState.ts", "utf8");

// replace DEFAULTS
const startStr = "export const DEFAULTS = {";
const startIdx = content.indexOf(startStr);
// find end of DEFAULTS
let endIdx = -1;
let braceCount = 0;
for (let i = startIdx + startStr.length - 1; i < content.length; i++) {
  if (content[i] === "{") braceCount++;
  else if (content[i] === "}") {
    braceCount--;
    if (braceCount === 0) {
      endIdx = i;
      break;
    }
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  let defaultsStr = "export const DEFAULTS = " + JSON.stringify(newDefaults, null, 2);
  // fix dialLimits formatting
  defaultsStr = defaultsStr.replace(/"dialLimits": {[\s\S]*?}/, '"dialLimits": newDefaultsDialLimitsPlaceholder');
  defaultsStr = defaultsStr.replace('newDefaultsDialLimitsPlaceholder', '{\n    "DEATH RATE": { "min": 0, "max": 1 },\n    "MAGNET": { "min": 0, "max": 10 },\n    "BUDGET": { "min": 500, "max": 1000000 }\n  } as Record<string, {min: number, max: number}>');
  
  content = content.slice(0, startIdx) + defaultsStr + ";" + content.slice(endIdx + 2); // +2 for };
}

// Add state for snakeStepSize and snakeWander
if (content.indexOf("const [snakeStepSize, setSnakeStepSize]") === -1) {
  const insertionPoint = content.indexOf('  const [snakeSpeed, setSnakeSpeed] = useState(() =>');
  const newStates = `  const [snakeStepSize, setSnakeStepSize] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeStepSize") || DEFAULTS.snakeStepSize.toString(),
    ),
  );
  const [snakeWander, setSnakeWander] = useState(() =>
    parseFloat(
      localStorage.getItem("snakeWander") || DEFAULTS.snakeWander.toString(),
    ),
  );\n`;
  content = content.slice(0, insertionPoint) + newStates + content.slice(insertionPoint);
}

// Add to returned object
if (content.indexOf("snakeStepSize,") === -1) {
  const returnIdx = content.indexOf('return {');
  const insertReturn = content.indexOf('snakeSpeed,', returnIdx);
  if (insertReturn !== -1) {
    content = content.slice(0, insertReturn) + 'snakeStepSize,\n      snakeWander,\n      ' + content.slice(insertReturn);
  }
  
  const returnSettersIdx = content.indexOf('setters: {');
  const insertReturnSetters = content.indexOf('setSnakeSpeed,', returnSettersIdx);
  if (insertReturnSetters !== -1) {
    content = content.slice(0, insertReturnSetters) + 'setSnakeStepSize,\n        setSnakeWander,\n        ' + content.slice(insertReturnSetters);
  }
}

fs.writeFileSync("src/hooks/useSimulationState.ts", content);
