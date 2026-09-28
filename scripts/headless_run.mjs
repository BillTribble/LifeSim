#!/usr/bin/env node
// Headless-Chrome run of LifeSim: screenshots, console capture, log slice, metrics.
//
// Usage:
//   node scripts/headless_run.mjs --url=http://localhost:8080/LifeSim/ --repoDir=$HOME/LifeSim \
//     [--seconds=90] [--speed=19.9] [--shots=15] [--out=test_results/x] [--label=modified]
//
// Speed / dial isolation: each run uses a brand-new temporary Chrome profile, so
// localStorage starts empty (no persisted dial overrides from the user's browser).
// Before any app script runs, an init script writes `lifesim_schema_ver` (read from
// <repoDir>/src/hooks/SimulationDefaults.ts so checkSchemaVersion() does not wipe
// storage) plus `speed`/`timeScale`/`slowMotion` = --speed. getStoredTimeScale()
// reads these at startup. The effective speed is verified from the SESSION START
// DIALS line (`speed=`). Without --speed, storage is left empty => code defaults.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { parseLine, sessionOf, sessionStarts, parseDials, computeMetrics, headline } from './lib/sim_metrics.mjs';

export function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) continue;
    a[m[1]] = m[2] !== undefined ? m[2] : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true');
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const GL_FLAGS = {
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  'angle-swiftshader': ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  egl: ['--use-gl=egl'],
};

function readSchema(repoDir) {
  try {
    const src = fs.readFileSync(path.join(repoDir, 'src/hooks/SimulationDefaults.ts'), 'utf8');
    return /CURRENT_SCHEMA\s*=\s*["']([^"']+)["']/.exec(src)?.[1] ?? null;
  } catch { return null; }
}

function readLogSince(logPath, startMs) {
  if (!fs.existsSync(logPath)) return [];
  const out = [];
  for (const raw of fs.readFileSync(logPath, 'utf8').split('\n')) {
    const l = parseLine(raw);
    if (l && l.t >= startMs) out.push(l);
  }
  return out;
}

export async function run(opts) {
  const seconds = +(opts.seconds ?? 90), shots = +(opts.shots ?? 15);
  const speed = opts.speed != null && opts.speed !== 'true' ? +opts.speed : null;
  const label = opts.label || 'run';
  const repoDir = path.resolve(opts.repoDir || process.cwd());
  const out = path.resolve(opts.out || path.join('test_results', `${label}_${Date.now()}`));
  const gl = opts.gl || 'swiftshader';
  fs.mkdirSync(out, { recursive: true });
  const consoleLog = fs.createWriteStream(path.join(out, 'console.log'));
  const clog = (s) => consoleLog.write(`${new Date().toISOString()} ${s}\n`);
  const schema = readSchema(repoDir);
  const myCodes = new Set(); // session codes observed in *this page's* /api/log POSTs
  let postedLines = 0;

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifesim-chrome-'));
  // SwiftShader is CPU/fragment-bound: a smaller --size (e.g. 800x450) raises fps.
  const [W, H] = String(opts.size || '1280x720').split('x').map(Number);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, userDataDir, protocolTimeout: 120000,
    defaultViewport: { width: W, height: H },
    args: ['--headless=new', '--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl',
      `--window-size=${W},${H}`, '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--autoplay-policy=no-user-gesture-required', ...(GL_FLAGS[gl] || GL_FLAGS.swiftshader)],
  });
  const result = { label, url: opts.url, repoDir, out, seconds, requested_speed: speed, gl, size: `${W}x${H}`, schema };
  try {
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') clog(`[console.${m.type()}] ${m.text()}`);
      else if (m.text().startsWith('[vite]')) {
        clog(`[hmr] ${m.text()}`);
        if (!/connect(ing|ed)/.test(m.text())) result.hmr_events = (result.hmr_events || 0) + 1; // updates/reloads only
      }
    });
    page.on('pageerror', (e) => clog(`[pageerror] ${e.message}\n${e.stack || ''}`));
    page.on('requestfailed', (r) => { if (!r.url().includes('/api/log')) clog(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`); });
    page.on('request', (r) => {
      if (!r.url().includes('/api/log') || r.method() !== 'POST') return;
      postedLines++;
      const code = sessionOf(r.postData() || '');
      const m = /=== SESSION (?:START|RESTART) \[([^\]]+)\]/.exec(r.postData() || '');
      if (m) myCodes.add(m[1]); else if (code && myCodes.size === 0) myCodes.add(code);
    });
    const renderEvery = Math.max(1, +(opts.renderEvery || 1));
    result.render_every = renderEvery;
    const extraLS = Object.fromEntries(String(opts.set || '').split(',').filter((s) => s.includes('='))
      .map((s) => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]));
    result.local_storage_overrides = extraLS;
    await page.evaluateOnNewDocument((schemaVer, spd, every, extra) => {
      try {
        window.__harnessFrames = 0; window.__harnessT0 = performance.now();
        const tick = () => { window.__harnessFrames++; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        // Fast mode: the engine ticks once per rAF, and SwiftShader rendering caps rAF
        // at ~1-20 fps. Skip clear/draw calls to the *default* framebuffer except every
        // Nth frame (or when forced for a screenshot). FBO draws (e.g. screen-fill
        // readback) are untouched. Sim logic is unchanged; only presentation is thinned.
        if (every > 1) {
          for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) {
            const bind = P.bindFramebuffer;
            P.bindFramebuffer = function (t, fb) { this.__fb = fb; return bind.call(this, t, fb); };
            for (const fn of ['clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
              const orig = P[fn]; if (!orig) continue;
              P[fn] = function (...a) {
                if (!this.__fb && !window.__harnessForceDraw && window.__harnessFrames % every !== 0) return;
                return orig.apply(this, a);
              };
            }
          }
        }
        if (sessionStorage.getItem('__harness_init')) return; // only on first load
        sessionStorage.setItem('__harness_init', '1');
        localStorage.clear();
        if (schemaVer) localStorage.setItem('lifesim_schema_ver', schemaVer);
        if (spd != null && schemaVer) for (const k of ['speed', 'timeScale', 'slowMotion']) localStorage.setItem(k, String(spd));
        if (schemaVer) for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
      } catch (e) { console.error('harness init failed', e); }
    }, schema, speed, renderEvery, extraLS);

    const startMs = Date.now();
    result.run_start = new Date(startMs).toISOString();
    await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    result.webgl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2') || c.getContext('webgl');
      if (!g) return null;
      const d = g.getExtension('WEBGL_debug_renderer_info');
      return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
    });
    clog(`[harness] WebGL renderer: ${result.webgl}`);

    const shotFiles = [];
    const takeShot = async (tag) => {
      const f = path.join(out, `shot_${tag}.png`);
      try {
        if (renderEvery > 1) { // force a couple of real frames so the PNG is current
          await page.evaluate(() => new Promise((r) => { window.__harnessForceDraw = true; requestAnimationFrame(() => requestAnimationFrame(r)); }));
        }
        await page.screenshot({ path: f }); shotFiles.push(path.basename(f));
      } catch (e) { clog(`[harness] screenshot failed: ${e.message}`); }
      if (renderEvery > 1) await page.evaluate(() => { window.__harnessForceDraw = false; }).catch(() => {});
    };
    const endAt = startMs + seconds * 1000;
    let nextShot = startMs + Math.min(shots, 5) * 1000; // early shot to catch blank starts
    const frameSamples = [[startMs, 0]]; // [wall ms, rAF frames] for mapping log times → frame index
    let nextSample = startMs;
    while (Date.now() < endAt) {
      if (Date.now() >= nextShot) {
        await takeShot(String(Math.round((Date.now() - startMs) / 1000)).padStart(4, '0') + 's');
        nextShot += shots * 1000;
      }
      if (Date.now() >= nextSample) {
        const n = await page.evaluate(() => window.__harnessFrames || 0).catch(() => null);
        if (n != null) frameSamples.push([Date.now(), n]);
        nextSample += 2000;
      }
      await sleep(Math.max(50, Math.min(500, nextShot - Date.now(), endAt - Date.now())));
    }
    await takeShot('final');
    result.shots = shotFiles;
    result.page_fps = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); };
      requestAnimationFrame(f);
    })).catch(() => null);
    await sleep(1500); // let final log POSTs flush
    result.run_end = new Date().toISOString();
    // The engine advances engine.time += timeScale once per rAF frame (no dt), so
    // sim progress scales with fps. Normalise by frames so headless (~20 fps
    // SwiftShader) and different builds can be compared per unit of sim time.
    const fr = await page.evaluate(() => ({ n: window.__harnessFrames || 0, t: performance.now() - (window.__harnessT0 || 0) })).catch(() => ({ n: 0, t: 0 }));
    result.frames = fr.n;
    result.mean_fps = fr.t > 0 ? Math.round((fr.n / (fr.t / 1000)) * 10) / 10 : null;

    // ---- log slice ----
    const all = readLogSince(path.join(repoDir, 'simulation.log'), startMs);
    const starts = sessionStarts(all).filter((s) => myCodes.has(s.code));
    result.session_codes = [...myCodes];
    result.posted_lines = postedLines;
    result.other_sessions_in_window = [...new Set(all.map((l) => sessionOf(l.body)).filter((c) => c && !myCodes.has(c)))];
    const mine = all.filter((l) => myCodes.has(sessionOf(l.body)));
    fs.writeFileSync(path.join(out, 'sim_excerpt.log'), mine.map((l) => `${l.ts} - ${l.body}`).join('\n') + '\n');
    const dials = starts.length ? parseDials(starts[0].dials) : {};
    result.dials = dials;
    result.effective_speed = dials.speed != null ? +dials.speed : null;
    result.speed_ok = speed == null ? null : result.effective_speed === speed;
    frameSamples.push([Date.now(), result.frames]);
    const metrics = computeMetrics(mine, startMs, frameSamples);
    // NOTE: births_per_1k_frames uses raw rAF frames (matches the tsx harness's frames/60 sim-s).
    // sim_seconds_60fps_equiv additionally multiplies by speed (engine.time += timeScale per frame).
    const simS = (result.frames * (result.effective_speed ?? 1)) / 60;
    metrics.sim_seconds_60fps_equiv = Math.round(simS);
    metrics.frames = result.frames;
    metrics.births_per_1k_frames = result.frames > 0 ? Math.round((metrics.births / result.frames) * 1000 * 100) / 100 : null;
    metrics.mean_fps = result.mean_fps;
    metrics.births_per_sim_min = simS > 0 ? Math.round((metrics.births / simS) * 60 * 100) / 100 : null;
    result.log_lines = mine.length;
    consoleLog.end();
    await new Promise((r) => consoleLog.on('finish', r));
    result.console_errors = fs.readFileSync(path.join(out, 'console.log'), 'utf8').split('\n').filter((l) => /\[(pageerror|console\.error)\]/.test(l)).length;
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ ...result, metrics }, null, 2));
    writeSummary(out, result, metrics);
    return { ...result, metrics };
  } finally {
    await browser.close().catch(() => {});
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

function writeSummary(out, r, m) {
  const h = headline(m);
  const lines = [
    `# LifeSim headless run: ${r.label}`, '',
    `- URL: ${r.url}`, `- Run: ${r.run_start} → ${r.run_end} (${r.seconds}s requested)`,
    `- Session code(s): ${r.session_codes.join(', ') || 'NONE FOUND'}; log lines: ${r.log_lines}`,
    `- Speed: requested=${r.requested_speed ?? 'default'} effective(DIALS)=${r.effective_speed} ${r.speed_ok === false ? '**MISMATCH**' : ''}`,
    `- WebGL: ${r.webgl}; page rAF fps at end: ${r.page_fps}`,
    `- Console/page errors: ${r.console_errors} (see console.log)`,
    r.other_sessions_in_window.length ? `- Note: other sessions wrote to the same log in this window (ignored): ${r.other_sessions_in_window.join(', ')}` : null,
    '', '| metric | value |', '|---|---|',
    ...Object.entries(h).map(([k, v]) => `| ${k} | ${v ?? '—'} |`),
    '', '## Screenshots', ...r.shots.map((s) => `![${s}](${s})`),
  ];
  fs.writeFileSync(path.join(out, 'summary.md'), lines.filter((l) => l !== null).join('\n') + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.url) { console.error('missing --url'); process.exit(2); }
  run(a).then((r) => {
    console.log(JSON.stringify({ out: r.out, sessions: r.session_codes, speed: r.effective_speed, webgl: r.webgl, errors: r.console_errors, ...headline(r.metrics) }, null, 2));
  }).catch((e) => { console.error(e); process.exit(1); });
}
