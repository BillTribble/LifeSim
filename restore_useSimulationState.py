import re
import json

new_defaults = {
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
  "enableGlow": False,
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
  "snakeStepSize": 1.0,
  "snakeWander": 1.0,
  "bushSpeed": 1,
  "treeSpeed": 1,
  "gingerSpeed": 1,
  "timeScale": 2.12,
  "dialLimits": {
    "DEATH RATE": { "min": 0, "max": 1 },
    "MAGNET": { "min": 0, "max": 10 },
    "BUDGET": { "min": 500, "max": 1000000 }
  },
  "cameraPosition": {
    "x": -26.126347506251534,
    "y": 199.99999999999997,
    "z": 281.6334745124995,
    "zoom": 1
  },
  "version": "1.0"
}

with open("src/hooks/useSimulationState.ts", "r") as f:
    content = f.read()

# Replace DEFAULTS
defaults_str = json.dumps(new_defaults, indent=2)
# Fix the dialLimits type
defaults_str = re.sub(r'"dialLimits": \{[\s\S]*?\},', '"dialLimits": {\n    "DEATH RATE": { "min": 0, "max": 1 },\n    "MAGNET": { "min": 0, "max": 10 },\n    "BUDGET": { "min": 500, "max": 1000000 }\n  } as Record<string, {min: number, max: number}>,', defaults_str)

start_idx = content.find("export const DEFAULTS = {")
if start_idx != -1:
    brace_count = 0
    end_idx = -1
    for i in range(start_idx + len("export const DEFAULTS = ") - 1, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
    
    if end_idx != -1:
        content = content[:start_idx] + "export const DEFAULTS = " + defaults_str + ";" + content[end_idx+1:]

# Add missing useStates
missing_states = [
    "snakeSpeed", "snakeStepSize", "snakeWander", "bushSpeed", "treeSpeed", "gingerSpeed", "timeScale",
    "theme", "themeMorphFreq", "themeMorphSpeed"
]

for state in missing_states:
    setter = "set" + state[0].upper() + state[1:]
    if f"const [{state}, {setter}]" not in content:
        # Find where to insert
        insertion_point = content.find("const [dialLimits, setDialLimits] = useState")
        
        if state == "theme":
            state_str = f"""  const [{state}, {setter}] = useState(() => {{
    const stored = localStorage.getItem("{state}");
    if (stored !== null) return parseInt(stored, 10);
    return DEFAULTS.{state};
  }});
"""
        else:
            state_str = f"""  const [{state}, {setter}] = useState(() =>
    parseFloat(
      localStorage.getItem("{state}") || DEFAULTS.{state}.toString(),
    ),
  );
"""
        content = content[:insertion_point] + state_str + content[insertion_point:]

# Add to returned state object
state_return_idx = content.find("state: {")
if state_return_idx != -1:
    for state in missing_states:
        if not re.search(r"\b" + state + r"\b", content[state_return_idx:content.find("},", state_return_idx)]):
            insert_pos = content.find("\n", state_return_idx) + 1
            content = content[:insert_pos] + f"      {state},\n" + content[insert_pos:]

# Add to returned setters object
setters_return_idx = content.find("setters: {")
if setters_return_idx != -1:
    for state in missing_states:
        setter = "set" + state[0].upper() + state[1:]
        if not re.search(r"\b" + setter + r"\b", content[setters_return_idx:content.find("},", setters_return_idx)]):
            insert_pos = content.find("\n", setters_return_idx) + 1
            content = content[:insert_pos] + f"      {setter},\n" + content[insert_pos:]

# Add localStorage saving
use_effect_idx = content.find("useEffect(() => {")
if use_effect_idx != -1:
    save_str = ""
    for state in missing_states:
        if state not in ["theme", "dialLimits", "cameraPosition"]:
            save_str += f'    localStorage.setItem("{state}", {state}.toString());\n'
    
    # Check if localStorage.setItem("snakeSpeed", ...) is already there
    if 'localStorage.setItem("snakeSpeed"' not in content:
        insert_pos = content.find("    localStorage.setItem(", use_effect_idx)
        content = content[:insert_pos] + save_str + content[insert_pos:]

    # Also make sure they are in the dependency array
    dep_idx = content.find("],", use_effect_idx)
    if dep_idx != -1:
        for state in missing_states:
            if state not in ["theme", "dialLimits", "cameraPosition"]:
                if not re.search(r"\b" + state + r"\b", content[use_effect_idx:dep_idx]):
                    content = content[:dep_idx] + f",\n    {state}" + content[dep_idx:]

with open("src/hooks/useSimulationState.ts", "w") as f:
    f.write(content)
