import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { resolveAgentHabit } from "./SimulationBotany";
import { hasBankedTreeBuds, isContinuousTreeGrowth, offerTreeBud, recordTreeNode } from "./SimulationTreeGrowth";
import { isOverSizeBudget } from "./SimulationPartnerSearch";
import { getSeekRamp } from "./SimulationSeekRamp";
import {
  type TreeHabit,
  type TreeProfile,
  PROFILES,
  isBigBranchingMode,
  isFiligreeMode,
} from "./SimulationMorphology";

export type { TreeHabit, TreeProfile };
export { PROFILES };

const PIPE_GAMMA = 2.6;
const MIN_TWIG = 0.038;

function minBranchThick(agent: Agent, habit: TreeHabit): number {
  if (habit === "rhizome_tuber") {
    return Math.max(0.08, (agent.genome?.minThickness || 0.09) * 0.5);
  }
  if (habit === "rhizome") {
    return Math.max(0.05, (agent.genome?.minThickness || 0.06) * 0.5);
  }
  if (habit === "rhizome_lace" || habit === "filigree") {
    return 0.015;
  }
  if (habit === "monolith") {
    return Math.max(0.22, (agent.genome?.minThickness || 0.28) * 0.80);
  }
  if (habit === "big_branching" || habit === "candelabra") {
    return Math.max(0.15, (agent.genome?.minThickness || 0.20) * 0.70);
  }
  return MIN_TWIG;
}

const STEP_PER_BUDGET = 0.13;
const SIM_STEP_SCALE = 0.7;
const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const GOLDEN = 2.39996323;

export function isTreeModelAgent(agent: Agent): boolean {
  if (agent.isFeeler) return false;
  const arch = agent.genome?.archetype;
  return arch === "tree" || arch === "rhizome" || agent.genome?.growthHabit === "rhizome_web";
}

export function getTreeHabit(engine: SimulationEngine, agent: Agent): TreeHabit {
  if ((engine as any).botanicalConcept && (engine as any).botanicalConcept !== "auto") {
    const concept = (engine as any).botanicalConcept;
    if (concept === "rhizome_web") return "rhizome";
    if (concept in PROFILES) return concept as TreeHabit;
  }
  const mode = agent.genome?.morphMode;
  if (mode === "monolith") return "monolith";
  if (mode === "big_branching") return "big_branching";
  if (mode === "candelabra") return "candelabra";
  if (mode === "filigree") return "filigree";
  if (mode === "spire") return "pine";
  if (mode === "umbrella") return "elm";
  if (mode === "rhizome_tuber") return "rhizome_tuber";
  if (mode === "rhizome_lace") return "rhizome_lace";
  if (mode === "rhizome_stolon") return "rhizome";

  if (agent.genome?.archetype === "rhizome") return "rhizome";
  const h = resolveAgentHabit(engine, agent.genome);
  if (h === "rhizome_web") return "rhizome";
  return h === "elm" || h === "pine" ? h : "oak";
}

function profileFor(engine: SimulationEngine, agent: Agent): TreeProfile {
  return PROFILES[getTreeHabit(engine, agent)] || PROFILES.oak;
}

function maxDepthFor(engine: SimulationEngine, p: TreeProfile, habit?: TreeHabit, agent?: Agent): number {
  if (agent?.genome?.branchOrderCap !== undefined) {
    return Math.max(2, Math.min(p.maxDepth, agent.genome.branchOrderCap, engine.maxBranchDepth ?? 6));
  }
  if (habit === "rhizome" || p === PROFILES.rhizome || habit === "rhizome_lace") {
    return Math.max(5, Math.min(p.maxDepth, (engine.maxBranchDepth ?? 5) + 1));
  }
  return Math.max(2, Math.min(p.maxDepth, engine.maxBranchDepth ?? p.maxDepth));
}

function spacingScale(engine: SimulationEngine, agent?: Agent): number {
  if (agent && (getTreeHabit(engine, agent) === "rhizome" || agent.genome?.archetype === "rhizome")) {
    const b = Math.max(0.5, engine.rhizomeBranching ?? 7.5);
    return THREE.MathUtils.clamp(Math.sqrt(7.5 / b), 0.45, 1.8);
  }
  const b = Math.max(1, engine.treeBranching ?? 17.5);
  return THREE.MathUtils.clamp(Math.sqrt(17.5 / b), 0.5, 2.0);
}

function endTaperFor(engine: SimulationEngine, p: TreeProfile, agent?: Agent): number {
  if (agent && (getTreeHabit(engine, agent) === "rhizome" || agent.genome?.archetype === "rhizome")) {
    const t = engine.rhizomeTaper ?? 0.55;
    return THREE.MathUtils.clamp(p.endTaper - (t - 0.55) * 0.45, 0.35, 0.95);
  }
  const t = engine.treeTaper ?? 0.6;
  return THREE.MathUtils.clamp(p.endTaper - (t - 0.6) * 0.5, 0.25, 0.95);
}

function tipCap(engine: SimulationEngine): number {
  const dial = engine.maxBranchesPerSpecies ?? 51;
  return Math.max(200, dial * (engine.designerMode ? 24 : 6));
}

export function getTreeStepSize(engine: SimulationEngine, agent: Agent): number {
  const p = profileFor(engine, agent);
  const budget = agent.treeBudget ?? p.trunkLength;
  const dial = (engine.treeStepSize ?? 0.6) / 0.6;
  const simScale = engine.designerMode ? 1 : SIM_STEP_SCALE;
  return THREE.MathUtils.clamp(budget * STEP_PER_BUDGET, p.stepMin, p.stepMax) * dial * simScale;
}

function deflect(dir: THREE.Vector3, angle: number, azimuth: number): THREE.Vector3 {
  const ref = Math.abs(dir.y) < 0.95 ? UP : X_AXIS;
  const perp = new THREE.Vector3().crossVectors(dir, ref).normalize().applyAxisAngle(dir, azimuth);
  return dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize();
}

function initTreeAgent(engine: SimulationEngine, agent: Agent) {
  const p = profileFor(engine, agent);
  const habit = getTreeHabit(engine, agent);
  const morphScale = THREE.MathUtils.clamp(agent.genome?.morphScale ?? 1.0, 0.55, 1.85);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const delayScale = isRhiz ? 1.0 : THREE.MathUtils.clamp(0.75 + (engine.treeBranchDelay ?? 5) * 0.05, 0.6, 1.6);
  agent.treeLen = 0;
  agent.treeBudget = p.trunkLength * morphScale * delayScale * (0.92 + Math.random() * 0.16);
  agent.treeBudIdx = Math.floor(Math.random() * 8);
  agent.treeRoot = agent.position.clone();
  if (p.noMidBranchLaterals) {
    agent.treeNextBud = Infinity;
  } else {
    agent.treeNextBud =
      p.crownDivision === 0
        ? agent.treeBudget * p.trunkLateralsFrom
        : agent.treeBudget * Math.min(1.5, p.trunkLateralsFrom);
  }
  agent.treeBaseThick = agent.thickness;
  if (isRhiz) {
    agent.treeAxis =
      agent.direction && agent.direction.lengthSq() > 0.01
        ? agent.direction.clone().normalize()
        : UP.clone();
  } else if (isTreeZeroGravity(engine) && !agent.treeAxis) {
    if (agent.direction && agent.direction.lengthSq() > 0.01) {
      agent.treeAxis = agent.direction.clone().normalize();
      agent.direction.copy(agent.treeAxis);
    } else {
      const centre = new THREE.Vector3(0, engine.creatureCenterY || 18.921075, 0);
      const toCentre = centre.sub(agent.position);
      const bias = toCentre.lengthSq() > 1 ? toCentre.normalize().multiplyScalar(0.9) : toCentre.set(0, 0, 0);
      const axis = new THREE.Vector3().randomDirection().add(bias).normalize();
      agent.treeAxis = axis;
      agent.direction.copy(axis);
    }
  }
}

export function isTreeZeroGravity(engine: SimulationEngine): boolean {
  return !engine.designerMode;
}

function axisOf(agent: Agent): THREE.Vector3 {
  return agent.treeAxis ?? UP;
}

function perpendicular(axis: THREE.Vector3, az: number): THREE.Vector3 {
  const ref = Math.abs(axis.y) < 0.95 ? UP : X_AXIS;
  const u = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  return u.multiplyScalar(Math.cos(az)).addScaledVector(v, Math.sin(az));
}

function initTrunkThickness(agent: Agent, zeroG: boolean) {
  const girthMod = agent.genome?.trunkGirthMod ?? 1.0;
  if (agent.genome?.archetype === "rhizome" || agent.genome?.growthHabit === "rhizome_web") {
    const base = Math.max(1.3, agent.genome.thicknessBase || 2.0);
    agent.thickness = base * 0.55 * girthMod;
    agent.treeBaseThick = agent.thickness;
    return;
  }
  const base = Math.max(0.5, agent.genome.thicknessBase || 4);
  agent.thickness = base * (zeroG ? 0.32 : 0.36) * girthMod;
  agent.treeBaseThick = agent.thickness;
}

export function ensureTreeAgentInit(engine: SimulationEngine, agent: Agent) {
  if (agent.treeBudget !== undefined || agent.isFeeler) return;
  if ((agent.branchDepth || 0) === 0) initTrunkThickness(agent, isTreeZeroGravity(engine));
  initTreeAgent(engine, agent);
}

export function getTreeRenderScale(agent: Agent): number {
  if ((agent.branchDepth || 0) !== 0 || !agent.treeBudget) return 1;
  const nubLen = Math.min(4.5, Math.max(2.2, agent.treeBudget * 0.18));
  const u = THREE.MathUtils.clamp((agent.treeLen || 0) / nubLen, 0, 1);
  return 1.08 - 0.08 * Math.sin(u * Math.PI * 0.5);
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
  if (isOverSizeBudget(engine, parent.genome.name)) {
    const habit = getTreeHabit(engine, parent);
    const maxSeekers = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace" ? 6 : 4;
    const currentTips = engine.agents.filter(
      (a: Agent) => a.active && !a.tapering && !a.isFeeler && a.genome.name === parent.genome.name,
    ).length;
    if (currentTips >= maxSeekers) return;
  }
  const bud = makeTreeAgent(engine, parent, parent.position, dir, thickness, budget, depth, spacing);
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
  const p = profileFor(engine, parent);
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
    treeNextBud: p.noMidBranchLaterals ? Infinity : budget * spacing * (0.45 + Math.random() * 0.5),
    treeBudIdx: Math.floor(Math.random() * 8),
    treeRoot: parent.treeRoot ? parent.treeRoot.clone() : parent.position.clone(),
    treeAxis: parent.treeAxis,
    treeBaseThick: thickness,
    rootOrigin: (parent.rootOrigin || parent.treeRoot || parent.position).clone(),
    branchBasePos: (depth <= 1 ? pos : (parent.branchBasePos || pos)).clone(),
  };
}

export function createTreeShoot(
  engine: SimulationEngine,
  template: Agent,
  pos: THREE.Vector3,
  woodDir: THREE.Vector3,
  woodDepth: number,
  woodThickness: number,
  vigor: number,
  nodeBranchBasePos?: THREE.Vector3,
): Agent {
  const p = profileFor(engine, template);
  const habit = getTreeHabit(engine, template);
  const maxDepth = maxDepthFor(engine, p, habit, template);
  const depth = Math.max(1, Math.min(woodDepth + 1, maxDepth - 2));
  const morphScale = THREE.MathUtils.clamp(template.genome?.morphScale ?? 1.0, 0.55, 1.85);
  const budget = p.limbLength * morphScale * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.8 + Math.random() * 0.4);
  const minT = minBranchThick(template, habit);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const thickness =
    isRhiz
      ? THREE.MathUtils.clamp(Math.max(woodThickness * 0.82, minT * (1.15 + 0.35 * vigor)), minT, minT * 3.2)
      : THREE.MathUtils.clamp(woodThickness * 0.7, MIN_TWIG * (2 + 2 * vigor), MIN_TWIG * 8);
  const A = axisOf(template);
  const root = template.treeRoot || pos;
  const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 20);
  const dir = deflect(woodDir, angle, Math.random() * Math.PI * 2);
  if (isRhiz) {
    const rel3D = new THREE.Vector3().subVectors(pos, root);
    if (rel3D.lengthSq() > 0.01) dir.addScaledVector(rel3D.normalize(), 0.55);
    dir.normalize();
  } else {
    const radial = new THREE.Vector3().subVectors(pos, root);
    radial.addScaledVector(A, -radial.dot(A));
    if (radial.lengthSq() > 0.01) dir.addScaledVector(radial.normalize(), 0.5);
    dir.addScaledVector(A, 0.15).normalize();
  }
  const spacing = p.lateralSpacing * spacingScale(engine, template);
  const shoot = makeTreeAgent(engine, template, pos, dir, thickness, budget, depth, spacing);
  shoot.branchBasePos = (woodDepth <= 0 ? pos : (nodeBranchBasePos || pos)).clone();
  return shoot;
}

function shouldBecomeKeeper(engine: SimulationEngine, agent: Agent, newAgents: Agent[]): boolean {
  const name = agent.genome.name;
  const alive = (a: Agent) => a !== agent && a.active && !a.tapering && !a.isFeeler && a.genome.name === name;
  return !engine.agents.some(alive) && !newAgents.some(alive);
}

export function applyTreeTropism(engine: SimulationEngine, agent: Agent) {
  const habit = getTreeHabit(engine, agent);
  const depth = agent.branchDepth || 0;
  const d = agent.direction;
  const root = agent.treeRoot || agent.position;
  const seekFactor = depth >= 1 ? Math.max(0.15, 1.0 - 0.75 * getSeekRamp(engine, agent)) : 1.0;

  if (habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace") {
    const rel3D = new THREE.Vector3().subVectors(agent.position, root);
    if (rel3D.lengthSq() > 0.04) {
      if (Math.sign(rel3D.y) !== Math.sign(d.y) && Math.abs(d.y) > 0.05) {
        rel3D.y = Math.sign(d.y) * Math.abs(rel3D.y);
      }
      rel3D.normalize();
      d.addScaledVector(rel3D, (depth <= 1 ? 0.028 : 0.018) * seekFactor);
    }
    d.normalize();
    return;
  }

  const A = axisOf(agent);
  const rel = new THREE.Vector3().subVectors(agent.position, root);
  const radial = rel.addScaledVector(A, -rel.dot(A));
  if (radial.lengthSq() < 0.01) radial.copy(d).addScaledVector(A, -d.dot(A));
  if (radial.lengthSq() < 0.0001) radial.copy(perpendicular(A, 0));
  radial.normalize();
  const progress = agent.treeBudget ? Math.min(1, (agent.treeLen || 0) / agent.treeBudget) : 0;
  const lean = (target: number, k: number) => {
    const a = d.dot(A);
    d.addScaledVector(A, THREE.MathUtils.lerp(a, target, k * seekFactor) - a);
  };

  if (depth === 0) {
    d.lerp(A, habit === "pine" ? 0.08 : 0.1);
  } else if (habit === "candelabra") {
    lean(depth === 1 ? 0.82 : 0.72, 0.045);
    d.addScaledVector(radial, 0.012 * seekFactor);
  } else if (habit === "oak" || habit === "monolith" || habit === "big_branching" || habit === "filigree") {
    lean(depth === 1 ? 0.68 : depth === 2 ? 0.5 : 0.35, 0.035);
    d.addScaledVector(radial, 0.018 * seekFactor);
  } else if (habit === "elm") {
    const target =
      depth === 1
        ? THREE.MathUtils.lerp(0.95, 0.45, progress * progress)
        : depth === 2
          ? 0.42
          : depth === 3
            ? 0.08
            : -0.25;
    lean(target, 0.04);
    d.addScaledVector(radial, (depth === 1 ? 0.008 : 0.015) * seekFactor);
  } else {
    lean(depth === 1 ? 0.02 + progress * 0.16 : 0.04, 0.05);
    if (depth === 1) d.addScaledVector(radial, 0.04 * seekFactor);
  }
  d.normalize();
}

const REST_MIN_TICKS = 24;
const REST_RANGE_TICKS = 36;
const REST_GROWTH_PER_FLUSH = 0.08;
const FLUSH_VIGOR_DECAY = 0.94;
const FLUSH_VIGOR_FLOOR = 0.55;

function enterTreeRest(agent: Agent) {
  agent.treeDormant = true;
  const flushes = agent.treeFlushes || 0;
  agent.treeRestTicks = Math.round(
    (REST_MIN_TICKS + Math.random() * REST_RANGE_TICKS) * (1 + Math.min(4, flushes) * REST_GROWTH_PER_FLUSH),
  );
}

export function tickTreeRest(engine: SimulationEngine, agent: Agent): boolean {
  if (!agent.treeDormant || agent.tapering || agent.isFeeler) return false;
  if (agent.treeRestTicks === undefined) enterTreeRest(agent);
  agent.treeRestTicks = (agent.treeRestTicks || 0) - 1;
  if (agent.treeRestTicks > 0) return false;

  const p = profileFor(engine, agent);
  const habit = getTreeHabit(engine, agent);
  const maxDepth = maxDepthFor(engine, p, habit, agent);
  const flushes = (agent.treeFlushes = (agent.treeFlushes || 0) + 1);
  const vigor = Math.max(FLUSH_VIGOR_FLOOR, Math.pow(FLUSH_VIGOR_DECAY, flushes - 1));
  const depth = Math.max(1, maxDepth - 2);
  const morphScale = THREE.MathUtils.clamp(agent.genome?.morphScale ?? 1.0, 0.55, 1.85);
  const budget = p.limbLength * morphScale * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.85 + Math.random() * 0.3);
  const spacing = p.lateralSpacing * spacingScale(engine, agent);

  const wasTrunk = (agent.branchDepth || 0) === 0;
  agent.treeDormant = false;
  agent.treeRestTicks = undefined;
  agent.branchDepth = depth;
  if (wasTrunk && depth >= 1) {
    agent.branchBasePos = agent.position.clone();
  }
  agent.treeLen = 0;
  agent.treeBudget = budget;
  agent.treeNextBud = p.noMidBranchLaterals ? Infinity : budget * spacing * (0.45 + Math.random() * 0.5);
  agent.thickness = Math.max(agent.thickness, MIN_TWIG * 3 * vigor + MIN_TWIG);
  agent.targetThickness = agent.thickness;
  const az = Math.random() * Math.PI * 2;
  agent.direction.copy(deflect(agent.direction, THREE.MathUtils.degToRad(p.forkAngleDeg), az));
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  if (isRhiz) {
    const root = agent.treeRoot || agent.position;
    const rel3D = new THREE.Vector3().subVectors(agent.position, root);
    if (rel3D.lengthSq() > 0.01) agent.direction.addScaledVector(rel3D.normalize(), 0.4);
    agent.direction.add(new THREE.Vector3().randomDirection().multiplyScalar(0.3)).normalize();
  } else {
    agent.direction.lerp(axisOf(agent), 0.35).normalize();
  }
  const label = isRhiz ? "RHIZOME" : "TREE";
  engine.onLog(`🌳 ${agent.genome.name} [${label}] new growth flush #${flushes}`);
  return true;
}

export function endTreeTipAtBoundary(engine: SimulationEngine, agent: Agent, newAgents: Agent[]) {
  if (agent.tapering || agent.treeDormant) return;
  if (shouldBecomeKeeper(engine, agent, newAgents)) {
    enterTreeRest(agent);
    return;
  }
  agent.tapering = true;
  agent.taperBudget = 0;
}

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
  const maxDepth = maxDepthFor(engine, p, habit, agent);
  const spacing = p.lateralSpacing * spacingScale(engine, agent);
  const budget = agent.treeBudget!;
  const roomForTips = strainCount + newAgents.length < tipCap(engine);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const morphScale = THREE.MathUtils.clamp(agent.genome?.morphScale ?? 1.0, 0.55, 1.85);

  agent.treeLen = (agent.treeLen || 0) + stepLen;
  recordTreeNode(engine, agent);

  const minT = minBranchThick(agent, habit);
  const endTaper =
    depth === 0 && habit === "pine"
      ? 0.3
      : isRhiz
        ? Math.max(0.82, endTaperFor(engine, p, agent))
        : endTaperFor(engine, p, agent);
  agent.thickness = Math.max(isRhiz ? minT : 0.02, agent.thickness * Math.pow(endTaper, stepLen / budget));

  // ---- Lateral buds ----
  const canLateral = !p.noMidBranchLaterals && depth + 1 <= maxDepth && roomForTips;
  while (!p.noMidBranchLaterals && agent.treeLen >= (agent.treeNextBud ?? Infinity) && agent.treeLen < budget * 0.94) {
    const frac = agent.treeLen / budget;
    if (canLateral && agent.thickness > (isRhiz ? minT * 0.95 : minT * 1.15)) {
      if (depth === 0 && habit === "pine") {
        const count = 2 + Math.floor(Math.random() * 4);
        const baseAz = Math.random() * Math.PI * 2;
        const tierLen = p.limbLength * morphScale * (1.05 - 0.8 * frac) * (0.7 + Math.random() * 0.6);
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
        const childT =
          isRhiz
            ? Math.max(minT, agent.thickness * Math.max(0.68, Math.pow(alpha, 1 / PIPE_GAMMA)))
            : Math.max(minT, agent.thickness * Math.pow(alpha, 1 / PIPE_GAMMA));
        if (isRhiz) {
          agent.thickness = Math.max(minT * 1.1, agent.thickness * Math.pow(1 - alpha * 0.35, 1 / PIPE_GAMMA));
        } else {
          agent.thickness *= Math.pow(1 - alpha, 1 / PIPE_GAMMA);
        }
        const az = (agent.treeBudIdx = (agent.treeBudIdx || 0) + 1) * GOLDEN;
        const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 20);
        const dir = deflect(agent.direction, angle, az);
        if (isRhiz) {
          agent.direction.copy(deflect(agent.direction, angle * alpha * 0.55, az + Math.PI));
          const out3D = new THREE.Vector3().subVectors(agent.position, agent.treeRoot || agent.position);
          if (out3D.lengthSq() > 0.04) dir.addScaledVector(out3D.normalize(), 0.22).normalize();
        }
        let childBudget: number;
        if (isRhiz) {
          childBudget =
            (depth === 0 ? p.limbLength * morphScale * (0.85 + Math.random() * 0.25) : budget * p.lengthRatio) *
            (0.85 + Math.random() * 0.3);
        } else {
          const posFactor = habit === "pine" ? 1.0 - 0.4 * frac : 0.6 + 0.4 * frac;
          childBudget =
            (depth === 0 ? p.limbLength * morphScale * 0.7 : budget * p.lengthRatio) * posFactor * (0.85 + Math.random() * 0.3);
        }
        spawnChild(engine, agent, newAgents, dir, childT, childBudget, depth + 1, spacing);
      }
    }
    const baseGap = depth === 0 && habit === "pine" ? p.whorlSpacing! : budget * spacing;
    agent.treeNextBud = (agent.treeNextBud || 0) + baseGap * (0.7 + Math.random() * 0.6);
  }

  if (agent.treeLen < budget) return;

  // ---- Terminal bud: crown division, sympodial fork, or fine tapered tip ----
  if (depth === 0 && p.crownDivision > 0) {
    if (isRhiz) {
      const n = p.crownDivision;
      const baseAz = (Math.random() - 0.5) * 0.18;
      const limbT = Math.max(minT * 2.1, agent.thickness * 0.76);
      for (let k = 0; k < n; k++) {
        const q = Math.floor(k / 2);
        const az = baseAz + (q * Math.PI * 0.5) + Math.PI * 0.25 + (Math.random() - 0.5) * 0.22;
        const signY = k % 2 === 0 ? 1 : -1;
        const elev = signY * (0.28 + (k % 4) * 0.12) + (Math.random() - 0.5) * 0.08;
        const clampedY = THREE.MathUtils.clamp(elev, -0.88, 0.88);
        const rXZ = Math.sqrt(Math.max(0.08, 1 - clampedY * clampedY));
        const dir = new THREE.Vector3(Math.cos(az) * rXZ, clampedY, Math.sin(az) * rXZ).normalize();
        const limbBudget = p.limbLength * morphScale * (0.88 + Math.random() * 0.28);
        if (k === 0) {
          agent.direction.copy(dir);
          agent.thickness = limbT;
          agent.branchDepth = 1;
          agent.branchBasePos = agent.position.clone();
          agent.isCanopy = true;
          agent.treeLen = 0;
          agent.treeBudget = limbBudget;
          agent.treeNextBud = p.noMidBranchLaterals ? Infinity : limbBudget * spacing * (0.35 + Math.random() * 0.35);
        } else {
          spawnChild(engine, agent, newAgents, dir, limbT, limbBudget, 1, spacing);
        }
      }
      return;
    }

    const n = p.crownDivision + (Math.random() < 0.35 ? 1 : 0) - (Math.random() < 0.2 ? 1 : 0);
    const baseAz = Math.random() * Math.PI * 2;
    const limbT = agent.thickness * Math.pow(1 / n, 1 / PIPE_GAMMA) * 1.05;
    for (let k = 0; k < n; k++) {
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.5;
      const spread = THREE.MathUtils.degToRad(p.divisionSpreadDeg + (Math.random() - 0.5) * 16);
      const dir = deflect(axisOf(agent), spread, az);
      const limbBudget = p.limbLength * morphScale * (0.85 + Math.random() * 0.3);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = limbT;
        agent.branchDepth = 1;
        agent.branchBasePos = agent.position.clone();
        agent.isCanopy = true;
        agent.treeLen = 0;
        agent.treeBudget = limbBudget;
        agent.treeNextBud = p.noMidBranchLaterals ? Infinity : limbBudget * spacing * (0.5 + Math.random() * 0.4);
      } else {
        spawnChild(engine, agent, newAgents, dir, limbT, limbBudget, 1, spacing);
      }
    }
    return;
  }

  const minForkThick = isRhiz ? minT * 0.95 : minT * 1.15;
  const canFork = depth >= 1 && depth < maxDepth && agent.thickness > minForkThick && roomForTips;
  if (!canFork) {
    if (!engine.designerMode) {
      const name = agent.genome.name;
      const banked = hasBankedTreeBuds(engine, name);
      const targetSeekers = banked ? 2 : 4;
      const aliveCount =
        engine.agents.filter((a: Agent) => a.active && !a.tapering && !a.isFeeler && a.genome.name === name).length +
        newAgents.filter((a: Agent) => a.active && !a.tapering && !a.isFeeler && a.genome.name === name).length;

      if ((aliveCount <= targetSeekers || (agent.isSeekerTwig && !banked)) && (agent.seekerFlushes || 0) < 1 && !isBigBranchingMode(agent.genome)) {
        agent.isSeekerTwig = true;
        agent.seekerFlushes = (agent.seekerFlushes || 0) + 1;
        agent.treeLen = 0;
        agent.treeBudget = 6 + Math.random() * 5;
        const seekerThick = minT * 1.15;
        agent.thickness = Math.min(agent.thickness, seekerThick);
        agent.treeNextBud = Infinity;
        return;
      }
    }

    if (shouldBecomeKeeper(engine, agent, newAgents)) {
      enterTreeRest(agent);
      return;
    }
    agent.tapering = true;
    agent.taperBudget = 0;
    return;
  }

  const n = Math.random() < (isRhiz ? 0.35 : (habit === "oak" || habit === "monolith" || habit === "big_branching") ? 0.25 : 0.15) ? 3 : 2;
  const equal = Math.random() < (engine.branchSplitSizeProb ?? 0.35);
  const baseAz = Math.random() * Math.PI * 2;
  const startT = agent.thickness;
  for (let k = 0; k < n; k++) {
    const share = equal
      ? 1 / n
      : isRhiz
        ? (k === 0 ? 0.56 : 0.48 / (n - 1))
        : (k === 0 ? 0.55 : 0.45 / (n - 1));
    const t =
      isRhiz
        ? Math.max(minT, startT * Math.max(0.72, Math.pow(share, 1 / PIPE_GAMMA)))
        : Math.max(minT * 0.85, startT * Math.pow(share, 1 / PIPE_GAMMA));
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
      agent.treeNextBud = p.noMidBranchLaterals ? Infinity : childBudget * spacing * (0.45 + Math.random() * 0.5);
    } else {
      spawnChild(engine, agent, newAgents, dir, t, childBudget, depth + 1, spacing);
    }
  }
}
