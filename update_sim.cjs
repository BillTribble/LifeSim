const fs = require('fs');

let text = fs.readFileSync('src/components/SimulationView.tsx', 'utf8');

text = text.replace(
  "tideOpacity?: number,",
  "tideOpacity?: number,\n  tideSaturation?: number,"
);

text = text.replace(
  "tideColorTop, tideColorBottom, tideThickness, tideOpacity, growthSpeed",
  "tideColorTop, tideColorBottom, tideThickness, tideOpacity, tideSaturation, growthSpeed"
);

text = text.replace(
  "if (tideOpacity !== undefined) engineRef.current.tideOpacity = tideOpacity;",
  "if (tideOpacity !== undefined) engineRef.current.tideOpacity = tideOpacity;\n      if (tideSaturation !== undefined) engineRef.current.tideSaturation = tideSaturation;"
);

// one more check for the component signature
text = text.replace(
  "tideColorTop, tideColorBottom, tideThickness, tideOpacity, growthSpeed, diebackRate, ornamentFrequency, branchingMultiplier }: Props & { ",
  "tideColorTop, tideColorBottom, tideThickness, tideOpacity, tideSaturation, growthSpeed, diebackRate, ornamentFrequency, branchingMultiplier }: Props & { "
);

fs.writeFileSync('src/components/SimulationView.tsx', text);

