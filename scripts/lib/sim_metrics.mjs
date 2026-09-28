// Parses LifeSim simulation.log lines (`<ISO ts> - <msg>`) into run metrics.
// Ported from the orchestrator's analyze_log.py + ghost_metric.py, extended for
// [HEALTH] / [FEELER_END] instrumentation when present.

const TS_RE = /^(\S+Z) - (.*)$/;
const SESS_RE = /=== SESSION (START|RESTART) \[([^\]]+)\] === \| DIALS: (.*)/;
const SNAP_RE = /\[SNAPSHOT\] \[([^\]]+)\] species=(\d+) agents=(\d+) geom=(\d+)/;
const FILL_RE = /\[SCREEN_FILL\] total=([\d.]+)%/;
const GEOM_RE = /\[GEOM\] live=(\d+) dying=(\d+) empty=(\d+) meshCount=(\d+) \| agents=(\d+)/;
const BIRTH_RE = /Offspring (.+?) \[(\w+)\] spawned from (.+?) × (.+?) \(Mating:/;
const ERAD_RE = /Species (.+?) \[(\w+)\] was fully eradicated/;
const FEELER_RE = /extending sensory feelers (?:toward (.+?)|to breed) \(Age (\d+)\)/;
const TAG_RE = /^\[([^\]]+)\]\s*(.*)$/;

export const parseTs = (s) => Date.parse(s);

export function parseLine(line) {
  const m = TS_RE.exec(line.replace(/\r?\n$/, ''));
  return m ? { t: parseTs(m[1]), ts: m[1], body: m[2] } : null;
}

/** Session code that a log body belongs to (SESSION/SNAPSHOT/tagged). */
export function sessionOf(body) {
  let m = SESS_RE.exec(body);
  if (m) return m[2];
  m = SNAP_RE.exec(body);
  if (m) return m[1];
  m = TAG_RE.exec(body);
  return m ? m[1] : null;
}

export function sessionStarts(lines) {
  const out = [];
  for (const l of lines) {
    const m = SESS_RE.exec(l.body);
    if (m) out.push({ kind: m[1], code: m[2], dials: m[3], t: l.t });
  }
  return out;
}

export function parseDials(dials) {
  const o = {};
  for (const kv of (dials || '').split(/\s+/)) {
    const i = kv.indexOf('=');
    if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1);
  }
  return o;
}

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);

function listInside(body, key) {
  const m = new RegExp(`${key}=\\[(.*?)\\]`).exec(body);
  if (!m || !m[1].trim()) return [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

function parseLiveSegs(body) {
  const segs = {};
  for (const part of listInside(body, 'liveSegs')) {
    const i = part.lastIndexOf(':');
    if (i > 0 && /^\d+$/.test(part.slice(i + 1).trim())) segs[part.slice(0, i).trim()] = +part.slice(i + 1);
  }
  return segs;
}

/** SNAPSHOT species summary: `Name(biomass[,DYING]), ...` segment. */
function parseSnapshotStrains(body) {
  const parts = body.split(' | ');
  const seg = parts.slice(1).find((p) => !p.startsWith('[SCREEN_FILL]') && !p.startsWith('DIALS:'));
  if (!seg) return null;
  const out = [];
  const re = /(.+?)\((\d+(?:\.\d+)?)(,DYING)?\)(?:, |$)/g;
  let m;
  while ((m = re.exec(seg))) out.push({ name: m[1].trim(), biomass: +m[2], dying: !!m[3] });
  return out;
}

function slope(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? num / den : null;
}

/** Generic `key=value` numeric extraction for new instrumentation lines. */
function numericKVs(body) {
  const o = {};
  const re = /([A-Za-z_][\w.]*)=(-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(body))) o[m[1]] = +m[2];
  return o;
}

/**
 * @param lines parsed lines ({t, ts, body}) already restricted to this run's session codes
 * @param runStartMs wall-clock ms when the run started (for relative times)
 */
export function computeMetrics(lines, runStartMs, frameSamples = null) {
  const rel = (t) => r2((t - runStartMs) / 1000);
  // Map a wall-clock ms to the page's rAF frame index by linear interpolation of samples.
  const fAt = (t) => {
    if (!frameSamples || frameSamples.length < 2) return null;
    let i = 1;
    while (i < frameSamples.length - 1 && frameSamples[i][0] < t) i++;
    const [t0, f0] = frameSamples[i - 1], [t1, f1] = frameSamples[i];
    return Math.round(t1 > t0 ? f0 + ((f1 - f0) * (t - t0)) / (t1 - t0) : f1);
  };
  const births = [], erads = [], feelers = [], snaps = [], geoms = [], health = [], feelerEnd = [], ghostSweeps = [];
  let sacrifice = 0, capacity = 0, ratioCull = 0, matingEol = 0;
  let lastLiving = null; // Set of living organism names from latest SNAPSHOT
  for (const { t, body } of lines) {
    if (body.includes('[SNAPSHOT]')) {
      const m = SNAP_RE.exec(body); if (!m) continue;
      const strains = parseSnapshotStrains(body);
      const living = strains ? strains.filter((s) => !s.dying) : null;
      if (living) lastLiving = new Set(living.map((s) => s.name));
      const f = FILL_RE.exec(body);
      snaps.push({ t: rel(t), f: fAt(t), species: +m[2], agents: +m[3], geom: +m[4], fill: f ? +f[1] : null,
        living: living ? living.length : null,
        medianBiomass: living && living.length ? median(living.map((s) => s.biomass)) : null });
      continue;
    }
    if (body.includes('[GEOM]')) {
      const g = GEOM_RE.exec(body); if (!g) continue;
      const segs = parseLiveSegs(body);
      const dying = new Set(listInside(body, 'dyingStrains'));
      const withSegs = Object.keys(segs).filter((k) => !k.startsWith('Feeler-'));
      const liveNotDying = withSegs.filter((k) => !dying.has(k));
      const ghosts = lastLiving ? liveNotDying.filter((k) => !lastLiving.has(k)) : null;
      geoms.push({ t: rel(t), f: fAt(t), live: +g[1], dying: +g[2], agents: +g[5], strainsWithSegs: withSegs.length,
        liveNotDying: liveNotDying.length, ghosts: ghosts ? ghosts.length : null,
        ghostSegs: ghosts ? ghosts.reduce((a, k) => a + segs[k], 0) : null });
      continue;
    }
    if (body.includes('[HEALTH]')) { health.push({ t: rel(t), f: fAt(t), ...numericKVs(body.split('[HEALTH]')[1]) }); continue; }
    if (body.includes('[FEELER_END]')) {
      const m = /len=(-?\d+(?:\.\d+)?)/.exec(body);
      const rs = /reason=(\S+)/.exec(body);
      feelerEnd.push({ t: rel(t), f: fAt(t), len: m ? +m[1] : null, reason: rs ? rs[1] : null });
      continue;
    }
    if (body.includes('[GHOST]')) {
      const m = /swept (\d+) strains \/ (\d+) segs/.exec(body);
      if (m) ghostSweeps.push({ t: rel(t), strains: +m[1], segs: +m[2] });
      continue;
    }
    let m;
    if ((m = BIRTH_RE.exec(body))) { births.push({ t, f: fAt(t), name: m[1], arch: m[2], a: m[3], b: m[4] }); continue; }
    if ((m = ERAD_RE.exec(body))) { erads.push({ t, name: m[1], arch: m[2] }); continue; }
    if ((m = FEELER_RE.exec(body))) { feelers.push({ t, target: m[1] || null, age: +m[2] }); continue; }
    if (body.includes('entering end-of-life')) {
      if (body.includes('sacrificed for new hybrid birth')) sacrifice++;
      else if (body.includes('maximum species capacity')) capacity++;
      else if (body.includes('dropped below')) ratioCull++;
      else if (body.includes('mating completed')) matingEol++;
    }
  }

  const first = lines.length ? lines[0].t : runStartMs, last = lines.length ? lines[lines.length - 1].t : runStartMs;
  const spanS = Math.max((last - first) / 1000, 1);
  const bornAt = new Map(births.map((b) => [b.name, b.t]));
  const lifespans = erads.filter((e) => bornAt.has(e.name) && e.t >= bornAt.get(e.name))
    .map((e) => (e.t - bornAt.get(e.name)) / 1000);
  const gaps = births.slice(1).map((b, i) => (b.t - births[i].t) / 1000);
  const parentLat = [];
  for (const b of births) for (const p of [b.a, b.b]) if (bornAt.has(p) && b.t > bornAt.get(p)) parentLat.push((b.t - bornAt.get(p)) / 1000);
  const arch = {};
  for (const b of births) arch[b.arch] = (arch[b.arch] || 0) + 1;

  const gT = geoms.map((g) => g.t), gS = geoms.map((g) => g.strainsWithSegs);
  const ghostVals = geoms.map((g) => g.ghosts).filter((x) => x != null);
  const hKeys = new Set(health.flatMap((h) => Object.keys(h).filter((k) => k !== 't')));
  const healthSummary = {};
  for (const k of hKeys) {
    const v = health.map((h) => h[k]).filter((x) => typeof x === 'number');
    healthSummary[k] = { median: r2(median(v)), max: r2(Math.max(...v)), last: v[v.length - 1] };
  }
  const feLens = feelerEnd.map((f) => f.len).filter((x) => x != null);
  // Per-1000-frame buckets (only when frame samples exist).
  const per1k = [];
  if (frameSamples && frameSamples.length > 1) {
    const maxF = frameSamples[frameSamples.length - 1][1];
    for (let b = 0; b * 1000 < maxF; b++) {
      const inB = (x) => x.f != null && x.f >= b * 1000 && x.f < (b + 1) * 1000;
      const hs = health.filter(inB), ss = snaps.filter(inB), gs = geoms.filter(inB);
      const lastOf = (arr, k) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i][k] != null) return arr[i][k]; return null; };
      per1k.push({ kframe: b, births: births.filter(inB).length, feeler_end: feelerEnd.filter(inB).length,
        living: lastOf(hs, 'living') ?? lastOf(ss, 'living'), ghostStrains_max: hs.length ? Math.max(...hs.map((h) => h.ghostStrains ?? 0)) : null,
        geom_ghosts_max: gs.length ? Math.max(...gs.map((g) => g.ghosts ?? 0)) : null, spread: lastOf(hs, 'spread'),
        meanSize: lastOf(hs, 'meanSize'), liveStrainsWithSegs_max: gs.length ? Math.max(...gs.map((g) => g.strainsWithSegs)) : null });
    }
  }

  return {
    span_s: r2(spanS),
    births: births.length,
    births_per_min: r2(births.length / spanS * 60),
    birth_archetypes: arch,
    median_lifespan_s: r2(median(lifespans)), lifespan_samples: lifespans.length,
    median_inter_birth_s: r2(median(gaps)),
    newborn_to_parent_s: r2(median(parentLat)), newborn_to_parent_samples: parentLat.length,
    eradications: erads.length,
    sacrifice_culls: sacrifice, capacity_culls: capacity, ratio_culls: ratioCull, mating_eol: matingEol,
    feeler_emissions: feelers.length,
    feeler_to_feeler_targets: feelers.filter((f) => f.target && f.target.startsWith('Feeler-')).length,
    feeler_median_age: median(feelers.map((f) => f.age)),
    snapshot: {
      n: snaps.length,
      species_median: median(snaps.map((s) => s.species)), species_max: snaps.length ? Math.max(...snaps.map((s) => s.species)) : null,
      living_median: median(snaps.map((s) => s.living).filter((x) => x != null)),
      agents_median: median(snaps.map((s) => s.agents)), agents_max: snaps.length ? Math.max(...snaps.map((s) => s.agents)) : null,
      geom_median: median(snaps.map((s) => s.geom)), geom_last: snaps.length ? snaps[snaps.length - 1].geom : null,
      fill_median: r2(median(snaps.map((s) => s.fill).filter((x) => x != null))),
      organism_biomass_median: r2(median(snaps.map((s) => s.medianBiomass).filter((x) => x != null))),
    },
    ghost: {
      n: geoms.length,
      max_strains_with_live_segs: gS.length ? Math.max(...gS) : null,
      last_strains_with_live_segs: gS.length ? gS[gS.length - 1] : null,
      strains_with_segs_slope_per_min: r2((slope(gT, gS) ?? NaN) * 60),
      ghost_median: median(ghostVals), ghost_max: ghostVals.length ? Math.max(...ghostVals) : null,
      ghost_last: ghostVals.length ? ghostVals[ghostVals.length - 1] : null,
      ghost_slope_per_min: r2((slope(geoms.filter((g) => g.ghosts != null).map((g) => g.t), ghostVals) ?? NaN) * 60),
      dying_median: median(geoms.map((g) => g.dying)),
    },
    health: health.length ? { n: health.length, ...healthSummary } : null,
    feeler_end: feelerEnd.length ? { n: feelerEnd.length, len_median: r2(median(feLens)), len_max: feLens.length ? Math.max(...feLens) : null,
      reasons: feelerEnd.reduce((o, f) => ((o[f.reason] = (o[f.reason] || 0) + 1), o), {}) } : null,
    ghost_sweeps: ghostSweeps.length ? { n: ghostSweeps.length, strains_total: ghostSweeps.reduce((a, g) => a + g.strains, 0), segs_total: ghostSweeps.reduce((a, g) => a + g.segs, 0) } : null,
    per_1k_frames: per1k,
    series: { snapshots: snaps, geom: geoms, health, feeler_end: feelerEnd, ghost_sweeps: ghostSweeps },
  };
}

/** Flat row of headline metrics for tables. */
export function headline(m) {
  return {
    'frames': m.frames ?? null, 'births/1k frames': m.births_per_1k_frames ?? null,
    'births': m.births, 'births/min': m.births_per_min,
    'mean fps (rAF)': m.mean_fps ?? null, 'sim s (60fps-equiv)': m.sim_seconds_60fps_equiv ?? null,
    'births/sim-min': m.births_per_sim_min ?? null, 'median lifespan s': m.median_lifespan_s,
    'median inter-birth s': m.median_inter_birth_s, 'newborn→parent s': m.newborn_to_parent_s,
    'eradications': m.eradications, 'sacrifice culls': m.sacrifice_culls, 'capacity culls': m.capacity_culls,
    'feeler emissions': m.feeler_emissions, 'feeler→Feeler targets': m.feeler_to_feeler_targets,
    'species median': m.snapshot.species_median, 'living organisms median': m.snapshot.living_median,
    'agents median': m.snapshot.agents_median, 'geom last': m.snapshot.geom_last,
    'organism biomass median': m.snapshot.organism_biomass_median, 'screen fill % median': m.snapshot.fill_median,
    'max strains w/ live segs': m.ghost.max_strains_with_live_segs,
    'strains w/ segs slope /min': m.ghost.strains_with_segs_slope_per_min,
    'ghost strains median': m.ghost.ghost_median, 'ghost strains max': m.ghost.ghost_max,
    'ghost slope /min': m.ghost.ghost_slope_per_min,
    'HEALTH fps median': m.health?.fps?.median ?? null, 'HEALTH spread median': m.health?.spread?.median ?? null,
    'HEALTH spread max': m.health?.spread?.max ?? null, 'HEALTH ghostStrains median': m.health?.ghostStrains?.median ?? null,
    'HEALTH ghostStrains max': m.health?.ghostStrains?.max ?? null, 'HEALTH liveStrainsWithSegs max': m.health?.liveStrainsWithSegs?.max ?? null,
    'HEALTH meanSize median': m.health?.meanSize?.median ?? null,
    'FEELER_END n': m.feeler_end?.n ?? null, 'FEELER_END len median': m.feeler_end?.len_median ?? null,
    'FEELER_END len max': m.feeler_end?.len_max ?? null, 'GHOST sweeps (strains/segs)': m.ghost_sweeps ? `${m.ghost_sweeps.strains_total}/${m.ghost_sweeps.segs_total}` : null,
  };
}
