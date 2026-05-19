import React, { useState, useRef } from "react";
import {
  Activity,
  Cpu,
  Database,
  Share2,
  Palette,
  Cloud,
  Dna,
  ChevronDown,
  Search,
} from "lucide-react";
import { Dial } from "./Dial";

function SmartDial(props: any) {
  const { label, min: defaultMin, max: defaultMax, state, setters, searchQuery, tooltip, ...rest } = props;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const match = label?.toLowerCase().includes(q) || tooltip?.toLowerCase().includes(q);
    if (!match) return null;
  }
  const limits = state.dialLimits?.[label];
  const min = limits?.min ?? defaultMin;
  const max = limits?.max ?? defaultMax;
  
  return (
    <Dial 
      label={label}
      min={min}
      max={max}
      tooltip={tooltip}
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
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [isBiomassCollapsed, setIsBiomassCollapsed] = useState(() => window.innerWidth < 640);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const controlsRef = useRef<HTMLDivElement>(null);

  const hasMatch = (labels: string[]) => !searchQuery || labels.some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleScroll = () => {
    if (!controlsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = controlsRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveTab(0);
      return;
    }
    const percent = scrollLeft / maxScroll;
    const newIndex = Math.min(6, Math.max(0, Math.round(percent * 6)));
    setActiveTab(newIndex);
  };

  const scrollToTab = (index: number) => {
    if (!controlsRef.current) return;
    const { scrollWidth, clientWidth } = controlsRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (index / 6) * maxScroll;
    controlsRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setActiveTab(index);
  };

  const totalBiomass =
    stats.strains.reduce((acc: number, s: any) => acc + s.biomass, 0) || 1;

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatMorphFreq = (val: number) => {
    if (val >= 1.0) return "OFF";
    const freq = Math.min(0.99, val);
    const intervalSecs = 3 * Math.pow(600 / 3, freq / 0.99);
    if (intervalSecs < 60) return `${Math.round(intervalSecs)}s`;
    const mins = Math.floor(intervalSecs / 60);
    const secs = Math.round(intervalSecs % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <>
      {cloudPanelOpen && <CloudConfigPanel state={state} setters={setters} />}
      {mutationPanelOpen && <MutationPanel state={state} setters={setters} />}
      {presetPanelOpen && <PresetPanel state={state} setters={setters} stats={stats} setRandomizeKey={setRandomizeKey} handleRestart={handleRestart} />}

      <div
        className={`absolute inset-0 z-10 pointer-events-none flex flex-col p-4 m-4 rounded transition-all duration-500 ${showHUD ? "border-2 border-[#D2B48C]/20" : "border-2 border-transparent"}`}
      >
        <header className="flex justify-between items-start mb-2 sm:mb-6 text-[10px] font-mono pb-2 pointer-events-none z-20 w-full">
          <div className={`flex gap-3 sm:gap-4 transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-auto flex" : "opacity-0 invisible pointer-events-none hidden w-0 overflow-hidden"}`}>
            <div
              className={`flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border border-[#D2B48C]/50 px-2 py-1 rounded bg-[#001220]/60 shadow-sm transition-opacity duration-500 ${showHUD ? "opacity-80" : "opacity-100"}`}
              onClick={handleRestart}
              title="Re-initialize system"
            >
              <Activity className="w-3.5 h-3.5 text-green-400" />
              <span>RESTART_SIM</span>
            </div>
            
            <div className="relative">
              <div
                className={`flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border border-[#D2B48C]/50 px-2 py-1 rounded bg-[#001220]/60 shadow-sm transition-opacity duration-500 ${showHUD ? "opacity-80" : "opacity-100"}`}
                onClick={() => setThemePanelOpen(!themePanelOpen)}
                title="Theme Settings"
              >
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>{["NORMAL", "ALBINO", "COMPLEMENT", "DUOTONE"][state.theme] || "THEME"}</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              
              {themePanelOpen && (
                <div className="absolute top-full left-0 mt-2 bg-[#001220]/90 border border-purple-500/50 p-4 rounded w-56 backdrop-blur-md z-50 pointer-events-auto shadow-lg shadow-purple-900/20">
                  <div className="flex flex-col gap-4 text-[9px]">
                    <div className="flex flex-col gap-1.5 border-b border-purple-500/30 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 0, label: "NORMAL" },
                                { id: 1, label: "ALBINO" },
                                { id: 2, label: "COMPLEMENT" },
                                { id: 3, label: "DUOTONE" }
                            ].map(theme => {
                                const isSelected = state.theme === theme.id;
                                const isPulsing = isSelected && (stats.themeProgress !== undefined && stats.themeProgress < 1.0 && stats.nextTheme === theme.id);
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => setters.setTheme(theme.id)}
                                        className={`p-1 border rounded transition-colors ${
                                            isSelected 
                                                ? (isPulsing ? 'bg-purple-500/50 border-purple-400 text-white animate-pulse' : 'bg-purple-500/50 border-purple-400 text-white')
                                                : 'bg-transparent border-purple-500/30 hover:border-purple-400/80 text-[#D2B48C]/70 hover:text-[#D2B48C]'
                                        }`}
                                    >
                                        {theme.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center gap-2 border-b border-purple-500/20 pb-3">
                        <span className="text-[#D2B48C]">AUTO MORPH</span>
                        <button
                          onClick={() => setters.setThemeMorphFreq(state.themeMorphFreq >= 1.0 ? 0.8 : 1.0)}
                          className={`px-3 py-1 border rounded font-mono font-bold transition-colors ${state.themeMorphFreq < 1.0 ? 'bg-green-500/30 border-green-400 text-green-300' : 'bg-red-500/30 border-red-400 text-red-300'}`}
                        >
                          {state.themeMorphFreq < 1.0 ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div className="flex justify-between gap-2">
                          <SmartDial state={state} setters={setters} tooltip="How often the theme automatically changes. Max value = OFF." label="MORPH_FREQ" min={0} max={1} step={0.01} value={state.themeMorphFreq} onChange={setters.setThemeMorphFreq} color="#a855f7" formatValue={formatMorphFreq} />
                          <SmartDial state={state} setters={setters} tooltip="The duration of the transition between themes in seconds." label="TRANS_SPEED" min={1} max={20} step={0.5} value={state.themeMorphSpeed} onChange={setters.setThemeMorphSpeed} color="#a855f7" formatValue={(v: number) => `${v.toFixed(1)}s`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto opacity-80"
              onClick={handleCopySettings}
              title="Copy all settings to clipboard"
            >
              <Database
                className={`w-3.5 h-3.5 ${copied ? "text-green-500" : "text-blue-400"}`}
              />
              <span>{copied ? "SETTINGS_COPIED!" : "COPY_SETTINGS"}</span>
            </div>
          </div>
          <div className="flex gap-4 text-right justify-end text-[9px] sm:text-[10px] items-center pointer-events-none ml-auto">
            <div className={`flex flex-wrap items-center gap-4 transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-auto flex" : "opacity-0 invisible pointer-events-none hidden w-0 overflow-hidden"}`}>
              <div className="flex items-center gap-2 border border-[#D2B48C]/30 px-3 py-1 rounded bg-[#001220]/60">
                <span className="text-[#D2B48C]">UPTIME:</span>
                <span className="text-white">{formatUptime(uptime)}</span>
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded pointer-events-auto"
                onClick={() => setPresetPanelOpen(!presetPanelOpen)}
                title="Presets"
              >
                <Database className="w-3 h-3 text-[#D2B48C]" />
                <span>PRESETS</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded pointer-events-auto"
                onClick={() => setMutationPanelOpen(!mutationPanelOpen)}
                title="Mutations"
              >
                <Dna className="w-3 h-3 text-[#87CEEB]" />
                <span>MUTATION</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded pointer-events-auto"
                onClick={() => setCloudPanelOpen(!cloudPanelOpen)}
                title="Configure Tide Cloud"
              >
                <Cloud className="w-3 h-3 text-purple-400" />
                <span>CONFIG</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
            <button
              onClick={() => setShowHUD(!showHUD)}
              className={`flex items-center gap-2 bg-[#001220]/60 border border-[#D2B48C]/30 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-500 overflow-hidden shrink-0 ${
                showHUD ? "w-6 h-6 p-0 justify-center hover:bg-white/20" : "px-3 py-1 hover:bg-white/10 pr-3.5"
              }`}
              title={showHUD ? "Hide HUD Interface" : "Show HUD Interface"}
            >
              <div className={`rounded-full transition-all duration-300 ${showHUD ? "w-2.5 h-2.5 bg-[#D2B48C]/60 hover:bg-white" : "w-2 h-2 bg-[#87CEEB]"}`} />
              <span className={`text-[10px] font-mono text-[#D2B48C] tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${showHUD ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
                Interface
              </span>
            </button>
          </div>
        </header>

        <div className={`flex-1 flex flex-col items-start pointer-events-none transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-none" : "opacity-0 invisible pointer-events-none"}`}>
          <div className="border border-[#D2B48C]/30 p-2 sm:p-3 bg-[#001220]/60 backdrop-blur-sm pointer-events-auto shadow-lg w-32 sm:w-40 mt-1">
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

        <footer className={`absolute bottom-0 left-0 right-0 flex flex-col justify-end text-[9px] font-mono transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-none" : "opacity-0 invisible pointer-events-none"}`}>
            {/* Stats Bar */}
            <div className="flex justify-between items-center w-full p-2 px-6 bg-transparent border-none z-20 shrink-0 pointer-events-auto">
              <div className="flex gap-4 sm:gap-6 items-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="opacity-60 text-[8px] uppercase">Active</span>
                  <span>{stats.totalAgents}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="opacity-60 text-[8px] uppercase">Vectors</span>
                  <span>{stats.geometryCount.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right flex flex-col gap-1 items-end w-[100px] sm:w-[150px]">
                <div className="flex justify-between w-full text-[9px] opacity-60 uppercase">
                  <span>Tide</span>
                  <span>{(stats.tideValue * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 border border-[#D2B48C]/20 overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-red-600 transition-all duration-75" style={{ width: `${stats.tideValue * 100}%` }} />
                </div>
              </div>
            </div>

          <div className={`w-full flex flex-col bg-[#001220]/95 sm:bg-[#001220]/60 backdrop-blur-md border-t border-[#D2B48C]/30 transition-all duration-500 origin-bottom`}>
            
            {/* Mobile Chevron Header */}
            <div 
              className="flex justify-center w-full py-2 cursor-pointer hover:bg-white/5 border-b border-[#D2B48C]/20 sm:hidden pointer-events-auto"
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            >
              <ChevronDown className={`w-5 h-5 text-[#D2B48C] transition-transform duration-300 ${isControlsExpanded ? "" : "rotate-180"}`} />
            </div>

            {/* Controls Area */}
            <div className={`w-full transition-all duration-500 ${isControlsExpanded ? "max-h-[60vh] sm:max-h-[50vh]" : "max-h-0 sm:max-h-[50vh]"} overflow-hidden`}>
              <div 
                ref={controlsRef}
                onScroll={handleScroll}
                className="flex sm:grid sm:grid-flow-col sm:grid-rows-2 overflow-x-auto gap-3 p-4 pb-3 no-scrollbar snap-x scroll-smooth pointer-events-auto"
              >
                
                {/* SYSTEM */}
                {hasMatch(['SLOW_MO', 'ROT_VEL', 'MAX_DOMS', 'MAX_AGENTS', 'MIN_AGENTS', 'MAX_SPECIES', 'RADIUS', 'TIME SCALE', 'ROTATION', 'MEMORY', 'ORGANISMS', 'SPECIES', 'BOUNDARY']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">SYSTEM</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TIME SCALE
Controls the simulation speed.
High: Fast motion.
Low: Slow motion." label="SLOW_MO" min={0.1} max={5.0} step={0.1} value={state.timeScale} onChange={setters.setTimeScale} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="ROTATION VELOCITY
Controls the base camera rotation speed.
High: Fast spinning view.
Low: Slow or stationary view." label="ROT_VEL" min={0.01} max={5.0} step={0.01} value={state.rotationSpeed} onChange={setters.setRotationSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MAX MEMORY POINTS
Limits total rendering complexity.
High: Richer visuals, lower performance.
Low: Simpler visuals, faster performance." label="MAX_DOMS" min={50000} max={450000} step={1000} value={state.maxDOMs} onChange={setters.setMaxDOMs} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MAX ORGANISMS
Upper limit for population.
High: Crowded ecosystem.
Low: Sparse ecosystem." label="MAX_AGENTS" min={1} max={200} step={1} value={state.maxAgents} onChange={setters.setMaxAgents} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MIN ORGANISMS
Lower limit for population.
High: Ecosystem never dies out.
Low: Ecosystem can become almost empty." label="MIN_AGENTS" min={2} max={20} step={1} value={state.minAgents} onChange={setters.setMinAgents} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MAX SPECIES
Maximum active genetic strains.
High: High biodiversity.
Low: Monoculture." label="MAX_SPECIES" min={1} max={20} step={1} value={state.maxSpecies} onChange={setters.setMaxSpecies} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BOUNDARY RADIUS
Size of the simulation area.
High: Vast open space.
Low: Confined, dense space." label="RADIUS" min={50} max={1000} step={10} value={state.boundarySize} onChange={setters.setBoundarySize} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* ECOLOGY */}
                {hasMatch(['MAGNET', 'PROXIM', 'DESPAIR', 'DESP_AGE', 'ENTROPY', 'ECO_FADE', 'CULL_RATE', 'SWARM', 'COHESION', 'DETECTION', 'RANGE', 'DESPERATION', 'AGE', 'POPULATION', 'LIMIT', 'FADE', 'CULL']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">ECOLOGY</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SWARM COHESION
How strongly organisms attract each other.
High: Tight, dense swarms.
Low: Independent, scattered movement." label="MAGNET" min={0} max={0.1} step={0.002} value={state.magnetism} onChange={setters.setMagnetism} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="DETECTION RANGE
How far organisms can sense others.
High: Long-range interactions.
Low: Myopic, local interactions only." label="PROXIM" min={1} max={2000.0} step={10.0} value={state.proximity} onChange={setters.setProximity} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="DESPERATION
Erratic movement when seeking food/mates.
High: Frantic, fast searching.
Low: Calm, methodical movement." label="DESPAIR" min={1} max={10.0} step={0.1} value={state.desperation} onChange={setters.setDesperation} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="DESPAIR AGE
Age at which desperation begins.
High: Only elders become desperate.
Low: Youthful desperation." label="DESP_AGE" min={100} max={5000} step={100} value={state.despairAge} onChange={setters.setDespairAge} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SELF HYBRIDIZATION (ENTROPY)
Biomass threshold for spontaneous self-mutation.
High: Dominant species remain purebred longer.
Low: Frequent spontaneous self-hybridization." label="ENTROPY" min={0.0} max={1.0} step={0.05} value={state.entropyThreshold} onChange={setters.setEntropyThreshold} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="ECO FADE
Rate at which environment marks disappear.
High: Trails fade quickly.
Low: Long-lasting environmental impact." label="ECO_FADE" min={0.0} max={1.0} step={0.01} value={state.ecoFade} onChange={setters.setEcoFade} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="CULL RATE
Speed of population control.
High: Rapid culling of excess organisms.
Low: Slow, gradual culling." label="CULL_RATE" min={0.0} max={50.0} step={0.01} value={state.cullRate} onChange={setters.setCullRate} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* LIFECYCLE */}
                {hasMatch(['GROW_SPD', 'DEATH RATE', 'DIE_BIAS', 'TERM_PROB', 'FADE_SPEED', 'FEELER_FADE', 'EXTRUSION', 'SPEED', 'DECAY', 'VELOCITY', 'AGE', 'BIAS', 'TERMINATION', 'FEELER']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">LIFECYCLE</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="EXTRUSION SPEED
Growth rate of organisms.
High: Fast, explosive growth.
Low: Slow, deliberate growth." label="GROW_SPD" min={0.1} max={5.0} step={0.1} value={state.growthSpeed} onChange={setters.setGrowthSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="DECAY VELOCITY
Speed of organism deterioration.
High: Rapid decay and death.
Low: Slow, lingering decline." label="DEATH RATE" min={0.0} max={100.0} step={0.01} value={state.diebackRate} onChange={setters.setDiebackRate} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="AGE BIAS
Impact of age on death rate.
High: Old age is strictly fatal.
Low: Age matters less for survival." label="DIE_BIAS" min={0.5} max={5.0} step={0.1} value={state.diebackAgeBias} onChange={setters.setDiebackAgeBias} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TERMINATION
Base chance of death for old creatures." label="TERM_PROB" min={0.0} max={1.0} step={0.0001} value={state.terminationProb} onChange={setters.setTerminationProb} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FADE SPEED
How fast dead organisms vanish.
High: Corpses disappear quickly.
Low: Ghostly remains linger." label="FADE_SPEED" min={0.1} max={15.0} step={0.1} value={state.desiccationSpeed} onChange={setters.setDesiccationSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FEELER FADE
Decay rate of sensory appendages.
High: Feelers are short-lived.
Low: Long, persistent feelers." label="FEELER_FADE" min={1.0} max={50.0} step={1.0} value={state.feelerFade} onChange={setters.setFeelerFade} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* REPRODUCTION */}
                {hasMatch(['HYBRID_COOL', 'HYBRID_SIZE', 'HYBRID_DECAY', 'BREED', 'COOLDOWN', 'SIZE', 'DECAY', 'REPRODUCTION']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">REPRODUCTION</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="HYBRID BREED COOL
Delay between breeding attempts.
High: Infrequent, rare breeding.
Low: Rapid, continuous breeding." label="HYBRID_COOL" min={10} max={2000} step={10} value={state.hybridCooldown} onChange={setters.setHybridCooldown} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="HYBRID SIZE
Starting size of new offspring.
High: Massive newborns.
Low: Tiny, fragile newborns." label="HYBRID_SIZE" min={0.5} max={10.0} step={0.1} value={state.hybridSize} onChange={setters.setHybridSize} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="HYBRID DECAY
Duration that hybridization artifacts persist before fading.
High: Artifacts linger for a long time.
Low: Artifacts fade away quickly." label="HYBRID_DECAY" min={0.01} max={1.0} step={0.01} value={state.hybridStickiness} onChange={setters.setHybridStickiness} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* BRANCHING */}
                {hasMatch(['BRANCH_VAR', 'BRANCHING', 'TERM_BRANCH', 'B_MUTATE', 'BRANCH_BIG', 'LRG_BRANCH', 'VARIANCE', 'RATE', 'PENALTY', 'MUTATION', 'PROB']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">BRANCHING</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH VARIANCE
Randomness in branching patterns.
High: Wild, chaotic branching.
Low: Uniform, predictable branching." label="BRANCH_VAR" min={1} max={50.0} step={1.0} value={state.branchTendencyVar} onChange={setters.setBranchTendencyVar} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH RATE
Overall frequency of branching.
High: Dense, bushy structures.
Low: Linear, simple structures." label="BRANCHING" min={0.1} max={500.0} step={0.1} value={state.branchingMultiplier} onChange={setters.setBranchingMultiplier} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH TERM PENALTY
Death risk after creating a branch.
High: Branching is often fatal.
Low: Safe, frequent branching." label="TERM_BRANCH" min={0.5} max={10.0} step={0.5} value={state.termProbPostBranch} onChange={setters.setTermProbPostBranch} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH MUTATION
Chance of mutation upon branching.
High: Rapid evolution on new branches.
Low: Stable genetic clones." label="B_MUTATE" min={0.0} max={1.0} step={0.01} value={state.branchMutationRate} onChange={setters.setBranchMutationRate} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH BIGGER
Chance for branches to be thicker.
High: Thick, heavy secondary branches.
Low: Thin, wispy branches." label="BRANCH_BIG" min={0} max={1.0} step={0.05} value={state.branchBigger} onChange={setters.setBranchBigger} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LARGE BRANCH PROB
Frequency of major structural forks.
High: Frequent major splits.
Low: Mostly minor side-branches." label="LRG_BRANCH" min={0.0} max={1.0} step={0.05} value={state.branchSplitSizeProb} onChange={setters.setBranchSplitSizeProb} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* SPEEDS */}
                {hasMatch(['SNAKE', 'S_STEP', 'S_WAND', 'BUSH', 'TREE', 'GINGER', 'SPEED', 'STEP', 'WANDER']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">SPEEDS</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SNAKE SPEED
Movement speed for snake-types.
High: Fast, darting snakes.
Low: Sluggish snakes." label="SNAKE" min={0.1} max={10.0} step={0.1} value={state.snakeSpeed} onChange={setters.setSnakeSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SNAKE STEP
Step size for snake-types.
High: Snakes cover more ground per tick.
Low: Snakes take smaller steps." label="S_STEP" min={0.1} max={5.0} step={0.1} value={state.snakeStepSize} onChange={setters.setSnakeStepSize} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SNAKE WANDER
Wander intensity for snake-types.
High: Snakes turn frantically.
Low: Snakes move in straight lines." label="S_WAND" min={0.1} max={10.0} step={0.1} value={state.snakeWander} onChange={setters.setSnakeWander} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BUSH SPEED
Growth speed for bush-types.
High: Rapidly expanding bushes.
Low: Slowly growing bushes." label="BUSH" min={0.1} max={10.0} step={0.1} value={state.bushSpeed} onChange={setters.setBushSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TREE SPEED
Growth speed for tree-types.
High: Fast-sprouting trees.
Low: Slow, ancient trees." label="TREE" min={0.1} max={10.0} step={0.1} value={state.treeSpeed} onChange={setters.setTreeSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="GINGER SPEED
Movement speed for ginger-types.
High: Quick, erratic gingers.
Low: Slow, drifting gingers." label="GINGER" min={0.1} max={10.0} step={0.1} value={state.gingerSpeed} onChange={setters.setGingerSpeed} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* MORPHOLOGY */}
                {hasMatch(['APPENDAGE SIZE', 'TAPER_TIME', 'MAX_WIDTH', 'MULTI_COLOR', 'SAME_COLOR', 'PULSE_SPD', 'SATURATION', 'APPENDAGE', 'SIZE', 'TAPER', 'WIDTH', 'COLOR', 'PULSE']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">MORPHOLOGY</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="APPENDAGE SIZE
Scale of structural appendages.
High: Massive, prominent appendages.
Low: Tiny, subtle appendages." label="APPENDAGE SIZE" min={0.05} max={1.0} step={0.01} value={state.flowerSize} onChange={setters.setFlowerSize} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TAPER DUR
Duration of line thickness tapering.
High: Long, smooth tapers.
Low: Abrupt, sharp tapers." label="TAPER_TIME" min={0.5} max={3.0} step={0.1} value={state.taperDuration} onChange={setters.setTaperDuration} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MAX WIDTH
Maximum thickness of organisms.
High: Thick, bulky lines.
Low: Thin, delicate lines." label="MAX_WIDTH" min={1.0} max={20.0} step={0.5} value={state.maxLineWidth} onChange={setters.setMaxLineWidth} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MULTI COLOR APP PROB
Chance of colorful appendages.
High: Rainbow, multi-colored parts.
Low: Monochromatic parts." label="MULTI_COLOR" min={0} max={1.0} step={0.05} value={state.multicolorAppProb} onChange={setters.setMulticolorAppProb} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SAME COLOR APP PROB
Chance appendages match body color.
High: Uniformly colored organisms.
Low: Contrasting appendage colors." label="SAME_COLOR" min={0.0} max={1.0} step={0.05} value={state.sameColorAppProb} onChange={setters.setSameColorAppProb} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="PULSE SPEED
Speed of luminescent pulses.
High: Rapid, strobing pulses.
Low: Slow, gentle throbbing." label="PULSE_SPD" min={0.1} max={1.0} step={0.1} value={state.globalPulseSpeed} onChange={setters.setGlobalPulseSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SATURATION
Overall color intensity limit.
High: Vibrant, neon colors.
Low: Muted, pastel colors." label="SATURATION" min={0.0} max={1.0} step={0.05} value={state.maxSaturation} onChange={setters.setMaxSaturation} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="GLOW INTENSITY
Intrinsic brightness of glowing organisms." label="GLOW_INTENSITY" min={0.1} max={10.0} step={0.1} value={state.glowTraitIntensity} onChange={setters.setGlowTraitIntensity} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="GLOW DISTANCE
Max spill range of reflected light onto neighboring creatures." label="GLOW_DIST" min={5.0} max={200.0} step={5.0} value={state.glowTraitDistance} onChange={setters.setGlowTraitDistance} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="GLOW REFLECT
Multiplier for how intensely nearby creatures reflect ambient glow." label="GLOW_REFLECT" min={0.0} max={5.0} step={0.1} value={state.glowTraitReflect} onChange={setters.setGlowTraitReflect} color="#87CEEB" />
                  </div>
                </div>
                )}

              </div>
              <div className="flex justify-between items-center gap-4 px-6 pb-3 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/40 border border-[#D2B48C]/30 px-3 py-1 rounded w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#87CEEB]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search controls..."
                    className="bg-transparent text-[10px] text-white focus:outline-none w-full placeholder:text-[#D2B48C]/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-[#D2B48C]/60 hover:text-white text-[10px]">✕</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {["SYSTEM", "ECOLOGY", "LIFECYCLE", "REPRODUCTION", "BRANCHING", "SPEEDS", "MORPHOLOGY"].map((name, idx) => (
                    <button
                      key={name}
                      onClick={() => scrollToTab(idx)}
                      title={name}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeTab === idx ? "w-6 bg-[#87CEEB]" : "w-2 bg-[#D2B48C]/40 hover:bg-[#D2B48C]/80"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
