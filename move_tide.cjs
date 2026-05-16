const fs = require('fs');

let text = fs.readFileSync('src/App.tsx', 'utf8');

const tideSpeedStr = `<Dial label="TIDE_SPEED" min={0} max={5.0} step={0.1} value={tideSpeed} onChange={setTideSpeed} color="#FF4500" />`;
text = text.replace(tideSpeedStr, '');

const insertTarget = `<Dial label="OPACITY" min={0} max={1} step={0.05} value={tideOpacity} onChange={setTideOpacity} color="#a855f7" />`;
const insertion = insertTarget + `\n                  ` + tideSpeedStr;

text = text.replace(insertTarget, insertion);

fs.writeFileSync('src/App.tsx', text);

