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
import {
  SystemSection,
  LandscapeSection,
  BotanySection,
  ConfigTideSection,
  EcologySection,
  LifecycleSection,
  ReproductionSection,
  BranchingSection,
  SpeedsSection,
  MorphologySection,
} from "./HUDSections";

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
  sessionCode?: string;
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
  sessionCode,
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showHUD) {
      setIsControlsExpanded(true);
    }
  }, [showHUD]);

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
                      <div className="flex flex-col gap-1.5 border-b border-purple-500/30 pb-3">
                        <span className="text-[#D2B48C] font-bold text-[8px] tracking-wider">START MODE (BETA HUE)</span>
                        <div className="grid grid-cols-2 gap-1.5 font-mono text-[8px]">
                          {[
                            { id: "complementary", label: "COMPLEMENT", desc: "Opposite 180°" },
                            { id: "analogous", label: "ANALOGOUS", desc: "Adjacent ±30°" },
                          ].map((mode) => {
                            const isSelected = (state.startColorMode || "complementary") === mode.id;
                            return (
                              <button
                                key={mode.id}
                                onClick={() => setters.setStartColorMode(mode.id)}
                                className={`p-1.5 border rounded flex flex-col items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-purple-500/50 border-purple-400 text-white font-bold"
                                    : "bg-transparent border-purple-500/30 hover:border-purple-400/80 text-[#D2B48C]/70 hover:text-[#D2B48C]"
                                }`}
                                title={mode.desc}
                              >
                                <span>{mode.label}</span>
                                <span className="text-[7px] opacity-70">{mode.desc}</span>
                              </button>
                            );
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


            <div className="flex flex-col items-end">
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
              {showHUD && (
                <div className="text-[8px] font-mono text-[#87CEEB] tracking-widest mt-0.5 px-2 select-none flex flex-col items-center">
                  <span>v{state.version || "0.3"}</span>
                  {sessionCode && (
                    <span className="text-[7px] text-[#D2B48C]/70 tracking-wider font-mono">
                      {sessionCode}
                    </span>
                  )}
                </div>
              )}
            </div>
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
                <div className="flex items-center gap-1.5">
                  <ChevronDown className={`w-3 h-3 transition-transform ${isBiomassCollapsed ? "rotate-180" : ""}`} />
                </div>
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span 
                            className={`text-[7px] px-1 py-0.2 rounded font-mono font-bold ${
                              (strain.matingCount || 0) > 0 
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" 
                                : "bg-white/5 text-[#87CEEB]/50"
                            }`} 
                            title={`Hybridizations: ${strain.matingCount || 0} / ${state.maxMatings || 1}`}
                          >
                            ⚡{strain.matingCount || 0}
                          </span>
                          <span>{percent.toFixed(1)}%</span>
                        </div>
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
                            <span>Hybrids:</span>
                            <span className="font-mono text-[#87CEEB]">
                              {strain.matingCount || 0}
                            </span>
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
                <SystemSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* LANDSCAPE */}
                <LandscapeSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* LEAVES & BOTANY */}
                <BotanySection searchQuery={searchQuery} state={state} setters={setters} />

                {/* CONFIG & TIDE */}
                <ConfigTideSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* ECOLOGY */}
                <EcologySection searchQuery={searchQuery} state={state} setters={setters} />

                {/* LIFECYCLE */}
                <LifecycleSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* REPRODUCTION */}
                <ReproductionSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* BRANCHING */}
                <BranchingSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* SPEEDS */}
                <SpeedsSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* MORPHOLOGY */}
                <MorphologySection searchQuery={searchQuery} state={state} setters={setters} />

              </div>
              <div className="flex justify-between items-center gap-4 px-6 pb-3 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/40 border border-[#D2B48C]/30 px-3 py-1 rounded w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#87CEEB]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search controls..."
                    className="bg-transparent text-[10px] text-white focus:outline-none w-full placeholder:text-[#D2B48C]/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="text-[#D2B48C]/60 hover:text-white text-[10px] cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
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
