#!/usr/bin/env node
// Runs the baseline (pristine worktree) and modified LifeSim with identical args
// and writes test_results/<timestamp>/{baseline,modified}/ + comparison.md.
//
// Usage:
//   node scripts/headless_compare.mjs [--seconds=90] [--speed=19.9] [--shots=15] [--parallel]
//     [--baseUrl=http://localhost:8091/LifeSim/] [--baseRepo=$HOME/LifeSim_baseline_wt]
//     [--modUrl=http://localhost:8080/LifeSim/] [--modRepo=$HOME/LifeSim] [--tag=name]
//     [--only=baseline|modified] [--outRoot=test_results]
// Default is sequential (baseline, then modified) so the two software-rendered
// Chromes don't compete for CPU; --parallel halves wall time but both runs slow down.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, parseArgs } from './headless_run.mjs';
import { headline } from './lib/sim_metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const HOME = os.homedir();

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function fmtDelta(b, m) {
  if (typeof b !== 'number' || typeof m !== 'number') return '';
  const d = m - b;
  const pct = b !== 0 ? ` (${d >= 0 ? '+' : ''}${Math.round((d / Math.abs(b)) * 100)}%)` : '';
  return `${d >= 0 ? '+' : ''}${Math.round(d * 100) / 100}${pct}`;
}

export function comparisonMarkdown(args, results) {
  const b = results.baseline, m = results.modified;
  const hb = b ? headline(b.metrics) : {}, hm = m ? headline(m.metrics) : {};
  const keys = [...new Set([...Object.keys(hb), ...Object.keys(hm)])];
  const meta = (r) => r ? `${r.session_codes.join(',') || 'NONE'} · speed=${r.effective_speed} · ${r.log_lines} lines · errors=${r.console_errors} · rAF fps=${r.page_fps}` : '—';
  const out = [
    `# LifeSim headless comparison`, '',
    `- Args: seconds=${args.seconds ?? 90} speed=${args.speed ?? 'default'} shots=${args.shots ?? 15} mode=${args.parallel ? 'parallel' : 'sequential'}`,
    `- Baseline: ${b?.url ?? '—'} — ${meta(b)}`,
    `- Modified: ${m?.url ?? '—'} — ${meta(m)}`, '',
    '| metric | baseline | modified | Δ |', '|---|---|---|---|',
    ...keys.map((k) => `| ${k} | ${hb[k] ?? '—'} | ${hm[k] ?? '—'} | ${fmtDelta(hb[k], hm[k])} |`),
  ];
  for (const [name, r] of Object.entries(results)) {
    if (r?.speed_ok === false) out.push('', `> **WARNING** ${name}: requested speed ${r.requested_speed} but DIALS reported ${r.effective_speed}.`);
    if (r && !r.session_codes.length) out.push('', `> **WARNING** ${name}: no session code captured — metrics are empty.`);
  }
  out.push('', 'Single-seed stochastic runs: treat small deltas as noise; repeat before concluding.');
  const lastShot = (name) => results[name]?.shots?.slice(-1)[0];
  out.push('', '## Final frames', '', '| baseline | modified |', '|---|---|',
    `| ${lastShot('baseline') ? `![](baseline/${lastShot('baseline')})` : '—'} | ${lastShot('modified') ? `![](modified/${lastShot('modified')})` : '—'} |`);
  return out.join('\n') + '\n';
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const root = path.resolve(a.outRoot || path.join(REPO, 'test_results'), stamp() + (a.tag ? `_${a.tag}` : ''));
  fs.mkdirSync(root, { recursive: true });
  const common = { seconds: a.seconds ?? 90, shots: a.shots ?? 15, speed: a.speed, gl: a.gl, size: a.size, renderEvery: a.renderEvery, set: a.set };
  const jobs = {
    baseline: { ...common, label: 'baseline', url: a.baseUrl || 'http://localhost:8091/LifeSim/', repoDir: a.baseRepo || path.join(HOME, 'LifeSim_baseline_wt'), out: path.join(root, 'baseline') },
    modified: { ...common, label: 'modified', url: a.modUrl || 'http://localhost:8080/LifeSim/', repoDir: a.modRepo || REPO, out: path.join(root, 'modified') },
  };
  const names = a.only ? [a.only] : ['baseline', 'modified'];
  const results = {};
  const go = async (n) => {
    console.error(`[compare] starting ${n} → ${jobs[n].out}`);
    try { results[n] = await run(jobs[n]); } catch (e) { console.error(`[compare] ${n} failed:`, e); results[n] = null; }
  };
  if (a.parallel) await Promise.all(names.map(go)); else for (const n of names) await go(n);
  const md = comparisonMarkdown(a, results);
  fs.writeFileSync(path.join(root, 'comparison.md'), md);
  console.log(md);
  console.log(`\n[compare] results: ${root}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
