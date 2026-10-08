import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Dices,
  Palette,
  Volume2,
  VolumeX,
  Database,
  Tv,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { SmartDial } from "./SmartDial";
import { PerfIndicator } from "./PerfIndicator";
import { SoundConfigPanel } from "./SoundConfigPanel";
import { PresetPanel } from "./PresetPanel";
import { INatInfoPanel } from "./INatInfoPanel";
import { triggerRandomize } from "../utils/randomize";

export interface HUDTopBarProps {
  showHUD: boolean;
  setShowHUD: (s: boolean) => void;
  stats: any;
  state: any;
  setters: any;
  handleRestart: () => void;
  setRandomizeKey: React.Dispatch<React.SetStateAction<number>>;
  handleCopySettings: () => void;
  copied: boolean;
  onOpenDesigner?: () => void;
}

const formatMorphFreq = (val: number) => {
  if (val >= 1.0) return "OFF";
  const freq = Math.min(0.99, val);
  const intervalSecs = 3 * Math.pow(600 / 3, freq / 0.99);
  if (intervalSecs < 60) return `${Math.round(intervalSecs)}s`;
  const mins = Math.floor(intervalSecs / 60);
  const secs = Math.round(intervalSecs % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export function HUDTopBar({
  showHUD,
  setShowHUD,
  stats,
  state,
  setters,
  handleRestart,
  setRandomizeKey,
  handleCopySettings,
  copied,
  onOpenDesigner,
}: HUDTopBarProps) {
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [inatPanelOpen, setInatPanelOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    if (!showHUD) {
      setThemePanelOpen(false);
      setSoundPanelOpen(false);
      setPresetPanelOpen(false);
    }
  }, [showHUD]);

  const closeLeftPopovers = () => {
    setThemePanelOpen(false);
    setSoundPanelOpen(false);
    setPresetPanelOpen(false);
  };

  const toggleThemePanel = () => {
    const next = !themePanelOpen;
    closeLeftPopovers();
    if (next) setThemePanelOpen(true);
  };

  const toggleSoundPanel = () => {
    const next = !soundPanelOpen;
    closeLeftPopovers();
    if (next) setSoundPanelOpen(true);
  };

  const togglePresetPanel = () => {
    const next = !presetPanelOpen;
    closeLeftPopovers();
    if (next) setPresetPanelOpen(true);
  };

  const toggleInatPanel = () => {
    setInatPanelOpen((prev) => !prev);
  };

  const renderUnmuteButton = (extraClass: string = "") => (
    <button
      onClick={() => setters.setSoundEnabled(true)}
      className={`h-7 flex items-center gap-1.5 cursor-pointer pointer-events-auto shrink-0 transition-all select-none shadow-md backdrop-blur-md font-mono border border-amber-500/60 px-2 lg:px-3.5 rounded-full bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 hover:text-white opacity-95 hover:opacity-100 animate-pulse ${extraClass}`}
      title="Click to unmute sound"
      aria-label="Click to Unmute"
    >
      <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="text-[9px] sm:text-[10px] font-bold whitespace-nowrap tracking-wide">
        <span className="hidden lg:inline">Click to </span>Unmute
      </span>
    </button>
  );

  return (
    <header className="relative flex flex-col w-full text-[10px] font-mono pointer-events-none z-20">
      {/* Row 1: Primary Transport, Live Telemetry & Master Interface Toggle */}
      <div className="w-full flex items-center justify-between gap-1.5 lg:gap-2">
        {/* Left Cluster */}
        <div className="flex items-center gap-1.5 lg:gap-2 pointer-events-auto shrink-0">
          <button
            onClick={handleRestart}
            className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border border-cyan-500/50 px-2 lg:px-2.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
            title="Restart ecosystem"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold">Restart</span>
          </button>

          <button
            onClick={() => triggerRandomize(setters, state, setRandomizeKey, handleRestart)}
            className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border border-purple-500/50 px-2 lg:px-2.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
            title="Randomize all simulation settings and theme"
          >
            <Dices className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold">RANDOM</span>
          </button>

          <div
            className="h-7 flex items-center gap-1.5 border border-[#D2B48C]/50 px-2 lg:px-2.5 rounded bg-[#001220]/70 backdrop-blur-md shadow-sm opacity-90 hover:opacity-100 transition-opacity shrink-0"
            title="SPEED — Controls simulation speed. Drag knob vertically to adjust."
          >
            <span className="text-[9px] sm:text-[10px] font-mono text-[#D2B48C]">SPEED</span>
            <div className="scale-[0.6] origin-center -my-3 -mx-4 shrink-0 flex items-center justify-center">
              <SmartDial
                state={state}
                setters={setters}
                tooltip={"SPEED\nControls the simulation speed.\nHigh: Fast motion.\nLow: Slow motion."}
                label=""
                min={0.1}
                max={100.0}
                step={0.1}
                value={state.timeScale}
                onChange={setters.setTimeScale}
                color="#87CEEB"
                hideValue={true}
              />
            </div>
            <span className="text-[9px] font-mono shrink-0" style={{ color: "#87CEEB" }}>
              {state.timeScale.toFixed(1)}
            </span>
          </div>

          {!state.soundEnabled && (
            showHUD
              ? renderUnmuteButton("hidden md:flex")
              : renderUnmuteButton("hidden sm:flex")
          )}
        </div>

        {/* Right Cluster */}
        <div className="flex items-center gap-1.5 lg:gap-2 pointer-events-auto shrink-0">
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {showHUD && <PerfIndicator perf={stats.perf} showHUD={showHUD} />}

            <button
              onClick={toggleInatPanel}
              className={`h-7 flex items-center gap-1.5 px-2 lg:px-2.5 rounded-full border transition-all pointer-events-auto backdrop-blur-md select-none font-mono font-bold text-[9px] shadow-sm cursor-pointer ${
                inatPanelOpen
                  ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                  : "bg-[#001220]/80 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:text-white"
              }`}
              title={inatPanelOpen ? "Minimise iNaturalist panel" : "Open iNaturalist Live Telemetry"}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
              <span className="tracking-wide">
                BIO-LINK<span className="hidden xl:inline"> // INFO</span>
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${inatPanelOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {state.soundEnabled && !showHUD && (
            <button
              onClick={() => setters.setSoundEnabled(false)}
              className="h-7 w-7 flex items-center justify-center bg-[#001220]/80 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/20 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-200 shrink-0 shadow-md select-none text-cyan-300 hover:text-white"
              title="Sound ON · Click to mute"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </button>
          )}

          <button
            onClick={() => setShowHUD(!showHUD)}
            className="h-7 flex items-center gap-1.5 lg:gap-2 bg-[#001220]/80 border border-[#D2B48C]/50 px-2 lg:px-3 backdrop-blur-md pointer-events-auto rounded-full transition-all duration-200 hover:bg-white/20 shrink-0 shadow-md select-none"
            title="HUD Interface"
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                showHUD ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "bg-[#87CEEB]"
              }`}
            />
            <span className="text-[10px] font-mono text-[#D2B48C] tracking-wider uppercase whitespace-nowrap">
              INTERFACE
            </span>
          </button>
        </div>
      </div>

      {/* Row 1.5 Mobile Unmute Pill (only when !showHUD && !soundEnabled on <sm viewports) */}
      {!showHUD && !state.soundEnabled && (
        <div className="sm:hidden flex justify-center w-full mt-1.5 pointer-events-auto">
          {renderUnmuteButton()}
        </div>
      )}

      {/* Row 2: Secondary Workspace & Mode Toolbar (rendered when showHUD === true) */}
      {showHUD && (
        <div className="w-full flex flex-col gap-1.5 mt-1.5 pt-1.5 border-t border-[#D2B48C]/15 pointer-events-none">
          {/* Narrow/Tablet Telemetry & Audio Strip (<840px) */}
          <div className="flex md:hidden flex-wrap items-center justify-between gap-1.5 w-full pointer-events-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              <PerfIndicator perf={stats.perf} showHUD={showHUD} />
              <button
                onClick={toggleInatPanel}
                className={`h-7 flex items-center gap-1.5 px-2.5 rounded-full border transition-all pointer-events-auto backdrop-blur-md select-none font-mono font-bold text-[9px] shadow-sm cursor-pointer ${
                  inatPanelOpen
                    ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                    : "bg-[#001220]/80 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:text-white"
                }`}
                title={inatPanelOpen ? "Minimise iNaturalist panel" : "Open iNaturalist Live Telemetry"}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
                <span className="tracking-wide">BIO-LINK</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${inatPanelOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {!state.soundEnabled && renderUnmuteButton()}
          </div>

          {/* Workspace Controls Strip */}
          <div className="w-full flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <button
              onClick={toggleThemePanel}
              className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border px-2 sm:px-2.5 rounded shadow-sm transition-all text-[9px] sm:text-[10px] select-none shrink-0 ${
                themePanelOpen
                  ? "bg-purple-500/30 border-purple-400 text-white"
                  : "border-[#D2B48C]/50 bg-[#001220]/70 text-[#D2B48C] hover:bg-white/10"
              }`}
              title="Theme Settings"
            >
              <Palette className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>{["NORMAL", "ALBINO", "COMPLEMENT", "DUOTONE"][state.theme] || "THEME"}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${themePanelOpen ? "rotate-180" : ""}`} />
            </button>

            <button
              onClick={toggleSoundPanel}
              className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border px-2 sm:px-2.5 rounded shadow-sm transition-all text-[9px] sm:text-[10px] select-none shrink-0 ${
                soundPanelOpen
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                  : state.soundEnabled
                  ? "border-cyan-400/80 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60"
                  : "border-[#D2B48C]/40 bg-[#001220]/60 text-[#D2B48C]/60 hover:text-[#D2B48C]"
              }`}
              title="Sound Engine & Environment Settings"
            >
              {state.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
              )}
              <span className="font-bold tracking-wider">SOUND</span>
              <ChevronDown
                className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                  soundPanelOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <button
              onClick={togglePresetPanel}
              className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border px-2 sm:px-2.5 rounded shadow-sm transition-all text-[9px] sm:text-[10px] select-none shrink-0 ${
                presetPanelOpen
                  ? "bg-[#D2B48C]/30 border-[#D2B48C] text-white"
                  : "border-[#D2B48C]/30 bg-[#001220]/60 text-[#D2B48C] hover:bg-white/10"
              }`}
              title="Presets"
            >
              <Database className="w-3.5 h-3.5 text-[#D2B48C] shrink-0" />
              <span>PRESETS</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${presetPanelOpen ? "rotate-180" : ""}`} />
            </button>

            <div className="hidden sm:block h-4 w-px bg-[#D2B48C]/20 mx-0.5 shrink-0" />

            <button
              onClick={handleCopySettings}
              className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 sm:px-2.5 rounded bg-[#001220]/60 hover:bg-white/10 shadow-sm transition-all shrink-0 text-[#D2B48C] text-[9px] sm:text-[10px] select-none"
              title="Copy all settings to clipboard"
            >
              <Database className={`w-3.5 h-3.5 shrink-0 ${copied ? "text-green-500" : "text-blue-400"}`} />
              <span>{copied ? "SETTINGS_COPIED" : "COPY_SETTINGS"}</span>
            </button>

            <button
              onClick={() => setters.setKioskMode && setters.setKioskMode(!state.kioskMode)}
              className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white border px-2 sm:px-2.5 rounded transition-colors shrink-0 text-[9px] sm:text-[10px] select-none ${
                state.kioskMode
                  ? "bg-purple-500/20 border-purple-400 text-purple-300"
                  : "bg-[#001220]/60 border-[#D2B48C]/30 text-[#D2B48C]/60 hover:text-[#D2B48C]"
              }`}
              title="KIOSK MODE — Periodically fades out and restarts the ecosystem"
            >
              <Tv className={`w-3.5 h-3.5 shrink-0 ${state.kioskMode ? "text-purple-300" : "text-[#D2B48C]/60"}`} />
              <span>KIOSK: {state.kioskMode ? "ON" : "OFF"}</span>
            </button>

            {onOpenDesigner && (
              <button
                onClick={onOpenDesigner}
                className="sm:ml-auto h-7 flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 px-2.5 rounded text-emerald-300 hover:text-white pointer-events-auto backdrop-blur-md transition-all shadow-sm select-none shrink-0 font-mono font-bold text-[9px] sm:text-[10px]"
                title="Open Archetype Designer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="tracking-wider uppercase">DESIGNER</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Anchored Popover Layer */}
      <div className="relative w-full z-50 pointer-events-none">
        {showHUD && themePanelOpen && (
          <div className="absolute top-1.5 left-0 z-50 pointer-events-auto">
            <div className="bg-[#001220]/95 border border-purple-500/50 p-3.5 sm:p-4 rounded-lg w-56 backdrop-blur-md shadow-lg shadow-purple-900/20 font-mono text-[#D2B48C]">
              <div className="flex justify-between items-center mb-3 border-b border-purple-500/30 pb-2">
                <span className="text-[10px] font-bold text-purple-300 tracking-wider">THEME</span>
                <button
                  onClick={() => setThemePanelOpen(false)}
                  className="text-purple-300/70 hover:text-white px-1.5 py-0.5 hover:bg-white/10 rounded text-[10px]"
                  title="Close theme panel"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-3 text-[9px]">
                <div className="flex flex-col gap-1.5 border-b border-purple-500/30 pb-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 0, label: "NORMAL" },
                      { id: 1, label: "ALBINO" },
                      { id: 2, label: "COMPLEMENT" },
                      { id: 3, label: "DUOTONE" },
                    ].map((theme) => {
                      const isSelected = state.theme === theme.id;
                      const isPulsing =
                        isSelected &&
                        stats.themeProgress !== undefined &&
                        stats.themeProgress < 1.0 &&
                        stats.nextTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setters.setTheme(theme.id)}
                          className={`p-1 border rounded transition-colors ${
                            isSelected
                              ? isPulsing
                                ? "bg-purple-500/50 border-purple-400 text-white animate-pulse"
                                : "bg-purple-500/50 border-purple-400 text-white"
                              : "bg-transparent border-purple-500/30 hover:border-purple-400/80 text-[#D2B48C]/70 hover:text-[#D2B48C]"
                          }`}
                        >
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 border-b border-purple-500/30 pb-2.5">
                  <span className="text-[#D2B48C] font-bold text-[8px] tracking-wider">
                    START MODE (BETA HUE)
                  </span>
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
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center gap-2 border-b border-purple-500/20 pb-2.5">
                    <span className="text-[#D2B48C]">AUTO MORPH</span>
                    <button
                      onClick={() =>
                        setters.setThemeMorphFreq(state.themeMorphFreq >= 1.0 ? 0.8 : 1.0)
                      }
                      className={`px-2.5 py-0.5 border rounded font-mono font-bold transition-colors ${
                        state.themeMorphFreq < 1.0
                          ? "bg-green-500/30 border-green-400 text-green-300"
                          : "bg-red-500/30 border-red-400 text-red-300"
                      }`}
                    >
                      {state.themeMorphFreq < 1.0 ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="flex justify-between gap-2">
                    <SmartDial
                      state={state}
                      setters={setters}
                      tooltip="How often the theme automatically changes. Max value = OFF."
                      label="MORPH_FREQ"
                      min={0}
                      max={1}
                      step={0.01}
                      value={state.themeMorphFreq}
                      onChange={setters.setThemeMorphFreq}
                      color="#a855f7"
                      formatValue={formatMorphFreq}
                    />
                    <SmartDial
                      state={state}
                      setters={setters}
                      tooltip="The duration of the transition between themes in seconds."
                      label="TRANS_SPEED"
                      min={1}
                      max={20}
                      step={0.5}
                      value={state.themeMorphSpeed}
                      onChange={setters.setThemeMorphSpeed}
                      color="#a855f7"
                      formatValue={(v: number) => `${v.toFixed(1)}s`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHUD && soundPanelOpen && (
          <div className="absolute top-1.5 left-0 sm:left-24 z-50 pointer-events-auto">
            <SoundConfigPanel
              state={state}
              setters={setters}
              stats={stats}
              onClose={() => setSoundPanelOpen(false)}
            />
          </div>
        )}

        {showHUD && presetPanelOpen && (
          <div className="absolute top-1.5 left-0 sm:left-44 z-50 pointer-events-auto">
            <PresetPanel
              state={state}
              setters={setters}
              stats={stats}
              setRandomizeKey={setRandomizeKey}
              handleRestart={handleRestart}
              onClose={() => setPresetPanelOpen(false)}
            />
          </div>
        )}

        {inatPanelOpen && (
          <div className="absolute top-1.5 left-0 md:left-auto md:right-0 z-50 pointer-events-auto">
            <INatInfoPanel onClose={() => setInatPanelOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
}
