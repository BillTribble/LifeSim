import React, { useState, useEffect } from "react";
import { SimulationView } from "./components/SimulationView";
import { HUD } from "./components/HUD";
import { PopupNotification, PopupItem } from "./components/PopupNotification";
import { useSimulationState } from "./hooks/useSimulationState";
import { triggerRandomize } from "./utils/randomize";

export default function App() {
  const [showHUD, setShowHUD] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const { state, setters } = useSimulationState();
  const [popupQueue, setPopupQueue] = useState<PopupItem[]>([]);

  const getScaledDuration = () => Math.round(4000 * (0.4 / Math.max(0.1, state.timeScale)));

  const handleInitOrganisms = ({ alpha, beta }: { alpha: any; beta: any }) => {
    const dur = getScaledDuration();
    const org1Item: PopupItem = {
      id: `org1-${Date.now()}`,
      type: "organism1",
      title: "Organism 1 (Alpha Strain)",
      subtitle: "Founder Phenotype 1",
      genome: alpha,
      duration: dur,
    };
    const org2Item: PopupItem = {
      id: `org2-${Date.now()}`,
      type: "organism2",
      title: "Organism 2 (Beta Strain)",
      subtitle: "Founder Phenotype 2",
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
      title: `Mating Event Detected${countText}`,
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

  const handleBranchMutationEvent = (event: { parent: any; child: any; count?: number }) => {
    const dur = getScaledDuration();
    const countText = event.count ? ` #${event.count}` : "";
    const branchItem: PopupItem = {
      id: `branch-${Date.now()}`,
      type: "branchMutation",
      title: `Branch Mutation${countText}`,
      subtitle: "Vegetative Divergence",
      branchData: event,
      duration: dur,
    };
    setPopupQueue((prev) => [...prev, branchItem]);
  };

  const handleDismissPopup = (id: string) => {
    setPopupQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const [stats, setStats] = useState({
    geometryCount: 0,
    totalAgents: 0,
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
      swarmCohesion: state.magnetism,
      detectionRange: state.proximity,
      populationLimit: state.entropyThreshold,
      extrusionSpeed: state.growthSpeed,
      fadeSpeed: state.desiccationSpeed,
      pulseSpeed: state.globalPulseSpeed,
      saturation: state.maxSaturation,
      cameraPosition: stats.cameraPosition,
      version: "1.0",
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

  const handleStateUpdate = (newState: any) => {
    setStats(newState);
  };

  const handleRestart = () => {
    setRestartKey((prev) => prev + 1);
    setUptime(0);
  };

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
          fetch('/api/log', { method: 'POST', body: msg }).catch(() => {});
        }}
        onStateUpdate={handleStateUpdate}
        onConfigChange={(config) => {
          if (config.bgColor) setters.setBgColor(config.bgColor);
          if (config.theme !== undefined) setters.setTheme(config.theme);
        }}
        restartTrigger={restartKey}
        randomizeTrigger={randomizeKey}
        rotationSpeed={state.rotationSpeed}
        magnetism={state.magnetism}
        proximity={state.proximity}
        desperation={state.desperation}
        despairAge={state.despairAge}
        flowerSize={state.flowerSize}
        entropyThreshold={state.entropyThreshold}
        tideSpeed={state.tideSpeed}
        tideColor={state.tideColor}
        bgColor={state.bgColor}
        fogColor={state.fogColor}
        tideThickness={state.tideThickness}
        tideOpacity={state.tideOpacity}
        tideSaturation={state.tideSaturation}
        growthSpeed={state.growthSpeed}
        diebackRate={state.diebackRate}
        hybridCooldown={state.hybridCooldown}
        hybridStickiness={state.hybridStickiness}
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
        desiccationSpeed={state.desiccationSpeed}
        enableGlow={state.enableGlow}
        glowSize={state.glowSize}
        fogVisibility={state.fogVisibility}
        traitProbs={state.traitProbs}
        hybridSize={state.hybridSize}
        terminationProb={state.terminationProb}
        termProbPostBranch={state.termProbPostBranch}
        taperDuration={state.taperDuration}
        diebackAgeBias={state.diebackAgeBias}
        branchMutationRate={state.branchMutationRate}
        maxLineWidth={state.maxLineWidth}
        globalPulseSpeed={state.globalPulseSpeed}
        multicolorAppProb={state.multicolorAppProb}
        sameColorAppProb={state.sameColorAppProb}
        maxSaturation={state.maxSaturation}
        feelerFade={state.feelerFade}
        cullRate={state.cullRate}
        snakeSpeed={state.snakeSpeed}
        snakeStepSize={state.snakeStepSize}
        snakeWander={state.snakeWander}
        bushSpeed={state.bushSpeed}
        treeSpeed={state.treeSpeed}
        gingerSpeed={state.gingerSpeed}
        timeScale={state.timeScale}
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
        onBranchMutationEvent={handleBranchMutationEvent}
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
