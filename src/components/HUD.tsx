import React, { useState } from "react";
import {
  Activity,
  Cpu,
  Database,
  Share2,
  Palette,
  Cloud,
  Dna,
  ChevronDown,
} from "lucide-react";
import { Dial } from "./Dial";

function SmartDial(props: any) {
  const { label, min: defaultMin, max: defaultMax, state, setters, ...rest } = props;
  const limits = state.dialLimits?.[label];
  const min = limits?.min ?? defaultMin;
  const max = limits?.max ?? defaultMax;
  
  return (
    <Dial 
      label={label}
      min={min}
      max={max}
      {...rest}
      onLimitsChange={(newMin: number, newMax: number) => {
        if (setters.setDialLimits) {
          setters.setDialLimits((prev: any) => ({ ...prev, [label]: { min: newMin, max: newMax } }));
        }
      }}
    />
  );
}
import { PresetPanel } from "./PresetPanel";
import { CloudConfigPanel } from "./CloudConfigPanel";
import { MutationPanel } from "./MutationPanel";

interface HUDProps {
  showHUD: boolean;
  setShowHUD: (s: boolean) => void;
  stats: any;
  state: any;
  setters: any;
  handleRestart: () => void;
  setRandomizeKey: React.Dispatch<React.SetStateAction<number>>;
  handleCopySettings: () => void;
  copied: boolean;
  uptime: number;
}

export function HUD({
  showHUD,
  setShowHUD,
  stats,
  state,
  setters,
  handleRestart,
  setRandomizeKey,
  handleCopySettings,
  copied,
  uptime,
}: HUDProps) {
  const [cloudPanelOpen, setCloudPanelOpen] = useState(false);
  const [mutationPanelOpen, setMutationPanelOpen] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [isBiomassCollapsed, setIsBiomassCollapsed] = useState(false);

  const totalBiomass =
    stats.strains.reduce((acc: number, s: any) => acc + s.biomass, 0) || 1;

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {cloudPanelOpen && <CloudConfigPanel state={state} setters={setters} />}
      {mutationPanelOpen && <MutationPanel state={state} setters={setters} />}
      {presetPanelOpen && <PresetPanel state={state} setters={setters} stats={stats} setRandomizeKey={setRandomizeKey} handleRestart={handleRestart} />}

      <div
        className={`absolute inset-0 z-10 pointer-events-none flex flex-col p-4 m-4 rounded transition-all duration-500 ${showHUD ? "border-2 border-[#D2B48C]/20" : "border-2 border-transparent"}`}
      >
        <header className={`flex justify-between items-start mb-6 text-[10px] font-mono pb-2 transition-all duration-500 ${showHUD ? "border-b border-[#D2B48C]/30" : "border-b border-transparent"}`}>
          <div className="flex gap-4">
            <div
              className={`flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border border-[#D2B48C]/50 px-2 py-1 rounded bg-[#001220]/60 shadow-sm transition-opacity duration-500 ${showHUD ? "opacity-80" : "opacity-100"}`}
              onClick={handleRestart}
              title="Re-initialize system"
            >
              <Activity className="w-3.5 h-3.5 text-green-400" />
              <span>RESTART_SIM</span>
            </div>
            <div
              className={`flex items-center gap-2 cursor-pointer hover:text-white transition-all duration-500 ${showHUD ? "opacity-80 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={handleCopySettings}
              title="Copy all settings to clipboard"
            >
              <Database
                className={`w-3.5 h-3.5 ${copied ? "text-green-500" : "text-blue-400"}`}
              />
              <span>{copied ? "SETTINGS_COPIED!" : "COPY_SETTINGS"}</span>
            </div>
          </div>
          <div className={`flex flex-wrap gap-4 text-right justify-end text-[9px] sm:text-[10px] items-center transition-opacity duration-500 ${showHUD ? "opacity-80 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <div className="flex items-center gap-2 border border-[#D2B48C]/30 px-3 py-1 rounded bg-[#001220]/60">
              <span className="text-[#D2B48C]">UPTIME:</span>
              <span className="text-white">{formatUptime(uptime)}</span>
            </div>
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded"
              onClick={() => setPresetPanelOpen(!presetPanelOpen)}
              title="Presets"
            >
              <Database className="w-3 h-3 text-[#D2B48C]" />
              <span>PRESETS</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded"
              onClick={() => setMutationPanelOpen(!mutationPanelOpen)}
              title="Mutations"
            >
              <Dna className="w-3 h-3 text-[#87CEEB]" />
              <span>MUTATION</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded"
              onClick={() => setCloudPanelOpen(!cloudPanelOpen)}
              title="Configure Tide Cloud"
            >
              <Cloud className="w-3 h-3 text-purple-400" />
              <span>CONFIG</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-4 gap-6 pointer-events-none">
          <div className="col-span-1 flex flex-col gap-6">
            <div className="border border-[#D2B48C]/30 p-2 sm:p-3 bg-[#001220]/60 backdrop-blur-sm pointer-events-auto shadow-lg w-32 sm:w-40">
              <h2 
                className="text-[8px] font-mono mb-2 text-[#87CEEB] flex items-center justify-between gap-1.5 tracking-widest cursor-pointer"
                onClick={() => setIsBiomassCollapsed(!isBiomassCollapsed)}
              >
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-3 h-3" />
                  BIOMASS
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${isBiomassCollapsed ? "rotate-180" : ""}`} />
              </h2>
              {!isBiomassCollapsed && (
                <div className="space-y-3 text-[8px] sm:text-[9px] font-mono max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  {(() => {
                  const archetypeTotals: Record<string, number> = {};
                  stats.strains.forEach((s: any) => {
                    const arch = s.archetype || "unknown";
                    archetypeTotals[arch] = (archetypeTotals[arch] || 0) + s.biomass;
                  });
                  return Object.entries(archetypeTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([arch, mass]) => {
                      const pct = ((mass / totalBiomass) * 100).toFixed(1);
                      return (
                        <div key={arch} className="flex justify-between text-[#87CEEB] opacity-80 border-b border-[#87CEEB]/20 pb-1 mb-1">
                          <span className="capitalize">{arch}</span>
                          <span>{pct}%</span>
                        </div>
                      );
                    });
                })()}
                {stats.strains.map((strain: any, i: number) => {
                  const percent = (strain.biomass / totalBiomass) * 100;
                  const hasGradient =
                    strain.color2 && strain.color2 !== strain.color;
                  const textStyle = hasGradient
                    ? {
                        backgroundImage: `linear-gradient(to right, ${strain.color}, ${strain.color2})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }
                    : { color: strain.color };
                  const barStyle = hasGradient
                    ? {
                        width: `${percent}%`,
                        backgroundImage: `linear-gradient(to right, ${strain.color}, ${strain.color2})`,
                      }
                    : { width: `${percent}%`, backgroundColor: strain.color };

                  return (
                    <div
                      key={i}
                      className="group relative cursor-pointer pointer-events-auto"
                    >
                      <div className="flex justify-between mb-0.5 items-center">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="truncate" style={textStyle}>
                            {strain.name}
                          </span>
                          {strain.isDying && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]" 
                              title="Marked for gradual die-off"
                            />
                          )}
                        </div>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={barStyle as React.CSSProperties}
                        />
                      </div>
                      {strain.genome && (
                        <div className="fixed left-40 sm:left-48 top-32 hidden group-hover:flex flex-col bg-[#001220]/95 border border-[#87CEEB]/50 p-3 z-[9999] min-w-[200px] shadow-2xl text-[#87CEEB] text-[9px] sm:text-[10px] pointer-events-none rounded whitespace-nowrap">
                          <div className="font-bold text-[10px] sm:text-[11px] border-b border-[#87CEEB]/30 pb-1 mb-1 shadow-sm">
                            {strain.name} traits
                          </div>
                          <div className="flex justify-between">
                            <span>Color:</span>
                            <span style={{ color: strain.color }}>
                              {strain.color}
                            </span>
                          </div>
                          {strain.color2 && strain.color2 !== strain.color && (
                            <div className="flex justify-between">
                              <span>Tip Color:</span>
                              <span style={{ color: strain.color2 }}>
                                {strain.color2}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Thickness:</span>
                            <span>
                              {strain.genome.thicknessBase?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thickness Decay:</span>
                            <span>
                              {strain.genome.thicknessDecay?.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Min Thickness:</span>
                            <span>
                              {strain.genome.minThickness?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Step Size:</span>
                            <span>{strain.genome.stepSize?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Wander:</span>
                            <span>
                              {strain.genome.wanderIntensity?.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bifurcation:</span>
                            <span>
                              {strain.genome.bifurcationRate?.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Branch Tendency:</span>
                            <span>
                              {strain.genome.branchTendency?.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Waving Speed:</span>
                            <span>{strain.genome.wavingSpeed?.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Waving Amp:</span>
                            <span>
                              {strain.genome.wavingAmplitude?.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Geometry:</span>
                            <span>{strain.genome.geometryType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Appendage:</span>
                            <span>{strain.genome.appendage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Multicolor App:</span>
                            <span>
                              {strain.genome.multicolorAppendage ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Same Color App:</span>
                            <span>
                              {strain.genome.sameColorAppendage ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pulse Target:</span>
                            <span>{strain.genome.pulseTarget}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pulse Speed:</span>
                            <span>{strain.genome.pulseSpeed?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gradient Growth:</span>
                            <span>
                              {strain.genome.gradientGrowth ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stability:</span>
                            <span>{strain.genome.stability?.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
          <div className="col-span-3"></div>
        </div>

        <footer className={`mt-6 flex flex-col justify-between items-end border-t border-[#D2B48C]/30 pt-4 text-[9px] font-mono transition-opacity duration-500 gap-4 ${showHUD ? "opacity-100" : "opacity-0"}`}>
          <div className="flex justify-between items-end w-full pointer-events-none">
            <div className={`flex gap-6 items-center ${showHUD ? "pointer-events-auto" : "pointer-events-none"}`}>
              <div className="flex flex-col items-center gap-1">
                <span className="opacity-60 text-[8px] uppercase">Active</span>
                <span>{stats.totalAgents}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="opacity-60 text-[8px] uppercase">Vectors</span>
                <span>{stats.geometryCount.toLocaleString()}</span>
              </div>

              <div className="h-full border-l border-[#D2B48C]/30 mx-2"></div>

              <div className="flex gap-4 items-center flex-wrap">
                <SmartDial state={state} setters={setters}
                  tooltip="ROTATION VELOCITY: Speed of the camera rotation."
                  label="ROT_VEL"
                  min={0.01}
                  max={5.0}
                  step={0.01}
                  value={state.rotationSpeed}
                  onChange={setters.setRotationSpeed}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="SWARM COHESION: Gravitational attraction. High = dense clustered structures. Low = sprawling independent organisms."
                  label="MAGNET"
                  min={0}
                  max={0.1}
                  step={0.002}
                  value={state.magnetism}
                  onChange={setters.setMagnetism}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MAX MEMORY POINTS: Increases maximum tail length. WARNING: High values will crash the browser!"
                  label="MAX_DOMS"
                  min={50000}
                  max={450000}
                  step={1000}
                  value={state.maxDOMs}
                  onChange={setters.setMaxDOMs}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="DETECTION RANGE: Distance for cross-breeding. High = frequent hybridization. Low = isolated species."
                  label="PROXIM"
                  min={1}
                  max={2000.0}
                  step={10.0}
                  value={state.proximity}
                  onChange={setters.setProximity}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="DESPERATION: Multiplier for age-based hunting and hybridization."
                  label="DESPAIR"
                  min={1}
                  max={10.0}
                  step={0.1}
                  value={state.desperation}
                  onChange={setters.setDesperation}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="DESPAIR AGE: Age at which creatures become desperate for hybridization."
                  label="DESP_AGE"
                  min={100}
                  max={5000}
                  step={100}
                  value={state.despairAge}
                  onChange={setters.setDespairAge}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="ARTIFACT SCALE: Size multiplier for ornaments. High = huge flowers/crystals. Low = tiny subtle details."
                  label="ART_SIZE"
                  min={0.05}
                  max={1.0}
                  step={0.01}
                  value={state.flowerSize}
                  onChange={setters.setFlowerSize}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="POPULATION LIMIT: Stability threshold. High = only highly dominant species survive. Low = extreme diversity."
                  label="ENTROPY"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={state.entropyThreshold}
                  onChange={setters.setEntropyThreshold}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="EXTRUSION SPEED: Rate of growth. High = explosive rapid expansion. Low = slow deliberate crawling."
                  label="GROW_SPD"
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  value={state.growthSpeed}
                  onChange={setters.setGrowthSpeed}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="DECAY VELOCITY: Speed of recycling. High = volatile fleeting patterns. Low = persistent lingering trails."
                  label="DEATH RATE"
                  min={0.0}
                  max={10.0}
                  step={0.01}
                  value={state.diebackRate}
                  onChange={setters.setDiebackRate}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="HYBRID BREED COOL: Hybridization cooldown. High = rare hybridization. Low = bursts of hybrids."
                  label="HYBRID_COOL"
                  min={10}
                  max={2000}
                  step={10}
                  value={state.hybridCooldown}
                  onChange={setters.setHybridCooldown}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="ARTIFACT DECAY: How long hybrid artifacts persist compared to paths."
                  label="ART_DECAY"
                  min={1}
                  max={50.0}
                  step={1.0}
                  value={state.hybridStickiness}
                  onChange={setters.setHybridStickiness}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="BRANCH VARIANCE: Tendency ratio for species branching."
                  label="BRANCH_VAR"
                  min={1}
                  max={50.0}
                  step={1.0}
                  value={state.branchTendencyVar}
                  onChange={setters.setBranchTendencyVar}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="BRANCH RATE: Base multiplier for branching. High = complex fractals. Low = single lines."
                  label="BRANCHING"
                  min={0.1}
                  max={500.0}
                  step={0.1}
                  value={state.branchingMultiplier}
                  onChange={setters.setBranchingMultiplier}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="AGE BIAS: Targets old structures. High = brutal early culling. Low = long-lived ancient trails."
                  label="DIE_BIAS"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={state.diebackAgeBias}
                  onChange={setters.setDiebackAgeBias}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="HYBRID_SIZE: Size of the hybridization polyhedra artifacts left behind."
                  label="HYBRID_SIZE"
                  min={0.5}
                  max={10.0}
                  step={0.1}
                  value={state.hybridSize}
                  onChange={setters.setHybridSize}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="FEELER FADE: Speed multiplier for feelers dying off. High = feelers die very fast. Low = feelers linger like normal paths."
                  label="FEELER_FADE"
                  min={1.0}
                  max={50.0}
                  step={1.0}
                  value={state.feelerFade}
                  onChange={setters.setFeelerFade}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="FADE SPEED: How fast dead segments dissolve into wireframes and nothing. High = aggressive fast fade. Low = long slow ghost trails."
                  label="FADE_SPEED"
                  min={0.1}
                  max={15.0}
                  step={0.1}
                  value={state.desiccationSpeed}
                  onChange={setters.setDesiccationSpeed}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="TAPER DUR: Tapering animation time. High = long thin pointy tails. Low = blunt sudden cutoffs."
                  label="TAPER_TIME"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={state.taperDuration}
                  onChange={setters.setTaperDuration}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="TERMINATION: Natural life span. High = short burst-like organisms. Low = immortal endless trails."
                  label="TERM_PROB"
                  min={0.0}
                  max={1.0}
                  step={0.0001}
                  value={state.terminationProb}
                  onChange={setters.setTerminationProb}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="BRANCH TERM PENALTY: Extra chance of termination shortly after branching."
                  label="TERM_BRANCH"
                  min={0.5}
                  max={10.0}
                  step={0.5}
                  value={state.termProbPostBranch}
                  onChange={setters.setTermProbPostBranch}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="BRANCH MUTATION: Child vs parent traits. High = branches look entirely alien. Low = branches perfectly match."
                  label="B_MUTATE"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={state.branchMutationRate}
                  onChange={setters.setBranchMutationRate}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MAX ORGANISMS: Hard limit on active organisms, kills oldest. High = swarms. Low = only a few lines."
                  label="MAX_AGENTS"
                  min={1}
                  max={200}
                  step={1}
                  value={state.maxAgents}
                  onChange={setters.setMaxAgents}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MAX SPECIES: Limits number of viable distinct species. Breeding will be constrained to not exceed this limit."
                  label="MAX_SPECIES"
                  min={1}
                  max={20}
                  step={1}
                  value={state.maxSpecies}
                  onChange={setters.setMaxSpecies}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="ECO_FADE: 0 = Global Agent Limit. 1 = Perfect equality between active species (protects bushier slow-growing species from extinction by single-strand fast growers)."
                  label="ECO_FADE"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={state.ecoFade}
                  onChange={setters.setEcoFade}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MIN ORGANISMS: Minimum number of organisms to keep alive."
                  label="MIN_AGENTS"
                  min={2}
                  max={20}
                  step={1}
                  value={state.minAgents}
                  onChange={setters.setMinAgents}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MULTI COLOR APP PROB: Appendage color chaos. High = rainbow gradients on thorns/flowers. Low = simple colors."
                  label="MULTI_COLOR"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={state.multicolorAppProb}
                  onChange={setters.setMulticolorAppProb}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="SAME COLOR APP PROB: Host vs complementary color. High = matching cohesive color palette. Low = highly contrasting colors."
                  label="SAME_COLOR"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={state.sameColorAppProb || 0.0}
                  onChange={setters.setSameColorAppProb}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="PULSE SPEED: Bioluminescence frequency. High = hyperactive strobe effect. Low = gentle breathing glow."
                  label="PULSE_SPD"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={state.globalPulseSpeed}
                  onChange={setters.setGlobalPulseSpeed}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MAX SATURATION: Controls the maximum possible saturation for organisms. High = vivid neon colors. Low = muted grayscale organisms."
                  label="MAX_SATURATION"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={state.maxSaturation}
                  onChange={setters.setMaxSaturation}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="MAX WIDTH: Stem thickness limit. High = massive giant vines. Low = whisper-thin hair spirals."
                  label="MAX_WIDTH"
                  min={1.0}
                  max={20.0}
                  step={0.5}
                  value={state.maxLineWidth}
                  onChange={setters.setMaxLineWidth}
                  color="#87CEEB"
                />
                <SmartDial state={state} setters={setters}
                  tooltip="CULL RATE: Multiplier for how fast a species dies off when marked for culling."
                  label="CULL_RATE"
                  min={1.0}
                  max={50.0}
                  step={0.5}
                  value={state.cullRate}
                  onChange={setters.setCullRate}
                  color="#87CEEB"
                />
              </div>
            </div>

            <div className={`text-right flex flex-col gap-1 items-end w-full md:w-auto ${showHUD ? "pointer-events-auto" : "pointer-events-none"}`}>
              <div className="flex flex-col items-end gap-1 mb-2 w-full max-w-[200px]">
                <div className="flex justify-between w-full text-[10px] opacity-60 uppercase">
                  <span>Tide Level</span>
                  <span>{(stats.tideValue * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 border border-[#D2B48C]/20 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 to-red-600 transition-all duration-75"
                    style={{ width: `${stats.tideValue * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 pointer-events-none">
        {!showHUD && (
          <span 
            className="text-[10px] font-mono text-[#D2B48C] opacity-80 uppercase transition-opacity duration-500 cursor-pointer pointer-events-auto hover:text-white"
            onClick={() => setShowHUD(true)}
          >
            Interface
          </span>
        )}
        <button
          onClick={() => setShowHUD(!showHUD)}
          className="w-3 h-3 bg-[#D2B48C]/60 hover:bg-white transition-all cursor-pointer rounded-full pointer-events-auto"
          title="Toggle HUD Interface"
        />
      </div>
    </>
  );
}
