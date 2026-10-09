import type { SimulationEngine } from "./SimulationEngine";
import { markDyingHelper } from "./SimulationEngineHelpers";
import { getActiveOwnerNames } from "./SimulationEcology";

/** Wall-clock interval between [HEALTH] lines. */
const HEALTH_INTERVAL_MS = 3000;

interface StrainGeometry {
  liveSegs: Map<string, number>;
  centroids: Map<string, { x: number; y: number; z: number; n: number }>;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function collectLiveGeometry(engine: SimulationEngine): StrainGeometry {
  const liveSegs = new Map<string, number>();
  const centroids = new Map<string, { x: number; y: number; z: number; n: number }>();
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (!seg || seg.dyingStart || engine.dyingStems.has(i)) continue;
    const name = seg.strainName || "unknown";
    liveSegs.set(name, (liveSegs.get(name) || 0) + 1);
    const m = seg.matrix.elements;
    let c = centroids.get(name);
    if (!c) {
      c = { x: 0, y: 0, z: 0, n: 0 };
      centroids.set(name, c);
    }
    c.x += m[12];
    c.y += m[13];
    c.z += m[14];
    c.n++;
  }
  return { liveSegs, centroids };
}

/** Strains owning live, non-dying segments with no active agent that are already dying, at END_OF_LIFE, or have no genome. */
function findGhostStrains(engine: SimulationEngine, geo: StrainGeometry): string[] {
  const owners = getActiveOwnerNames(engine.agents);
  const ghosts: string[] = [];
  for (const name of geo.liveSegs.keys()) {
    if (owners.has(name)) continue;
    // NEVER treat a living organism as a ghost strain!
    const isDying = engine.dyingStrains && engine.dyingStrains.has(name);
    const lc = engine.speciesLifecycleMap?.get(name);
    const isEol = lc?.phase === "END_OF_LIFE";
    const hasGenome = engine.genomeMap?.has(name);
    if (!isDying && !isEol && hasGenome) continue;
    ghosts.push(name);
  }
  return ghosts;
}

/**
 * Safety net for floating bits: any ghost strain gets all its live segments faded out.
 * Does not add the strain to `dyingStrains` (nothing would ever remove it again) but does
 * tombstone the lifecycle so late segments, if any, are born dying.
 */
export function sweepGhostStrains(engine: SimulationEngine): number {
  const geo = collectLiveGeometry(engine);
  const ghosts = findGhostStrains(engine, geo);
  if (ghosts.length === 0) return 0;
  const ghostSet = new Set(ghosts);
  const t = engine.unscaledTime;
  let segs = 0;
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (seg && !seg.dyingStart && ghostSet.has(seg.strainName)) {
      markDyingHelper(engine, engine.segments, engine.dyingStems, i, t);
      segs++;
    }
  }
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      const seg = app.segments[i];
      if (seg && !seg.dyingStart && ghostSet.has(seg.strainName)) {
        markDyingHelper(engine, app.segments, app.dyingSet, i, t);
      }
    }
  }
  for (let i = 0; i < engine.hybridSegments.length; i++) {
    const seg = engine.hybridSegments[i];
    if (seg && !seg.dyingStart && seg.childStrainName && ghostSet.has(seg.childStrainName)) {
      markDyingHelper(engine, engine.hybridSegments, engine.dyingHybrids, i, t);
    }
  }
  for (const name of ghosts) {
    const state = engine.speciesLifecycleMap.get(name);
    if (state && state.phase !== "END_OF_LIFE") {
      state.phase = "END_OF_LIFE";
      state.deathStartTick = t;
      state.reason = state.reason || "ghost sweep";
    }
  }
  const preview = ghosts.slice(0, 8).join(", ");
  engine.onLog(`[GHOST] swept ${ghosts.length} strains / ${segs} segs [${preview}${ghosts.length > 8 ? ", …" : ""}]`);
  return ghosts.length;
}

let lastHealthWall = -1;
let lastHealthFrame = 0;

/** Emits `[HEALTH] fps=… spread=… radius=… living=… ghostStrains=… liveStrainsWithSegs=… meanSize=…` every ~3 s. */
export function emitHealthTelemetry(engine: SimulationEngine): void {
  const t = now();
  if (lastHealthWall < 0 || engine.frameCount < lastHealthFrame) {
    lastHealthWall = t;
    lastHealthFrame = engine.frameCount;
    return;
  }
  const elapsed = t - lastHealthWall;
  if (elapsed < HEALTH_INTERVAL_MS) return;
  const fps = ((engine.frameCount - lastHealthFrame) * 1000) / elapsed;
  lastHealthWall = t;
  lastHealthFrame = engine.frameCount;

  const geo = collectLiveGeometry(engine);
  const ghosts = findGhostStrains(engine, geo);
  const living = engine.getLivingOrganisms();
  const cents: { x: number; y: number; z: number }[] = [];
  let sizeSum = 0;
  for (const name of living) {
    sizeSum += geo.liveSegs.get(name) || 0;
    const c = geo.centroids.get(name);
    if (c && c.n > 0) cents.push({ x: c.x / c.n, y: c.y / c.n, z: c.z / c.n });
  }
  let nnSum = 0;
  let cx = 0, cy = 0, cz = 0;
  for (const c of cents) {
    cx += c.x;
    cy += c.y;
    cz += c.z;
  }
  if (cents.length > 0) {
    cx /= cents.length;
    cy /= cents.length;
    cz /= cents.length;
  }
  let radius = 0;
  for (let i = 0; i < cents.length; i++) {
    let best = Infinity;
    for (let j = 0; j < cents.length; j++) {
      if (i === j) continue;
      const dx = cents[i].x - cents[j].x, dy = cents[i].y - cents[j].y, dz = cents[i].z - cents[j].z;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    if (Number.isFinite(best)) nnSum += best;
    const rx = cents[i].x - cx, ry = cents[i].y - cy, rz = cents[i].z - cz;
    radius = Math.max(radius, Math.sqrt(rx * rx + ry * ry + rz * rz));
  }
  const spread = cents.length > 1 ? nnSum / cents.length : 0;
  const meanSize = living.size > 0 ? sizeSum / living.size : 0;
  engine.onLog(
    `[HEALTH] fps=${fps.toFixed(1)} spread=${spread.toFixed(1)} radius=${radius.toFixed(1)} living=${living.size} ghostStrains=${ghosts.length} liveStrainsWithSegs=${geo.liveSegs.size} meanSize=${meanSize.toFixed(1)}`,
  );
}
