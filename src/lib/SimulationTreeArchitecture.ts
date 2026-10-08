import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";
import { resolveAgentHabit } from "./SimulationBotany";
import { hasBankedTreeBuds, isContinuousTreeGrowth, offerTreeBud, recordTreeNode } from "./SimulationTreeGrowth";
import { getOrganismSegmentBudget, getStrainTissueCount, isOverSizeBudget } from "./SimulationPartnerSearch";
import { getSeekRamp } from "./SimulationSeekRamp";
import { type TreeHabit, type TreeProfile, PROFILES, isBigBranchingMode, isFiligreeMode, computeInitialTrunkThickness } from "./SimulationMorphology";

export type { TreeHabit, TreeProfile };
export { PROFILES };

const PIPE_GAMMA = 2.6;
const MIN_TWIG = 0.055;

function minBranchThick(agent: Agent, habit: TreeHabit): number {
  let rawMin = MIN_TWIG;
  if (habit === "rhizome_tuber") rawMin = Math.max(0.09, (agent.genome?.minThickness || 0.09) * 0.55);
  else if (habit === "rhizome") rawMin = Math.max(0.075, (agent.genome?.minThickness || 0.07) * 0.55);
  else if (habit === "rhizome_lace" || habit === "filigree") rawMin = 0.042;
  else if (habit === "monolith" || habit === "big_branching" || habit === "candelabra" || habit === "oak" || habit === "elm" || habit === "pine") rawMin = 0.055;
  return Math.min(rawMin, Math.max(0.032, (agent.treeBaseThick || agent.thickness || 0.4) * 0.22));
}

const STEP_PER_BUDGET = 0.15;
const SIM_STEP_SCALE = 1.05;
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
  if (mode === "monolith" || mode === "big_branching" || mode === "candelabra" || mode === "filigree" || mode === "rhizome_tuber" || mode === "rhizome_lace") return mode;
  if (mode === "spire") return "pine";
  if (mode === "umbrella") return "elm";
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
  if (habit === "rhizome" || p === PROFILES.rhizome || habit === "rhizome_lace" || habit === "rhizome_tuber") {
    if (agent?.genome?.branchOrderCap !== undefined) {
      return Math.max(2, Math.min(p.maxDepth, agent.genome.branchOrderCap, engine.maxBranchDepth ?? 6));
    }
    return Math.max(3, Math.min(p.maxDepth, (engine.maxBranchDepth ?? 5) + 1));
  }
  return Math.max(5, Math.min(p.maxDepth, agent?.genome?.branchOrderCap ?? p.maxDepth, Math.max(5, engine.maxBranchDepth ?? 5)));
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
  return Math.max(80, dial * (engine.designerMode ? 24 : 4.2));
}

export function getTreeStepSize(engine: SimulationEngine, agent: Agent): number {
  const p = profileFor(engine, agent);
  const budget = agent.treeBudget ?? p.trunkLength;
  const dial = (engine.treeStepSize ?? 0.6) / 0.6;
  const simScale = engine.designerMode ? 1 : SIM_STEP_SCALE;
  const depth = agent.branchDepth || 0;
  let base: number;
  if (depth <= 1) {
    base = THREE.MathUtils.clamp(budget * 0.14, p.stepMin, p.stepMax) * dial * simScale;
  } else if (depth === 2) {
    base = THREE.MathUtils.clamp(budget * 0.16, 0.55, 1.05) * dial * simScale;
  } else if (depth === 3) {
    base = THREE.MathUtils.clamp(budget * 0.18, 0.42, 0.78) * dial * simScale;
  } else if (depth === 4) {
    base = THREE.MathUtils.clamp(budget * 0.22, 0.34, 0.62) * dial * simScale;
  } else {
    base = THREE.MathUtils.clamp(budget * 0.26, 0.28, 0.48) * dial * simScale;
  }
  return base * (1.0 + Math.max(0, ((agent.genome as any)?.rambleFactor ?? 1.0) - 1.0) * 0.18);
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
  const delayScale = isRhiz ? 1.0 : THREE.MathUtils.clamp(0.85 + ((engine.treeBranchDelay ?? 15) - 15) * 0.02, 0.75, 1.15);
  const ramble = THREE.MathUtils.clamp((agent.genome as any)?.rambleFactor ?? 1.2, 0.85, 2.6);
  agent.treeLen = 0;
  agent.treeBudget = p.trunkLength * Math.pow(morphScale, 0.55) * delayScale * (0.92 + Math.random() * 0.16);
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
      const bias = toCentre.lengthSq() > 1 ? toCentre.normalize().multiplyScalar(toCentre.length() > 28 ? 0.22 : 0.05) : toCentre.set(0, 0, 0);
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
  agent.thickness = computeInitialTrunkThickness(agent.genome, zeroG);
  agent.treeBaseThick = agent.thickness;
}

export function ensureTreeAgentInit(engine: SimulationEngine, agent: Agent) {
  if (agent.treeBudget !== undefined || agent.isFeeler) return;
  if ((agent.branchDepth || 0) === 0) initTrunkThickness(agent, isTreeZeroGravity(engine));
  initTreeAgent(engine, agent);
}

export function getTreeRenderScale(agent: Agent): number {
  if ((agent.branchDepth || 0) !== 0 || !agent.treeBudget) return 1;
  const nubLen = Math.min(5.0, Math.max(2.5, agent.treeBudget * 0.35));
  const u = THREE.MathUtils.clamp((agent.treeLen || 0) / nubLen, 0, 1);
  return 1.20 - 0.20 * Math.sin(u * Math.PI * 0.5);
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
): Agent | undefined {
  const habit = getTreeHabit(engine, parent);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  if (isRhiz || depth >= 4) {
    const segBudget = getOrganismSegmentBudget(engine, parent.genome.name);
    const tissue = getStrainTissueCount(engine, parent.genome.name);
    if (tissue > segBudget * (isRhiz ? 1.0 : 1.95)) {
      const maxSeekers = isRhiz ? 6 : 16;
      const currentTips = engine.agents.filter(
        (a: Agent) => a.active && !a.tapering && !a.isFeeler && a.genome.name === parent.genome.name,
      ).length;
      if (currentTips >= maxSeekers) return undefined;
    }
  }
  const bud = makeTreeAgent(engine, parent, parent.position, dir, thickness, budget, depth, spacing);
  if (!offerTreeBud(engine, bud)) newAgents.push(bud);
  return bud;
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
  const normDir = dir.clone().normalize();
  const embedDist = Math.min(0.42, (parent.thickness || thickness) * 0.38);
  const embeddedStart = pos.clone().addScaledVector(normDir, -embedDist);
  const habit = getTreeHabit(engine, parent);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const defaultNextBud = p.noMidBranchLaterals
    ? Infinity
    : isRhiz
      ? budget * spacing * (0.35 + Math.random() * 0.35)
      : depth >= 4
        ? Infinity
        : budget * (0.56 + Math.random() * 0.18);
  return {
    position: embeddedStart.clone(),
    lastPosition: embeddedStart.clone(),
    direction: normDir,
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
    treeNextBud: defaultNextBud,
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
  const morphScale = THREE.MathUtils.clamp(template.genome?.morphScale ?? 1.0, 0.55, 1.85);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const rambleMult = 1.0 + (THREE.MathUtils.clamp((template.genome as any)?.rambleFactor ?? 1.2, 0.85, 2.6) - 1.0) * (isRhiz ? 0.70 : 0.55);
  const minT = minBranchThick(template, habit);

  let depth: number;
  let budget: number;
  let thickness: number;
  if (isRhiz) {
    depth = Math.max(1, Math.min(woodDepth + 1, maxDepth - 2));
    budget = p.limbLength * morphScale * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.8 + Math.random() * 0.4) * rambleMult;
    thickness = THREE.MathUtils.clamp(Math.max(woodThickness * 0.82, minT * (1.15 + 0.35 * vigor)), minT, minT * 3.2);
  } else {
    if (woodDepth >= 2) {
      depth = Math.max(3, maxDepth - 1);
      budget = 2.0 + Math.random() * 1.6;
      thickness = THREE.MathUtils.clamp(woodThickness * 0.45, minT * 1.8, 0.32);
    } else {
      depth = 2;
      budget = p.limbLength * 0.58 * morphScale;
      thickness = THREE.MathUtils.clamp(woodThickness * 0.72, 0.65, 1.8);
    }
  }
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
  const ramble = THREE.MathUtils.clamp((agent.genome as any)?.rambleFactor ?? 1.2, 0.85, 2.6);
  const isRhizHabit = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  const meanderAmt = isRhizHabit
    ? Math.sin((agent.age || 0) * 0.09 + (agent.id || 0) * 1.7) * 0.038 * Math.max(0, ramble - 0.95)
    : Math.sin((agent.age || 0) * 0.14 + (agent.id || 0) * 1.9) * 0.055 * (0.75 + 0.30 * ramble);
  const meanderPerp = perpendicular(d, ((agent.id || 0) * GOLDEN) + (agent.age || 0) * 0.045);

  if (isRhizHabit) {
    const rel3D = new THREE.Vector3().subVectors(agent.position, root);
    if (rel3D.lengthSq() > 0.04) {
      if (Math.sign(rel3D.y) !== Math.sign(d.y) && Math.abs(d.y) > 0.05) {
        rel3D.y = Math.sign(d.y) * Math.abs(rel3D.y);
      }
      rel3D.normalize();
      d.addScaledVector(rel3D, (depth <= 1 ? 0.045 : 0.030) * ramble * seekFactor);
    }
    d.addScaledVector(meanderPerp, meanderAmt);
    d.normalize();
    return;
  }

  const A = axisOf(agent);
  const rel = new THREE.Vector3().subVectors(agent.position, root);
  const radial = rel.addScaledVector(A, -rel.dot(A));
  if (radial.lengthSq() < 0.01) radial.copy(d).addScaledVector(A, -d.dot(A));
  if (radial.lengthSq() < 0.0001) radial.copy(perpendicular(A, 0));
  radial.normalize();
  const lean = (target: number, k: number) => {
    const a = d.dot(A);
    const scaledK = (k / Math.pow(ramble, 0.65)) * seekFactor;
    d.addScaledVector(A, THREE.MathUtils.lerp(a, target, scaledK) - a);
  };

  if (depth === 0) {
    d.lerp(A, (habit === "pine" ? 0.08 : 0.1) / Math.pow(ramble, 0.65));
    d.addScaledVector(meanderPerp, meanderAmt * 0.35);
  } else if (depth === 1) {
    const target = habit === "candelabra" || habit === "elm" ? 0.48 : 0.38;
    lean(target, 0.022);
    d.addScaledVector(radial, 0.032 * seekFactor * ramble);
    d.addScaledVector(meanderPerp, meanderAmt * 0.95);
  } else if (depth === 2) {
    lean(0.22, 0.018);
    d.addScaledVector(radial, 0.038 * seekFactor * ramble);
    d.addScaledVector(meanderPerp, meanderAmt * 1.15);
  } else {
    // depth >= 3 (twigs): very light axial lean + strong radial / meander splay
    lean(0.12, 0.008);
    d.addScaledVector(radial, 0.042 * seekFactor * ramble);
    d.addScaledVector(meanderPerp, meanderAmt * 1.55);
  }
  d.normalize();
}

const REST_MIN_TICKS = 14;
const REST_RANGE_TICKS = 22;
const REST_GROWTH_PER_FLUSH = 0.05;
const FLUSH_VIGOR_DECAY = 0.95;
const FLUSH_VIGOR_FLOOR = 0.65;

function enterTreeRest(agent: Agent) {
  agent.treeDormant = true;
  const flushes = agent.treeFlushes || 0;
  agent.treeRestTicks = Math.round(
    (REST_MIN_TICKS + Math.random() * REST_RANGE_TICKS) * (1 + Math.min(4, flushes) * REST_GROWTH_PER_FLUSH),
  );
}

export function tickTreeRest(engine: SimulationEngine, agent: Agent): boolean {
  if (!agent.treeDormant || agent.tapering || agent.isFeeler) return false;
  const habit = getTreeHabit(engine, agent);
  const isRhiz = habit === "rhizome" || habit === "rhizome_tuber" || habit === "rhizome_lace";
  if (!isRhiz) return false;
  if (getStrainTissueCount(engine, agent.genome.name) > getOrganismSegmentBudget(engine, agent.genome.name) * 1.28) return false;
  if (agent.treeRestTicks === undefined) enterTreeRest(agent);
  const inatCharge = (engine as any).inatBroodinessCharge ?? 0.35;
  const wakeStep = inatCharge > 0.35 ? 2 : 1;
  agent.treeRestTicks = (agent.treeRestTicks || 0) - wakeStep;
  if (agent.treeRestTicks > 0) return false;

  const p = profileFor(engine, agent);
  const maxDepth = maxDepthFor(engine, p, habit, agent);
  const flushes = (agent.treeFlushes = (agent.treeFlushes || 0) + 1);
  const vigor = Math.min(
    1.15,
    Math.max(FLUSH_VIGOR_FLOOR, Math.pow(FLUSH_VIGOR_DECAY, flushes - 1)) * (1 + 0.22 * inatCharge),
  );
  const depth = Math.max(1, maxDepth - 2);
  const morphScale = THREE.MathUtils.clamp(agent.genome?.morphScale ?? 1.0, 0.55, 1.85);
  const rambleMult =
    1.0 +
    (THREE.MathUtils.clamp((agent.genome as any)?.rambleFactor ?? 1.2, 0.85, 2.6) - 1.0) * (isRhiz ? 0.70 : 0.55);
  const budget =
    p.limbLength * morphScale * Math.pow(p.lengthRatio, depth - 1) * vigor * (0.95 + Math.random() * 0.35) * rambleMult;
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
  agent.treeNextBud = p.noMidBranchLaterals ? Infinity : budget * spacing * (0.35 + Math.random() * 0.4);
  agent.thickness = Math.max(agent.thickness, MIN_TWIG * 3.2 * vigor + MIN_TWIG);
  agent.targetThickness = agent.thickness;
  const az = Math.random() * Math.PI * 2;
  agent.direction.copy(deflect(agent.direction, THREE.MathUtils.degToRad(p.forkAngleDeg), az));
  const root = agent.treeRoot || agent.position;
  const rel3D = new THREE.Vector3().subVectors(agent.position, root);
  if (rel3D.lengthSq() > 0.01) agent.direction.addScaledVector(rel3D.normalize(), 0.4);
  agent.direction.add(new THREE.Vector3().randomDirection().multiplyScalar(0.3)).normalize();
  engine.onLog(`🌳 ${agent.genome.name} [RHIZOME] new growth flush #${flushes}`);
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
  const rambleMult =
    1.0 +
    (THREE.MathUtils.clamp((agent.genome as any)?.rambleFactor ?? 1.2, 0.85, 2.6) - 1.0) * (isRhiz ? 0.70 : 0.55);

  agent.treeLen = (agent.treeLen || 0) + stepLen;
  recordTreeNode(engine, agent);

  const minT = minBranchThick(agent, habit);
  const progressFrac = THREE.MathUtils.clamp(agent.treeLen / Math.max(0.1, budget), 0, 1);
  if (isRhiz) {
    const endTaper = Math.max(0.82, endTaperFor(engine, p, agent));
    agent.thickness = Math.max(minT, agent.thickness * Math.pow(endTaper, stepLen / budget));
  } else {
    // Trees: hold stout girth on trunk & main body of limbs, taper distal limb ends smoothly into twigs
    let orderTaper: number;
    if (depth === 0) {
      orderTaper = habit === "pine" ? 0.68 : 0.85;
    } else if (depth === 1) {
      orderTaper = progressFrac < 0.65 ? 0.86 : 0.58;
    } else if (depth === 2) {
      orderTaper = progressFrac < 0.50 ? 0.82 : 0.42;
    } else if (depth === 3) {
      orderTaper = 0.72;
    } else if (depth === 4) {
      orderTaper = 0.68;
    } else {
      orderTaper = 0.52;
    }
    agent.thickness = Math.max(0.028, agent.thickness * Math.pow(orderTaper, stepLen / budget));
  }

  // ---- Lateral buds ----
  const canLateral = !p.noMidBranchLaterals && depth + 1 <= maxDepth && roomForTips;
  while (!p.noMidBranchLaterals && agent.treeLen >= (agent.treeNextBud ?? Infinity) && agent.treeLen < budget * 0.94) {
    const frac = agent.treeLen / budget;
    if (canLateral && agent.thickness > (isRhiz ? minT * 0.95 : 0.042)) {
      if (depth === 0 && habit === "pine") {
        const count = 2 + (Math.random() < 0.45 ? 1 : 0);
        const baseAz = Math.random() * Math.PI * 2;
        const tierLen = p.limbLength * morphScale * (0.95 - 0.35 * frac) * (0.85 + Math.random() * 0.25) * rambleMult;
        const childT = Math.max(0.55, agent.thickness * 0.72);
        for (let w = 0; w < count; w++) {
          const az = baseAz + (w * Math.PI * 2) / count + (Math.random() - 0.5) * 0.4;
          const A = axisOf(agent);
          const dir = perpendicular(A, az).addScaledVector(A, 0.15 + (Math.random() - 0.5) * 0.1).normalize();
          spawnChild(engine, agent, newAgents, dir, childT, tierLen, 1, p.lateralSpacing);
        }
        agent.thickness *= 0.94;
      } else if (isRhiz) {
        const alpha = p.lateralAlpha * (0.8 + Math.random() * 0.4);
        const childT = Math.max(minT, agent.thickness * Math.max(0.68, Math.pow(alpha, 1 / PIPE_GAMMA)));
        agent.thickness = Math.max(minT * 1.1, agent.thickness * Math.pow(1 - alpha * 0.35, 1 / PIPE_GAMMA));
        const az = (agent.treeBudIdx = (agent.treeBudIdx || 0) + 1) * GOLDEN;
        const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 20);
        const dir = deflect(agent.direction, angle, az);
        agent.direction.copy(deflect(agent.direction, angle * alpha * 0.55, az + Math.PI));
        const out3D = new THREE.Vector3().subVectors(agent.position, agent.treeRoot || agent.position);
        if (out3D.lengthSq() > 0.04) dir.addScaledVector(out3D.normalize(), 0.22).normalize();
        const childBudget =
          (depth === 0 ? p.limbLength * morphScale * (0.85 + Math.random() * 0.25) * rambleMult : budget * p.lengthRatio) *
          (0.85 + Math.random() * 0.3);
        spawnChild(engine, agent, newAgents, dir, childT, childBudget, depth + 1, spacing);
      } else {
        // Tree lateral buds: preserve parent thickness on depth 0..2; burst compact twigs on depth >= 2
        let childT: number;
        let childBudget: number;
        if (depth === 0) {
          childT = agent.thickness * 0.72;
          agent.thickness *= 0.94;
          childBudget = p.limbLength * morphScale * (0.82 + Math.random() * 0.20) * rambleMult;
        } else if (depth === 1) {
          childT = agent.thickness * 0.70;
          agent.thickness *= 0.94;
          childBudget = THREE.MathUtils.clamp(budget * p.lengthRatio * (0.85 + Math.random() * 0.20), 3.6, 5.2);
        } else if (depth === 2) {
          childT = THREE.MathUtils.clamp(agent.thickness * 0.52, 0.16, 0.30);
          agent.thickness *= 0.92;
          childBudget = THREE.MathUtils.clamp(budget * 0.60, 2.2, 3.2);
        } else if (depth === 3) {
          childT = THREE.MathUtils.clamp(agent.thickness * 0.58, 0.095, 0.16);
          agent.thickness *= 0.93;
          childBudget = THREE.MathUtils.clamp(budget * 0.65, 1.5, 2.3);
        } else {
          childT = THREE.MathUtils.clamp(agent.thickness * 0.58, 0.048, 0.09);
          agent.thickness *= 0.94;
          childBudget = THREE.MathUtils.clamp(budget * 0.65, 1.0, 1.6);
        }

        const az = (agent.treeBudIdx = (agent.treeBudIdx || 0) + 1) * GOLDEN;
        const angle = THREE.MathUtils.degToRad(p.lateralAngleDeg + (Math.random() - 0.5) * 22);
        const dir = deflect(agent.direction, angle, az);
        const childSpacing = depth >= 2 ? Math.max(0.28, spacing * 0.85) : Math.max(0.36, spacing);
        const child = spawnChild(engine, agent, newAgents, dir, childT, childBudget, depth + 1, childSpacing);
        if (child) {
          child.treeNextBud = depth + 1 >= 4 ? Infinity : childBudget * (0.52 + Math.random() * 0.16);
        }
      }
    }
    const orderSpacing = isRhiz
      ? (depth >= 2 ? spacing * 0.52 : spacing)
      : (depth <= 1 ? 0.48 : (depth === 2 ? 0.44 : (depth === 3 ? 0.48 : Infinity)));
    const baseGap = depth === 0 && habit === "pine" ? p.whorlSpacing! : budget * orderSpacing;
    agent.treeNextBud = (agent.treeNextBud || 0) + baseGap * (0.82 + Math.random() * 0.30);
  }

  const overBudget = isOverSizeBudget(engine, agent.genome.name);
  if (agent.treeLen < (overBudget && (isRhiz ? depth >= 1 : depth >= 3) ? budget * 0.78 : budget)) return;

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
        const limbBudget = p.limbLength * morphScale * (0.88 + Math.random() * 0.28) * rambleMult;
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

    const n = Math.max(3, p.crownDivision + (Math.random() < 0.45 ? 1 : 0));
    const baseAz = Math.random() * Math.PI * 2;
    const limbT = agent.thickness * 0.78;
    const limbSpacing = Math.max(0.36, spacing);
    for (let k = 0; k < n; k++) {
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.45;
      const spread = THREE.MathUtils.degToRad(p.divisionSpreadDeg + (Math.random() - 0.5) * 14);
      const dir = deflect(axisOf(agent), spread, az);
      const limbBudget = p.limbLength * morphScale * (0.88 + Math.random() * 0.22) * rambleMult;
      const nextBud = p.noMidBranchLaterals ? Infinity : limbBudget * (0.52 + Math.random() * 0.16);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = limbT;
        agent.branchDepth = 1;
        agent.branchBasePos = agent.position.clone();
        agent.isCanopy = true;
        agent.treeLen = 0;
        agent.treeBudget = limbBudget;
        agent.treeNextBud = nextBud;
      } else {
        const child = spawnChild(engine, agent, newAgents, dir, limbT, limbBudget, 1, limbSpacing);
        if (child) child.treeNextBud = nextBud;
      }
    }
    return;
  }

  const minForkThick = isRhiz ? minT * 0.95 : 0.032;
  const sizeBudgetCap = getOrganismSegmentBudget(engine, agent.genome.name) * (isRhiz ? 1.65 : 2.25);
  const isHardOverBudget = (isRhiz ? depth >= 1 : depth >= 4) && getStrainTissueCount(engine, agent.genome.name) > sizeBudgetCap;
  const canFork = depth >= 1 && depth < maxDepth && agent.thickness > minForkThick && (!isRhiz && depth <= 3 ? true : roomForTips) && !isHardOverBudget;
  if (!canFork) {
    if (shouldBecomeKeeper(engine, agent, newAgents)) {
      enterTreeRest(agent);
      return;
    }
    agent.tapering = true;
    agent.taperBudget = 0;
    return;
  }

  if (isRhiz) {
    const n = Math.random() < 0.35 ? 3 : 2;
    const equal = Math.random() < (engine.branchSplitSizeProb ?? 0.35);
    const baseAz = Math.random() * Math.PI * 2;
    const startT = agent.thickness;
    for (let k = 0; k < n; k++) {
      const share = equal ? 1 / n : (k === 0 ? 0.56 : 0.48 / (n - 1));
      const t = Math.max(minT, startT * Math.max(0.72, Math.pow(share, 1 / PIPE_GAMMA)));
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
    return;
  }

  // ---- Trees: Two-regime forking (Stout limbs -> rich multi-order burst of twigs) ----
  const startT = agent.thickness;
  const baseAz = Math.random() * Math.PI * 2;

  if (depth === 1) {
    // Big Primary Limb -> Stout Secondary Limbs (depth 2)
    const n = Math.random() < 0.55 ? 3 : 2;
    const limbSpacing = Math.max(0.36, spacing);
    for (let k = 0; k < n; k++) {
      const t = startT * (n === 3 ? 0.72 : 0.76) * (0.94 + Math.random() * 0.12);
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.45;
      const ang = THREE.MathUtils.degToRad(p.forkAngleDeg * (0.92 + Math.random() * 0.20));
      const dir = deflect(agent.direction, ang, az);
      const childBudget = THREE.MathUtils.clamp(budget * p.lengthRatio * (0.85 + Math.random() * 0.22), 3.8, 5.2);
      const childNextBud = childBudget * (0.55 + Math.random() * 0.16);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = t;
        agent.branchDepth = 2;
        agent.treeLen = 0;
        agent.treeBudget = childBudget;
        agent.treeNextBud = childNextBud;
      } else {
        const child = spawnChild(engine, agent, newAgents, dir, t, childBudget, 2, limbSpacing);
        if (child) child.treeNextBud = childNextBud;
      }
    }
  } else if (depth === 2) {
    // Secondary Limb -> Burst of Primary Twig Branches (depth 3: 3..4 twigs!)
    const n = 3 + (Math.random() < 0.65 ? 1 : 0);
    const twigAngle = THREE.MathUtils.degToRad(Math.max(46, p.forkAngleDeg * 1.15) + (Math.random() - 0.5) * 16);
    const childSpacing = Math.max(0.28, spacing * 0.85);
    for (let k = 0; k < n; k++) {
      const t = THREE.MathUtils.clamp(startT * (0.50 + Math.random() * 0.10), 0.16, 0.30);
      const childBudget = THREE.MathUtils.clamp(budget * 0.60 * (0.85 + Math.random() * 0.25), 2.2, 3.2);
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.55;
      const dir = deflect(agent.direction, twigAngle, az);
      const childNextBud = childBudget * (0.52 + Math.random() * 0.16);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = t;
        agent.branchDepth = 3;
        agent.treeLen = 0;
        agent.treeBudget = childBudget;
        agent.treeNextBud = childNextBud;
      } else {
        const child = spawnChild(engine, agent, newAgents, dir, t, childBudget, 3, childSpacing);
        if (child) child.treeNextBud = childNextBud;
      }
    }
  } else if (depth === 3) {
    // Primary Twig Branch -> Burst of Fine Twigs (depth 4: 3 fine twigs!)
    const n = 3;
    const fineAngle = THREE.MathUtils.degToRad(Math.max(50, p.forkAngleDeg * 1.22) + (Math.random() - 0.5) * 18);
    const childSpacing = Math.max(0.28, spacing * 0.85);
    for (let k = 0; k < n; k++) {
      const t = THREE.MathUtils.clamp(startT * (0.58 + Math.random() * 0.10), 0.095, 0.16);
      const childBudget = THREE.MathUtils.clamp(budget * 0.65 * (0.85 + Math.random() * 0.25), 1.5, 2.3);
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.6;
      const dir = deflect(agent.direction, fineAngle, az);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = t;
        agent.branchDepth = 4;
        agent.treeLen = 0;
        agent.treeBudget = childBudget;
        agent.treeNextBud = Infinity;
      } else {
        const child = spawnChild(engine, agent, newAgents, dir, t, childBudget, 4, childSpacing);
        if (child) child.treeNextBud = Infinity;
      }
    }
  } else {
    // depth >= 4 -> Delicate Terminal Twiglets (depth 5..6: 2..3 delicate twiglets!)
    const n = Math.random() < 0.65 ? 3 : 2;
    const ang = THREE.MathUtils.degToRad(Math.max(52, p.forkAngleDeg * 1.28) + (Math.random() - 0.5) * 18);
    for (let k = 0; k < n; k++) {
      const t = THREE.MathUtils.clamp(startT * (0.58 + Math.random() * 0.08), 0.048, 0.09);
      const childBudget = THREE.MathUtils.clamp(budget * 0.65 * (0.85 + Math.random() * 0.25), 1.0, 1.6);
      const az = baseAz + (k * Math.PI * 2) / n + (Math.random() - 0.5) * 0.55;
      const dir = deflect(agent.direction, ang, az);
      if (k === 0) {
        agent.direction.copy(dir);
        agent.thickness = t;
        agent.branchDepth = depth + 1;
        agent.treeLen = 0;
        agent.treeBudget = childBudget;
        agent.treeNextBud = Infinity;
      } else {
        const child = spawnChild(engine, agent, newAgents, dir, t, childBudget, depth + 1, spacing * 0.5);
        if (child) child.treeNextBud = Infinity;
      }
    }
  }
}
