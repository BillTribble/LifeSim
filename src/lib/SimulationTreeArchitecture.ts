import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { resolveAgentHabit } from "./SimulationBotany";
import { isContinuousTreeGrowth, offerTreeBud, recordTreeNode } from "./SimulationTreeGrowth";

/**
 * Tree architecture model (tree archetype only).
 *
 * Replaces the old "branch as often as possible, then prune the thinnest tips"
 * loop for trees with a hierarchical, length-budgeted model:
 *  - every branch order has a finite length budget (trunk > limbs > branches > twigs),
 *  - lateral buds are spaced along each branch (spiral phyllotaxis / pine whorls),
 *  - at the end of its budget a branch either divides (crown division, sympodial fork)
 *    or tapers into a fine pointed tip,
 *  - radii follow the Da Vinci pipe model so thickness steps down at every node,
 *  - habit-specific tropisms shape oak (ascending), elm (vase / spreading) and
 *    pine (excurrent leader with horizontal tiers).
 */

export type TreeHabit = "oak" | "elm" | "pine";

interface TreeProfile {
  trunkLength: number; // clear bole (or full leader height for pine)
  crownDivision: number; // scaffold limbs at the top of the bole (0 = excurrent leader)
  divisionSpreadDeg: number;
  trunkLateralsFrom: number; // fraction of trunk length where trunk laterals start (>= 1 = none)
  limbLength: number; // budget of a first-order limb
  lengthRatio: number; // child budget / parent budget
  lateralSpacing: number; // distance between lateral buds as a fraction of the branch budget
  lateralAngleDeg: number;
  lateralAlpha: number; // pipe-area fraction handed to a lateral
  forkAngleDeg: number;
  endTaper: number; // tip thickness / base thickness along one branch (before laterals)
  stepMin: number;
  stepMax: number;
  maxDepth: number;
  whorlSpacing?: number; // pine only
}

const PROFILES: Record<TreeHabit, TreeProfile> = {
  oak: {
    trunkLength: 11,
    crownDivision: 3,
    divisionSpreadDeg: 34,
    trunkLateralsFrom: 0.55,
    limbLength: 17,
    lengthRatio: 0.58,
    lateralSpacing: 0.2,
    lateralAngleDeg: 46,
    lateralAlpha: 0.2,
    forkAngleDeg: 32,
    endTaper: 0.72,
    stepMin: 0.45,
    stepMax: 1.3,
    maxDepth: 5,
  },
  elm: {
    trunkLength: 14,
    crownDivision: 4,
    divisionSpreadDeg: 18,
    trunkLateralsFrom: 2,
    limbLength: 30,
    lengthRatio: 0.5,
    lateralSpacing: 0.12,
    lateralAngleDeg: 42,
    lateralAlpha: 0.16,
    forkAngleDeg: 30,
    endTaper: 0.7,
    stepMin: 0.45,
    stepMax: 1.3,
    maxDepth: 5,
  },
  pine: {
    trunkLength: 54,
    crownDivision: 0,
    divisionSpreadDeg: 0,
    trunkLateralsFrom: 0.16,
    limbLength: 15,
    lengthRatio: 0.42,
    lateralSpacing: 0.17,
    lateralAngleDeg: 58,
    lateralAlpha: 0.12,
    forkAngleDeg: 28,
    endTaper: 0.62,
    stepMin: 0.45,
    stepMax: 1.3,
    maxDepth: 4,
    whorlSpacing: 4.4,
  },
};

const PIPE_GAMMA = 2.6;
const MIN_TWIG = 0.038;
const STEP_PER_BUDGET = 0.13;
// Ecosystem-mode step scaling factor; reduced from 1.6 to 0.7 so trees grow at ~44% rate, aligning with other organisms.
const SIM_STEP_SCALE = 0.7;
const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const GOLDEN = 2.39996323;

export function isTreeModelAgent(agent: Agent): boolean {
  return !agent.isFeeler && agent.genome?.archetype === "tree";
}

export function getTreeHabit(engine: SimulationEngine, agent: Agent): TreeHabit {
  const h = resolveAgentHabit(engine, agent.genome);
  return h === "elm" || h === "pine" ? h : "oak";
}

function profileFor(engine: SimulationEngine, agent: Agent): TreeProfile {
  return PROFILES[getTreeHabit(engine, agent)];
}

function maxDepthFor(engine: SimulationEngine, p: TreeProfile): number {
  return Math.max(2, Math.min(p.maxDepth, engine.maxBranchDepth ?? p.maxDepth));
}

/** Lateral density follows the TREE BRANCHING dial (17.5 = profile default). */
function spacingScale(engine: SimulationEngine): number {
  const b = Math.max(1, engine.treeBranching ?? 17.5);
  return THREE.MathUtils.clamp(Math.sqrt(17.5 / b), 0.5, 2.0);
}

/** Tip taper follows the TREE TAPER dial (0.6 = profile default). */
function endTaperFor(engine: SimulationEngine, p: TreeProfile): number {
  const t = engine.treeTaper ?? 0.6;
  return THREE.MathUtils.clamp(p.endTaper - (t - 0.6) * 0.5, 0.25, 0.95);
}

function tipCap(engine: SimulationEngine): number {
  const dial = engine.maxBranchesPerSpecies ?? 51;
  return Math.max(200, dial * (engine.designerMode ? 24 : 6));
}

/**
 * Step length scales with the branch's length budget: long scaffold limbs use long straight
 * segments, twigs use short ones. Keeps every branch at ~7-12 segments, which bounds the
 * per-frame cost (engine loops are O(segments + appendages)).
 */
export function getTreeStepSize(engine: SimulationEngine, agent: Agent): number {
  const p = profileFor(engine, agent);
  const dial = (engine.treeStepSize ?? 0.6) / 0.6;
  const budget = agent.treeBudget ?? p.trunkLength;
  // Ecosystem mode hosts many trees at once; SIM_STEP_SCALE (0.7) slows growth rate to match other organisms while keeping segments balanced.
  const simScale = engine.designerMode ? 1 : SIM_STEP_SCALE;
  return THREE.MathUtils.clamp(budget * STEP_PER_BUDGET, p.stepMin, p.stepMax) * dial * simScale;
}

/** Rotates `dir` away from itself by `angle`, around an azimuth-selected perpendicular. */
function deflect(dir: THREE.Vector3, angle: number, azimuth: number): THREE.Vector3 {
  const ref = Math.abs(dir.y) < 0.95 ? UP : X_AXIS;
  const perp = new THREE.Vector3().crossVectors(dir, ref).normalize().applyAxisAngle(dir, azimuth);
  return dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize();
}

function initTreeAgent(engine: SimulationEngine, agent: Agent) {
  const p = profileFor(engine, agent);
  const delayScale = THREE.MathUtils.clamp(0.75 + (engine.treeBranchDelay ?? 5) * 0.05, 0.6, 1.6);
  agent.treeLen = 0;
  agent.treeBudget = p.trunkLength * delayScale * (0.92 + Math.random() * 0.16);
  agent.treeBudIdx = Math.floor(Math.random() * 8);
  agent.treeRoot = agent.position.clone();
  agent.treeNextBud =
    p.crownDivision === 0
      ? agent.treeBudget * p.trunkLateralsFrom
      : agent.treeBudget * Math.min(1.5, p.trunkLateralsFrom);
  agent.treeBaseThick = agent.thickness;
  if (isTreeZeroGravity(engine) && !agent.treeAxis) {
    // No gravity: the tree grows along its own random axis, biased toward open space
    const centre = new THREE.Vector3(0, engine.creatureCenterY || 18.921075, 0);
    const toCentre = centre.sub(agent.position);
    const bias = toCentre.lengthSq() > 1 ? toCentre.normalize().multiplyScalar(0.9) : toCentre.set(0, 0, 0);
    const axis = new THREE.Vector3().randomDirection().add(bias).normalize();
    agent.treeAxis = axis;
    agent.direction.copy(axis);
  }
}

/** Ecosystem (non-designer) trees grow in zero gravity: each tree has its own axis. */
export function isTreeZeroGravity(engine: SimulationEngine): boolean {
  return !engine.designerMode;
}

function axisOf(agent: Agent): THREE.Vector3 {
  return agent.treeAxis ?? UP;
}

/** Unit vector perpendicular to `axis` at azimuth `az` (stable basis). */
function perpendicular(axis: THREE.Vector3, az: number): THREE.Vector3 {
  const ref = Math.abs(axis.y) < 0.95 ? UP : X_AXIS;
  const u = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  return u.multiplyScalar(Math.cos(az)).addScaledVector(v, Math.sin(az));
}

/** Trunk base radius relative to genome thicknessBase (3.2-5.8) => ~1.1-2.0 world units. */
const TRUNK_RADIUS_FACTOR = 0.34;
/** Floating (zero-g) trees have no weight to carry: slimmer trunks. */
const ZERO_G_TRUNK_FACTOR = 0.22;

function initTrunkThickness(agent: Agent, zeroG: boolean) {
  const base = Math.max(0.5, agent.genome.thicknessBase || 4);
  agent.thickness = Math.min(agent.thickness, base * (zeroG ? ZERO_G_TRUNK_FACTOR : TRUNK_RADIUS_FACTOR));
  agent.treeBaseThick = agent.thickness;
}

/** Lazily initialises tree-model state; safe to call every step (must run before the first segment). */
export function ensureTreeAgentInit(engine: SimulationEngine, agent: Agent) {
  if (agent.treeBudget !== undefined || agent.isFeeler) return;
  if ((agent.branchDepth || 0) === 0) initTrunkThickness(agent, isTreeZeroGravity(engine));
  initTreeAgent(engine, agent);
}

/** Render-only thickness multiplier: a short root flare at the base of the trunk (none in zero-g). */
export function getTreeRenderScale(agent: Agent): number {
  if ((agent.branchDepth || 0) !== 0 || !agent.treeBudget || agent.treeAxis) return 1;
  const flareLen = Math.min(5, agent.treeBudget * 0.2);
  const u = (agent.treeLen || 0) / flareLen;
  return u >= 1 ? 1 : 1 + 0.25 * (1 - u) * (1 - u);
}

function spawnChild(
  engine: SimulationEngine,
  parent: Agent,
  newAgents: Agent[],
  dir: THREE.Vector3,
  thickness: number,
  budget: number,
  depth: number,
  spacing: number,
) {
  const bud = makeTreeAgent(engine, parent, parent.position, dir, thickness, budget, depth, spacing);
  // Ecosystem trees open buds a few at a time (steady growth) instead of all at once
  if (!offerTreeBud(engine, bud)) newAgents.push(bud);
}

function makeTreeAgent(
  engine: SimulationEngine,
  parent: Agent,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  thickness: number,
  budget: number,
  depth: number,
  spacing: number,
): Agent {
  return {
    position: pos.clone(),
    lastPosition: pos.clone(),
    direction: dir.clone().normalize(),
    genome: parent.genome,
    active: true,
    age: 25,
    isCanopy: true,
    thickness,
    targetThickness: thickness,
    cooldown: parent.cooldown || 0,
    id: engine.nextAgentId++,
    parentAgent: undefined,
    parentId: parent.id,
    branchDepth: depth,
    treeLen: 0,
    treeBudget: budget,
    treeNextBud: budget * spacing * (0.45 + Math.random() * 0.5),
    treeBudIdx: Math.floor(Math.random() * 8),
    treeRoot: parent.treeRoot ? parent.treeRoot.clone() : parent.position.clone(),
    treeAxis: parent.treeAxis,
    treeBaseThick: thickness,
  };
}

/**
 * Reiteration shoot sprouting from existing wood (continuous growth): leans outward from the
 * tree's axis and starts two orders above the depth limit so it can fork and fill out.
 */
export function createTreeShoot(
  engine: SimulationEngine,
  template: Agent,
  pos: THREE.Vector3,
  woodDir: THREE.Vector3,
  woodDepth: number,
  woodThickness: number,
  vigor: number,
): Agent {
  const p = profileFor(engine, template);
  const maxDepth = maxDepthFor(engine, p);
  const depth = Math.max(1, Math.min(woodDepth + 1, maxDepth - 2));
  const budget = p.limbLength * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.8 + Math.random() * 0.4);
  const thickness = THREE.MathUtils.clamp(woodThickness * 0.7, MIN_TWIG * (2 + 2 * vigor), MIN_TWIG * 8);
  const A = axisOf(template);
  const root = template.treeRoot || pos;
  const radial = new THREE.Vector3().subVectors(pos, root);
  radial.addScaledVector(A, -radial.dot(A));
  const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 20);
  const dir = deflect(woodDir, angle, Math.random() * Math.PI * 2);
  if (radial.lengthSq() > 0.01) dir.addScaledVector(radial.normalize(), 0.5);
  dir.addScaledVector(A, 0.15).normalize();
  const spacing = p.lateralSpacing * spacingScale(engine);
  return makeTreeAgent(engine, template, pos, dir, thickness, budget, depth, spacing);
}

/** True when no other non-tapering agent of this strain exists (growing tip or existing keeper). */
function shouldBecomeKeeper(engine: SimulationEngine, agent: Agent, newAgents: Agent[]): boolean {
  const name = agent.genome.name;
  const alive = (a: Agent) => a !== agent && a.active && !a.tapering && !a.isFeeler && a.genome.name === name;
  return !engine.agents.some(alive) && !newAgents.some(alive);
}

/** Habit-specific tropisms applied every step (replaces the generic tree gravitropism). */
export function applyTreeTropism(engine: SimulationEngine, agent: Agent) {
  const habit = getTreeHabit(engine, agent);
  const depth = agent.branchDepth || 0;
  const d = agent.direction;
  const A = axisOf(agent);
  const root = agent.treeRoot || agent.position;
  // Outward direction from the tree's axis line (the "radial" of the crown)
  const rel = new THREE.Vector3().subVectors(agent.position, root);
  const radial = rel.addScaledVector(A, -rel.dot(A));
  if (radial.lengthSq() < 0.01) radial.copy(d).addScaledVector(A, -d.dot(A));
  if (radial.lengthSq() < 0.0001) radial.copy(perpendicular(A, 0));
  radial.normalize();
  const progress = agent.treeBudget ? Math.min(1, (agent.treeLen || 0) / agent.treeBudget) : 0;
  // Pull the along-axis component of the heading toward `target` at rate k
  const lean = (target: number, k: number) => {
    const a = d.dot(A);
    d.addScaledVector(A, THREE.MathUtils.lerp(a, target, k) - a);
  };

  if (depth === 0) {
    d.lerp(A, habit === "pine" ? 0.08 : 0.1);
  } else if (habit === "oak") {
    // White oak: ascending limbs, outward-reaching crooked branches
    lean(depth === 1 ? 0.68 : depth === 2 ? 0.5 : 0.35, 0.035);
    d.addScaledVector(radial, 0.018);
  } else if (habit === "elm") {
    // Elm: vase limbs that arch outward, fine spreading/drooping twigs at the rim
    const target =
      depth === 1
        ? THREE.MathUtils.lerp(0.95, 0.45, progress * progress)
        : depth === 2
          ? 0.42
          : depth === 3
            ? 0.08
            : -0.25;
    lean(target, 0.04);
    d.addScaledVector(radial, depth === 1 ? 0.008 : 0.015);
  } else {
    // White pine: horizontal tiers with a slight upturn toward the tips
    lean(depth === 1 ? 0.02 + progress * 0.16 : 0.04, 0.05);
    if (depth === 1) d.addScaledVector(radial, 0.04);
  }
  d.normalize();
}

/** Rest period (growth ticks) between flushes; each flush rests a little longer. */
const REST_MIN_TICKS = 90;
const REST_RANGE_TICKS = 180;
const REST_GROWTH_PER_FLUSH = 0.15;
/** Each flush is a little less vigorous than the last, floored so growth never fully stops. */
const FLUSH_VIGOR_DECAY = 0.9;
const FLUSH_VIGOR_FLOOR = 0.45;

/** Puts the tree's last tip to rest; it wakes later for a new growth flush. */
function enterTreeRest(agent: Agent) {
  agent.treeDormant = true;
  const flushes = agent.treeFlushes || 0;
  agent.treeRestTicks = Math.round(
    (REST_MIN_TICKS + Math.random() * REST_RANGE_TICKS) * (1 + flushes * REST_GROWTH_PER_FLUSH),
  );
}

/**
 * Counts down a resting keeper. When the rest ends, the tip wakes with a new growth flush:
 * a fresh length budget, a few forking orders of headroom and enough vigor (thickness) to
 * branch again. Returns true when the tip woke up this tick.
 */
export function tickTreeRest(engine: SimulationEngine, agent: Agent): boolean {
  if (!agent.treeDormant || agent.tapering || agent.isFeeler) return false;
  // Continuous growth: the scheduler sprouts new shoots; the keeper only anchors the organism
  if (isContinuousTreeGrowth(engine)) return false;
  if (agent.treeRestTicks === undefined) enterTreeRest(agent); // legacy keepers
  agent.treeRestTicks = (agent.treeRestTicks || 0) - 1;
  if (agent.treeRestTicks > 0) return false;

  const p = profileFor(engine, agent);
  const maxDepth = maxDepthFor(engine, p);
  const flushes = (agent.treeFlushes = (agent.treeFlushes || 0) + 1);
  const vigor = Math.max(FLUSH_VIGOR_FLOOR, Math.pow(FLUSH_VIGOR_DECAY, flushes - 1));
  // Resume two orders below the depth limit so the flush can fork and spread again
  const depth = Math.max(1, maxDepth - 2);
  const budget = p.limbLength * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.85 + Math.random() * 0.3);
  const spacing = p.lateralSpacing * spacingScale(engine);

  agent.treeDormant = false;
  agent.treeRestTicks = undefined;
  agent.branchDepth = depth;
  agent.treeLen = 0;
  agent.treeBudget = budget;
  agent.treeNextBud = budget * spacing * (0.45 + Math.random() * 0.5);
  // New shoot: enough girth to fork again (twig ends are too thin to branch)
  agent.thickness = Math.max(agent.thickness, MIN_TWIG * 3 * vigor + MIN_TWIG);
  agent.targetThickness = agent.thickness;
  // Break out of the old heading, leaning back toward the tree's own axis
  const az = Math.random() * Math.PI * 2;
  agent.direction.copy(deflect(agent.direction, THREE.MathUtils.degToRad(p.forkAngleDeg), az));
  agent.direction.lerp(axisOf(agent), 0.35).normalize();
  engine.onLog(`🌳 ${agent.genome.name} [TREE] new growth flush #${flushes}`);
  return true;
}

/**
 * Ends a tree tip that reached the world boundary (instead of bouncing along the wall).
 * The last living tip of a tree rests as a keeper (organism stays alive) and regrows later.
 */
export function endTreeTipAtBoundary(engine: SimulationEngine, agent: Agent, newAgents: Agent[]) {
  if (agent.tapering || agent.treeDormant) return;
  if (shouldBecomeKeeper(engine, agent, newAgents)) {
    enterTreeRest(agent);
    return;
  }
  agent.tapering = true; // caller deactivates it immediately (no reflected hook)
  agent.taperBudget = 0;
}

/**
 * Advances one growth step of the tree model: length accounting, taper, lateral buds
 * and terminal division. Call after the agent has moved and emitted its segment.
 */
export function stepTreeArchitecture(
  engine: SimulationEngine,
  agent: Agent,
  newAgents: Agent[],
  strainCount: number,
  stepLen: number,
) {
  if (agent.tapering || agent.isFeeler || agent.treeDormant) return;
  ensureTreeAgentInit(engine, agent);

  const p = profileFor(engine, agent);
  const habit = getTreeHabit(engine, agent);
  const depth = agent.branchDepth || 0;
  const maxDepth = maxDepthFor(engine, p);
  const spacing = p.lateralSpacing * spacingScale(engine);
  const budget = agent.treeBudget!;
  const roomForTips = strainCount + newAgents.length < tipCap(engine);

  agent.treeLen = (agent.treeLen || 0) + stepLen;
  recordTreeNode(engine, agent);

  // Continuous taper along the branch (pine leader tapers harder to a spire)
  const endTaper = depth === 0 && habit === "pine" ? 0.3 : endTaperFor(engine, p);
  agent.thickness = Math.max(0.02, agent.thickness * Math.pow(endTaper, stepLen / budget));

  // ---- Lateral buds ----
  const canLateral = depth + 1 <= maxDepth && roomForTips;
  while (agent.treeLen >= (agent.treeNextBud ?? Infinity) && agent.treeLen < budget * 0.94) {
    const frac = agent.treeLen / budget;
    if (canLateral && agent.thickness > MIN_TWIG * 1.4) {
      if (depth === 0 && habit === "pine") {
        // Whorl of 3-5 horizontal branches; lower tiers longer (conical crown)
        const count = 2 + Math.floor(Math.random() * 4);
        const baseAz = Math.random() * Math.PI * 2;
        const tierLen = p.limbLength * (1.05 - 0.8 * frac) * (0.7 + Math.random() * 0.6);
        const childT = Math.max(MIN_TWIG, agent.thickness * Math.pow(p.lateralAlpha, 1 / PIPE_GAMMA));
        for (let w = 0; w < count; w++) {
          const az = baseAz + (w * Math.PI * 2) / count + (Math.random() - 0.5) * 0.4;
          const A = axisOf(agent);
          const dir = perpendicular(A, az).addScaledVector(A, 0.05 + (Math.random() - 0.5) * 0.1);
          spawnChild(engine, agent, newAgents, dir, childT, tierLen, 1, p.lateralSpacing);
        }
        agent.thickness *= 0.95;
      } else {
        const alpha = p.lateralAlpha * (0.8 + Math.random() * 0.4);
        const childT = Math.max(MIN_TWIG, agent.thickness * Math.pow(alpha, 1 / PIPE_GAMMA));
        agent.thickness *= Math.pow(1 - alpha, 1 / PIPE_GAMMA);
        const az = (agent.treeBudIdx = (agent.treeBudIdx || 0) + 1) * GOLDEN;
        const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 20);
        const dir = deflect(agent.direction, angle, az);
        // Acrotony for broadleaves (upper laterals longer); trunk laterals become limbs
        const posFactor = habit === "pine" ? 1.0 - 0.4 * frac : 0.6 + 0.4 * frac;
        const childBudget =
          (depth === 0 ? p.limbLength * 0.7 : budget * p.lengthRatio) * posFactor * (0.85 + Math.random() * 0.3);
        spawnChild(engine, agent, newAgents, dir, childT, childBudget, depth + 1, spacing);
      }
    }
    const baseGap = depth === 0 && habit === "pine" ? p.whorlSpacing! : budget * spacing;
    agent.treeNextBud = (agent.treeNextBud || 0) + baseGap * (0.7 + Math.random() * 0.6);
  }

  if (agent.treeLen < budget) return;

  // ---- Terminal bud: crown division, sympodial fork, or fine tapered tip ----
  if (depth === 0 && p.crownDivision > 0) {
    const n = p.crownDivision + (Math.random() < 0.35 ? 1 : 0) - (Math.random() < 0.2 ? 1 : 0);
    const baseAz = Math.random() * Math.PI * 2;
    const limbT = agent.thickness * Math.pow(1 / n, 1 / PIPE_GAMMA) * 1.05;
    for (let k = 0; k < n; k++) {
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.5;
      const spread = THREE.MathUtils.degToRad(p.divisionSpreadDeg + (Math.random() - 0.5) * 16);
      const dir = deflect(axisOf(agent), spread, az);
      const limbBudget = p.limbLength * (0.85 + Math.random() * 0.3);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = limbT;
        agent.branchDepth = 1;
        agent.isCanopy = true;
        agent.treeLen = 0;
        agent.treeBudget = limbBudget;
        agent.treeNextBud = limbBudget * spacing * (0.5 + Math.random() * 0.4);
      } else {
        spawnChild(engine, agent, newAgents, dir, limbT, limbBudget, 1, spacing);
      }
    }
    return;
  }

  const canFork = depth >= 1 && depth < maxDepth && agent.thickness > MIN_TWIG * 1.3 && roomForTips;
  if (!canFork) {
    if (shouldBecomeKeeper(engine, agent, newAgents)) {
      enterTreeRest(agent); // last tip: rests (organism stays alive), then regrows in a new flush
      return;
    }
    agent.tapering = true;
    agent.taperBudget = 0;
    return;
  }

  const n = Math.random() < (habit === "oak" ? 0.25 : 0.15) ? 3 : 2;
  const equal = Math.random() < (engine.branchSplitSizeProb ?? 0.35);
  const baseAz = Math.random() * Math.PI * 2;
  const startT = agent.thickness;
  for (let k = 0; k < n; k++) {
    const share = equal ? 1 / n : k === 0 ? 0.55 : 0.45 / (n - 1);
    const t = Math.max(MIN_TWIG * 0.8, startT * Math.pow(share, 1 / PIPE_GAMMA));
    const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.6;
    const ang = THREE.MathUtils.degToRad(p.forkAngleDeg * (k === 0 && !equal ? 0.45 : 1) + (Math.random() - 0.5) * 14);
    const dir = deflect(agent.direction, ang, az);
    const childBudget = budget * p.lengthRatio * (0.85 + Math.random() * 0.3);
    if (k === 0) {
      agent.direction.copy(dir);
      agent.thickness = t;
      agent.branchDepth = depth + 1;
      agent.treeLen = 0;
      agent.treeBudget = childBudget;
      agent.treeNextBud = childBudget * spacing * (0.45 + Math.random() * 0.5);
    } else {
      spawnChild(engine, agent, newAgents, dir, t, childBudget, depth + 1, spacing);
    }
  }
}
