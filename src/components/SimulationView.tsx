import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SimulationEngine } from "../lib/SimulationEngine";
import { SimulationHoverTooltip } from "./SimulationHoverTooltip";

export interface SimulationViewProps {
  onLog: (msg: string) => void;
  onStateUpdate: (state: any) => void;
  onConfigChange?: (config: any) => void;
  onInitOrganisms?: (event: { alpha: any; beta: any }) => void;
  onMatingEvent?: (event: { parent1: any; parent2: any; child: any }) => void;
  onFeelerEvent?: (event: { parent: any; feeler: any }) => void;
  stats?: any;
  kioskMode?: boolean;
  onKioskTrigger?: () => void;
  restartTrigger?: number;
  randomizeTrigger?: number;
  rotationSpeed?: number;
  rotationSpeedY?: number;
  magnetism?: number;
  seekAmount?: number;
  proximity?: number;
  desperation?: number;
  despairAge?: number;
  maxMatings?: number;
  startColorMode?: string;
  flowerSize?: number;
  tideSpeed?: number;
  minAgents?: number;
  boundarySize?: number;
  boundarySquash?: number;
  tideColor?: string;
  bgColor?: string;
  fogColor?: string;
  tideThickness?: number;
  tideOpacity?: number;
  tideSaturation?: number;
  growthSpeed?: number;
  widthGrowthEffect?: number;
  diebackRate?: number;
  allowBreeding?: boolean;
  hybridCooldown?: number;
  hybridStickiness?: number;
  hybridSpinSpeed?: number;
  branchTendencyVar?: number;
  ornamentFrequency?: number;
  branchingMultiplier?: number;
  branchBigger?: number;
  branchSplitSizeProb?: number;
  pruningStrength?: number;
  maxBranchDepth?: number;
  maxBranchesPerSpecies?: number;
  maxDOMs?: number;
  maxAgents?: number;
  maxSpecies?: number;
  ecoFade?: number;
  desiccationSpeed?: number;
  enableGlow?: boolean;
  glowSize?: number;
  fogVisibility?: number;
  traitProbs?: Record<string, number>;
  hybridSize?: number;
  terminationProb?: number;
  termProbPostBranch?: number;
  segmentGap?: number;
  taperDuration?: number;
  diebackAgeBias?: number;
  maxLineWidth?: number;
  globalPulseSpeed?: number;
  multicolorAppProb?: number;
  sameColorAppProb?: number;
  maxSaturation?: number;
  colorClamp?: number;
  gridHeight?: number;
  layerGap?: number;
  floorHeight?: number;
  ceilingHeight?: number;
  cameraProjection?: number;
  showBoundaryBox?: boolean;
  feelerFade?: number;
  feelerDelay?: number;
  cullRate?: number;
  snakeSpeed?: number;
  snakeStepSize?: number;
  snakeWander?: number;
  bushSpeed?: number;
  treeSpeed?: number;
  rhizomeSpeed?: number;
  bushStepSize?: number;
  treeStepSize?: number;
  rhizomeStepSize?: number;
  bushBranching?: number;
  widthVariance?: number;
  branchGrowthBoost?: number;
  colorMutationShift?: number;
  treeBranching?: number;
  snakeBranching?: number;
  rhizomeBranching?: number;
  bushMinBranches?: number;
  rhizomeMinBranches?: number;
  treeMinBranches?: number;
  snakeMinBranches?: number;
  timeScale?: number;
  postMatingDieoff?: boolean;
  theme?: number;
  themeMorphFreq?: number;
  themeMorphSpeed?: number;
  glowTraitIntensity?: number;
  glowTraitDistance?: number;
  glowTraitReflect?: number;
  botanyRealism?: boolean;
  windVelocity?: number;
  flutterIntensity?: number;
  leafScale?: number;
  leafDensity?: number;
  relativeLeafSizeDiff?: number;
  leafGrowthSpeed?: number;
  phyllotaxisAngle?: number;
  leafProbability?: number;
  appendageSpawnRate?: number;
  glowProbability?: number;
  stemCurviness?: number;
  veinStrength?: number;
  veinGlow?: number;
  designerMode?: boolean;
  designerArchetype?: any;
  onDesignerStrainName?: (name: string) => void;
  [key: string]: any;
}

function applyEngineProps(engine: any, props: Record<string, any>) {
  if (!engine) return;
  const directProps = [
    "tideThickness",
    "tideOpacity",
    "tideSaturation",
    "growthSpeed",
    "diebackRate",
    "ornamentFrequency",
    "branchingMultiplier",
    "branchBigger",
    "themeMorphFreq",
    "themeMorphSpeed",
    "glowTraitIntensity",
    "glowTraitDistance",
    "glowTraitReflect",
    "kioskMode",
  ];

  const methodMap: Record<string, string> = {
    designerMode: "setDesignerMode",
    designerArchetype: "setDesignerArchetype",
    rotationSpeed: "setRotationSpeed",
    rotationSpeedY: "setRotationSpeedY",
    magnetism: "setMagnetism",
    seekAmount: "setSeekAmount",
    proximity: "setProximity",
    desperation: "setDesperation",
    despairAge: "setDespairAge",
    maxMatings: "setMaxMatings",
    startColorMode: "setStartColorMode",
    flowerSize: "setFlowerSize",
    widthGrowthEffect: "setWidthGrowthEffect",
    minAgents: "setMinAgents",
    boundarySize: "setBoundarySize",
    boundarySquash: "setBoundarySquash",
    tideSpeed: "setTideSpeed",
    tideColor: "setTideColor",
    bgColor: "setBgColor",
    fogColor: "setFogColor",
    allowBreeding: "setAllowBreeding",
    hybridCooldown: "setHybridCooldown",
    hybridStickiness: "setHybridStickiness",
    hybridSpinSpeed: "setHybridSpinSpeed",
    branchTendencyVar: "setBranchTendencyVar",
    branchSplitSizeProb: "setBranchSplitSizeProb",
    pruningStrength: "setPruningStrength",
    maxBranchDepth: "setMaxBranchDepth",
    maxBranchesPerSpecies: "setMaxBranchesPerSpecies",
    maxDOMs: "setMaxDOMs",
    maxAgents: "setMaxAgents",
    maxSpecies: "setMaxSpecies",
    ecoFade: "setEcoFade",
    desiccationSpeed: "setDesiccationSpeed",
    enableGlow: "setEnableGlow",
    glowSize: "setGlowSize",
    fogVisibility: "setFogVisibility",
    traitProbs: "setTraitProbs",
    hybridSize: "setHybridSize",
    terminationProb: "setTerminationProb",
    termProbPostBranch: "setTermProbPostBranch",
    segmentGap: "setSegmentGap",
    taperDuration: "setTaperDuration",
    diebackAgeBias: "setDiebackAgeBias",
    maxLineWidth: "setMaxLineWidth",
    globalPulseSpeed: "setGlobalPulseSpeed",
    multicolorAppProb: "setMulticolorAppProb",
    sameColorAppProb: "setSameColorAppProb",
    maxSaturation: "setMaxSaturation",
    colorClamp: "setColorClamp",
    gridHeight: "setGridHeight",
    layerGap: "setLayerGap",
    floorHeight: "setFloorHeight",
    ceilingHeight: "setCeilingHeight",
    cameraProjection: "setCameraProjection",
    showBoundaryBox: "setShowBoundaryBox",
    feelerFade: "setFeelerFade",
    feelerDelay: "setFeelerDelay",
    cullRate: "setCullRate",
    snakeSpeed: "setSnakeSpeed",
    snakeStepSize: "setSnakeStepSize",
    snakeWander: "setSnakeWander",
    bushSpeed: "setBushSpeed",
    treeSpeed: "setTreeSpeed",
    rhizomeSpeed: "setRhizomeSpeed",
    bushStepSize: "setBushStepSize",
    treeStepSize: "setTreeStepSize",
    rhizomeStepSize: "setRhizomeStepSize",
    bushBranching: "setBushBranching",
    widthVariance: "setWidthVariance",
    branchGrowthBoost: "setBranchGrowthBoost",
    colorMutationShift: "setColorMutationShift",
    treeBranching: "setTreeBranching",
    treeBranchDelay: "setTreeBranchDelay",
    bushTaper: "setBushTaper",
    treeTaper: "setTreeTaper",
    rhizomeTaper: "setRhizomeTaper",
    snakeBranching: "setSnakeBranching",
    rhizomeBranching: "setRhizomeBranching",
    bushMinBranches: "setBushMinBranches",
    rhizomeMinBranches: "setRhizomeMinBranches",
    treeMinBranches: "setTreeMinBranches",
    snakeMinBranches: "setSnakeMinBranches",
    timeScale: "setTimeScale",
    postMatingDieoff: "setPostMatingDieoff",
    theme: "setTheme",
    botanyRealism: "setBotanyRealism",
    windVelocity: "setWindVelocity",
    flutterIntensity: "setFlutterIntensity",
    leafScale: "setLeafScale",
    leafDensity: "setLeafDensity",
    relativeLeafSizeDiff: "setRelativeLeafSizeDiff",
    leafGrowthSpeed: "setLeafGrowthSpeed",
    phyllotaxisAngle: "setPhyllotaxisAngle",
    leafProbability: "setLeafProbability",
    appendageSpawnRate: "setAppendageSpawnRate",
    glowProbability: "setGlowProbability",
    stemCurviness: "setStemCurviness",
    veinStrength: "setVeinStrength",
    veinGlow: "setVeinGlow",
  };

  for (const key of directProps) {
    if (props[key] !== undefined && engine[key] !== props[key]) {
      engine[key] = props[key];
    }
  }

  for (const [key, method] of Object.entries(methodMap)) {
    if (
      props[key] !== undefined &&
      engine[key] !== props[key] &&
      typeof engine[method] === "function"
    ) {
      engine[method](props[key]);
    }
  }
}

export function SimulationView(props: SimulationViewProps) {
  const {
    onLog,
    onStateUpdate,
    onInitOrganisms,
    onMatingEvent,
    onFeelerEvent,
    onKioskTrigger,
    kioskMode,
    onConfigChange,
    restartTrigger,
    randomizeTrigger,
    stats,
    bgColor,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const [hoveredStrainName, setHoveredStrainName] = useState<string | null>(
    null
  );
  const [hoveredAgentInfo, setHoveredAgentInfo] = useState<{
    age: number;
    tapering: boolean;
    appendage?: string;
    matingCount?: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastRaycastTime = useRef<number>(0);
  const pointerDownStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (engineRef.current) {
      applyEngineProps(engineRef.current, props);
    }
  }, Object.values(props));

  useEffect(() => {
    if (
      engineRef.current &&
      randomizeTrigger !== undefined &&
      randomizeTrigger > 0
    ) {
      engineRef.current.randomizeColors();
    }
  }, [randomizeTrigger]);

  useEffect(() => {
    if (engineRef.current && restartTrigger !== undefined) {
      engineRef.current.restart();
    }
  }, [restartTrigger]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const engine = new SimulationEngine(canvasRef.current, width, height);
    engine.onLog = onLog;
    engine.onStateUpdate = onStateUpdate;
    if (onInitOrganisms) engine.onInitOrganisms = onInitOrganisms;
    if (onMatingEvent) engine.onMatingEvent = onMatingEvent;
    if (onFeelerEvent) engine.onFeelerEvent = onFeelerEvent;
    if (onKioskTrigger) engine.onKioskTrigger = onKioskTrigger;
    if (kioskMode !== undefined) engine.kioskMode = kioskMode;
    if (props.onDesignerStrainName) engine.onDesignerStrainName = props.onDesignerStrainName;
    if (onConfigChange) {
      engine.onConfigChange = onConfigChange;
      onConfigChange({ bgColor: engine.bgColor });
    }
    engineRef.current = engine;

    applyEngineProps(engine, props);

    engine.initAgents();
    engine.start();

    const handleResize = () => {
      if (containerRef.current && engineRef.current) {
        engineRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.renderer.dispose();
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (pointerDownStart.current) {
      const dx = e.clientX - pointerDownStart.current.x;
      const dy = e.clientY - pointerDownStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pointerDownStart.current = null;
      if (dist > 5) return;
    }

    if (!containerRef.current || !engineRef.current) return;
    const engine = engineRef.current;
    if (!engine.camera || !engine.cylinderMesh) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, engine.camera);

    const intersects = raycaster.intersectObject(engine.cylinderMesh, true);

    let targetStrainName: string | null = null;

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && engine.segments[instanceId]) {
        targetStrainName = engine.segments[instanceId].strainName;
      }
    }

    if (!targetStrainName && engine.agents.length > 0) {
      let nearestAgent: any = null;
      let minDistSq = Infinity;
      const clickRay = raycaster.ray;

      engine.agents.forEach((agent) => {
        if (agent.active && !agent.isFeeler) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minDistSq && distSq < 8000) {
            minDistSq = distSq;
            nearestAgent = agent;
          }
        }
      });

      if (nearestAgent) {
        targetStrainName = nearestAgent.genome.name;
      }
    }

    if (targetStrainName) {
      let boosted = 0;
      engine.agents.forEach((agent) => {
        if (agent.active && agent.genome.name === targetStrainName) {
          agent.growthBoost = 16.0;
          agent.thickness = Math.min(
            agent.thickness * 1.5,
            agent.genome.thicknessBase * 3.0
          );
          agent.cooldown = 0;
          boosted++;
        }
      });

      if (boosted > 0) {
        engine.onLog(
          `🌟 Growth spurt triggered for ${targetStrainName.split(" ")[0]}!`
        );
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!containerRef.current || !engineRef.current) return;
    const now = performance.now();
    if (now - lastRaycastTime.current < 40) return;
    lastRaycastTime.current = now;

    const engine = engineRef.current;
    if (!engine.camera || !engine.cylinderMesh) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, engine.camera);

    const intersects = raycaster.intersectObject(engine.cylinderMesh, true);

    let targetStrainName: string | null = null;

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && engine.segments[instanceId]) {
        const sName = engine.segments[instanceId].strainName;
        if (sName !== "hybrid") {
          targetStrainName = sName;
        }
      }
    }

    if (!targetStrainName && engine.agents.length > 0) {
      let nearestAgent: any = null;
      let minDistSq = Infinity;
      const clickRay = raycaster.ray;

      engine.agents.forEach((agent) => {
        if (agent.active && !agent.isFeeler) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minDistSq && distSq < 300) {
            minDistSq = distSq;
            nearestAgent = agent;
          }
        }
      });

      if (nearestAgent) {
        targetStrainName = nearestAgent.genome.name;
      }
    }

    if (targetStrainName) {
      let matchingAgent: any = null;
      let minD = Infinity;
      const clickRay = raycaster.ray;
      engine.agents.forEach((agent) => {
        if (
          agent.active &&
          !agent.isFeeler &&
          agent.genome.name === targetStrainName
        ) {
          const distSq = clickRay.distanceSqToPoint(agent.position);
          if (distSq < minD) {
            minD = distSq;
            matchingAgent = agent;
          }
        }
      });
      if (!matchingAgent) {
        matchingAgent = engine.agents.find(
          (a) => a.active && !a.isFeeler && a.genome.name === targetStrainName
        );
      }
      if (matchingAgent) {
        const isStrainDeleting = !!(
          engine.dyingStrains && engine.dyingStrains.has(targetStrainName)
        );
        const lifecycle = (engine as any).speciesLifecycleMap?.get(targetStrainName);
        setHoveredAgentInfo({
          age: matchingAgent.age,
          tapering: isStrainDeleting,
          appendage: matchingAgent.genome.appendage,
          matingCount: matchingAgent.matingCount || lifecycle?.matingCount || 0,
        });
      } else {
        setHoveredAgentInfo(null);
      }
    } else {
      setHoveredAgentInfo(null);
    }

    engine.hoveredStrainName = targetStrainName;
    setHoveredStrainName(targetStrainName);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          if (engineRef.current) engineRef.current.hoveredStrainName = null;
          setHoveredStrainName(null);
          setHoveredAgentInfo(null);
        }}
        className="block w-full h-full cursor-pointer pointer-events-auto"
      />
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150 z-20"
        style={{
          backgroundColor: bgColor || "#001220",
          opacity: stats?.kioskFadeProgress || 0,
        }}
      />
      <SimulationHoverTooltip
        hoveredStrainName={hoveredStrainName}
        hoveredAgentInfo={hoveredAgentInfo}
        mousePos={mousePos}
        stats={stats}
      />
    </div>
  );
}
