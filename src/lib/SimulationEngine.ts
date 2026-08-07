import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Genome,
  Agent,
  Segment,
  MAX_POINTS,
  Archetype,
  SpeciesLifecycleState,
} from "./SimulationTypes";
import { updateSimulation } from "./SimulationUpdate";
import { setupSimulationScene } from "./SimulationRenderer";
import {
  updateMeshSegments,
  processDyingSegments,
} from "./SimulationMeshUpdate";
import {
  generateRandomGenome,
  randomizeColors,
  updateBoundaryMesh,
  setupCameraProjection,
  setupBoundarySize,
  setupBoundarySquash,
  setupSceneBackground,
  setupFogColor,
  setupFogVisibility,
  setupTheme,
  spawnNewSpecies,
  setupInitialCreatures,
  resetCamera,
  executeReset,
  initSpeciesLifecycle,
  killSpecies,
  spawnHybridArtifact,
  updateGridHelpers,
  handleScreenFade,
  emitStateUpdate,
  getTrackedPositions,
} from "./SimulationSceneSetup";

export class SimulationEngine {
  scene: THREE.Scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;

  agents: Agent[] = [];

  maxAgents: number = 200;

  cylinderMesh!: THREE.InstancedMesh;
  tideMesh!: THREE.Mesh;
  hybridMeshes: THREE.InstancedMesh[] = [];
  hybridConnectionMesh!: THREE.LineSegments;
  dummy!: THREE.Object3D;
  canvas!: HTMLCanvasElement;
  floorGridMat?: THREE.ShaderMaterial;
  ceilingGridMat?: THREE.ShaderMaterial;
  floorGridMesh?: THREE.GridHelper;
  ceilingGridMesh?: THREE.GridHelper;
  silhouetteTarget?: THREE.WebGLRenderTarget;
  silhouettePixelBuffer?: Uint8Array;

  pointCount: number = 0;
  segments: Segment[] = [];
  hybridSegments: Segment[] = [];
  hybridCount: number = 0;

  appendages: Map<
    string,
    {
      mesh: THREE.InstancedMesh;
      segments: Segment[];
      dyingSet: Set<number>;
      count: number;
    }
  > = new Map();

  biomassMap: Map<string, number> = new Map();
  genomeMap: Map<string, Genome> = new Map();
  suppressedStrains: Set<string> = new Set();
  speciesAbove3Percent: Set<string> = new Set();
  time: number = 0;
  lastBiomassCheckTime: number = 0;
  unscaledTime: number = 0;
  frameCount: number = 0;
  timeScale: number = 1;
  hoveredStrainName: string | null = null;
  lastHoveredStrainName: string | null = null;
  glowTraitIntensity: number = 1.5;
  glowTraitDistance: number = 50.0;
  glowTraitReflect: number = 1.0;

  onLog: (msg: string) => void = () => {};
  onStateUpdate: (state: any) => void = () => {};
  onConfigChange?: (config: any) => void;
  onInitOrganisms?: (event: { alpha: Genome; beta: Genome }) => void;
  onMatingEvent?: (event: { parent1: Genome; parent2: Genome; child: Genome; count?: number }) => void;
  onFeelerEvent?: (event: { parent: Genome; feeler: Genome; count?: number }) => void;
  matingCount: number = 0;
  totalHybridCount: number = 0;
  feelerCount: number = 0;
  nextAgentId: number = 1;
  strainFeelerCooldown: Map<string, number> = new Map();
  speciesLifecycleMap: Map<string, SpeciesLifecycleState> = new Map();
  hasAnyOrganismBred: boolean = false;
  lastMatingWorldPos?: THREE.Vector3;
  lastFeelerWorldPos?: THREE.Vector3;

  rotationSpeed: number = 0.13;
  rotationSpeedY: number = 0.0;
  phiDirection: number = -1;
  magnetism: number = 0.08708895046646814;
  seekAmount: number = 0.0;
  proximity: number = 362.21842356693804;
  desperation: number = 6.900969569643401;
  despairAge: number = 1310.6350448360784;
  maxMatings: number = 1;
  startColorMode: string = "analogous";
  flowerSize: number = 1.0;
  globalPulseSpeed: number = 0.6760780934052621;
  maxLineWidth: number = 15.969935502148255;
  widthVariance: number = 0.5;
  branchGrowthBoost: number = 1.5;
  colorMutationShift: number = 0.06;
  multicolorAppProb: number = 0.2190675672205824;
  sameColorAppProb: number = 0.32405154770477973;
  tideSpeed: number = 1.5952414033038085;
  tideValue: number = 0;
  tideColorTop: string = "#2c7abe";
  tideColorBottom: string = "#5c3e5e";
  tideThickness: number = 377.1499619661219;
  tideOpacity: number = 0.25457806871050703;
  tideSaturation: number = 0.9915627848373325;
  maxSaturation: number = 0.43933066036466184;
  colorClamp: number = 1;
  growthSpeed: number = 0.11;
  widthGrowthEffect: number = 0.0;
  diebackRate: number = 8.111775230578985;
  allowBreeding: boolean = true;
  hybridCooldown: number = 339.6557860499387;
  postMatingDieoff: boolean = true;
  hybridStickiness: number = 42.874691796901615;
  hybridSpinSpeed: number = 0.2;
  ornamentFrequency: number = 6.343394210305978;
  branchingMultiplier: number = 500;
  branchTendencyVar: number = 20.13801242680057;
  desiccationSpeed: number = 9.174839585959253;

  botanyRealism: boolean = true;
  windVelocity: number = 0.2;
  flutterIntensity: number = 0.5;
  leafScale: number = 0.55;
  leafDensity: number = 0.35;
  relativeLeafSizeDiff: number = 0.2;
  leafGrowthSpeed: number = 0.0045;
  phyllotaxisAngle: number = 137.5;
  leafProbability: number = 1;
  appendageSpawnRate: number = 1;
  glowProbability: number = 0.1;
  stemCurviness: number = 3;
  veinStrength: number = 15;
  veinGlow: number = 0.5;

  hybridSize: number = 2.0;

  maxDOMs: number = 341000;
  lastMaxDOMs: number = 341000;
  minAgents: number = 6;
  boundarySize: number = 120;
  boundarySquash: number = 1.0;
  boundaryShape: "sphere" | "cube" = Math.random() < 0.5 ? "sphere" : "cube";
  maxSpecies: number = 14;
  ecoFade: number = 0.5769956505103522;
  probGlow: number = 0.0;
  branchSplitSizeProb: number = 0.6199182775180784;
  branchBigger: number = 0.8195623433742498;
  enableGlow: boolean = false;
  glowSize: number = 0.5;
  fogVisibility: number = 760.9755555176774;
  tideCullIndex: number = 0;

  kioskMode: boolean = false;
  lastKioskTime: number = 0;
  lastKioskRealTime: number = 0;
  kioskFadeProgress: number = 0;
  kioskFadingOut: boolean = false;
  onKioskTrigger?: () => void;

  bgColor: string = "#001220";
  tideColor: string = "#FF4500";
  
  theme: number = 0;
  nextTheme: number = 0;
  themeProgress: number = 1.0;
  themeMorphFreq: number = 1.0;
  themeMorphSpeed: number = 5.0;
  manualThemeTransition: boolean = false;
  lastThemeMorphTime: number = 0;

  themeColor1: string = "#ffffff";
  themeColor2: string = "#ffffff";
  nextThemeColor1: string = "#ffffff";
  nextThemeColor2: string = "#ffffff";

  traitProbs: Record<string, number> = {
    flowers: 0.5,
    lillyPads: 0.5,
    leaves: 0.4,
    petals: 0.5,
    needles: 0.5,
    thorns: 0.5,
    hair: 0.5,
    curlyHair: 0.5,
    crystals: 0.5,
    spores: 0.5,
    scales: 0.5,
    spirals: 0.5,
    ferns: 0.5,
    sparkles: 0.3,
    buds: 0.4
  };

  dyingStems = new Set<number>();
  dyingHybrids = new Set<number>();
  dyingStrains = new Set<string>();

  blackColor = new THREE.Color(0, 0, 0);
  colorDummy = new THREE.Color();

  terminationProb: number = 0.02;
  termProbPostBranch: number = 0.5;
  segmentGap: number = 0.12;
  taperDuration: number = 1.5;
  feelerFade: number = 10.0;
  diebackAgeBias: number = 2.0;
  cullRate: number = 5.0;

  snakeSpeed: number = 1.4;
  snakeStepSize: number = 1.2;
  snakeWander: number = 1.0;
  bushSpeed: number = 1.10;
  treeSpeed: number = 1.20;
  rhizomeSpeed: number = 0.75;

  bushStepSize: number = 0.45;
  treeStepSize: number = 0.90;
  rhizomeStepSize: number = 0.40;

  bushBranching: number = 9.5;
  treeBranching: number = 1.8;
  snakeBranching: number = 1.0;
  rhizomeBranching: number = 1.4;

  private reqId: number = 0;
  lastFlowerSize: number = 1.0;
  lastHybridSize: number = 2.0;
  lastLeafScale: number = 0.55;
  lastRelativeLeafSizeDiff: number = 0.2;
  lastStemCurviness: number = 1.0;

  width: number = 0;
  height: number = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    setupSimulationScene(this, width, height);
    // initAgents() is NOT called here — it is called explicitly in SimulationView
    // after all user settings have been applied to the engine.
  }

  private generateRandomGenome(baseName: string, forceArchetype?: any): Genome {
    return generateRandomGenome(this, baseName, forceArchetype);
  }

  randomizeColors() {
    randomizeColors(this);
  }

  cameraZoom: number = 1.15;
  cameraHeight: number = 75;
  gridHeight: number = 80;
  layerGap: number = 80;
  floorHeight: number = 0;
  ceilingHeight: number = 0;
  cameraProjection: number = 1.0;
  ambientLight?: THREE.AmbientLight;
  showBoundaryBox: boolean = false;
  boundaryMesh?: THREE.LineSegments;
  fadeProgress: number = 0;
  fadeState: "idle" | "out" | "in" = "idle";
  fadeScene?: THREE.Scene;
  fadeCamera?: THREE.OrthographicCamera;
  fadeQuadMat?: THREE.MeshBasicMaterial;
  fadeQuadMesh?: THREE.Mesh;

  setShowBoundaryBox(show: boolean) {
    this.showBoundaryBox = show;
    this.updateBoundaryMesh();
  }

  updateBoundaryMesh() {
    updateBoundaryMesh(this);
  }

  setGridHeight(height: number) {
    this.gridHeight = height;
    this.layerGap = height;
  }
  setLayerGap(gap: number) {
    this.layerGap = gap;
    this.gridHeight = gap;
  }
  setFloorHeight(h: number) {
    this.floorHeight = h;
  }
  setCeilingHeight(h: number) {
    this.ceilingHeight = h;
  }
  setCameraProjection(val: number) {
    setupCameraProjection(this, val);
  }

  setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
    if (this.controls) this.controls.autoRotateSpeed = speed;
  }
  setRotationSpeedY(speed: number) {
    this.rotationSpeedY = speed;
  }
  setCameraZoom(zoom: number) {
    this.cameraZoom = zoom;
    if (this.camera) {
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
    }
  }
  setCameraHeight(height: number) {
    this.cameraHeight = height;
    if (this.camera && this.controls) {
      this.controls.target.y = height;
      this.camera.position.y = height;
      this.controls.update();
    }
  }
  setMagnetism(val: number) {
    this.magnetism = val;
  }
  setSeekAmount(val: number) {
    this.seekAmount = val;
  }
  setProximity(val: number) {
    this.proximity = val;
  }

  setDesperation(val: number) {
    this.desperation = val;
  }

  setDespairAge(val: number) {
    this.despairAge = val;
  }
  setMaxMatings(val: number) {
    this.maxMatings = Math.max(1, Math.round(val));
  }
  setStartColorMode(val: string) {
    this.startColorMode = val;
  }
  setFlowerSize(val: number) {
    this.flowerSize = val;
    this.leafScale = val;
  }
  setMinAgents(val: number) {
    this.minAgents = val;
  }
  creatureCenterY: number = 18.921075;
  setBoundarySize(val: number) {
    setupBoundarySize(this, val);
  }
  setBoundarySquash(val: number) {
    setupBoundarySquash(this, val);
  }
  setTideSpeed(val: number) {
    this.tideSpeed = val;
  }
  setMaxDOMs(val: number) {
    this.maxDOMs = Math.min(val, MAX_POINTS);
  }
  setProbGlow(val: number) {
    this.probGlow = val;
  }
  setDesiccationSpeed(val: number) {
    this.desiccationSpeed = val;
  }
  setTimeScale(val: number) {
    this.timeScale = val;
  }
  setEnableGlow(val: boolean) {
    this.enableGlow = val;
  }
  setGlowSize(val: number) {
    this.glowSize = val;
  }
  setFogVisibility(val: number) {
    setupFogVisibility(this, val);
  }
  setTheme(val: number, manual: boolean = true) {
    setupTheme(this, val, manual);
  }
  setBgColor(c: string) {
    setupSceneBackground(this, c);
  }
  setFogColor(c: string) {
    setupFogColor(this, c);
  }
  setPostMatingDieoff(val: boolean) {
    this.postMatingDieoff = val;
  }
  setGlobalPulseSpeed(val: number) {
    this.globalPulseSpeed = val;
  }
  setMaxLineWidth(val: number) {
    this.maxLineWidth = val;
  }
  setMulticolorAppProb(val: number) {
    this.multicolorAppProb = val;
  }
  setSameColorAppProb(val: number) {
    this.sameColorAppProb = val;
  }
  setTideColor(c: string) {
    this.tideColor = c;
  }
  setTraitProbs(probs: Record<string, number>) {
    this.traitProbs = probs;
  }
  setTerminationProb(val: number) {
    this.terminationProb = val;
  }
  setTermProbPostBranch(val: number) {
    this.termProbPostBranch = val;
  }
  setSegmentGap(val: number) {
    this.segmentGap = val;
  }
  setMaxAgents(val: number) {
    this.maxAgents = val;
  }
  setMaxSpecies(val: number) {
    this.maxSpecies = val;
  }
  setEcoFade(val: number) {
    this.ecoFade = val;
  }
  setTaperDuration(val: number) {
    this.taperDuration = val;
  }
  setFeelerFade(val: number) {
    this.feelerFade = val;
  }

  setCullRate(val: number) {
    this.cullRate = val;
  }
  setSnakeSpeed(val: number) {
    this.snakeSpeed = val;
  }
  setSnakeStepSize(val: number) {
    this.snakeStepSize = val;
  }
  setBushStepSize(val: number) {
    this.bushStepSize = val;
  }
  setTreeStepSize(val: number) {
    this.treeStepSize = val;
  }
  setRhizomeStepSize(val: number) {
    this.rhizomeStepSize = val;
  }
  setSnakeWander(val: number) {
    this.snakeWander = val;
  }
  setBushSpeed(val: number) {
    this.bushSpeed = val;
  }
  setTreeSpeed(val: number) {
    this.treeSpeed = val;
  }
  setRhizomeSpeed(val: number) {
    this.rhizomeSpeed = val;
  }
  setBushBranching(val: number) {
    this.bushBranching = val;
  }
  setTreeBranching(val: number) {
    this.treeBranching = val;
  }
  setSnakeBranching(val: number) {
    this.snakeBranching = val;
  }
  setRhizomeBranching(val: number) {
    this.rhizomeBranching = val;
  }
  setWidthVariance(val: number) {
    this.widthVariance = val;
  }
  setBranchGrowthBoost(val: number) {
    this.branchGrowthBoost = val;
  }
  setColorMutationShift(val: number) {
    this.colorMutationShift = val;
  }

  spawnNewSpecies(forceArchetype?: Archetype): Genome {
    return spawnNewSpecies(this, forceArchetype);
  }

  setDiebackAgeBias(val: number) {
    this.diebackAgeBias = val;
  }
  setBranchSplitSizeProb(val: number) {
    this.branchSplitSizeProb = val;
  }
  setGrowthSpeed(g: number) {
    this.growthSpeed = g;
  }
  setWidthGrowthEffect(val: number) {
    this.widthGrowthEffect = val;
  }
  setBotanyRealism(val: boolean) {
    this.botanyRealism = val;
  }
  setWindVelocity(val: number) {
    this.windVelocity = val;
  }
  setFlutterIntensity(val: number) {
    this.flutterIntensity = val;
  }
  setLeafScale(val: number) {
    this.leafScale = val;
  }
  setLeafDensity(val: number) {
    this.leafDensity = val;
  }
  setRelativeLeafSizeDiff(val: number) {
    this.relativeLeafSizeDiff = val;
  }
  setLeafGrowthSpeed(val: number) {
    this.leafGrowthSpeed = val;
  }
  setPhyllotaxisAngle(val: number) {
    this.phyllotaxisAngle = val;
  }
  setLeafProbability(val: number) {
    this.leafProbability = val;
  }
  setAppendageSpawnRate(val: number) {
    this.appendageSpawnRate = val;
  }
  setGlowProbability(val: number) {
    this.glowProbability = val;
  }
  setStemCurviness(val: number) {
    this.stemCurviness = val;
  }
  setVeinStrength(val: number) {
    this.veinStrength = val;
  }
  setVeinGlow(val: number) {
    this.veinGlow = val;
  }
  setDiebackRate(d: number) {
    this.diebackRate = d;
  }
  setMaxSaturation(val: number) {
    this.maxSaturation = val;
  }
  setColorClamp(val: number) {
    this.colorClamp = val;
    this.maxSaturation = val;
  }
  setAllowBreeding(v: boolean) {
    this.allowBreeding = v;
  }
  setHybridCooldown(c: number) {
    this.hybridCooldown = c;
  }
  setHybridStickiness(v: number) {
    this.hybridStickiness = v;
  }
  setHybridSpinSpeed(s: number) {
    this.hybridSpinSpeed = s;
  }
  setOrnamentFrequency(o: number) {
    this.ornamentFrequency = o;
  }
  setBranchingMultiplier(b: number) {
    this.branchingMultiplier = b;
  }
  setBranchTendencyVar(v: number) {
    this.branchTendencyVar = v;
  }
  setHybridSize(val: number) {
    this.hybridSize = val;
  }

  setupInitialCreatures() {
    setupInitialCreatures(this);
  }

  initAgents() {
    setupInitialCreatures(this);
  }

  resetCamera() {
    resetCamera(this);
  }

  executeReset() {
    executeReset(this);
  }

  restart() {
    this.fadeState = "out";
    if (this.fadeProgress <= 0) {
      this.fadeProgress = 0.01;
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  addLineSegment(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    genome: Genome,
    thickness: number,
    isAppendage = false,
    agentId?: number,
  ) {
    updateMeshSegments(this, p1, p2, genome, thickness, isAppendage, agentId);
  }

  markDying(segments: any[], dyingSet: Set<number>, idx: number, dyingStartOverride?: number) {
    const seg = segments[idx];
    if (seg && !seg.dyingStart) {
      seg.dyingStart = dyingStartOverride !== undefined ? dyingStartOverride : this.unscaledTime;
      dyingSet.add(idx);
      if (seg.countsForBiomass !== false) {
        const prevBiomass = this.biomassMap.get(seg.strainName) || 0;
        if (prevBiomass > 0) {
          this.biomassMap.set(seg.strainName, prevBiomass - 1);
        }
      }
    }
  }

  markAgentSegmentsDying(agentId?: number) {
    if (agentId === undefined) return;
    const now = this.unscaledTime;
    for (let i = 0; i < this.maxDOMs; i++) {
      const seg = this.segments[i];
      if (seg && seg.agentId === agentId && !seg.dyingStart) {
        this.markDying(this.segments, this.dyingStems, i, now);
      }
    }
    for (const app of this.appendages.values()) {
      const lim = Math.floor(this.maxDOMs / 4);
      for (let i = 0; i < lim; i++) {
        const seg = app.segments[i];
        if (seg && seg.agentId === agentId && !seg.dyingStart) {
          this.markDying(app.segments, app.dyingSet, i, now);
        }
      }
    }
  }

  markStrainSegmentsDying(strainName?: string) {
    if (!strainName) return;
    const now = this.unscaledTime;
    if (!this.dyingStrains) this.dyingStrains = new Set();
    this.dyingStrains.add(strainName);
    const liveAgents = this.agents.filter(a => a.active && !a.tapering && !a.isFeeler && a.genome.name === strainName).length;
    this.onLog(`🔻 markStrainSegmentsDying(${strainName}) — active living agents: ${liveAgents}`);

    for (let i = 0; i < this.maxDOMs; i++) {
      const seg = this.segments[i];
      if (seg && seg.strainName === strainName && !seg.dyingStart) {
        this.markDying(this.segments, this.dyingStems, i, now);
      }
    }
    for (const app of this.appendages.values()) {
      const lim = Math.floor(this.maxDOMs / 4);
      for (let i = 0; i < lim; i++) {
        const seg = app.segments[i];
        if (seg && seg.strainName === strainName && !seg.dyingStart) {
          this.markDying(app.segments, app.dyingSet, i, now);
        }
      }
    }
  }

  initSpeciesLifecycle(strainName: string) {
    return initSpeciesLifecycle(this, strainName);
  }

  killSpecies(strainName: string, reason: string) {
    killSpecies(this, strainName, reason);
  }

  processDying(
    segments: any[],
    dyingSet: Set<number>,
    mesh: THREE.InstancedMesh,
    isFlower: boolean = false,
  ) {
    processDyingSegments(this, segments, dyingSet, mesh, isFlower);
  }

  spawnHybridArtifact(pos: THREE.Vector3, color: THREE.Color, strainName?: string, strainBName?: string, agentAId?: number, agentBId?: number) {
    spawnHybridArtifact(
      this,
      pos,
      color,
      strainName,
      strainBName,
      agentAId,
      agentBId,
    );
  }

  update() {
    updateSimulation(this);
  }

  animate = () => {
    this.reqId = requestAnimationFrame(this.animate);
    updateGridHelpers(this);
    handleScreenFade(this);
    this.update();
    this.renderer.render(this.scene, this.camera);

    const activeFade = Math.max(this.fadeProgress, this.kioskFadeProgress || 0);
    if (activeFade > 0 && this.fadeScene && this.fadeQuadMat) {
      this.fadeQuadMat.opacity = activeFade;
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.fadeScene, this.fadeCamera);
      this.renderer.autoClear = true;
    }

    if (this.reqId % 15 === 0) {
      emitStateUpdate(this);
    }
  };

  getTrackedPositions() {
    return getTrackedPositions(this);
  }

  start() {
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.reqId);
    this.controls.dispose();
  }
}
