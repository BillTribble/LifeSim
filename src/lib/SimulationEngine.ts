import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Genome,
  Agent,
  Segment,
  MAX_POINTS,
  GEO_TYPES,
  PULSE_TARGETS,
  ARCHETYPES,
  Archetype,
  MOVEMENT_TYPES,
} from "./SimulationTypes";
import {
  setupShaderMaterial,
  getWeightedAppendage,
  breedGenomes,
  mutateGenome,
  getRandomWeightedArchetype,
  formatGenomeName,
} from "./SimulationGenetics";
import { updateSimulation } from "./SimulationUpdate";
import { setupSimulationScene } from "./SimulationRenderer";
import {
  updateMeshSegments,
  processDyingSegments,
} from "./SimulationMeshUpdate";

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
  speciesAbove5Percent: Set<string> = new Set();
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
  feelerCount: number = 0;
  hasAnyOrganismBred: boolean = false;
  lastMatingWorldPos?: THREE.Vector3;
  lastFeelerWorldPos?: THREE.Vector3;

  rotationSpeed: number = 0.13;
  phiDirection: number = -1;
  magnetism: number = 0.08361988738043864;
  proximity: number = 1538.23896997661;
  desperation: number = 4.333947682994568;
  despairAge: number = 3185.029905594175;
  flowerSize: number = 1.3;
  globalPulseSpeed: number = 0.8637093147800061;
  maxLineWidth: number = 1.5;
  multicolorAppProb: number = 0.3155126730950826;
  sameColorAppProb: number = 0.4968205547416572;
  tideSpeed: number = 1.2393635516813024;
  tideValue: number = 0;
  tideColorTop: string = "#0b939c";
  tideColorBottom: string = "#3e5e50";
  tideThickness: number = 74.92111043533596;
  tideOpacity: number = 0.12871529096468015;
  tideSaturation: number = 0.0162554822004225;
  maxSaturation: number = 0.3135869032532054;
  colorClamp: number = 1;
  growthSpeed: number = 0.11;
  diebackRate: number = 5.50616330309604;
  allowBreeding: boolean = true;
  hybridCooldown: number = 926.4522288567662;
  postMatingDieoff: boolean = true;
  hybridStickiness: number = 48.44796525279812;
  ornamentFrequency: number = 9.525004244851067;
  branchingMultiplier: number = 163.34538034535345;
  branchTendencyVar: number = 11.779000158227072;
  desiccationSpeed: number = 12.842754552113087;

  botanyRealism: boolean = true;
  windVelocity: number = 0.2;
  flutterIntensity: number = 0.5;
  leafScale: number = 0.14;
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
  minAgents: number = 3;
  boundarySize: number = 50;
  boundaryShape: "sphere" | "cube" = Math.random() < 0.5 ? "sphere" : "cube";
  maxSpecies: number = 14;
  ecoFade: number = 0.8944272063480259;
  probGlow: number = 0.0;
  branchSplitSizeProb: number = 0.7936089206087223;
  branchBigger: number = 0.9929495875268578;
  enableGlow: boolean = false;
  glowSize: number = 0.5;
  fogVisibility: number = 826.8761838338102;
  tideCullIndex: number = 0;

  kioskMode: boolean = true;
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
    spirals: 0.5
  };

  dyingStems = new Set<number>();
  dyingHybrids = new Set<number>();
  dyingStrains = new Set<string>();

  blackColor = new THREE.Color(0, 0, 0);
  colorDummy = new THREE.Color();

  terminationProb: number = 0.02;
  termProbPostBranch: number = 2.0;
  taperDuration: number = 1.5;
  feelerFade: number = 10.0;
  diebackAgeBias: number = 2.0;
  cullRate: number = 5.0;

  snakeSpeed: number = 3.0;
  snakeStepSize: number = 1.0;
  snakeWander: number = 1.0;
  bushSpeed: number = 1.0;
  treeSpeed: number = 1.0;
  rhizomeSpeed: number = 1.0;

  bushBranching: number = 8.0;
  treeBranching: number = 1.0;
  snakeBranching: number = 1.0;
  rhizomeBranching: number = 1.0;

  private reqId: number = 0;
  lastFlowerSize: number = 1.0;
  lastHybridSize: number = 2.0;
  lastLeafScale: number = 1.0;
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
    const color = new THREE.Color().setHSL(
      Math.random(),
      0.7 + Math.random() * 0.3,
      0.4 + Math.random() * 0.4,
    );
    
    const archetype = forceArchetype || getRandomWeightedArchetype();
    const movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];

    // Per-archetype genome parameters for clearly distinct growth forms
    let thicknessBase: number;
    let minThickness: number;
    let thicknessDecay: number;
    let bifurcationRate: number;
    let stepSize: number;
    let branchTendency: number;

    if (archetype === "bush") {
      // BUSH: Thin stems, extremely high bifurcation → dense bushy mass of tendrils
      thicknessBase = (0.6 + Math.random() * 1.2) * 0.70;      // Thin but visible stems
      minThickness = (0.08 + Math.random() * 0.15) * 0.70;     // Recovery kicks in while still visible
      thicknessDecay = 0.9993 + Math.random() * 0.0005;
      bifurcationRate = 0.25 + Math.random() * 0.15;             // Prolific branching rate
      stepSize = (0.5 + Math.random() * 0.3) * 0.70;             // Sprawling steps
      branchTendency = Math.exp((Math.random() - 0.3) * this.branchTendencyVar * 0.2) * (Math.random() > 0.5 ? 12.0 : 5.0);
    } else if (archetype === "tree") {
      // TREE: Thick trunk, low initial branching that explodes into canopy later
      thicknessBase = (3.0 + Math.random() * 4.0) * 0.70;       // Thick trunk
      minThickness = (0.2 + Math.random() * 1.0) * 0.70;
      thicknessDecay = 0.9996 + Math.random() * 0.0004;
      bifurcationRate = 0.005 + Math.random() * 0.015;           // Low branching (trunk phase dominates)
      stepSize = (1.0 + Math.random() * 1.0) * 0.70;             // Long strides → tall trunks
      branchTendency = Math.exp((Math.random() - 0.5) * this.branchTendencyVar * 0.2) * (Math.random() > 0.7 ? 6.0 : 0.8);
    } else if (archetype === "snake") {
      // SNAKE: Medium-thin, almost no branching, long sinuous unbranched forms
      thicknessBase = (1.0 + Math.random() * 2.0) * 0.70;       // Medium thickness
      minThickness = (0.3 + Math.random() * 0.8) * 0.70;
      thicknessDecay = 0.9998 + Math.random() * 0.0002;          // Very slow decay → stays thick
      bifurcationRate = 0.002 + Math.random() * 0.005;           // Extremely low branching
      stepSize = (1.2 + Math.random() * 1.2) * 0.70;             // Long strides → elongated forms
      branchTendency = Math.exp((Math.random() - 0.5) * this.branchTendencyVar * 0.2) * (Math.random() > 0.9 ? 2.0 : 0.2);
    } else {
      // RHIZOME: Thick swollen nodes, high bifurcation, short stubby
      thicknessBase = 12.0 + Math.random() * 6.0;
      minThickness = 5.0 + Math.random() * 3.0;
      thicknessDecay = 0.9995 + Math.random() * 0.0004;
      bifurcationRate = 0.25 + Math.random() * 0.20;
      stepSize = 0.2 + Math.random() * 0.15;
      branchTendency = 20.0 + Math.random() * 15.0;
    }

    return {
      name: formatGenomeName(archetype),
      archetype: archetype,
      movementType: movementType,
      color: color,
      thicknessBase: thicknessBase,
      minThickness: minThickness,
      thicknessDecay: thicknessDecay,
      stepSize: stepSize,
      bifurcationRate: bifurcationRate,
      wanderIntensity: archetype === "rhizome" ? 1.0 + Math.random() * 0.8 : archetype === "bush" ? 0.8 + Math.random() * 0.5 : 0.01 + Math.random() * 0.05,
      branchTendency: branchTendency,
      wavingSpeed: Math.random() * 0.05,
      wavingAmplitude: Math.random() * 0.08,
      geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
      appendage: getWeightedAppendage(this.traitProbs),
      multicolorAppendage: false,
      sameColorAppendage: Math.random() < this.sameColorAppProb,
      stability: 0.8,
      pulseTarget:
        Math.random() < 0.05
          ? PULSE_TARGETS[
              Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1
            ]
          : "none",
      pulseSpeed: 0.003 + Math.random() * 0.007,
      gradientGrowth: Math.random() < (this.traitProbs["gradient"] || 0.1),
      gradientType: 1 + Math.floor(Math.random() * 4),
      createdAt: this.time,
      singleton: archetype === "snake" && Math.random() < 0.5,
      isGlowing: Math.random() < (this.traitProbs.glow ?? 0.1),
      
      // Procedural Leaf Genes
      leafDivision: Math.random(),
      vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
      canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
      phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
      succulence: Math.random(),

      // Recessive Gene Carriers
      recessive: {
        archetype: ARCHETYPES.find(a => a !== archetype) || ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)],
        movementType: MOVEMENT_TYPES.find(m => m !== movementType) || MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)],
        geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
        appendage: getWeightedAppendage(this.traitProbs),
        color: new THREE.Color().setHSL((color.getHSL({h:0,s:0,l:0}).h + 0.50 + (Math.random() - 0.5) * 0.04 + 1.0) % 1.0, 0.68, 0.52),
        isGlowing: Math.random() < 0.3,
        vernationType: (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)],
        canopyZone: (["wholeBody", "terminal", "basal"] as const)[Math.floor(Math.random() * 3)],
        phyllotaxisMode: (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)],
      },
    };
  }

  randomizeColors() {
    const uniqueGenomes = new Set<Genome>();
    this.agents.forEach((a) => uniqueGenomes.add(a.genome));

    const alphaGenome = Array.from(uniqueGenomes).find((g) =>
      g.name.startsWith("Alpha"),
    );
    const betaGenome = Array.from(uniqueGenomes).find((g) =>
      g.name.startsWith("Beta"),
    );

    const colorMap = new Map<string, THREE.Color>();

    if (alphaGenome && betaGenome) {
      const baseHue = Math.random();
      if (this.theme !== 1) {
        alphaGenome.color.setHSL(baseHue, 0.9, 0.52);
        betaGenome.color.setHSL((baseHue + 0.5) % 1.0, 0.9, 0.52);
      }

      colorMap.set(alphaGenome.name, alphaGenome.color.clone());
      colorMap.set(betaGenome.name, betaGenome.color.clone());

      const bgHue = (baseHue + 2 / 3) % 1.0;
      const bgColorObj = new THREE.Color().setHSL(bgHue, 0.4, 0.08);
      const bgHex = "#" + bgColorObj.getHexString();
      this.setBgColor(bgHex);
      if (this.onConfigChange) {
        this.onConfigChange({ bgColor: bgHex });
      }
    }

    uniqueGenomes.forEach((g) => {
      if (!g.name.startsWith("Alpha") && !g.name.startsWith("Beta")) {
        const newColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
        g.color.copy(newColor);
        colorMap.set(g.name, newColor);
      }
    });

    if (this.cylinderMesh.instanceColor) {
      for (let i = 0; i < MAX_POINTS; i++) {
        const seg = this.segments[i];
        if (seg) {
          const newColor = colorMap.get(seg.strainName);
          if (newColor) {
            this.cylinderMesh.setColorAt(i, newColor);
          }
        }
      }
      this.cylinderMesh.instanceColor.needsUpdate = true;
    }
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
    if (!this.scene) return;

    if (this.boundaryMesh) {
      this.scene.remove(this.boundaryMesh);
      if (this.boundaryMesh.geometry) this.boundaryMesh.geometry.dispose();
      if (this.boundaryMesh.material) {
        if (Array.isArray(this.boundaryMesh.material)) {
          this.boundaryMesh.material.forEach(m => m.dispose());
        } else {
          this.boundaryMesh.material.dispose();
        }
      }
      this.boundaryMesh = undefined;
    }

    if (!this.showBoundaryBox) return;

    const b = this.boundarySize;
    let geo: THREE.BufferGeometry;

    if (this.boundaryShape === "sphere") {
      const sphereGeo = new THREE.SphereGeometry(b, 24, 16);
      geo = new THREE.WireframeGeometry(sphereGeo);
    } else {
      const boxGeo = new THREE.BoxGeometry(b * 2, b * 2, b * 2);
      geo = new THREE.EdgesGeometry(boxGeo);
    }

    const mat = new THREE.LineBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.5,
    });

    this.boundaryMesh = new THREE.LineSegments(geo, mat);
    this.boundaryMesh.position.set(0, this.creatureCenterY, 0);
    this.scene.add(this.boundaryMesh);
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
    this.cameraProjection = val;
    if (this.camera && this.controls) {
      const baseFOV = 45.0;
      const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, val));
      const distFactor = Math.tan((baseFOV * Math.PI / 360)) / Math.tan((targetFOV * Math.PI / 360));
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      const baseDist = 137.42;
      const newDist = baseDist * distFactor;
      this.camera.fov = targetFOV;
      this.camera.position.copy(this.controls.target).addScaledVector(dir, newDist);
      this.camera.updateProjectionMatrix();

      // Dynamic fog near/far planes to ensure orthographic view never goes dark
      if (this.scene && this.scene.fog && (this.scene.fog instanceof THREE.Fog)) {
        this.scene.fog.near = 120 * distFactor;
        this.scene.fog.far = (this.fogVisibility || 800) * distFactor;
      }

      if (this.ambientLight) {
        this.ambientLight.intensity = THREE.MathUtils.lerp(2.2, 1.2, val);
      }

      this.controls.update();
    }
  }

  setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
    if (this.controls) this.controls.autoRotateSpeed = speed;
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
  setProximity(val: number) {
    this.proximity = val;
  }

  setDesperation(val: number) {
    this.desperation = val;
  }

  setDespairAge(val: number) {
    this.despairAge = val;
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
    this.boundarySize = val;
    this.updateBoundaryMesh();
    if (this.camera && this.controls) {
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      const baseFOV = 45.0;
      const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, this.cameraProjection));
      const distFactor = Math.tan((baseFOV * Math.PI / 360)) / Math.tan((targetFOV * Math.PI / 360));
      const baseDist = val * 2.7484;
      const newDist = baseDist * distFactor;
      this.camera.position.copy(this.controls.target).addScaledVector(dir, newDist);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }
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
    this.fogVisibility = val;
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).far = val;
      (this.scene.fog as THREE.Fog).near = Math.max(10, val / 4);
    }
  }
  setTheme(val: number, manual: boolean = true) {
    if (manual) {
      this.lastThemeMorphTime = this.frameCount;
    }
    if (this.nextTheme !== val) {
      if (this.themeProgress < 1.0) {
        this.theme = this.nextTheme;
        this.themeColor1 = this.nextThemeColor1;
        this.themeColor2 = this.nextThemeColor2;
      }
      
      this.nextTheme = val;
      this.themeProgress = 0.0;
      this.manualThemeTransition = manual;
      
      const tc1 = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
      const tc2 = new THREE.Color().setHSL((tc1.getHSL({h:0,s:0,l:0}).h + 0.5) % 1.0, 0.8, 0.5);
      this.nextThemeColor1 = "#" + tc1.getHexString();
      this.nextThemeColor2 = "#" + tc2.getHexString();
    }
  }
  setBgColor(c: string) {
    this.bgColor = c;
    const color = new THREE.Color(c);
    this.scene.background = color;
    if (this.scene.fog) {
      this.scene.fog.color.copy(color);
    }
    if (this.floorGridMat && this.floorGridMat.uniforms.fogColor) {
      this.floorGridMat.uniforms.fogColor.value.copy(color);
    }
    if (this.ceilingGridMat && this.ceilingGridMat.uniforms.fogColor) {
      this.ceilingGridMat.uniforms.fogColor.value.copy(color);
    }
  }
  setFogColor(c: string) {
    const color = new THREE.Color(c);
    if (this.scene.fog) {
      this.scene.fog.color.copy(color);
    }
    if (this.floorGridMat && this.floorGridMat.uniforms.fogColor) {
      this.floorGridMat.uniforms.fogColor.value.copy(color);
    }
    if (this.ceilingGridMat && this.ceilingGridMat.uniforms.fogColor) {
      this.ceilingGridMat.uniforms.fogColor.value.copy(color);
    }
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

  spawnNewSpecies(forceArchetype?: Archetype): Genome {
    const archetypes: Archetype[] = ["bush", "tree", "snake", "rhizome"];
    const arch = forceArchetype || archetypes[Math.floor(Math.random() * archetypes.length)];
    const familyNames = ["Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda"];
    const nameStr = `${familyNames[Math.floor(Math.random() * familyNames.length)]}-${Math.floor(Math.random() * 900 + 100)}`;
    const genome = this.generateRandomGenome(nameStr, arch);
    genome.appendage = getWeightedAppendage(this.traitProbs);
    // Archetype-specific thickness for spawned species (don't override bush's thin stems)
    if (arch === "bush") {
      genome.thicknessBase = (0.6 + Math.random() * 1.2) * 0.70;
    } else if (arch === "tree") {
      genome.thicknessBase = (3.5 + Math.random() * 3.0) * 0.70;
    } else if (arch === "snake") {
      genome.thicknessBase = (1.2 + Math.random() * 2.0) * 0.70;
    } else {
      // rhizome — keep the values from generateRandomGenome
    }
    genome.color = new THREE.Color().setHSL(Math.random(), 0.9, 0.55);

    this.genomeMap.set(genome.name, genome);

    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 80
    );

    const agent: Agent = {
      position: pos.clone(),
      lastPosition: pos.clone(),
      direction: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize(),
      genome: genome,
      active: true,
      age: 0,
      thickness: genome.thicknessBase * 1.5,
      cooldown: 200
    };

    this.agents.push(agent);
    this.onLog(`🌱 Emergence of new species: ${genome.name} [${arch.toUpperCase()}] to maintain minimum 3 species.`);
    return genome;
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

  initAgents() {
    this.agents = [];
    this.biomassMap.clear();
    this.pointCount = 0;
    this.segments = [];
    this.hybridSegments = [];
    this.hybridCount = 0;
    if (this.dyingStrains) this.dyingStrains.clear();
    if (this.dyingStems) this.dyingStems.clear();
    if (this.suppressedStrains) this.suppressedStrains.clear();
    if (this.speciesAbove5Percent) this.speciesAbove5Percent.clear();
    this.time = 0;
    this.frameCount = 0;
    const idm = new THREE.Matrix4().set(
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    );
    for (let i = 0; i < MAX_POINTS; i++) {
      this.cylinderMesh.setMatrixAt(i, idm);
    }
    const cylPackAAttr = this.cylinderMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
    if (cylPackAAttr) {
      for (let i = 0; i < MAX_POINTS; i++) {
        cylPackAAttr.setZ(i, 0.0); // 0.0 = Fully opaque, 0% decay
      }
      cylPackAAttr.needsUpdate = true;
    }

    for (const app of this.appendages.values()) {
      for (let i = 0; i < app.mesh.count; i++) {
        app.mesh.setMatrixAt(i, idm);
      }
      const appPackAAttr = app.mesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      if (appPackAAttr) {
        for (let i = 0; i < app.mesh.count; i++) {
          appPackAAttr.setZ(i, 0.0);
        }
        appPackAAttr.needsUpdate = true;
      }
      app.mesh.instanceMatrix.needsUpdate = true;
      app.mesh.count = 0;
      app.segments = [];
      app.dyingSet.clear();
      app.count = 0;
    }

    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const mesh of this.hybridMeshes) {
      for (let i = 0; i < 2000; i++) {
        mesh.setMatrixAt(i, zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = 0;
    }

    this.cylinderMesh.instanceMatrix.needsUpdate = true;
    this.cylinderMesh.count = 0;

    const alphaArchetype = getRandomWeightedArchetype();
    let betaArchetype = getRandomWeightedArchetype();
    while (betaArchetype === alphaArchetype) {
      betaArchetype = getRandomWeightedArchetype();
    }

    const getHashForFamilyAndRange = (family: number, range: "alpha" | "beta"): number => {
      const targetSelector = family === 5 
        ? 0.8 + Math.random() * 0.2 
        : family * 0.16 + Math.random() * 0.16;

      const hMin = range === "alpha" ? 0.0 : 0.5;
      const hMax = range === "alpha" ? 0.5 : 1.0;

      const kMin = Math.ceil(hMin * 7.3 - targetSelector);
      const kMax = Math.floor(hMax * 7.3 - targetSelector);

      const k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
      return (k + targetSelector) / 7.3;
    };

    const alphaFamily = Math.floor(Math.random() * 6);
    let betaFamily = Math.floor(Math.random() * 6);
    while (betaFamily === alphaFamily) {
      betaFamily = Math.floor(Math.random() * 6);
    }

    const alphaGenome = this.generateRandomGenome("Alpha", alphaArchetype);
    alphaGenome.appendage = getWeightedAppendage(this.traitProbs);
    alphaGenome.genomeHash = getHashForFamilyAndRange(alphaFamily, "alpha");

    let betaGenome = this.generateRandomGenome("Beta", betaArchetype);
    betaGenome.appendage = getWeightedAppendage(this.traitProbs);
    betaGenome.genomeHash = getHashForFamilyAndRange(betaFamily, "beta");

    let attempts = 0;
    while (
      attempts < 50 &&
      (betaGenome.geometryType === alphaGenome.geometryType ||
       betaGenome.movementType === alphaGenome.movementType ||
       betaGenome.archetype === alphaGenome.archetype ||
       betaGenome.canopyZone === alphaGenome.canopyZone)
    ) {
      attempts++;
      betaGenome = this.generateRandomGenome("Beta", betaArchetype);
      betaGenome.appendage = getWeightedAppendage(this.traitProbs);
      betaGenome.genomeHash = getHashForFamilyAndRange(betaFamily, "beta");
    }

    // Archetype-specific thickness — preserve the archetype's character
    const getArchetypeThickness = (arch: Archetype) => {
      if (arch === "bush") {
        return (0.6 + Math.random() * 1.2) * 0.70;
      } else if (arch === "tree") {
        return (3.5 + Math.random() * 2.5) * 0.70;
      } else if (arch === "snake") {
        return (1.2 + Math.random() * 2.0) * 0.70;
      } else {
        return (5.0 + Math.random() * 3.5) * 0.70;
      }
    };
    alphaGenome.thicknessBase = getArchetypeThickness(alphaArchetype);
    betaGenome.thicknessBase = getArchetypeThickness(betaArchetype);

    // Assign distinct vernation and phyllotaxis modes
    alphaGenome.vernationType = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
    let betaVern = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
    while (betaVern === alphaGenome.vernationType) {
      betaVern = (["circinate", "convolute", "conduplicate"] as const)[Math.floor(Math.random() * 3)];
    }
    betaGenome.vernationType = betaVern;

    alphaGenome.phyllotaxisMode = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
    let betaPhyllo = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
    while (betaPhyllo === alphaGenome.phyllotaxisMode) {
      betaPhyllo = (["spiral", "decussate", "whorled"] as const)[Math.floor(Math.random() * 3)];
    }
    betaGenome.phyllotaxisMode = betaPhyllo;

    let alphaHue = alphaGenome.color.getHSL({ h: 0, s: 0, l: 0 }).h;
    if (this.theme === 1) { // Albino theme: Ensure bright contrasting color
      alphaGenome.color.setHSL(0.1, 0.02, 0.95); // Pure white albino
      betaGenome.color.setHSL(0.55, 1.0, 0.55);  // Bright vivid cyan/teal contrast
    } else {
      alphaHue = Math.random();
      alphaGenome.color.setHSL(alphaHue, 0.9, 0.52);
      betaGenome.color.setHSL((alphaHue + 0.5) % 1.0, 0.9, 0.52);
    }

    const bgHue = (alphaHue + 2 / 3) % 1.0;
    const bgColorObj = new THREE.Color().setHSL(bgHue, 0.4, 0.08);
    const bgHex = "#" + bgColorObj.getHexString();
    this.setBgColor(bgHex);
    
    // Generate theme colors
    const tc1 = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
    const tc2 = new THREE.Color().setHSL((tc1.getHSL({h:0,s:0,l:0}).h + 0.5) % 1.0, 0.8, 0.5);
    this.themeColor1 = "#" + tc1.getHexString();
    this.themeColor2 = "#" + tc2.getHexString();
    this.nextThemeColor1 = this.themeColor1;
    this.nextThemeColor2 = this.themeColor2;
    this.nextTheme = this.theme;
    this.themeProgress = 1.0;
    this.lastThemeMorphTime = 0;

    if (this.onConfigChange) {
      this.onConfigChange({ bgColor: bgHex });
    }

    // Startup Rule: At most ONE founder organism can have multicolor appendages or rainbow gradient growth
    if (alphaGenome.gradientGrowth) {
      betaGenome.gradientGrowth = false;
      betaGenome.multicolorAppendage = false;
      betaGenome.sameColorAppendage = true;
    } else if (betaGenome.gradientGrowth) {
      alphaGenome.multicolorAppendage = false;
      alphaGenome.sameColorAppendage = true;
      betaGenome.multicolorAppendage = false;
      betaGenome.sameColorAppendage = true;
    } else if (alphaGenome.multicolorAppendage) {
      betaGenome.multicolorAppendage = false;
      betaGenome.sameColorAppendage = true;
    }

    // Organism A (Alpha Strain) placed on the LEFT side of screen (X = -40)
    this.agents.push({
      position: new THREE.Vector3(-40, 0, 0),
      direction: new THREE.Vector3(
        -1,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
      ).normalize(),
      genome: alphaGenome,
      active: true,
      age: 0,
      lastPosition: new THREE.Vector3(-40, 0, 0),
      thickness: alphaGenome.thicknessBase * 2.0,
      cooldown: 350,
    });

    // Organism B (Beta Strain) placed on the RIGHT side of screen (X = +40)
    this.agents.push({
      position: new THREE.Vector3(40, 0, 0),
      direction: new THREE.Vector3(
        1,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
      ).normalize(),
      genome: betaGenome,
      active: true,
      age: 0,
      lastPosition: new THREE.Vector3(40, 0, 0),
      thickness: betaGenome.thicknessBase * 2.0,
      cooldown: 350,
    });

    this.matingCount = 0;
    this.feelerCount = 0;
    this.hasAnyOrganismBred = false;
    if (this.onInitOrganisms) {
      this.onInitOrganisms({ alpha: alphaGenome, beta: betaGenome });
    }
  }

  resetCamera() {
    if (this.camera && this.controls) {
      const creatureCenterY = this.creatureCenterY || 18.921075;
      const wasAutoRotate = this.controls.autoRotate;
      this.controls.autoRotate = false;

      this.controls.target.set(0, creatureCenterY, 0);
      this.camera.position.set(0, creatureCenterY, -137.42);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(this.controls.target);
      this.camera.updateProjectionMatrix();

      this.controls.saveState();
      this.controls.reset();

      this.camera.position.set(0, creatureCenterY, -137.42);
      this.controls.target.set(0, creatureCenterY, 0);
      this.controls.update();

      this.controls.autoRotate = wasAutoRotate;
      this.setCameraProjection(this.cameraProjection);
    }
  }

  executeReset() {
    this.time = 0;
    this.lastKioskTime = 0;
    this.lastKioskRealTime = performance.now();
    this.kioskFadeProgress = 0;
    this.kioskFadingOut = false;
    this.resetCamera();
    this.initAgents();
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
  ) {
    updateMeshSegments(this, p1, p2, genome, thickness, isAppendage);
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

  processDying(
    segments: any[],
    dyingSet: Set<number>,
    mesh: THREE.InstancedMesh,
    isFlower: boolean = false,
  ) {
    processDyingSegments(this, segments, dyingSet, mesh, isFlower);
  }

  spawnHybridArtifact(pos: THREE.Vector3, color: THREE.Color, strainName?: string, strainBName?: string, agentAId?: number, agentBId?: number) {
    if (this.hybridMeshes.length === 0) return;

    const currentCount = this.hybridCount % 2000;

    this.dummy.position.copy(pos);
    this.dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    this.dummy.scale.set(this.hybridSize, this.hybridSize, this.hybridSize);
    this.dummy.updateMatrix();

    const variant = Math.floor(Math.random() * this.hybridMeshes.length);
    const mesh = this.hybridMeshes[variant];

    mesh.setMatrixAt(currentCount, this.dummy.matrix);
    mesh.setColorAt(currentCount, color);

    this.hybridSegments[currentCount] = {
      index: currentCount,
      timestamp: this.time,
      matrix: this.dummy.matrix.clone(),
      thickness: this.hybridSize,
      strainName: strainName || "hybrid",
      strainBName: strainBName || "hybrid",
      agentAId: agentAId,
      agentBId: agentBId,
      variant: variant,
      color: color.clone(),
    };

    this.dyingHybrids.delete(currentCount);

    this.hybridCount++;

    // We will recalculate counts for all meshes later if we want, but actually
    // when updating we use the segment variant to update the right mesh.
    // Easiest is to set count = 2000 and have zero-scale matrix for unused, OR
    // we update 'count' in a loop elsewhere.
    // For now, let's just make all meshes draw up to 2000 and empty ones will have invisible matrices,
    // or we can just set count to 2000 for all hybrid meshes.
    for (const m of this.hybridMeshes) {
      m.count = 2000;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  update() {
    updateSimulation(this);
  }

  animate = () => {
    this.reqId = requestAnimationFrame(this.animate);

    // Update Dual Bioluminescent Grid Helpers (Follows Camera in XZ plane, centered vertically on creatures at creatureCenterY)
    if (this.camera) {
      const camY = this.camera.position.y;
      const baseGap = this.boundarySize + 2.0;
      const layerGapOffset = (this.layerGap - 100) / 2;
      const floorY = this.creatureCenterY - baseGap - layerGapOffset + this.floorHeight;
      const ceilingY = this.creatureCenterY + baseGap + layerGapOffset + this.ceilingHeight;

      if (this.floorGridMesh) {
        this.floorGridMesh.position.x = this.camera.position.x;
        this.floorGridMesh.position.y = floorY;
        this.floorGridMesh.position.z = this.camera.position.z;
        this.floorGridMesh.visible = (camY > floorY);
      }
      if (this.ceilingGridMesh) {
        this.ceilingGridMesh.position.x = this.camera.position.x;
        this.ceilingGridMesh.position.y = ceilingY;
        this.ceilingGridMesh.position.z = this.camera.position.z;
        this.ceilingGridMesh.visible = (camY < ceilingY);
      }

      // Smooth opacity fading when camera approaches plane boundary
      const floorAlpha = THREE.MathUtils.clamp((camY - floorY) / 25.0, 0.0, 1.0);
      const ceilingAlpha = THREE.MathUtils.clamp((ceilingY - camY) / 25.0, 0.0, 1.0);

      if (this.floorGridMat && this.floorGridMat.uniforms.planeOpacity) {
        this.floorGridMat.uniforms.planeOpacity.value = floorAlpha;
      }
      if (this.ceilingGridMat && this.ceilingGridMat.uniforms.planeOpacity) {
        this.ceilingGridMat.uniforms.planeOpacity.value = ceilingAlpha;
      }
      if (this.floorGridMat && this.floorGridMat.uniforms.cameraPos) {
        this.floorGridMat.uniforms.cameraPos.value.copy(this.controls ? this.controls.target : this.camera.position);
      }
      if (this.ceilingGridMat && this.ceilingGridMat.uniforms.cameraPos) {
        this.ceilingGridMat.uniforms.cameraPos.value.copy(this.controls ? this.controls.target : this.camera.position);
      }
    }

    // Handle Smooth Screen Fade & Camera Reset on Restart
    if (this.fadeState === "out") {
      this.fadeProgress = Math.min(1.0, this.fadeProgress + 0.08);
      if (this.fadeProgress >= 1.0) {
        this.executeReset();
        this.fadeState = "in";
      }
    } else if (this.fadeState === "in") {
      this.fadeProgress = Math.max(0.0, this.fadeProgress - 0.08);
      if (this.fadeProgress <= 0.0) {
        this.fadeState = "idle";
      }
    }

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
      const strains: {
        name: string;
        color: string;
        color2: string;
        biomass: number;
        genome: any;
        archetype?: string;
        isDying?: boolean;
      }[] = [];
      this.biomassMap.forEach((v, k) => {
        if (v > 0 && !k.startsWith("Feeler-")) {
          const genome = this.genomeMap.get(k);
          if (genome) {
            const color2 = genome.gradientGrowth
              ? "#" +
                genome.color.clone().offsetHSL(0.5, 0, 0).getHexString()
              : "#" + genome.color.getHexString();
            strains.push({
              name: k,
              color: "#" + genome.color.getHexString(),
              color2,
              biomass: v,
              genome: genome,
              archetype: genome.archetype,
              isDying: this.dyingStrains?.has(k),
            });
          }
        }
      });

      let activeCount = 0;
      for (let i = 0; i < this.agents.length; i++) {
        if (this.agents[i].active && !this.agents[i].tapering && !this.agents[i].isFeeler) activeCount++;
      }

      let totalActiveGeometries = 0;
      for (let i = 0; i < this.maxDOMs; i++) {
        if (this.segments[i] && !this.dyingStems.has(i))
          totalActiveGeometries++;
      }
      for (const app of this.appendages.values()) {
        const lim = Math.floor(this.maxDOMs / 4);
        for (let i = 0; i < lim; i++) {
          if (app.segments[i] && !app.dyingSet.has(i)) totalActiveGeometries++;
        }
      }

        this.onStateUpdate({
          geometryCount: totalActiveGeometries,
          totalAgents: activeCount,
          kioskFadeProgress: this.kioskFadeProgress,
          strains: strains.sort((a, b) => b.biomass - a.biomass).slice(0, 8),
          tideValue: this.tideValue,
          cameraPosition: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
            zoom: this.camera.zoom,
          },
          theme: this.theme,
          nextTheme: this.nextTheme,
          themeProgress: this.themeProgress,
          trackedPositions: this.getTrackedPositions(),
        });
    }
  };

  getTrackedPositions() {
    if (!this.camera || !this.width || !this.height) return null;

    this.camera.updateMatrixWorld();

    const projectPos = (pos: THREE.Vector3) => {
      const v = pos.clone();
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.width;
      const y = (-v.y * 0.5 + 0.5) * this.height;
      return { x, y, isBehind: v.z > 1 };
    };

    // Fixed initial spawn locations (Alpha on screen left, Beta on screen right) so vector lines indicate the first position without crossing over
    const alphaPos = new THREE.Vector3(-40, 0, 0);
    const betaPos = new THREE.Vector3(40, 0, 0);

    return {
      org1: projectPos(alphaPos),
      org2: projectPos(betaPos),
      mating: this.lastMatingWorldPos ? projectPos(this.lastMatingWorldPos) : null,
      feeler: this.lastFeelerWorldPos ? projectPos(this.lastFeelerWorldPos) : null,
    };
  }

  start() {
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.reqId);
    this.controls.dispose();
  }
}
