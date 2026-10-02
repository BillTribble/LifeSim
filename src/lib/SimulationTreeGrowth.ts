import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { createTreeShoot, isTreeModelAgent } from "./SimulationTreeArchitecture";
import { isBigBranchingMode, isFiligreeMode } from "./SimulationMorphology";
import { getOrganismSegmentBudget, getStrainTissueCount, isOverSizeBudget } from "./SimulationPartnerSearch";

/**
 * Continuous tree growth (ecosystem mode).
 *
 * Without this, every lateral bud of a tree opens at once: the whole crown grows in parallel,
 * finishes its length budget together, and the tree rests (a burst, then a long stop).
 *
 * Instead each tree keeps a small number of growing tips:
 *  - extra buds wait in a bud bank and open one at a time (oldest first) as tips finish,
 *  - when the bank is empty, new shoots sprout from recently grown wood (reiteration), leaning
 *    outward from the tree's axis, so the crown keeps branching and filling out all its life.
 */

interface TreeNode {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  depth: number;
  thickness: number;
  branchBasePos: THREE.Vector3;
}

interface TreeGrowthState {
  buds: Agent[];
  nodes: TreeNode[];
  nodeHead: number;
  growing: number;
  clock: number; // in growth steps
  nextRelease: number;
  shoots: number;
  template?: Agent;
}

/** Growing tips per tree/rhizome at once (paced so crowns unfold continuously over time). */
const MAX_GROWING_TIPS = 12;
/** Below this many growing tips (and an empty bud bank) the tree sprouts a new shoot. */
const MIN_GROWING_TIPS = 4;
const MAX_BANKED_BUDS = 120;
const MAX_NODES = 240;
/** Growth steps between bud openings / new shoots. */
const BUD_RELEASE_MIN = 0.65;
const BUD_RELEASE_RANGE = 0.55;
const SHOOT_MIN = 1.4;
const SHOOT_RANGE = 1.2;
/** Shoots slowly lose vigor (shorter), floored so the tree never stops growing. */
const SHOOT_VIGOR_DECAY = 0.994;
const SHOOT_VIGOR_FLOOR = 0.78;

const states = new WeakMap<SimulationEngine, Map<string, TreeGrowthState>>();

export function isContinuousTreeGrowth(engine: SimulationEngine): boolean {
  return !engine.designerMode;
}

export function hasBankedTreeBuds(engine: SimulationEngine, name: string): boolean {
  const s = states.get(engine)?.get(name);
  return !!s && s.buds.length > 0;
}

function stateFor(engine: SimulationEngine, name: string): TreeGrowthState {
  let map = states.get(engine);
  if (!map) {
    map = new Map();
    states.set(engine, map);
  }
  let s = map.get(name);
  if (!s) {
    s = { buds: [], nodes: [], nodeHead: 0, growing: 1, clock: 0, nextRelease: 0, shoots: 0 };
    map.set(name, s);
  }
  return s;
}

/**
 * Offers a freshly created tree bud. Returns true if the bud was banked (or discarded because
 * the bank is full) and must NOT be added to the scene; false if it should start growing now.
 */
export function offerTreeBud(engine: SimulationEngine, bud: Agent): boolean {
  if (!isContinuousTreeGrowth(engine)) return false;
  const s = stateFor(engine, bud.genome.name);
  const isFiligree = isFiligreeMode(bud.genome || s.template?.genome);
  const isMacro = isBigBranchingMode(bud.genome || s.template?.genome);
  const isSoft = !!(engine as any)._isSoftwareRaster;
  const initialTipsCap = isSoft ? 3 : (isFiligree ? 7 : isMacro ? 4 : 6);
  const initialMinCap = isSoft ? 2 : (isMacro ? 3 : 4);
  if (((bud.branchDepth || 0) <= 1 && s.growing < initialTipsCap) || (s.growing < initialMinCap && s.buds.length === 0)) {
    s.growing++;
    return false;
  }
  const maxBank = MAX_BANKED_BUDS;
  if (s.buds.length >= maxBank) {
    // Keep structural buds: drop the finest (deepest) one, which may be the incoming bud
    let worst = -1;
    let worstDepth = bud.branchDepth || 0;
    for (let i = 0; i < s.buds.length; i++) {
      const d = s.buds[i].branchDepth || 0;
      if (d > worstDepth) {
        worst = i;
        worstDepth = d;
      }
    }
    if (worst < 0) return true;
    s.buds.splice(worst, 1);
  }
  s.buds.push(bud);
  return true;
}

/** Records a point of grown wood that future shoots can sprout from (ring buffer: recent-biased). */
export function recordTreeNode(engine: SimulationEngine, agent: Agent) {
  if (!isContinuousTreeGrowth(engine)) return;
  if ((agent.branchDepth || 0) === 0 && (agent.treeLen || 0) < 3.0) return;
  const s = stateFor(engine, agent.genome.name);
  s.template = agent;
  const rawDepth = agent.branchDepth || 0;
  const node: TreeNode = {
    pos: agent.position.clone(),
    dir: agent.direction.clone(),
    depth: Math.max(1, rawDepth),
    thickness: agent.thickness,
    branchBasePos: (rawDepth === 0 ? agent.position : (agent.branchBasePos || agent.position)).clone(),
  };
  if (s.nodes.length < MAX_NODES) {
    s.nodes.push(node);
  } else {
    s.nodes[s.nodeHead] = node;
    s.nodeHead = (s.nodeHead + 1) % MAX_NODES;
  }
}

/** Tree tips end at the world boundary, so shoots sprouting right next to it would only make stubs. */
function nearBoundary(engine: SimulationEngine, pos: THREE.Vector3): boolean {
  const b = engine.boundarySize * 0.85;
  const bY = Math.max(5.0, engine.boundarySize * (engine.boundarySquash ?? 1.0)) * 0.85;
  const dy = pos.y - (engine.creatureCenterY || 18.921075);
  return Math.abs(pos.x) > b || Math.abs(pos.z) > b || Math.abs(dy) > bY;
}

/** Tournament pick favouring wood far from the tree's root, so the crown expands outward. */
function pickNode(engine: SimulationEngine, s: TreeGrowthState, minDepth: number = 1): TreeNode | null {
  const root = s.template?.treeRoot;
  let best: TreeNode | null = null;
  let bestD = -1;
  for (let k = 0; k < 8; k++) {
    const n = s.nodes[Math.floor(Math.random() * s.nodes.length)];
    if (!n || nearBoundary(engine, n.pos)) continue;
    if (n.depth < minDepth && k < 5) continue;
    const d = root ? n.pos.distanceToSquared(root) : 0;
    if (d > bestD) {
      best = n;
      bestD = d;
    }
    if (k >= 2 && best) break; // up to 3 valid candidates
  }
  return best;
}

/**
 * Once per frame: opens banked buds and sprouts new shoots so every living tree keeps a steady
 * trickle of growth. Call after all agents have stepped (new tips go into `newAgents`).
 */
export function sustainTreeGrowth(engine: SimulationEngine, activeAgents: Agent[], newAgents: Agent[]) {
  if (!isContinuousTreeGrowth(engine)) return;
  const map = states.get(engine);
  if (!map || map.size === 0) return;

  const growing = new Map<string, number>();
  const alive = new Set<string>();
  const count = (list: Agent[]) => {
    for (const a of list) {
      if (!a.active || a.tapering || !isTreeModelAgent(a)) continue;
      const name = a.genome.name;
      alive.add(name);
      if (!a.treeDormant) growing.set(name, (growing.get(name) || 0) + 1);
    }
  };
  count(activeAgents);
  count(newAgents);

  const dt = engine.timeScale ?? 1;
  for (const [name, s] of map) {
    if (!alive.has(name)) {
      map.delete(name); // organism gone
      continue;
    }
    if (engine.dyingStrains?.has(name)) {
      map.delete(name);
      continue;
    }
    if (s.template && s.template.cooldown > 0) {
      s.template.cooldown = Math.max(0, s.template.cooldown - dt);
    }
    for (let i = 0; i < s.buds.length; i++) {
      if (s.buds[i].cooldown > 0) {
        s.buds[i].cooldown = Math.max(0, s.buds[i].cooldown - dt);
      }
    }
    if (engine.suppressedStrains?.has(name)) continue;

    const tick = (engine.growthSpeed ?? 0.06) * (engine.treeSpeed ?? 0.65) * dt;
    const isFiligree = isFiligreeMode(s.template?.genome);
    const isMacro = isBigBranchingMode(s.template?.genome);
    const isSoft = !!(engine as any)._isSoftwareRaster;
    const maxTips = isSoft ? 4 : (isFiligree ? 14 : isMacro ? 8 : MAX_GROWING_TIPS);
    const minTips = isSoft ? 2 : (isMacro ? 3 : MIN_GROWING_TIPS);

    s.growing = growing.get(name) || 0;
    s.clock += tick;
    if (getStrainTissueCount(engine, name) > getOrganismSegmentBudget(engine, name) * 1.28) continue;
    if (s.clock < s.nextRelease || s.growing >= maxTips) continue;

    if (s.buds.length > 0) {
      // Release 2 buds (3 for filigree) per interval so the crown unfolds with rich branching
      const releaseLimit = isFiligree ? 3 : 2;
      const toRelease = s.buds.length > 1 && s.growing + 1 < maxTips
        ? Math.min(releaseLimit, maxTips - s.growing)
        : 1;
      for (let r = 0; r < toRelease && s.buds.length > 0; r++) {
        const idx = Math.floor(Math.random() * Math.min(3, s.buds.length));
        const bud = s.buds.splice(idx, 1)[0];
        bud.lastPosition.copy(bud.position);
        newAgents.push(bud);
        s.growing++;
      }
      const budInterval = isFiligree ? BUD_RELEASE_MIN * 0.75 : BUD_RELEASE_MIN;
      s.nextRelease = s.clock + budInterval + Math.random() * BUD_RELEASE_RANGE;
    } else if (s.growing < minTips && s.template && s.nodes.length > 0) {
      const mode = s.template.genome?.morphMode;
      const minDepth = mode === "filigree" || mode === "rhizome_lace" ? 2 : 1;

      const node = pickNode(engine, s, minDepth);
      const shootInterval = SHOOT_MIN + Math.random() * SHOOT_RANGE;
      if (!node) {
        s.nextRelease = s.clock + shootInterval;
        continue;
      }
      const vigor = Math.max(SHOOT_VIGOR_FLOOR, Math.pow(SHOOT_VIGOR_DECAY, s.shoots));
      newAgents.push(createTreeShoot(engine, s.template, node.pos, node.dir, node.depth, node.thickness, vigor, node.branchBasePos));
      s.shoots++;
      s.growing++;
      s.nextRelease = s.clock + shootInterval;
    }
  }
}

/** Propagates post-mating cooldown to banked tree buds and template for a strain. */
export function applyTreeStrainCooldown(engine: SimulationEngine, strainName: string, cd: number) {
  const map = states.get(engine);
  const s = map?.get(strainName);
  if (!s) return;
  if (s.template) s.template.cooldown = Math.max(s.template.cooldown || 0, cd);
  for (let i = 0; i < s.buds.length; i++) {
    s.buds[i].cooldown = Math.max(s.buds[i].cooldown || 0, cd);
  }
}
