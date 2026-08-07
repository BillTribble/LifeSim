import React, { useState, useEffect, useRef } from "react";
import { SimulationView } from "./components/SimulationView";
import { HUD } from "./components/HUD";
import { PopupNotification, PopupItem } from "./components/PopupNotification";
import { useSimulationState } from "./hooks/useSimulationState";
import { triggerRandomize } from "./utils/randomize";
import { ActivityLog, LogEntry } from "./components/ActivityLog";
import { generateSessionCode } from "./utils/sessionCode";

export default function App() {
  const [showHUD, setShowHUD] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [sessionCode, setSessionCode] = useState(() => generateSessionCode());
  const sessionCodeRef = useRef(sessionCode);
  sessionCodeRef.current = sessionCode;
  const { state, setters } = useSimulationState();
  const [popupQueue, setPopupQueue] = useState<PopupItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [{ id: Date.now() + Math.random(), text: msg, time }, ...prev.slice(0, 49)]);
    // Persist to disk via Vite dev server middleware with session code
    fetch('/api/log', { method: 'POST', body: `[${sessionCodeRef.current}] ${msg}` }).catch(() => {});
  };

  const getScaledDuration = () => Math.max(10000, Math.round(10000 * (0.4 / Math.max(0.1, state.timeScale))));

  const handleInitOrganisms = ({ alpha, beta }: { alpha: any; beta: any }) => {
    const dur = getScaledDuration();
    const org1Item: PopupItem = {
      id: `org1-${Date.now()}`,
      type: "organism1",
      title: "Organism A (Alpha Strain)",
      subtitle: "Founder Phenotype A",
      genome: alpha,
      duration: dur,
    };
    const org2Item: PopupItem = {
      id: `org2-${Date.now()}`,
      type: "organism2",
      title: "Organism B (Beta Strain)",
      subtitle: "Founder Phenotype B",
      genome: beta,
      duration: dur,
    };
    setPopupQueue([org1Item, org2Item]);
  };

  const handleMatingEvent = (event: { parent1: any; parent2: any; child: any; count?: number }) => {
    const dur = getScaledDuration();
    const countText = event.count ? ` #${event.count}` : "";
    const matingItem: PopupItem = {
      id: `mating-${Date.now()}`,
      type: "mating",
      title: `Mating Detected${countText}`,
      subtitle: "Cross-Species Hybridization",
      matingData: event,
      duration: dur,
    };
    setPopupQueue((prev) => [...prev, matingItem]);
  };

  const handleFeelerEvent = (event: { parent: any; feeler: any; count?: number }) => {
    const dur = getScaledDuration();
    const countText = event.count ? ` #${event.count}` : "";
    const feelerItem: PopupItem = {
      id: `feeler-${Date.now()}`,
      type: "feeler",
      title: `Feeler Extended${countText}`,
      subtitle: "Hybridization Tendril",
      feelerData: event,
      duration: dur,
    };
    setPopupQueue((prev) => [...prev, feelerItem]);
  };

  const handleDismissPopup = (id: string) => {
    setPopupQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const [stats, setStats] = useState({
    geometryCount: 0,
    totalAgents: 0,
    hybridCount: 0,
    strains: [] as {
      name: string;
      color: string;
      color2?: string;
      biomass: number;
      archetype?: string;
      isDying?: boolean;
    }[],
    tideValue: 0,
    cameraPosition: { x: 0, y: 0, z: 0, zoom: 1 },
    theme: 0,
    nextTheme: 0,
    themeProgress: 1.0,
  });
  const [uptime, setUptime] = useState(0);

  const [randomizeKey, setRandomizeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopySettings = () => {
    const settings = {
      ...state,
      appendageSize: state.flowerSize,
      hybridDecay: state.hybridStickiness,
      deathRate: state.diebackRate,
      slowMotion: state.timeScale,
      rotationVelocity: state.rotationSpeed,
      rotationVelocityY: state.rotationSpeedY,
      swarmCohesion: state.magnetism,
      detectionRange: state.proximity,
      extrusionSpeed: state.growthSpeed,
      fadeSpeed: state.desiccationSpeed,
      pulseSpeed: state.globalPulseSpeed,
      saturation: state.maxSaturation,
      cameraPosition: stats.cameraPosition,
      version: "0.3",
    };
    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => {
        const next = prev + 1;
        if (next % 10 === 0) {
          console.log(`[LifeSim] Uptime: ${Math.floor(next / 60)}m ${next % 60}s (${next}s)`);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic state snapshot to disk log every 3 seconds
  const lastSnapshotRef = React.useRef(0);
  const lastGeoAlert = React.useRef(0);
  const handleStateUpdate = (newState: any) => {
    setStats(newState);
    const now = Date.now();

    // ALERT: detect stems disappearing while agents are alive
    if (newState.geometryCount !== undefined && newState.totalAgents !== undefined) {
      if (newState.geometryCount < 10 && newState.totalAgents > 0 && now - lastGeoAlert.current > 5000) {
        lastGeoAlert.current = now;
        const alert = `🚨 [INVISIBLE BUG] geometries=${newState.geometryCount} but agents=${newState.totalAgents} — stems vanished while creatures alive!`;
        console.error(alert);
        fetch('/api/log', { method: 'POST', body: alert }).catch(() => {});
      }
    }

    if (now - lastSnapshotRef.current >= 3000) {
      lastSnapshotRef.current = now;
      const strains = newState.strains || [];
      const speciesSummary = strains.map((s: any) =>
        `${s.name || "?"}(${s.biomass?.toFixed?.(0) || 0}${s.isDying ? ",DYING" : ""})`
      ).join(", ");

      const sf = newState.screenFill;
      let fillSummary = "";
      if (sf) {
        const speciesFill = (sf.speciesBreakdown || []).map((sp: any) =>
          `${sp.name}[${(sp.archetype || "?").toUpperCase()}]=${sp.fillPct.toFixed(1)}%(${sp.pixels}px)`
        ).join(", ");
        fillSummary = ` | [SCREEN_FILL] total=${sf.totalFillPct.toFixed(1)}% (${sf.totalOccupiedPixels}/${sf.totalPixels}px) [${speciesFill}]`;
      }

      const dials = `DIALS: minAgents=${state.minAgents} maxAgents=${state.maxAgents} maxSpec=${state.maxSpecies} rad=${state.boundarySize} squash=${state.boundarySquash} spd=${state.growthSpeed} slowMo=${state.timeScale} magnet=${state.magnetism?.toFixed(3)} seek=${state.seekAmount?.toFixed(2)} prox=${state.proximity?.toFixed(0)} desp=${state.desperation?.toFixed(1)} despAge=${state.despairAge?.toFixed(0)} breedLim=${state.maxMatings} ecoFade=${state.ecoFade?.toFixed(2)} dieback=${state.diebackRate?.toFixed(2)} termProb=${state.terminationProb?.toFixed(2)} termPost=${state.termProbPostBranch} gap=${state.segmentGap} brMult=${state.branchingMultiplier} brBoost=${state.branchGrowthBoost}`;
      const snapshot = `[SNAPSHOT] [${sessionCodeRef.current}] species=${strains.length} agents=${newState.totalAgents ?? "?"} geom=${newState.geometryCount ?? "?"}${fillSummary} | ${speciesSummary} | ${dials}`;
      fetch('/api/log', { method: 'POST', body: snapshot }).catch(() => {});
    }
  };

  const handleRestart = () => {
    const nextCode = generateSessionCode();
    setSessionCode(nextCode);
    sessionCodeRef.current = nextCode;
    setRestartKey((prev) => prev + 1);
    setUptime(0);
    const dials = `DIALS: minAgents=${state.minAgents} maxAgents=${state.maxAgents} maxSpec=${state.maxSpecies} rad=${state.boundarySize} squash=${state.boundarySquash} spd=${state.growthSpeed} slowMo=${state.timeScale} magnet=${state.magnetism?.toFixed(3)} seek=${state.seekAmount?.toFixed(2)} prox=${state.proximity?.toFixed(0)} desp=${state.desperation?.toFixed(1)} despAge=${state.despairAge?.toFixed(0)} breedLim=${state.maxMatings} ecoFade=${state.ecoFade?.toFixed(2)} dieback=${state.diebackRate?.toFixed(2)} termProb=${state.terminationProb?.toFixed(2)} termPost=${state.termProbPostBranch} gap=${state.segmentGap} brMult=${state.branchingMultiplier} brBoost=${state.branchGrowthBoost}`;
    fetch('/api/log', { method: 'POST', body: `=== SESSION RESTART [${nextCode}] === | ${dials}` }).catch(() => {});
  };

  // Log session start on mount
  React.useEffect(() => {
    const dials = `DIALS: minAgents=${state.minAgents} maxAgents=${state.maxAgents} maxSpec=${state.maxSpecies} rad=${state.boundarySize} squash=${state.boundarySquash} spd=${state.growthSpeed} slowMo=${state.timeScale} magnet=${state.magnetism?.toFixed(3)} seek=${state.seekAmount?.toFixed(2)} prox=${state.proximity?.toFixed(0)} desp=${state.desperation?.toFixed(1)} despAge=${state.despairAge?.toFixed(0)} breedLim=${state.maxMatings} ecoFade=${state.ecoFade?.toFixed(2)} dieback=${state.diebackRate?.toFixed(2)} termProb=${state.terminationProb?.toFixed(2)} termPost=${state.termProbPostBranch} gap=${state.segmentGap} brMult=${state.branchingMultiplier} brBoost=${state.branchGrowthBoost}`;
    fetch('/api/log', { method: 'POST', body: `=== SESSION START [${sessionCodeRef.current}] === | ${dials}` }).catch(() => {});
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#001220] text-[#D2B48C] font-sans overflow-hidden select-none">
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 20%, rgba(0,0,0,0.85) 120%)",
        }}
      />
      <SimulationView
        stats={stats}
        onLog={(msg) => {
          console.log(msg);
          handleLog(msg);
        }}
        onStateUpdate={handleStateUpdate}
        onConfigChange={(config) => {
          if (config.bgColor) setters.setBgColor(config.bgColor);
          if (config.theme !== undefined) setters.setTheme(config.theme);
        }}
        restartTrigger={restartKey}
        randomizeTrigger={randomizeKey}
        rotationSpeed={state.rotationSpeed}
        rotationSpeedY={state.rotationSpeedY}
        magnetism={state.magnetism}
        seekAmount={state.seekAmount}
        proximity={state.proximity}
        desperation={state.desperation}
        despairAge={state.despairAge}
        maxMatings={state.maxMatings}
        startColorMode={state.startColorMode}
        flowerSize={state.flowerSize}
        tideSpeed={state.tideSpeed}
        tideColor={state.tideColor}
        bgColor={state.bgColor}
        fogColor={state.fogColor}
        tideThickness={state.tideThickness}
        tideOpacity={state.tideOpacity}
        tideSaturation={state.tideSaturation}
        growthSpeed={state.growthSpeed}
        widthGrowthEffect={state.widthGrowthEffect}
        diebackRate={state.diebackRate}
        allowBreeding={state.allowBreeding}
        hybridCooldown={state.hybridCooldown}
        hybridStickiness={state.hybridStickiness}
        hybridSpinSpeed={state.hybridSpinSpeed}
        branchTendencyVar={state.branchTendencyVar}
        ornamentFrequency={state.ornamentFrequency}
        branchingMultiplier={state.branchingMultiplier}
        branchBigger={state.branchBigger}
        branchSplitSizeProb={state.branchSplitSizeProb}
        maxDOMs={state.maxDOMs}
        maxAgents={state.maxAgents}
        maxSpecies={state.maxSpecies}
        ecoFade={state.ecoFade}
        minAgents={state.minAgents}
        boundarySize={state.boundarySize}
        boundarySquash={state.boundarySquash}
        desiccationSpeed={state.desiccationSpeed}
        enableGlow={state.enableGlow}
        glowSize={state.glowSize}
        fogVisibility={state.fogVisibility}
        traitProbs={state.traitProbs}
        hybridSize={state.hybridSize}
        terminationProb={state.terminationProb}
        termProbPostBranch={state.termProbPostBranch}
        segmentGap={state.segmentGap}
        taperDuration={state.taperDuration}
        diebackAgeBias={state.diebackAgeBias}
        maxLineWidth={state.maxLineWidth}
        globalPulseSpeed={state.globalPulseSpeed}
        multicolorAppProb={state.multicolorAppProb}
        sameColorAppProb={state.sameColorAppProb}
        maxSaturation={state.maxSaturation}
        colorClamp={state.colorClamp}
        gridHeight={state.gridHeight}
        layerGap={state.layerGap}
        floorHeight={state.floorHeight}
        ceilingHeight={state.ceilingHeight}
        cameraProjection={state.cameraProjection}
        showBoundaryBox={state.showBoundaryBox}
        feelerFade={state.feelerFade}
        cullRate={state.cullRate}
        snakeSpeed={state.snakeSpeed}
        snakeStepSize={state.snakeStepSize}
        snakeWander={state.snakeWander}
        bushSpeed={state.bushSpeed}
        treeSpeed={state.treeSpeed}
        rhizomeSpeed={state.rhizomeSpeed}
        bushStepSize={state.bushStepSize}
        treeStepSize={state.treeStepSize}
        rhizomeStepSize={state.rhizomeStepSize}
        bushBranching={state.bushBranching}
        widthVariance={state.widthVariance}
        branchGrowthBoost={state.branchGrowthBoost}
        colorMutationShift={state.colorMutationShift}
        treeBranching={state.treeBranching}
        snakeBranching={state.snakeBranching}
        rhizomeBranching={state.rhizomeBranching}
        bushMinBranches={state.bushMinBranches}
        rhizomeMinBranches={state.rhizomeMinBranches}
        treeMinBranches={state.treeMinBranches}
        snakeMinBranches={state.snakeMinBranches}
        timeScale={state.timeScale}
        postMatingDieoff={state.postMatingDieoff}
        theme={state.theme}
        themeMorphFreq={state.themeMorphFreq}
        themeMorphSpeed={state.themeMorphSpeed}
        glowTraitIntensity={state.glowTraitIntensity}
        glowTraitDistance={state.glowTraitDistance}
        glowTraitReflect={state.glowTraitReflect}
        botanyRealism={state.botanyRealism}
        windVelocity={state.windVelocity}
        flutterIntensity={state.flutterIntensity}
        leafScale={state.leafScale}
        leafDensity={state.leafDensity}
        relativeLeafSizeDiff={state.relativeLeafSizeDiff}
        leafGrowthSpeed={state.leafGrowthSpeed}
        phyllotaxisAngle={state.phyllotaxisAngle}
        leafProbability={state.leafProbability}
        appendageSpawnRate={state.appendageSpawnRate}
        glowProbability={state.glowProbability}
        stemCurviness={state.stemCurviness}
        kioskMode={state.kioskMode}
        onKioskTrigger={() => triggerRandomize(setters, state, setRandomizeKey, handleRestart)}
        onInitOrganisms={handleInitOrganisms}
        onMatingEvent={handleMatingEvent}
        onFeelerEvent={handleFeelerEvent}
      />

      <PopupNotification queue={popupQueue} trackedPositions={stats.trackedPositions} onDismiss={handleDismissPopup} />

      <HUD
        showHUD={showHUD}
        setShowHUD={setShowHUD}
        stats={stats}
        state={state}
        setters={setters}
        handleRestart={handleRestart}
        setRandomizeKey={setRandomizeKey}
        handleCopySettings={handleCopySettings}
        copied={copied}
        uptime={uptime}
        sessionCode={sessionCode}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 18, 32, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(210, 180, 140, 0.2);
        }
      `}</style>
    </div>
  );
}
