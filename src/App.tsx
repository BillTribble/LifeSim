import React, { useState, useEffect } from "react";
import { SimulationView } from "./components/SimulationView";
import { HUD } from "./components/HUD";
import { useSimulationState } from "./hooks/useSimulationState";

export default function App() {
  const [showHUD, setShowHUD] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const { state, setters } = useSimulationState();

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
    const timer = setInterval(() => setUptime((prev) => prev + 1), 1000);
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
      />

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
