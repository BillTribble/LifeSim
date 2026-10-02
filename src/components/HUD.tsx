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
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SmartDial } from "./SmartDial";
import { PresetPanel } from "./PresetPanel";
import { CloudConfigPanel } from "./CloudConfigPanel";
import { MutationPanel } from "./MutationPanel";
import { LeafConfigPanel } from "./LeafConfigPanel";
import { SoundConfigPanel } from "./SoundConfigPanel";
import { triggerRandomize } from "../utils/randomize";
import {
  SystemSection,
  WindMotionSection,
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
import { BiomassPanel } from "./BiomassPanel";
import { BotanicalConcept, BotanicalConceptMeta } from "../lib/SimulationBotany";
import { BotanicalConceptSwitcher } from "./BotanicalConceptSwitcher";
import { INatInfoPanel } from "./INatInfoPanel";
import { inatService } from "../lib/SimulationINatService";

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
  onOpenDesigner?: () => void;
  botanicalConcept?: BotanicalConcept;
  onSelectConcept?: (concept: BotanicalConcept, meta: BotanicalConceptMeta) => void;
  evolutionStep?: number;
  onSelectEvolutionStep?: (step: number) => void;
  onOpenEvolutionModal?: () => void;
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
  onOpenDesigner,
  botanicalConcept,
  onSelectConcept,
  evolutionStep,
  onSelectEvolutionStep,
  onOpenEvolutionModal,
}: HUDProps) {
  const [cloudPanelOpen, setCloudPanelOpen] = useState(false);
  const [mutationPanelOpen, setMutationPanelOpen] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [leafPanelOpen, setLeafPanelOpen] = useState(false);
  const [landscapePanelOpen, setLandscapePanelOpen] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const [inatPanelOpen, setInatPanelOpen] = useState(false);
  const [broodCharge, setBroodCharge] = useState(() => inatService.getBroodinessCharge());
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return inatService.subscribe(() => {
      setBroodCharge(inatService.getBroodinessCharge());
    });
  }, []);

  React.useEffect(() => {
    if (showHUD) {
      setIsControlsExpanded(true);
    } else {
      setSoundPanelOpen(false);
      setInatPanelOpen(false);
      setThemePanelOpen(false);
      setPresetPanelOpen(false);
      setCloudPanelOpen(false);
      setMutationPanelOpen(false);
      setLeafPanelOpen(false);
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
      {showHUD && cloudPanelOpen && <CloudConfigPanel state={state} setters={setters} />}
      {showHUD && mutationPanelOpen && <MutationPanel state={state} setters={setters} />}
      {showHUD && presetPanelOpen && <PresetPanel state={state} setters={setters} stats={stats} setRandomizeKey={setRandomizeKey} handleRestart={handleRestart} onClose={() => setPresetPanelOpen(false)} />}
      {showHUD && leafPanelOpen && <LeafConfigPanel state={state} setters={setters} />}
      {showHUD && soundPanelOpen && <SoundConfigPanel state={state} setters={setters} stats={stats} />}

      {/* Middle-Top Persistent Unmute Button (only when sound is muted) */}
      {!state.soundEnabled && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 h-7 flex items-center gap-1.5 cursor-pointer pointer-events-auto shrink-0 transition-all select-none shadow-md backdrop-blur-md font-mono border border-amber-500/60 px-3.5 rounded-full bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 hover:text-white opacity-95 hover:opacity-100 animate-pulse"
          onClick={() => setters.setSoundEnabled(true)}
          title="Click to unmute sound"
        >
          <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap tracking-wide">
            Click to Unmute
          </span>
        </div>
      )}

      <div
        className={`absolute inset-0 z-40 pointer-events-none flex flex-col p-2 sm:p-4 m-1 sm:m-4 rounded transition-all duration-500 ${showHUD ? "border-2 border-[#D2B48C]/20" : "border-2 border-transparent"}`}
      >
        <header className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 mb-2 sm:mb-6 text-[10px] font-mono pb-2 pointer-events-none z-20 w-full">
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-none flex-wrap sm:flex-nowrap">
            {/* Top-Left Persistent Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
              <div
                className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-90 hover:opacity-100 border border-cyan-500/50 px-2.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
                onClick={handleRestart}
                title="Restart ecosystem"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold">Restart</span>
              </div>

              <div
                className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-90 hover:opacity-100 border border-purple-500/50 px-2.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
                onClick={() => triggerRandomize(setters, state, setRandomizeKey, handleRestart)}
                title="Randomize all simulation settings and theme"
              >
                <Dices className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold">RANDOM</span>
              </div>
            </div>

            <div className={`flex items-center gap-2 sm:gap-3 transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-auto flex" : "opacity-0 invisible pointer-events-none hidden w-0 overflow-hidden"}`}>
              <div className="relative shrink-0">
                <div
                  className={`h-7 flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border border-[#D2B48C]/50 px-2.5 rounded bg-[#001220]/60 shadow-sm transition-opacity duration-500 ${showHUD ? "opacity-80 hover:opacity-100" : "opacity-100"}`}
                  onClick={() => {
                    setThemePanelOpen(!themePanelOpen);
                    setSoundPanelOpen(false);
                    setCloudPanelOpen(false);
                    setMutationPanelOpen(false);
                    setPresetPanelOpen(false);
                    setLeafPanelOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  title="Theme Settings"
                >
                  <Palette className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{["NORMAL", "ALBINO", "COMPLEMENT", "DUOTONE"][state.theme] || "THEME"}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
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

              <div className="relative shrink-0">
                <div
                  className={`h-7 flex items-center gap-2 cursor-pointer hover:text-white pointer-events-auto border px-2.5 rounded shadow-sm transition-all duration-300 ${
                    state.soundEnabled
                      ? "border-cyan-400/80 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 shadow-cyan-950/40"
                      : "border-[#D2B48C]/40 bg-[#001220]/60 text-[#D2B48C]/60 hover:text-[#D2B48C]"
                  }`}
                  onClick={() => {
                    setSoundPanelOpen(!soundPanelOpen);
                    setThemePanelOpen(false);
                    setCloudPanelOpen(false);
                    setMutationPanelOpen(false);
                    setPresetPanelOpen(false);
                    setLeafPanelOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  title="Sound Engine & Environment Settings"
                >
                  {state.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
                  )}
                  <span className="font-bold tracking-wider">
                    SOUND
                  </span>
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${soundPanelOpen ? "rotate-180" : ""}`} />
                </div>
              </div>

              <div
                className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-80 hover:opacity-100 border border-[#D2B48C]/30 px-2.5 rounded bg-[#001220]/60 shadow-sm transition-all shrink-0 text-[#D2B48C]"
                onClick={handleCopySettings}
                title="Copy all settings to clipboard"
              >
                <Database
                  className={`w-3.5 h-3.5 shrink-0 ${copied ? "text-green-500" : "text-blue-400"}`}
                />
                <span>{copied ? "SETTINGS_COPIED" : "COPY_SETTINGS"}</span>
              </div>

              <div
                className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto opacity-80 hover:opacity-100 border px-2.5 rounded transition-colors shrink-0 ${
                  state.kioskMode
                    ? "bg-purple-500/20 border-purple-400 text-purple-300"
                    : "bg-[#001220]/60 border-[#D2B48C]/30 text-[#D2B48C]/60 hover:text-[#D2B48C]"
                }`}
                onClick={() => setters.setKioskMode && setters.setKioskMode(!state.kioskMode)}
                title="KIOSK MODE — Periodically fades out and restarts the ecosystem"
              >
                <Tv className={`w-3.5 h-3.5 shrink-0 ${state.kioskMode ? "text-purple-300" : "text-[#D2B48C]/60"}`} />
                <span>KIOSK: {state.kioskMode ? "ON" : "OFF"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
              <div className="h-7 pointer-events-auto flex items-center gap-1.5 border border-[#D2B48C]/50 px-2.5 rounded bg-[#001220]/70 backdrop-blur-md shadow-sm opacity-90 hover:opacity-100 transition-opacity shrink-0"
                title="SPEED — Controls simulation speed. Drag knob vertically to adjust."
              >
                <span className="text-[9px] sm:text-[10px] font-mono text-[#D2B48C]">SPEED</span>
                <div className="scale-[0.6] origin-center -my-3 -mx-1 shrink-0 flex items-center justify-center">
                  <SmartDial state={state} setters={setters} tooltip={"SPEED\nControls the simulation speed.\nHigh: Fast motion.\nLow: Slow motion."} label="" min={0.1} max={100.0} step={0.1} value={state.timeScale} onChange={setters.setTimeScale} color="#87CEEB" hideValue={true} />
                </div>
                <span className="text-[9px] font-mono shrink-0" style={{ color: '#87CEEB' }}>{state.timeScale.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 text-right justify-end text-[9px] sm:text-[10px] items-center pointer-events-none ml-auto shrink-0">
            {showHUD && (
              <div
                className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2.5 rounded pointer-events-auto bg-[#001220]/60 shadow-sm transition-colors text-[#D2B48C] shrink-0"
                onClick={() => {
                  setPresetPanelOpen(!presetPanelOpen);
                  setSoundPanelOpen(false);
                  setMutationPanelOpen(false);
                  setCloudPanelOpen(false);
                  setLeafPanelOpen(false);
                  setThemePanelOpen(false);
                  setIsControlsExpanded(false);
                }}
                title="Presets"
              >
                <Database className="w-3.5 h-3.5 text-[#D2B48C] shrink-0" />
                <span>PRESETS</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </div>
            )}

            {showHUD && onOpenDesigner && (
              <button
                onClick={onOpenDesigner}
                className="h-7 flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 px-2.5 rounded text-emerald-300 hover:text-white pointer-events-auto backdrop-blur-md transition-all shadow-sm select-none shrink-0 font-mono font-bold"
                title="Open Archetype Designer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="tracking-wider uppercase">DESIGNER</span>
              </button>
            )}

            {/* Sound ON icon button directly next to INTERFACE */}
            {state.soundEnabled && (
              <button
                onClick={() => setters.setSoundEnabled(false)}
                className="h-7 w-7 flex items-center justify-center bg-[#001220]/80 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/20 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-200 shrink-0 shadow-md select-none text-cyan-300 hover:text-white"
                title="Sound ON · Click to mute"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </button>
            )}

            {/* BIO-LINK // INFO button */}
            {showHUD && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setInatPanelOpen(!inatPanelOpen)}
                  className={`h-7 flex items-center gap-1.5 px-2.5 rounded-full border transition-all pointer-events-auto backdrop-blur-md select-none font-mono font-bold text-[9px] shadow-sm ${
                    inatPanelOpen
                      ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                      : "bg-[#001220]/80 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:text-white"
                  }`}
                  title="iNaturalist Live Telemetry & Simulation Guide"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
                  <span className="tracking-wide">BIO-LINK // INFO</span>
                  <span className="text-emerald-400 font-normal">
                    BROOD {Math.round(broodCharge * 100)}%
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${inatPanelOpen ? "rotate-180" : ""}`} />
                </button>
                {inatPanelOpen && (
                  <div className="absolute right-0 top-full mt-2 z-[9999]">
                    <INatInfoPanel onClose={() => setInatPanelOpen(false)} />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-end relative shrink-0">
              <button
                onClick={() => {
                  const nextHUD = !showHUD;
                  setShowHUD(nextHUD);
                  if (nextHUD) {
                    setIsControlsExpanded(true);
                  } else {
                    setSoundPanelOpen(false);
                    setThemePanelOpen(false);
                    setPresetPanelOpen(false);
                    setCloudPanelOpen(false);
                    setMutationPanelOpen(false);
                    setLeafPanelOpen(false);
                  }
                }}
                className="h-7 flex items-center gap-2 bg-[#001220]/80 border border-[#D2B48C]/50 px-3 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-200 hover:bg-white/20 shrink-0 shadow-md select-none"
                title="HUD Interface"
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${showHUD ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-[#87CEEB]"}`} />
                <span className="text-[10px] font-mono text-[#D2B48C] tracking-wider uppercase whitespace-nowrap">
                  INTERFACE
                </span>
              </button>
              {showHUD && (
                <div className="absolute top-full right-0 text-[8px] font-mono text-[#87CEEB] tracking-widest mt-0.5 px-2 select-none flex flex-col items-end whitespace-nowrap">
                  <span>v{state.version || "0.3.1"}</span>
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

        <BiomassPanel
          stats={stats}
          totalBiomass={totalBiomass}
          state={state}
          showHUD={showHUD}
        />

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
                    setSoundPanelOpen(false);
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

                {/* WIND & MOTION */}
                <WindMotionSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* LANDSCAPE */}
                <LandscapeSection searchQuery={searchQuery} state={state} setters={setters} />

                {/* LEAVES & BOTANY */}
                <BotanySection
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  botanicalConcept={botanicalConcept}
                  onSelectConcept={onSelectConcept}
                />

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
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 pb-3 pointer-events-auto">
                <div className="flex items-center gap-3 flex-wrap">
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
