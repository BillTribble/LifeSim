import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Add Dial to imports
text = text.replace("import { Activity", "import { Dial } from './components/Dial';\nimport { Activity")

# Add tideSaturation to DEFAULTS
text = text.replace("tideOpacity: 0.5,", "tideOpacity: 0.5,\n  tideSaturation: 1.0,")

# Add tideSaturation state
text = text.replace("const [tideOpacity, setTideOpacity] = useState(() => parseFloat(localStorage.getItem('tideOpacity') || DEFAULTS.tideOpacity.toString()));", "const [tideOpacity, setTideOpacity] = useState(() => parseFloat(localStorage.getItem('tideOpacity') || DEFAULTS.tideOpacity.toString()));\n  const [tideSaturation, setTideSaturation] = useState(() => parseFloat(localStorage.getItem('tideSaturation') || DEFAULTS.tideSaturation.toString()));")

# Update localStorage setItem and dependencies
text = text.replace("localStorage.setItem('tideOpacity', tideOpacity.toString());", "localStorage.setItem('tideOpacity', tideOpacity.toString());\n    localStorage.setItem('tideSaturation', tideSaturation.toString());")
text = text.replace("tideOpacity, growthSpeed, diebackRate,", "tideOpacity, tideSaturation, growthSpeed, diebackRate,")

# Add setTideSaturation default reset
text = text.replace("setTideOpacity(DEFAULTS.tideOpacity);", "setTideOpacity(DEFAULTS.tideOpacity);\n    setTideSaturation(DEFAULTS.tideSaturation);")

# Update App to pass tideSaturation downstream
text = text.replace("tideOpacity={tideOpacity}", "tideOpacity={tideOpacity}\n        tideSaturation={tideSaturation}")

# Let's replace inputs with Dials string by string

# tideOpacity -> Dial
text = re.sub(
    r'<div className="flex flex-col gap-1.5">\s*<span className="opacity-80">OPACITY: \{tideOpacity.toFixed\(2\)\}</span>\s*<input type="range" min="0" max="1" step="0.05" value=\{tideOpacity\} onChange=\{\(e\) => setTideOpacity\(parseFloat\(e.target.value\)\)\} className="accent-purple-500 w-full h-1"/>\s*</div>',
    r'<div className="flex justify-between gap-2">\n                  <Dial label="OPACITY" min={0} max={1} step={0.05} value={tideOpacity} onChange={setTideOpacity} color="#a855f7" />\n                  <Dial label="SATURATION" min={0} max={2} step={0.1} value={tideSaturation} onChange={setTideSaturation} color="#a855f7" />\n               </div>',
    text
)

# tideThickness -> Dial
text = re.sub(
    r'<div className="flex flex-col gap-1.5">\s*<span className="opacity-80">THICKNESS: \{tideThickness.toFixed\(0\)\}</span>\s*<input type="range" min="10" max="400" step="10" value=\{tideThickness\} onChange=\{\(e\) => setTideThickness\(parseFloat\(e.target.value\)\)\} className="accent-purple-500 w-full h-1"/>\s*</div>',
    r'<div className="flex flex-col gap-2 mt-2">\n                  <div className="flex justify-between items-center px-4"><span className="opacity-80 text-[10px]">THICKNESS: {tideThickness.toFixed(0)}</span><Dial min={10} max={400} step={10} value={tideThickness} onChange={setTideThickness} color="#a855f7" /></div>\n               </div>',
    text
)

# Oh wait, we wanted to move tideSpeed into Cloud panel. Let's remove tideSpeed from main HUD inputs to Cloud panel.
tide_speed_input = re.search(r'<div className="flex flex-col gap-1">\s*<span className="text-\[10px\] opacity-60">TIDE_SPEED</span>\s*<input\s*type="range" min="0.5" max="4.0" step="0.1"\s*value=\{tideSpeed\}\s*onChange=\{\(e\) => setTideSpeed\(parseFloat\(e.target.value\)\)\}\s*className="accent-\[#FF4500\] w-24 h-1"\s*/>\s*</div>', text)
if tide_speed_input:
    text = text.replace(tide_speed_input.group(0), "")
    
    # insert it into cloud panel with dial
    text = text.replace(
        r'<div className="flex justify-between gap-2">',
        r'<div className="flex justify-between gap-2">\n                  <Dial label="SPEED" min={0.5} max={4.0} step={0.1} value={tideSpeed} onChange={setTideSpeed} color="#a855f7" />\n                  '
    )

# Now, convert all remaining `<input type="range" ... />` blocks to Dials in the main bar.
# These blocks usually look like: 
# <div className="flex flex-col gap-1">
#   <span className="text-[10px] opacity-60">ROTATION</span>
#   <input ... />
# </div>

import re

def replacer(match):
    label_text = match.group(1)
    min_val = match.group(2)
    max_val = match.group(3)
    step_val = match.group(4)
    val_name = match.group(5)
    set_name = match.group(6)
    color = match.group(7)
    return f'<Dial label="{label_text}" min={{{min_val}}} max={{{max_val}}} step={{{step_val}}} value={{{val_name}}} onChange={{{set_name}}} color="{color}" />'

pattern = r'<div className="flex flex-col gap-1">\s*<span className="text-\[10px\] opacity-60">([^<]+)</span>\s*<input\s*type="range"\s*min="([^"]+)"\s*max="([^"]+)"\s*step="([^"]+)"\s*value=\{([^}]+)\}\s*onChange=\{\(e\) => ([^\(]+)\(parseFloat\(e.target.value\)\)\}\s*className="accent-\[([^\]]+)\][^"]*"\s*/>\s*</div>'

text = re.sub(pattern, replacer, text)

with open('src/App.tsx', 'w') as f:
    f.write(text)

