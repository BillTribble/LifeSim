import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";
import {
  areStrainsCompatibleForMating,
  FERTILITY_MIN_GROWTH_STEPS,
  FERTILITY_MIN_SEGMENTS,
  getFertilityMinTicks,
  getOrganismGrowthSteps,
  getSeekRamp,
  isSpeciesOnCooldown,
  MIN_NEXUS_DISPERSAL_DIST_SQ,
} from "./SimulationSeekRamp";
import { getOrganismBudgetMultiplier } from "./SimulationMorphology";

/** Live, non-dying, non-feeler stem positions grouped by strain, with a bounding sphere per strain. */
export interface StrainTissue {
  count: number;
  xs: number[];
  ys: number[];
  zs: number[];
  cx: number;
  cy: number;
  cz: number;
  r: number;
}

const MAX_TISSUE_SAMPLES_PER_STRAIN = 160;

/**
 * Per-frame spatial index of organism tissue (plan 3.6). Built once per frame in O(segments)
 * and reused by every partner scan instead of re-walking engine.segments for every tip × partner.
 * Keeps exact `count` per strain while stride-sampling spatial anchor points (`<= 160` per strain)
 * so partner and feeler scans remain O(1) bounded and hold 60 FPS even with 12 mature organisms.
 */
export function getStrainTissueIndex(engine: SimulationEngine): Map<string, StrainTissue> {
  const cache = (engine as any)._tissueIndex;
  if (engine.frameCount !== undefined && cache && cache.frame === engine.frameCount) return cache.map;
  const map = new Map<string, StrainTissue>();
  const segLen = engine.segments ? engine.segments.length : 0;
  const limit = Math.min(engine.pointCount ?? segLen, engine.maxDOMs ?? segLen);
  const counts = new Map<string, number>();
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (!seg || seg.dyingStart || seg.isFeeler || seg.strainName.startsWith("Feeler-")) continue;
    counts.set(seg.strainName, (counts.get(seg.strainName) || 0) + 1);
  }
  const strides = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const [name, total] of counts.entries()) {
    strides.set(name, Math.max(1, Math.floor(total / MAX_TISSUE_SAMPLES_PER_STRAIN)));
    seen.set(name, 0);
    map.set(name, { count: total, xs: [], ys: [], zs: [], cx: 0, cy: 0, cz: 0, r: 0 });
  }
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (!seg || seg.dyingStart || seg.isFeeler || seg.strainName.startsWith("Feeler-")) continue;
    const idx = seen.get(seg.strainName) || 0;
    seen.set(seg.strainName, idx + 1);
    const stride = strides.get(seg.strainName) || 1;
    if (idx % stride !== 0) continue;
    const t = map.get(seg.strainName)!;
    const m = seg.matrix.elements;
    t.xs.push(m[12]);
    t.ys.push(m[13]);
    t.zs.push(m[14]);
  }
  for (const t of map.values()) {
    const n = t.xs.length;
    if (n === 0) continue;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += t.xs[i];
      cy += t.ys[i];
      cz += t.zs[i];
    }
    cx /= n;
    cy /= n;
    cz /= n;
    let r2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = t.xs[i] - cx, dy = t.ys[i] - cy, dz = t.zs[i] - cz;
      r2 = Math.max(r2, dx * dx + dy * dy + dz * dz);
    }
    t.cx = cx;
    t.cy = cy;
    t.cz = cz;
    t.r = Math.sqrt(r2);
  }
  (engine as any)._tissueIndex = { frame: engine.frameCount, map };
  return map;
}

/** Live tissue segment count of an organism this frame (0 if none). */
export function getStrainTissueCount(engine: SimulationEngine, strainName: string): number {
  return getStrainTissueIndex(engine).get(strainName)?.count ?? 0;
}

/** Global live-segment budget shared by maxCreatures organisms. */
export const GLOBAL_SEGMENT_BUDGET = 11000;

export function getOrganismSegmentBudget(engine: SimulationEngine, strainName?: string): number {
  const genome = strainName ? engine.genomeMap?.get(strainName) : undefined;
  const mult = getOrganismBudgetMultiplier(genome);
  if ((engine as any)._isSoftwareRaster) {
    return Math.round(THREE.MathUtils.clamp(360 * mult, 260, 560));
  }
  const baseBudget = Math.min(880, Math.max(320, GLOBAL_SEGMENT_BUDGET / Math.max(1, engine.maxCreatures || 12)));
  return Math.min(1350, Math.max(280, Math.round(baseBudget * mult)));
}

/** True when the organism's live tissue exceeds its soft size budget (it then slows and caps tips). */
export function isOverSizeBudget(engine: SimulationEngine, strainName: string): boolean {
  return getStrainTissueCount(engine, strainName) > getOrganismSegmentBudget(engine, strainName);
}

/**
 * Effective mating cap for a living organism: honors `engine.maxMatings`, but if the colony is
 * still below `maxCreatures` or fewer than 3 living organisms have remaining matings, extends the
 * cap by 1 so surviving organisms never become permanently sterile and freeze the ecosystem.
 */
export function getEffectiveMaxMatings(engine: SimulationEngine, strainMCount: number): number {
  const maxM = engine.maxMatings !== undefined ? Math.max(1, engine.maxMatings) : 1;
  if (strainMCount < maxM) return maxM;
  const livingSet =
    typeof engine.getLivingOrganisms === "function" ? engine.getLivingOrganisms() : undefined;
  const livingCount = livingSet
    ? livingSet.size
    : typeof engine.getLivingOrganismCount === "function"
      ? engine.getLivingOrganismCount()
      : 2;
  if (livingCount < (engine.maxCreatures || 7)) {
    return Math.max(maxM, strainMCount + 1);
  }
  const lifecycle = (engine as any).speciesLifecycleMap;
  if (livingSet && lifecycle) {
    let fertilePool = 0;
    for (const s of livingSet) {
      if ((lifecycle.get(s)?.matingCount || 0) < maxM) fertilePool++;
    }
    if (fertilePool < 3) return Math.max(maxM, strainMCount + 1);
  }
  return maxM;
}

/**
 * True once an organism may mate: past the hybridCooldown delay, at least
 * FERTILITY_MIN_GROWTH_STEPS of growth, and at least FERTILITY_MIN_SEGMENTS of live tissue.
 */
export function isOrganismMature(engine: SimulationEngine, genome: any): boolean {
  if (!genome) return false;
  const ageTicks = genome.createdAt !== undefined ? engine.time - genome.createdAt : engine.time;
  if (ageTicks < getFertilityMinTicks(engine)) return false;
  if (getOrganismGrowthSteps(engine, genome) < FERTILITY_MIN_GROWTH_STEPS) return false;
  if (engine.pointCount === undefined) return true;
  return getStrainTissueCount(engine, genome.name) >= FERTILITY_MIN_SEGMENTS;
}

function anchorsFor(engine: SimulationEngine, strainA: string, genomeA: any, strainB: string, genomeB: any): THREE.Vector3[] {
  const map = engine.speciesLifecycleMap as any;
  const sA = map?.get(strainA);
  const sB = map?.get(strainB);
  const out: THREE.Vector3[] = [];
  for (const a of [genomeA?.birthPos, sA?.birthPos, genomeA?.lastMatingPos, sA?.lastMatingPos,
    genomeB?.birthPos, sB?.birthPos, genomeB?.lastMatingPos, sB?.lastMatingPos]) {
    if (a) out.push(a);
  }
  return out;
}

function inNexus(anchors: THREE.Vector3[], x: number, y: number, z: number): boolean {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const dx = x - a.x, dy = y - a.y, dz = z - a.z;
    if (dx * dx + dy * dy + dz * dz < MIN_NEXUS_DISPERSAL_DIST_SQ) return true;
  }
  return false;
}

export interface PartnerSearchResult {
  bestPartner: Agent | null;
  bestPartnerFertile: boolean;
  nearestDistSq: number;
  targetContactPos: THREE.Vector3 | null;
}

/**
 * Finds the nearest mate-able tissue for `agent`: the closest point on any compatible partner
 * organism (full scan of its live tissue, plus its growth tips). Feelers are never partners
 * (plan 2.3). A feeler agent only considers its locked target organism (plan 2.2) and also
 * uses the nearest point from its own steering scan (plan 2.7).
 */
export function findNearestPartner(
  engine: SimulationEngine,
  agent: Agent,
  selfIndex: number,
  activeAgents: Agent[],
  bredThisFrame: Set<Agent>,
  evalGenome: any,
  maxM: number,
): PartnerSearchResult {
  const res: PartnerSearchResult = { bestPartner: null, bestPartnerFertile: false, nearestDistSq: Infinity, targetContactPos: null };
  const tissue = getStrainTissueIndex(engine);
  const lifecycle = engine.speciesLifecycleMap as any;
  const strainResult = new Map<string, { d: number; x: number; y: number; z: number } | null>();
  const ax = agent.position.x, ay = agent.position.y, az = agent.position.z;
  const lockedTarget = agent.isFeeler ? agent.feelerTargetStrain : undefined;
  if (agent.isFeeler && !lockedTarget) return res;

  for (let j = 0; j < activeAgents.length; j++) {
    if (j === selfIndex) continue;
    const partner = activeAgents[j];
    if (!partner.active || partner.isFeeler) continue;
    const pg = partner.genome;
    if (pg.name === evalGenome.name) continue;
    if (lockedTarget && pg.name !== lockedTarget) continue;

    const partnerMCount = lifecycle?.get(pg.name)?.matingCount || partner.matingCount || 0;
    const partnerMaxM = Math.max(maxM, getEffectiveMaxMatings(engine, partnerMCount));
    const partnerDying = !!(engine.dyingStrains && engine.dyingStrains.has(pg.name));
    const partnerViable = !partnerDying && (!partner.tapering || partner.thickness > 0.02);
    if (!partnerViable || partnerMCount >= partnerMaxM || bredThisFrame.has(partner)) continue;
    if (!areStrainsCompatibleForMating(engine, evalGenome.name, evalGenome, pg.name, pg)) continue;

    const partnerStrainAge = pg.createdAt !== undefined ? engine.time - pg.createdAt : engine.time;
    const partnerFertile =
      !isSpeciesOnCooldown(engine, pg.name, pg) &&
      partner.cooldown <= 0 &&
      getSeekRamp(engine, partner, partnerStrainAge) > 0 &&
      isOrganismMature(engine, pg);

    const anchors = anchorsFor(engine, evalGenome.name, evalGenome, pg.name, pg);
    let distSq = Infinity;
    let cx = 0, cy = 0, cz = 0;
    if (!inNexus(anchors, partner.position.x, partner.position.y, partner.position.z)) {
      distSq = agent.position.distanceToSquared(partner.position);
      cx = partner.position.x; cy = partner.position.y; cz = partner.position.z;
    }

    let sr = strainResult.get(pg.name);
    if (sr === undefined) {
      sr = null;
      const t = tissue.get(pg.name);
      if (t) {
        const dcx = ax - t.cx, dcy = ay - t.cy, dcz = az - t.cz;
        const toSphere = Math.max(0, Math.sqrt(dcx * dcx + dcy * dcy + dcz * dcz) - t.r);
        // Skip strains whose bounding sphere cannot beat the best tissue found so far
        if (toSphere * toSphere < res.nearestDistSq) {
          let best = Infinity, bx = 0, by = 0, bz = 0;
          for (let k = 0; k < t.xs.length; k++) {
            const dx = ax - t.xs[k], dy = ay - t.ys[k], dz = az - t.zs[k];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < best && !inNexus(anchors, t.xs[k], t.ys[k], t.zs[k])) {
              best = d; bx = t.xs[k]; by = t.ys[k]; bz = t.zs[k];
            }
          }
          if (Number.isFinite(best)) sr = { d: best, x: bx, y: by, z: bz };
        }
      }
      strainResult.set(pg.name, sr);
    }
    if (sr && sr.d < distSq) {
      distSq = sr.d;
      cx = sr.x; cy = sr.y; cz = sr.z;
    }
    if (lockedTarget && agent.feelerNearestPos) {
      const d = agent.position.distanceToSquared(agent.feelerNearestPos);
      if (d < distSq) {
        distSq = d;
        cx = agent.feelerNearestPos.x; cy = agent.feelerNearestPos.y; cz = agent.feelerNearestPos.z;
      }
    }

    if (distSq < res.nearestDistSq) {
      res.nearestDistSq = distSq;
      res.bestPartner = partner;
      res.bestPartnerFertile = partnerFertile;
      res.targetContactPos = new THREE.Vector3(cx, cy, cz);
    }
  }
  return res;
}
