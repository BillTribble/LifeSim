const fs = require('fs');

const content = fs.readFileSync('src/components/HUD.tsx', 'utf8');
const regex = /<SmartDial[^>]*label="([^"]+)"[^>]*min=\{([0-9.]+)\}[^>]*max=\{([0-9.]+)\}/g;
let match;
const dialLimits = {};

while ((match = regex.exec(content)) !== null) {
  const label = match[1];
  const min = parseFloat(match[2]);
  const max = parseFloat(match[3]);
  dialLimits[label] = { min, max };
}

console.log(JSON.stringify(dialLimits, null, 2));
