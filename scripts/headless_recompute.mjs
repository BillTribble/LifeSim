#!/usr/bin/env node
// Recompute derived frame metrics (frames, births_per_1k_frames) for existing result dirs
// and regenerate comparison.md. Usage: node scripts/headless_recompute.mjs <resultDir>...
import fs from 'node:fs';
import path from 'node:path';
import { comparisonMarkdown } from './headless_compare.mjs';

for (const root of process.argv.slice(2)) {
  const results = {};
  for (const side of ['baseline', 'modified']) {
    const f = path.join(root, side, 'metrics.json');
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.metrics.frames = j.frames;
    j.metrics.births_per_1k_frames = j.frames > 0 ? Math.round((j.metrics.births / j.frames) * 100000) / 100 : null;
    j.metrics.mean_fps ??= j.mean_fps;
    fs.writeFileSync(f, JSON.stringify(j, null, 2));
    results[side] = j;
  }
  const b = results.baseline || results.modified;
  const args = { seconds: b.seconds, speed: b.requested_speed, shots: 15, parallel: false };
  fs.writeFileSync(path.join(root, 'comparison.md'), comparisonMarkdown(args, results));
  console.log(root, Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { frames: r.frames, births: r.metrics.births, per1k: r.metrics.births_per_1k_frames }])));
}
