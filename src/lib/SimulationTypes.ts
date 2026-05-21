import * as THREE from "three";

export const GEO_TYPES = ["cylinder", "ribbon", "segmented"] as const;
export const APPENDAGES = [
  "none",
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
export type Archetype = "bush" | "tree" | "snake" | "ginger";
export const ARCHETYPES: Archetype[] = ["bush", "tree", "snake", "ginger"];

export type MovementType = "wiggle" | "spiral" | "orthogonal";
export const MOVEMENT_TYPES: MovementType[] = ["wiggle", "spiral", "orthogonal"];

export const PULSE_TARGETS = ["none", "stem", "appendage", "all"] as const;

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
  createdAt?: number;
  singleton?: boolean;
  isGlowing?: boolean;
  
  // Procedural Leaf Genes
  leafDivision: number;
  vernationType: "circinate" | "convolute" | "conduplicate";
  canopyZone: "wholeBody" | "terminal" | "basal";
  phyllotaxisMode: "spiral" | "decussate" | "whorled";
  succulence: number;
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
  growthBoost?: number;
}

export interface Segment {
  index: number;
  timestamp: number;
  strainName: string;
  matrix: THREE.Matrix4;
  thickness: number;
  dyingStart?: number;
  variant?: number;
  parentIndex?: number;
  parentTimestamp?: number;
  color?: THREE.Color;
  randomFactor?: number;
}

export const MAX_POINTS = 240000;
