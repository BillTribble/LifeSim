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
  Leaf,
  Dices,
  Tv,
  RotateCcw,
  Layers,
} from "lucide-react";
import { SmartDial } from "./SmartDial";
import { PresetPanel } from "./PresetPanel";
import { CloudConfigPanel } from "./CloudConfigPanel";
import { MutationPanel } from "./MutationPanel";
import { LeafConfigPanel } from "./LeafConfigPanel";
import { triggerRandomize } from "../utils/randomize";

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
  const [leafPanelOpen, setLeafPanelOpen] = useState(false);
  const [landscapePanelOpen, setLandscapePanelOpen] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [isBiomassCollapsed, setIsBiomassCollapsed] = useState(() => window.innerWidth < 640);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const controlsRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (showHUD) {
      setIsControlsExpanded(true);
    }
  }, [showHUD]);

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
      {presetPanelOpen && <PresetPanel state={state} setters={setters} stats={stats} setRandomizeKey={setRandomizeKey} handleRestart={handleRestart} onClose={() => setPresetPanelOpen(false)} />}
      {leafPanelOpen && <LeafConfigPanel state={state} setters={setters} />}

      <div
        className={`absolute inset-0 z-40 pointer-events-none flex flex-col p-2 sm:p-4 m-1 sm:m-4 rounded transition-all duration-500 ${showHUD ? "border-2 border-[#D2B48C]/20" : "border-2 border-transparent"}`}
      >
        <header className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 mb-2 sm:mb-6 text-[10px] font-mono pb-2 pointer-events-none z-20 w-full">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pointer-events-none">
            {/* Top-Left Persistent Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-90 hover:opacity-100 border border-cyan-500/50 px-2 py-0.5 sm:py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
                onClick={handleRestart}
                title="Restart ecosystem"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold">Restart</span>
              </div>

              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-90 hover:opacity-100 border border-purple-500/50 px-2 py-0.5 sm:py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
                onClick={() => triggerRandomize(setters, state, setRandomizeKey, handleRestart)}
                title="Randomize all simulation settings and theme"
              >
                <Dices className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold">RANDOM</span>
              </div>
            </div>

            <div className={`flex flex-wrap items-center gap-2 sm:gap-3 transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-auto flex" : "opacity-0 invisible pointer-events-none hidden w-0 overflow-hidden"}`}>
              <div className="relative shrink-0">
                <div
                  className={`flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border border-[#D2B48C]/50 px-2 py-1 rounded bg-[#001220]/60 shadow-sm transition-opacity duration-500 ${showHUD ? "opacity-80" : "opacity-100"}`}
                  onClick={() => {
                    setThemePanelOpen(!themePanelOpen);
                    setCloudPanelOpen(false);
                    setMutationPanelOpen(false);
                    setPresetPanelOpen(false);
                    setLeafPanelOpen(false);
                    setIsControlsExpanded(false);
                  }}
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
                className="flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto opacity-80 shrink-0"
                onClick={handleCopySettings}
                title="Copy all settings to clipboard"
              >
                <Database
                  className={`w-3.5 h-3.5 ${copied ? "text-green-500" : "text-blue-400"}`}
                />
                <span>{copied ? "SETTINGS_COPIED" : "COPY_SETTINGS"}</span>
              </div>

              <div
                className={`flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-80 border px-2 py-0.5 rounded transition-colors shrink-0 ${
                  state.kioskMode
                    ? "bg-purple-500/20 border-purple-400 text-purple-300"
                    : "bg-[#001220]/60 border-[#D2B48C]/30 text-[#D2B48C]/60 hover:text-[#D2B48C]"
                }`}
                onClick={() => setters.setKioskMode && setters.setKioskMode(!state.kioskMode)}
                title="KIOSK MODE — Periodically fades out and randomizes the ecosystem"
              >
                <Tv className={`w-3.5 h-3.5 ${state.kioskMode ? "text-purple-300" : "text-[#D2B48C]/60"}`} />
                <span>KIOSK: {state.kioskMode ? "ON" : "OFF"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
              <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 border border-[#D2B48C]/50 px-1.5 sm:px-2 py-0.5 rounded bg-[#001220]/70 backdrop-blur-md shadow-sm opacity-90 hover:opacity-100 transition-opacity shrink-0"
                title="TIME SCALE — Controls simulation speed. Drag knob vertically to adjust."
              >
                <span className="text-[9px] sm:text-[10px] font-mono text-[#D2B48C]">SLOW_MO</span>
                <div className="scale-[0.65] origin-center -my-2 -mx-1 shrink-0">
                  <SmartDial state={state} setters={setters} tooltip={"TIME SCALE\nControls the simulation speed.\nHigh: Fast motion.\nLow: Slow motion."} label="" min={0.1} max={100.0} step={0.1} value={state.timeScale} onChange={setters.setTimeScale} color="#87CEEB" hideValue={true} />
                </div>
                <span className="text-[9px] font-mono shrink-0" style={{ color: '#87CEEB' }}>{state.timeScale.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 text-right justify-end text-[9px] sm:text-[10px] items-center pointer-events-none ml-auto shrink-0">
            <div className={`flex flex-wrap items-center gap-2 sm:gap-4 transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-auto flex" : "opacity-0 invisible pointer-events-none hidden w-0 overflow-hidden"}`}>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded pointer-events-auto"
                onClick={() => {
                  setPresetPanelOpen(!presetPanelOpen);
                  setMutationPanelOpen(false);
                  setCloudPanelOpen(false);
                  setLeafPanelOpen(false);
                  setThemePanelOpen(false);
                  setIsControlsExpanded(false);
                }}
                title="Presets"
              >
                <Database className="w-3 h-3 text-[#D2B48C]" />
                <span>PRESETS</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>


            <button
              onClick={() => {
                const nextHUD = !showHUD;
                setShowHUD(nextHUD);
                if (nextHUD) {
                  setIsControlsExpanded(true);
                }
              }}
              className="flex items-center gap-2 bg-[#001220]/80 border border-[#D2B48C]/50 px-3 py-1 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-200 hover:bg-white/20 shrink-0 shadow-md select-none"
              title="HUD Interface"
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${showHUD ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-[#87CEEB]"}`} />
              <span className="text-[10px] font-mono text-[#D2B48C] tracking-wider uppercase whitespace-nowrap">
                INTERFACE
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
                  const filteredStrains = stats.strains.filter((s: any) => !s.name.startsWith("Feeler-"));
                  const archetypeTotals: Record<string, number> = {};
                  filteredStrains.forEach((s: any) => {
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
                {stats.strains.filter((s: any) => !s.name.startsWith("Feeler-")).map((strain: any, i: number) => {
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
                
                <div
                  className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded bg-[#001220]/60 pointer-events-auto ml-2"
                  onClick={() => {
                    setIsControlsExpanded(!isControlsExpanded);
                    setPresetPanelOpen(false);
                    setMutationPanelOpen(false);
                    setCloudPanelOpen(false);
                    setLeafPanelOpen(false);
                    setThemePanelOpen(false);
                  }}
                  title="Toggle System Dials"
                >
                  <Cpu className="w-3 h-3 text-[#87CEEB]" />
                  <span>DIALS</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isControlsExpanded ? "" : "rotate-180"}`} />
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
            <div className={`w-full transition-all duration-500 ${isControlsExpanded ? "max-h-[60vh] sm:max-h-[50vh]" : "max-h-0"} overflow-hidden`}>
              <div 
                ref={controlsRef}
                onScroll={handleScroll}
                className="flex sm:grid sm:grid-flow-col sm:grid-rows-2 overflow-x-auto gap-3 p-4 pb-3 no-scrollbar snap-x scroll-smooth pointer-events-auto"
              >
                
                {/* SYSTEM */}
                {hasMatch(['ROT_VEL', 'MAX_DOMS', 'MAX_AGENTS', 'MIN_AGENTS', 'MAX_SPECIES', 'RADIUS', 'ROTATION', 'MEMORY', 'ORGANISMS', 'SPECIES', 'BOUNDARY']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">SYSTEM</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">

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

                {/* LANDSCAPE */}
                {hasMatch(['LAYER_GAP', 'FLOOR_HEIGHT', 'CEILING_HEIGHT', 'LANDSCAPE', 'LAYER', 'HEIGHT', 'GAP', 'FLOOR', 'CEILING']) && (
                <div className="flex flex-col gap-2 border border-[#87CEEB]/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#87CEEB] tracking-widest text-center border-b border-[#87CEEB]/20 pb-1 font-bold">LANDSCAPE</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LAYER GAP
Relative vertical distance/gap between floor and ceiling landscape layers." label="LAYER_GAP" min={10} max={300} step={1} value={state.layerGap} onChange={setters.setLayerGap} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FLOOR HEIGHT
Individual vertical offset for the bottom floor landscape layer." label="FLOOR_HEIGHT" min={-150} max={150} step={1} value={state.floorHeight} onChange={setters.setFloorHeight} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="CEILING HEIGHT
Individual vertical offset for the top ceiling landscape layer." label="CEILING_HEIGHT" min={-150} max={150} step={1} value={state.ceilingHeight} onChange={setters.setCeilingHeight} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="CAMERA PROJECTION
Slide between flat orthographic (0 = no perspective) and full 3D perspective (1.0)." label="PROJECTION" min={0.0} max={1.0} step={0.01} value={state.cameraProjection ?? 1.0} onChange={setters.setCameraProjection} color="#87CEEB" />
                    <button
                      onClick={() => setters.setShowBoundaryBox(!state.showBoundaryBox)}
                      className={`px-2 py-1 rounded text-[8px] font-mono tracking-wider border transition-all ${
                        state.showBoundaryBox
                          ? 'border-[#87CEEB] bg-[#87CEEB]/20 text-[#87CEEB]'
                          : 'border-white/20 bg-black/40 text-white/50 hover:bg-white/10'
                      }`}
                      title="Toggle 3D Bounding Box Wireframe Edges"
                    >
                      BOUNDS: {state.showBoundaryBox ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
                )}

                {/* LEAVES & BOTANY */}
                {hasMatch(['LEAF_SCALE', 'LEAF_DENSITY', 'LEAF_SIZE_DIFF', 'LEAF_SPD', 'LEAF_ANGLE', 'LEAF_PROB', 'WIND_VEL', 'FLUTTER', 'LEAF', 'LEAVES', 'BOTANY']) && (
                <div className="flex flex-col gap-2 border border-green-500/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-green-400 tracking-widest text-center border-b border-green-500/20 pb-1 font-bold">LEAVES & BOTANY</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LEAF SCALE
Size of foliage leaves." label="LEAF_SCALE" min={0.05} max={10.0} step={0.05} value={state.leafScale} onChange={setters.setLeafScale} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LEAF DENSITY
Density of foliage coverage along stems." label="LEAF_DENSITY" min={0.1} max={1.0} step={0.05} value={state.leafDensity} onChange={setters.setLeafDensity} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LEAF SIZE DIFF
Variability in individual leaf sizes." label="LEAF_SIZE_DIFF" min={0.0} max={0.5} step={0.05} value={state.relativeLeafSizeDiff} onChange={setters.setRelativeLeafSizeDiff} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LEAF GROWTH SPEED
Rate at which new leaves unfurl." label="LEAF_SPD" min={0.005} max={0.05} step={0.005} value={state.leafGrowthSpeed} onChange={setters.setLeafGrowthSpeed} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="PHYLLOTAXIS ANGLE
Divergence angle between consecutive leaves." label="LEAF_ANGLE" min={90} max={180} step={1} value={state.phyllotaxisAngle} onChange={setters.setPhyllotaxisAngle} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LEAF PROBABILITY
Chance of spawning leaves on eligible nodes." label="LEAF_PROB" min={0.1} max={1.0} step={0.05} value={state.leafProbability} onChange={setters.setLeafProbability} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="WIND VELOCITY
Sway velocity imparted by wind on foliage." label="WIND_VEL" min={0.0} max={5.0} step={0.1} value={state.windVelocity} onChange={setters.setWindVelocity} color="#4ade80" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FLUTTER INTENSITY
Rapid fluttering motion of individual leaves." label="FLUTTER" min={0.0} max={2.0} step={0.1} value={state.flutterIntensity} onChange={setters.setFlutterIntensity} color="#4ade80" />
                  </div>
                </div>
                )}

                {/* CONFIG & TIDE */}
                {hasMatch(['TIDE_SPEED', 'TIDE_THICK', 'TIDE_OPACITY', 'TIDE_SAT', 'FOG_VIS', 'TIDE', 'CLOUD', 'CONFIG', 'FOG']) && (
                <div className="flex flex-col gap-2 border border-purple-500/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-purple-400 tracking-widest text-center border-b border-purple-500/20 pb-1 font-bold">CONFIG & TIDE</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TIDE SPEED
Speed of tide cloud pulses." label="TIDE_SPEED" min={0.1} max={10.0} step={0.1} value={state.tideSpeed} onChange={setters.setTideSpeed} color="#c084fc" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TIDE THICKNESS
Vertical thickness of tide cloud layer." label="TIDE_THICK" min={20} max={500} step={10} value={state.tideThickness} onChange={setters.setTideThickness} color="#c084fc" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TIDE OPACITY
Transparency of tide cloud layer." label="TIDE_OPACITY" min={0.0} max={1.0} step={0.05} value={state.tideOpacity} onChange={setters.setTideOpacity} color="#c084fc" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TIDE SATURATION
Color saturation of tide cloud layer." label="TIDE_SAT" min={0.0} max={1.0} step={0.05} value={state.tideSaturation} onChange={setters.setTideSaturation} color="#c084fc" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FOG VISIBILITY
Distance of atmospheric fog fade." label="FOG_VIS" min={100} max={2000} step={50} value={state.fogVisibility} onChange={setters.setFogVisibility} color="#c084fc" />
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
Low: Slow, deliberate growth." label="GROW_SPD" min={0.01} max={5.0} step={0.01} value={state.growthSpeed} onChange={setters.setGrowthSpeed} color="#87CEEB" />
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
Low: Ghostly remains linger." label="FADE_SPEED" min={0.1} max={100.0} step={0.5} value={state.desiccationSpeed} onChange={setters.setDesiccationSpeed} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FEELER FADE
Decay rate of sensory appendages.
High: Feelers are short-lived.
Low: Long, persistent feelers." label="FEELER_FADE" min={1.0} max={50.0} step={1.0} value={state.feelerFade} onChange={setters.setFeelerFade} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* REPRODUCTION */}
                {hasMatch(['HYBRID_COOL', 'HYBRID_SIZE', 'HYBRID_DECAY', 'HYBRID_SPIN', 'BREED', 'COOLDOWN', 'SIZE', 'DECAY', 'SPIN', 'REPRODUCTION']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">REPRODUCTION</span>
                  <div className="flex gap-1 flex-wrap justify-center items-center max-w-[280px] sm:max-w-none">
                    <button
                      onClick={() => setters.setAllowBreeding(!state.allowBreeding)}
                      className={`px-2 py-1 rounded text-[8px] font-mono tracking-wider border transition-all ${
                        state.allowBreeding
                          ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                          : 'border-red-500/50 bg-red-950/40 text-red-400 opacity-80 hover:bg-red-900/50'
                      }`}
                      title="Toggle whether organisms can breed and produce offspring"
                    >
                      BREEDING: {state.allowBreeding ? 'ON' : 'OFF'}
                    </button>
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
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="HYBRID SPIN
Rotation speed of hybridization artifact polygons.
High: Spinning rapidly.
Low: Extremely slow rotation." label="HYBRID_SPIN" min={0.0} max={2.0} step={0.05} value={state.hybridSpinSpeed} onChange={setters.setHybridSpinSpeed} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* BRANCHING */}
                {hasMatch(['BRANCH_VAR', 'BRANCHING', 'BRANCH_SPD', 'BUSH', 'TREE', 'SNAKE', 'RHIZOME', 'BUSH_BR', 'TREE_BR', 'SNAK_BR', 'RHIZ_BR', 'ARCHETYPE', 'TERM_BRANCH', 'B_MUTATE', 'BRANCH_BIG', 'LRG_BRANCH', 'VARIANCE', 'RATE', 'PENALTY', 'MUTATION', 'PROB']) && (
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
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH SPEED BOOST
Multiplies growth speed for creatures doing lots of branching.
High: Heavily branching bushes explode in rapid growth.
Low: Branching does not speed up growth." label="BRANCH_SPD" min={0.0} max={3.0} step={0.1} value={state.branchGrowthBoost} onChange={setters.setBranchGrowthBoost} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH TERM PENALTY
Death risk after creating a branch.
High: Branching is often fatal.
Low: Safe, frequent branching." label="TERM_BRANCH" min={0.5} max={10.0} step={0.5} value={state.termProbPostBranch} onChange={setters.setTermProbPostBranch} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BRANCH BIGGER
Chance for branches to be thicker.
High: Thick, heavy secondary branches.
Low: Thin, wispy branches." label="BRANCH_BIG" min={0} max={1.0} step={0.05} value={state.branchBigger} onChange={setters.setBranchBigger} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="BUSH BRANCHING
Branching multiplier for bush-types.
High: Extremely dense bush branching.
Low: Sparse bush branches." label="BUSH_BR" min={0.1} max={50.0} step={0.5} value={state.bushBranching} onChange={setters.setBushBranching} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TREE BRANCHING
Branching multiplier for tree-types.
High: Explosive tree canopy.
Low: Single trunk trees." label="TREE_BR" min={0.1} max={50.0} step={0.5} value={state.treeBranching} onChange={setters.setTreeBranching} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="SNAKE BRANCHING
Branching multiplier for snake-types.
High: Branching snakes.
Low: Pure single snakes." label="SNAK_BR" min={0.1} max={50.0} step={0.5} value={state.snakeBranching} onChange={setters.setSnakeBranching} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="RHIZOME BRANCHING
Branching multiplier for rhizome-types.
High: Intense, tangled rhizome network.
Low: Minimal rhizome splits." label="RHIZ_BR" min={0.1} max={50.0} step={0.5} value={state.rhizomeBranching} onChange={setters.setRhizomeBranching} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* SPEEDS */}
                {hasMatch(['SNAKE', 'S_STEP', 'S_WAND', 'BUSH', 'TREE', 'RHIZOME', 'SPEED', 'STEP', 'WANDER']) && (
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
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="RHIZOME SPEED
Movement speed for rhizome-types.
High: Quick, erratic rhizomes.
Low: Slow, drifting rhizomes." label="RHIZOME" min={0.1} max={10.0} step={0.1} value={state.rhizomeSpeed} onChange={setters.setRhizomeSpeed} color="#87CEEB" />
                  </div>
                </div>
                )}

                {/* MORPHOLOGY */}
                {hasMatch(['APPENDAGE SIZE', 'TAPER_TIME', 'MAX_WIDTH', 'WIDTH_VAR', 'MULTI_COLOR', 'SAME_COLOR', 'PULSE_SPD', 'SATURATION', 'APPENDAGE', 'SIZE', 'TAPER', 'WIDTH', 'COLOR', 'PULSE']) && (
                <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
                  <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">MORPHOLOGY</span>
                  <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="APPENDAGE SIZE
Scale of structural appendages.
High: Massive, prominent appendages.
Low: Tiny, subtle appendages." label="APPENDAGE SIZE" min={0.1} max={3.0} step={0.1} value={state.flowerSize} onChange={setters.setFlowerSize} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="TAPER DUR
Duration of line thickness tapering.
High: Long, smooth tapers.
Low: Abrupt, sharp tapers." label="TAPER_TIME" min={0.5} max={3.0} step={0.1} value={state.taperDuration} onChange={setters.setTaperDuration} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="MAX WIDTH
Maximum thickness of organisms.
High: Thick, bulky lines.
Low: Thin, delicate lines." label="MAX_WIDTH" min={1.0} max={20.0} step={0.5} value={state.maxLineWidth} onChange={setters.setMaxLineWidth} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="WIDTH VARIANCE
Variance in creature width. Wider creatures branch more and rotate more.
High: Extreme thickness differences, lush rhododendron-like bushes.
Low: Uniform thin creatures." label="WIDTH_VAR" min={0.0} max={2.0} step={0.1} value={state.widthVariance} onChange={setters.setWidthVariance} color="#87CEEB" />
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
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="COLOR CLAMPING (0-100%)
Limits max saturation & lightness clamping of organism colors.
High (100%): Unconstrained vivid colors.
Low (0%): Heavily clamped, muted tones." label="COLOR_CLAMP" min={0.0} max={1.0} step={0.01} value={state.colorClamp} onChange={setters.setColorClamp} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="LAYER GAP
Relative vertical distance/gap to landscape layers with creature space in middle." label="LAYER_GAP" min={10} max={300} step={1} value={state.layerGap} onChange={setters.setLayerGap} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="FLOOR HEIGHT
Individual height control for the bottom floor landscape layer." label="FLOOR_HEIGHT" min={-200} max={40} step={1} value={state.floorHeight} onChange={setters.setFloorHeight} color="#87CEEB" />
                    <SmartDial searchQuery={searchQuery} state={state} setters={setters} tooltip="CEILING HEIGHT
Individual height control for the top ceiling landscape layer." label="CEILING_HEIGHT" min={45} max={300} step={1} value={state.ceilingHeight} onChange={setters.setCeilingHeight} color="#87CEEB" />
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
