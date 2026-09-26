import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { createTreeShoot, isTreeModelAgent } from "./SimulationTreeArchitecture";

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

/** Growing tips per tree at once (bushes/rhizomes have similar live tip counts per branch cluster). */
const MAX_GROWING_TIPS = 6;
/** Below this many growing tips (and an empty bud bank) the tree sprouts a new shoot. */
const MIN_GROWING_TIPS = 2;
const MAX_BANKED_BUDS = 48;
const MAX_NODES = 240;
/** Growth steps between bud openings / new shoots. */
const BUD_RELEASE_MIN = 1.5;
const BUD_RELEASE_RANGE = 1.5;
const SHOOT_MIN = 5;
const SHOOT_RANGE = 5;
/** Shoots slowly lose vigor (shorter), floored so the tree never stops growing. */
const SHOOT_VIGOR_DECAY = 0.985;
const SHOOT_VIGOR_FLOOR = 0.55;

const states = new WeakMap<SimulationEngine, Map<string, TreeGrowthState>>();

export function isContinuousTreeGrowth(engine: SimulationEngine): boolean {
  return !engine.designerMode;
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
  // Primary scaffold limbs (depth <= 1: oak boughs, elm vase limbs, pine whorls) open immediately
  // so the tree establishes its signature shape during the initial 1s seek-free growth window.
  if ((bud.branchDepth || 0) <= 1 || (s.growing < MAX_GROWING_TIPS && s.buds.length === 0)) {
    s.growing++;
    return false;
  }
  if (s.buds.length >= MAX_BANKED_BUDS) {
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
  const s = stateFor(engine, agent.genome.name);
  s.template = agent;
  const node: TreeNode = {
    pos: agent.position.clone(),
    dir: agent.direction.clone(),
    depth: agent.branchDepth || 0,
    thickness: agent.thickness,
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
function pickNode(engine: SimulationEngine, s: TreeGrowthState): TreeNode | null {
  const root = s.template?.treeRoot;
  let best: TreeNode | null = null;
  let bestD = -1;
  for (let k = 0; k < 6; k++) {
    const n = s.nodes[Math.floor(Math.random() * s.nodes.length)];
    if (nearBoundary(engine, n.pos)) continue;
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

  const tick = (engine.growthSpeed ?? 0.11) * (engine.treeSpeed ?? 1) * (engine.timeScale ?? 1);
  for (const [name, s] of map) {
    if (!alive.has(name)) {
      map.delete(name); // organism gone
      continue;
    }
    if (engine.dyingStrains?.has(name) || engine.suppressedStrains?.has(name)) continue;
    s.growing = growing.get(name) || 0;
    s.clock += tick;
    if (s.clock < s.nextRelease || s.growing >= MAX_GROWING_TIPS) continue;

    if (s.buds.length > 0) {
      // Mostly FIFO (breadth-first crown) with a little shuffle
      const idx = Math.floor(Math.random() * Math.min(3, s.buds.length));
      const bud = s.buds.splice(idx, 1)[0];
      bud.lastPosition.copy(bud.position);
      newAgents.push(bud);
      s.growing++;
      s.nextRelease = s.clock + BUD_RELEASE_MIN + Math.random() * BUD_RELEASE_RANGE;
    } else if (s.growing < MIN_GROWING_TIPS && s.template && s.nodes.length > 0) {
      const node = pickNode(engine, s);
      if (!node) {
        s.nextRelease = s.clock + SHOOT_MIN;
        continue;
      }
      const vigor = Math.max(SHOOT_VIGOR_FLOOR, Math.pow(SHOOT_VIGOR_DECAY, s.shoots));
      newAgents.push(createTreeShoot(engine, s.template, node.pos, node.dir, node.depth, node.thickness, vigor));
      s.shoots++;
      s.growing++;
      s.nextRelease = s.clock + SHOOT_MIN + Math.random() * SHOOT_RANGE;
    }
  }
}
