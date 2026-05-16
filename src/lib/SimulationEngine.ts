import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Genome,
  Agent,
  Segment,
  MAX_POINTS,
  BOUNDARY,
  GEO_TYPES,
  PULSE_TARGETS,
  ARCHETYPES,
  MOVEMENT_TYPES,
} from "./SimulationTypes";
import {
  setupShaderMaterial,
  getWeightedAppendage,
  breedGenomes,
  mutateGenome,
} from "./SimulationGenetics";
import { updateSimulation } from "./SimulationUpdate";
import { setupSimulationScene } from "./SimulationRenderer";
import {
  updateMeshSegments,
  processDyingSegments,
} from "./SimulationMeshUpdate";

export class SimulationEngine {
  scene: THREE.Scene = new THREE.Scene();
  camera!: THREE.OrthographicCamera;
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

  onLog: (msg: string) => void = () => {};
  onStateUpdate: (state: any) => void = () => {};
  onConfigChange?: (config: any) => void;

  magnetism: number = 0.02;
  proximity: number = 400.0;
  desperation: number = 2.0;
  despairAge: number = 1000;
  flowerSize: number = 1.0;
  entropyThreshold: number = 0.7;
  globalPulseSpeed: number = 1.0;
  maxLineWidth: number = 8.0;
  multicolorAppProb: number = 0.5;
  sameColorAppProb: number = 0.5;
  tideSpeed: number = 1.0;
  tideValue: number = 0;
  tideColorTop: string = "#8A2BE2";
  tideColorBottom: string = "#FF4500";
  tideThickness: number = 140.0;
  tideOpacity: number = 0.5;
  tideSaturation: number = 1.0;
  maxSaturation: number = 1.0;
  growthSpeed: number = 1.0;
  diebackRate: number = 1.0;
  hybridCooldown: number = 300;
  hybridStickiness: number = 10;
  ornamentFrequency: number = 1.0;
  branchingMultiplier: number = 1.0;
  branchTendencyVar: number = 10;
  desiccationSpeed: number = 1.0;

  hybridSize: number = 2.0;

  maxDOMs: number = 80000;
  lastMaxDOMs: number = 80000;
  minAgents: number = 2;
  maxSpecies: number = 6;
  ecoFade: number = 0.5;
  probGlow: number = 0.0;
  branchSplitSizeProb: number = 0.2;
  branchBigger: number = 0.5;
  branchMutationRate: number = 0.05;
  enableGlow: boolean = false;
  glowSize: number = 0.0;
  fogVisibility: number = 800;
  tideCullIndex: number = 0;

  bgColor: string = "#001220";
  tideColor: string = "#FF4500";

  traitProbs: Record<string, number> = {
    flowers: 0.1,
    leaves: 0.1,
    petals: 0.1,
    needles: 0.1,
    thorns: 0.1,
    hair: 0.1,
    curlyHair: 0.0,
    crystals: 0.0,
    spores: 0.0,
    scales: 0.0,
    spirals: 0.0,
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

  private reqId: number = 0;
  lastFlowerSize: number = 1.0;
  lastHybridSize: number = 2.0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    setupSimulationScene(this, width, height);
    this.initAgents();
  }

  private generateRandomGenome(baseName: string, forceArchetype?: any): Genome {
    const color = new THREE.Color().setHSL(
      Math.random(),
      0.7 + Math.random() * 0.3,
      0.4 + Math.random() * 0.4,
    );
    
    const archetype = forceArchetype || ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    const movementType = MOVEMENT_TYPES[Math.floor(Math.random() * MOVEMENT_TYPES.length)];

    return {
      name: `${baseName} [${archetype.toUpperCase()}]-${Math.floor(Math.random() * 100)}`,
      archetype: archetype,
      movementType: movementType,
      color: color,
      thicknessBase: 1.5 + Math.random() * 4,
      minThickness: 0.1 + Math.random() * 1.5,
      thicknessDecay: 0.995 + Math.random() * 0.01,
      stepSize: 0.8 + Math.random() * 0.8,
      bifurcationRate: 0.01 + Math.random() * 0.03,
      wanderIntensity: 0.01 + Math.random() * 0.05,
      branchTendency:
        Math.exp((Math.random() - 0.5) * this.branchTendencyVar * 0.2) *
        (Math.random() > 0.8 ? 10.0 : 0.5),
      wavingSpeed: Math.random() * 0.05,
      wavingAmplitude: Math.random() * 0.08,
      geometryType: GEO_TYPES[Math.floor(Math.random() * GEO_TYPES.length)],
      appendage: getWeightedAppendage(this.traitProbs),
      multicolorAppendage: Math.random() < this.multicolorAppProb,
      sameColorAppendage: Math.random() < this.sameColorAppProb,
      stability: 0.8,
      pulseTarget:
        Math.random() < 0.05
          ? PULSE_TARGETS[
              Math.floor(Math.random() * (PULSE_TARGETS.length - 1)) + 1
            ]
          : "none",
      pulseSpeed: 0.05 + Math.random() * 0.15,
      gradientGrowth: Math.random() < (this.traitProbs["gradient"] || 0.1),
      createdAt: this.time,
      singleton: archetype === "snake" && Math.random() < 0.5,
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
      alphaGenome.color.setHSL(baseHue, 0.8, 0.5);
      betaGenome.color.setHSL((baseHue + 1 / 3) % 1.0, 0.8, 0.5);

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

  setRotationSpeed(speed: number) {
    if (this.controls) this.controls.autoRotateSpeed = speed;
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
  }
  setEntropyThreshold(val: number) {
    this.entropyThreshold = val;
  }
  setMinAgents(val: number) {
    this.minAgents = val;
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
  setBgColor(c: string) {
    this.bgColor = c;
    this.scene.background = new THREE.Color(c);
  }
  setFogColor(c: string) {
    if (this.scene.fog) {
      this.scene.fog.color.set(c);
    }
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

  setDiebackAgeBias(val: number) {
    this.diebackAgeBias = val;
  }
  setBranchSplitSizeProb(val: number) {
    this.branchSplitSizeProb = val;
  }
  setBranchMutationRate(val: number) {
    this.branchMutationRate = val;
  }
  setGrowthSpeed(g: number) {
    this.growthSpeed = g;
  }
  setDiebackRate(d: number) {
    this.diebackRate = d;
  }
  setMaxSaturation(val: number) {
    this.maxSaturation = val;
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
    this.time = 0;
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

    for (const app of this.appendages.values()) {
      for (let i = 0; i < app.mesh.count; i++) {
        app.mesh.setMatrixAt(i, idm);
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

    const alphaArchetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    let betaArchetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    while (betaArchetype === alphaArchetype) {
      betaArchetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    }

    const alphaGenome = this.generateRandomGenome("Alpha", alphaArchetype);
    let betaGenome = this.generateRandomGenome("Beta", betaArchetype);

    while (
       betaGenome.appendage === alphaGenome.appendage ||
       betaGenome.geometryType === alphaGenome.geometryType ||
       betaGenome.movementType === alphaGenome.movementType ||
       betaGenome.pulseTarget === alphaGenome.pulseTarget
    ) {
      betaGenome = this.generateRandomGenome("Beta", betaArchetype);
    }

    const alphaHue = alphaGenome.color.getHSL({ h: 0, s: 0, l: 0 }).h;
    betaGenome.color.setHSL((alphaHue + 1 / 3) % 1.0, 0.8, 0.5);

    const bgHue = (alphaHue + 2 / 3) % 1.0;
    const bgColorObj = new THREE.Color().setHSL(bgHue, 0.4, 0.08);
    const bgHex = "#" + bgColorObj.getHexString();
    this.setBgColor(bgHex);
    if (this.onConfigChange) {
      this.onConfigChange({ bgColor: bgHex });
    }

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
      cooldown: 0,
    });

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
      cooldown: 0,
    });
  }

  restart() {
    this.initAgents();
  }

  resize(width: number, height: number) {
    const aspect = width / height;
    const d = 180;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
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

  markDying(segments: any[], dyingSet: Set<number>, idx: number) {
    const seg = segments[idx];
    if (seg && !seg.dyingStart) {
      seg.dyingStart = this.time;
      dyingSet.add(idx);
      if (segments === this.segments) {
        const prevBiomass = this.biomassMap.get(seg.strainName) || 0;
        if (prevBiomass > 0)
          this.biomassMap.set(seg.strainName, prevBiomass - 1);
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

  spawnHybridArtifact(pos: THREE.Vector3, color: THREE.Color) {
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
      strainName: "hybrid",
      variant: variant,
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
    this.update();
    this.renderer.render(this.scene, this.camera);

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
        if (v > 0) {
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
        strains: strains.sort((a, b) => b.biomass - a.biomass).slice(0, 8),
        tideValue: this.tideValue,
        cameraPosition: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
          zoom: this.camera.zoom,
        },
      });
    }
  };

  start() {
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.reqId);
    this.controls.dispose();
  }
}
