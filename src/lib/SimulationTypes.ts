import * as THREE from "three";

export const GEO_TYPES = ["cylinder", "ribbon", "segmented"] as const;
export const APPENDAGES = [
  "thorns",
  "hair",
  "curlyHair",
  "crystals",
  "spores",
  "scales",
  "spirals",
  "flowers",
  "lillyPads",
  "leaves",
  "petals",
  "needles",
  "sparkles",
  "ferns",
  "buds",
] as const;
export type Archetype = "bush" | "tree" | "snake" | "rhizome";
export const ARCHETYPES: Archetype[] = ["bush", "tree", "rhizome"];

export type MovementType = "wiggle" | "spiral" | "orthogonal";
export const MOVEMENT_TYPES: MovementType[] = ["wiggle", "spiral", "orthogonal"];

export const PULSE_TARGETS = ["none", "stem", "appendage", "all"] as const;

export type MorphMode =
  | "monolith"
  | "big_branching"
  | "candelabra"
  | "spire"
  | "umbrella"
  | "filigree"
  | "bush_compact"
  | "bush_medium"
  | "bush_giant"
  | "rhizome_tuber"
  | "rhizome_stolon"
  | "rhizome_lace";

export interface RecessiveGenes {
  archetype: Archetype;
  movementType: MovementType;
  geometryType: (typeof GEO_TYPES)[number];
  appendage: (typeof APPENDAGES)[number];
  color: THREE.Color;
  isGlowing: boolean;
  vernationType: "circinate" | "convolute" | "conduplicate";
  canopyZone: "wholeBody" | "terminal" | "basal";
  phyllotaxisMode: "spiral" | "decussate" | "whorled";
  growthHabit?: string;
  morphMode?: MorphMode;
  morphScale?: number;
  trunkGirthMod?: number;
  branchOrderCap?: number;
}

export interface Genome {
  name: string;
  archetype: Archetype;
  movementType: MovementType;
  color: THREE.Color;
  thicknessBase: number;
  thicknessDecay: number;
  minThickness: number;
  stepSize: number;
  bifurcationRate: number;
  wanderIntensity: number;
  branchTendency: number;
  wavingSpeed: number;
  wavingAmplitude: number;
  geometryType: (typeof GEO_TYPES)[number];
  appendage: (typeof APPENDAGES)[number];
  stability: number;
  multicolorAppendage: boolean;
  sameColorAppendage: boolean;
  pulseTarget: (typeof PULSE_TARGETS)[number];
  pulseSpeed: number;
  gradientGrowth?: boolean;
  gradientType?: number;
  createdAt?: number;
  singleton?: boolean;
  isGlowing?: boolean;
  isHybrid?: boolean;
  
  // Procedural Leaf Genes
  leafDivision: number;
  vernationType: "circinate" | "convolute" | "conduplicate";
  canopyZone: "wholeBody" | "terminal" | "basal";
  phyllotaxisMode: "spiral" | "decussate" | "whorled";
  succulence: number;
  growthHabit?: string;
  morphMode?: MorphMode;
  morphScale?: number;
  trunkGirthMod?: number;
  branchOrderCap?: number;

  recessive?: RecessiveGenes;
  genomeHash?: number;
  cooldownUntil?: number;
  matedPartners?: Set<string>;
  parentStrains?: string[];
  birthPos?: THREE.Vector3;
  lastMatingPos?: THREE.Vector3;
}

export interface Agent {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  genome: Genome;
  active: boolean;
  age: number;
  lastPosition: THREE.Vector3;
  thickness: number;
  targetThickness?: number;
  cooldown: number;
  tapering?: boolean;
  forceTapering?: boolean;
  recovering?: boolean;
  suppressionFade?: number;
  growthAccumulator?: number;
  spiralAxis?: THREE.Vector3;
  isFeeler?: boolean;
  realGenome?: Genome;
  parentAgent?: Agent;
  growthBoost?: number;
  isCanopy?: boolean;
  branchCooldown?: number;
  hasBred?: boolean;
  matingCount?: number;
  fadeAge?: number;
  taperBudget?: number;
  dieAfterTicks?: number;
  id?: number;
  parentId?: number;
  branchDepth?: number;
  hasFeelerAttempted?: boolean;
  // Tree architecture model state (see SimulationTreeArchitecture.ts)
  treeLen?: number;
  treeBudget?: number;
  treeNextBud?: number;
  treeBudIdx?: number;
  treeRoot?: THREE.Vector3;
  treeAxis?: THREE.Vector3; // zero-gravity mode: the tree's own "up" (shared by all its branches)
  treeBaseThick?: number;
  treeDormant?: boolean; // resting tree keeper: no growth, still breeds + ages
  treeRestTicks?: number; // ticks left before a resting keeper wakes for a new growth flush
  treeFlushes?: number; // how many growth flushes this tip has had (vigor slowly declines)
  isSeekerTwig?: boolean;
  seekerFlushes?: number;
  // Feeler lifecycle (see SimulationFeelers.ts)
  feelerTargetStrain?: string; // root organism the feeler was aimed at when spawned (locked)
  feelerStep?: number; // per-step length, scaled from the parent's botanical step
  feelerTravel?: number; // distance travelled so far
  feelerMaxLen?: number; // min(1.2 x initial target distance, FEELER_MAX_REACH)
  feelerNearestPos?: THREE.Vector3; // nearest target tissue found by the last full scan
  feelerStepOverride?: number; // clamp for the final step onto the target
  feelerEnded?: boolean; // [FEELER_END] already logged + segments dissolved
  rootOrigin?: THREE.Vector3;
  branchBasePos?: THREE.Vector3;
  lastStepSize?: number;
}

export interface Segment {
  index: number;
  timestamp: number;
  strainName: string;
  strainBName?: string;
  childStrainName?: string;
  agentId?: number;
  agentAId?: number;
  agentBId?: number;
  matrix: THREE.Matrix4;
  thickness: number;
  dyingStart?: number;
  variant?: number;
  parentIndex?: number;
  parentTimestamp?: number;
  color?: THREE.Color;
  randomFactor?: number;
  countsForBiomass?: boolean;
  isFeeler?: boolean;
  rootOrigin?: THREE.Vector3;
  branchBasePos?: THREE.Vector3;
  branchDepth?: number;
}

export interface SpeciesLifecycleState {
  phase: 'GROWING' | 'MATURE' | 'END_OF_LIFE';
  createdAt: number;
  hasBred: boolean;
  matingCount: number;
  feelerAttempted?: boolean;
  deathStartTick?: number;
  reason?: string;
  cooldownUntil?: number;
  matedPartners?: Set<string>;
  parentStrains?: string[];
  birthPos?: THREE.Vector3;
  lastMatingPos?: THREE.Vector3;
  maxAgeSteps?: number; // max growth-step age reached by any of the organism's tips
  segsAtDeath?: number; // live stem segments marked dying when end-of-life began
  eradicated?: boolean; // "fully eradicated" already logged
}

export const MAX_POINTS = 500000;
