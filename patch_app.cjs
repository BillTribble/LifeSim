const fs = require('fs');

let text = fs.readFileSync('src/App.tsx', 'utf8');

// Add Dial to imports
text = text.replace("import { Activity", "import { Dial } from './components/Dial';\nimport { Activity");

// Add tideSaturation to DEFAULTS
text = text.replace("tideOpacity: 0.5,", "tideOpacity: 0.5,\n  tideSaturation: 1.0,");

// Add tideSaturation state
text = text.replace("const [tideOpacity, setTideOpacity] = useState(() => parseFloat(localStorage.getItem('tideOpacity') || DEFAULTS.tideOpacity.toString()));", "const [tideOpacity, setTideOpacity] = useState(() => parseFloat(localStorage.getItem('tideOpacity') || DEFAULTS.tideOpacity.toString()));\n  const [tideSaturation, setTideSaturation] = useState(() => parseFloat(localStorage.getItem('tideSaturation') || DEFAULTS.tideSaturation.toString()));");

// Update localStorage setItem and dependencies
text = text.replace("localStorage.setItem('tideOpacity', tideOpacity.toString());", "localStorage.setItem('tideOpacity', tideOpacity.toString());\n    localStorage.setItem('tideSaturation', tideSaturation.toString());");
text = text.replace("tideOpacity, growthSpeed, diebackRate,", "tideOpacity, tideSaturation, growthSpeed, diebackRate,");

// Add setTideSaturation default reset
text = text.replace("setTideOpacity(DEFAULTS.tideOpacity);", "setTideOpacity(DEFAULTS.tideOpacity);\n    setTideSaturation(DEFAULTS.tideSaturation);");

// Update App to pass tideSaturation downstream
text = text.replace("tideOpacity={tideOpacity}", "tideOpacity={tideOpacity}\n        tideSaturation={tideSaturation}");

// tideOpacity -> Dial
text = text.replace(
    /<div className="flex flex-col gap-1\.5">\s*<span className="opacity-80">OPACITY: \{tideOpacity\.toFixed\(2\)\}<\/span>\s*<input type="range" min="0" max="1" step="0\.05" value=\{tideOpacity\} onChange=\{\(e\) => setTideOpacity\(parseFloat\(e\.target\.value\)\)\} className="accent-purple-500 w-full h-1"\/>\s*<\/div>/,
    '<div className="flex justify-between gap-2">\n                  <Dial label="OPACITY" min={0} max={1} step={0.05} value={tideOpacity} onChange={setTideOpacity} color="#a855f7" />\n                  <Dial label="SATURATION" min={0} max={2} step={0.1} value={tideSaturation} onChange={setTideSaturation} color="#a855f7" />\n               </div>'
);

// tideThickness -> Dial
text = text.replace(
    /<div className="flex flex-col gap-1\.5">\s*<span className="opacity-80">THICKNESS: \{tideThickness\.toFixed\(0\)\}<\/span>\s*<input type="range" min="10" max="400" step="10" value=\{tideThickness\} onChange=\{\(e\) => setTideThickness\(parseFloat\(e\.target\.value\)\)\} className="accent-purple-500 w-full h-1"\/>\s*<\/div>/,
    '<div className="flex flex-col gap-2 mt-2">\n                  <div className="flex justify-between items-center px-4"><span className="opacity-80 text-[10px] w-16">THICKNESS</span><Dial min={10} max={400} step={10} value={tideThickness} onChange={setTideThickness} color="#a855f7" /></div>\n               </div>'
);

// tideSpeed -> move from HUD to Cloud Panel
const tideSpeedRegex = /<div className="flex flex-col gap-1">\s*<span className="text-\[10px\] opacity-60">TIDE_SPEED<\/span>\s*<input\s*type="range" min="0\.5" max="4\.0" step="0\.1"\s*value=\{tideSpeed\}\s*onChange=\{\(e\) => setTideSpeed\(parseFloat\(e\.target\.value\)\)\}\s*className="accent-\[#FF4500\] w-24 h-1"\s*\/>\s*<\/div>/;
const match = text.match(tideSpeedRegex);
if (match) {
    text = text.replace(match[0], "");
    text = text.replace(
        '<div className="flex justify-between gap-2">',
        '<div className="flex justify-between gap-2">\n                  <Dial label="SPEED" min={0.5} max={4.0} step={0.1} value={tideSpeed} onChange={setTideSpeed} color="#a855f7" />\n                  '
    );
}

// Convert all the other inputs to Dials
const inputPattern = /<div className="flex flex-col gap-1">\s*<span className="text-\[10px\] opacity-60">([^<]+)<\/span>\s*<input\s*type="range" min="([^"]+)" max="([^"]+)" step="([^"]+)"\s*value=\{([^}]+)\}\s*onChange=\{\(e\) => ([^\(]+)\(parseFloat\(e\.target\.value\)\)\}\s*className="accent-\[([^\]]+)\][^"]*"\s*\/>\s*<\/div>/g;

text = text.replace(inputPattern, (m, label, min, max, step, val, setter, color) => {
    return `<Dial label="${label}" min={${min}} max={${max}} step={${step}} value={${val}} onChange={${setter}} color="${color}" />`;
});

fs.writeFileSync('src/App.tsx', text);

