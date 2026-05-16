const fs = require('fs');

const files = [
  'src/components/HUD.tsx',
  'src/components/MutationPanel.tsx',
  'src/lib/SimulationUpdate.ts',
  'src/lib/SimulationUpdateAgents.ts',
  'src/lib/SimulationGenetics.ts',
  'src/lib/SimulationEngine.ts',
  'src/utils/colors.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/\\`/g, '`');
    text = text.replace(/\\\$/g, '$');
    fs.writeFileSync(file, text);
    console.log(`Fixed ${file}`);
  }
}
