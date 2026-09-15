import React from "react";
import { SmartDial } from "./SmartDial";
import { Volume2, VolumeX, CloudRain, Sun, Wind, Sparkles, Waves } from "lucide-react";
import { SOUND_ENVIRONMENTS, SoundEnvironmentId } from "../lib/SimulationSound";

interface SoundConfigPanelProps {
  state: any;
  setters: any;
  stats?: any;
}

export function SoundConfigPanel({ state, setters, stats }: SoundConfigPanelProps) {
  const soundInfo = stats?.soundInfo;
  const currentEnv = (state.soundEnvironment || "rain") as SoundEnvironmentId;

  const envButtons: { id: SoundEnvironmentId; label: string; icon: any; desc: string }[] = [
    { id: "sunny", label: "SUNNY", icon: Sun, desc: "Fair meadow · Major · Warm pads" },
    { id: "rain", label: "RAIN", icon: CloudRain, desc: "Rain shower · Dorian · Droplets" },
    { id: "mist", label: "MIST", icon: Wind, desc: "Ethereal mist · Lydian · Reverb" },
    { id: "twilight", label: "TWILIGHT", icon: Sparkles, desc: "Stormy dusk · Minor · Deep drone" },
    { id: "ocean", label: "OCEAN", icon: Waves, desc: "Bioluminescent abyss · Phrygian" },
  ];

  return (
    <div className="absolute top-16 right-4 sm:right-48 bg-[#001220]/95 border border-cyan-500/50 p-4 rounded w-72 sm:w-80 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-cyan-900/30 overflow-visible mt-24 sm:mt-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 border-b border-cyan-500/30 pb-2">
        <div className="flex items-center gap-1.5">
          {state.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : (
            <VolumeX className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-[10px] font-bold tracking-widest text-cyan-300">
            SOUND ENGINE
          </span>
        </div>
        <button
          onClick={() => setters.setSoundEnabled(!state.soundEnabled)}
          className={`px-2.5 py-0.5 border rounded text-[9px] font-bold transition-colors ${
            state.soundEnabled
              ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
              : "bg-red-500/30 border-red-400 text-red-300"
          }`}
          title="Toggle Sound Engine On/Off"
        >
          {state.soundEnabled ? "SOUND ON" : "MUTED"}
        </button>
      </div>

      <div className="flex flex-col gap-3 text-[9px]">
        {/* Environment Soundscape Selection */}
        <div className="flex flex-col gap-1.5 border-b border-cyan-500/20 pb-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[#D2B48C] font-bold text-[8px] tracking-wider">
              ENVIRONMENT / WEATHER
            </span>
            <span className="text-[7px] text-cyan-400/80">
              {SOUND_ENVIRONMENTS[currentEnv]?.label.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[8px]">
            {envButtons.map((env) => {
              const Icon = env.icon;
              const isSelected = currentEnv === env.id;
              return (
                <button
                  key={env.id}
                  onClick={() => setters.setSoundEnvironment(env.id)}
                  className={`p-1.5 border rounded flex items-center gap-1.5 transition-colors text-left ${
                    isSelected
                      ? "bg-cyan-500/40 border-cyan-400 text-white font-bold shadow-sm shadow-cyan-500/30"
                      : "bg-transparent border-cyan-500/20 hover:border-cyan-400/60 text-[#D2B48C]/70 hover:text-[#D2B48C]"
                  }`}
                  title={env.desc}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-300" : "text-cyan-500/70"}`} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">{env.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Environmental Cycling Controls */}
        <div className="flex flex-col gap-2 border-b border-cyan-500/20 pb-2.5">
          <div className="flex justify-between items-center text-[8px]">
            <span className="text-[#D2B48C]">AUTO-CYCLE ENVS:</span>
            <button
              onClick={() => setters.setSoundAutoCycle(!state.soundAutoCycle)}
              className={`px-2 py-0.5 border rounded font-bold transition-colors ${
                state.soundAutoCycle
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                  : "bg-black/40 border-cyan-500/20 text-[#D2B48C]/60"
              }`}
              title="Automatically transition between environments over time"
            >
              {state.soundAutoCycle ? "AUTO (60s)" : "MANUAL"}
            </button>
          </div>
          <div className="flex justify-between items-center text-[8px]">
            <span className="text-[#D2B48C]">SYNC WITH VISUAL THEME:</span>
            <button
              onClick={() => setters.setSoundSyncThemes(!state.soundSyncThemes)}
              className={`px-2 py-0.5 border rounded font-bold transition-colors ${
                state.soundSyncThemes
                  ? "bg-purple-500/30 border-purple-400 text-purple-300"
                  : "bg-black/40 border-purple-500/20 text-[#D2B48C]/60"
              }`}
              title="Sync soundscape with the active visual color theme"
            >
              {state.soundSyncThemes ? "SYNCED" : "INDEPENDENT"}
            </button>
          </div>
        </div>

        {/* Master Sound Dials */}
        <div className="flex justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
          <SmartDial
            state={state}
            setters={setters}
            tooltip="MASTER VOLUME\nOverall audio output level of generative synthesis."
            label="VOLUME"
            min={0}
            max={100}
            step={1}
            value={state.soundVolume ?? 70}
            onChange={setters.setSoundVolume}
            color="#22D3EE"
            formatValue={(v: number) => `${v.toFixed(0)}%`}
          />
          <SmartDial
            state={state}
            setters={setters}
            tooltip="SPACE / REVERB\nControls the wet/dry balance of the procedural convolution reverb."
            label="SPACE"
            min={0}
            max={100}
            step={1}
            value={state.soundSpace ?? 55}
            onChange={setters.setSoundSpace}
            color="#22D3EE"
            formatValue={(v: number) => `${v.toFixed(0)}%`}
          />
        </div>

        {/* Granular Event Toggles */}
        <div className="flex justify-between gap-2 border-b border-cyan-500/20 pb-2.5 text-[8px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#D2B48C]/80">STEP CHIMES:</span>
            <button
              onClick={() => setters.setSoundMovement(!state.soundMovement)}
              className={`px-1.5 py-0.5 border rounded font-bold transition-colors ${
                state.soundMovement
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                  : "bg-black/30 border-cyan-500/20 text-red-300/60"
              }`}
            >
              {state.soundMovement ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#D2B48C]/80">WEATHER BED:</span>
            <button
              onClick={() => setters.setSoundWeather(!state.soundWeather)}
              className={`px-1.5 py-0.5 border rounded font-bold transition-colors ${
                state.soundWeather
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                  : "bg-black/30 border-cyan-500/20 text-red-300/60"
              }`}
            >
              {state.soundWeather ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Live Harmony Theory & Readout (from Sleeper Murmur Sound) */}
        {soundInfo && (
          <div className="flex flex-col gap-1.5 bg-black/40 border border-cyan-500/20 p-2 rounded text-[8px]">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold tracking-wider">HARMONY READOUT</span>
              <span className="text-cyan-300/70 font-mono">
                {soundInfo.activeVoices || 0} voices
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center py-1">
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">KEY</div>
                <div className="text-cyan-200 font-bold text-[10px]">
                  {soundInfo.key || "C"}
                </div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">MODE</div>
                <div className="text-cyan-200 font-bold text-[9px] uppercase">
                  {soundInfo.mode || "DORIAN"}
                </div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">CHORD</div>
                <div className="text-cyan-200 font-bold text-[9px] uppercase">
                  {soundInfo.colour || "TRIAD"}
                </div>
              </div>
            </div>

            {/* Tension Meter */}
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex justify-between text-[7px] opacity-70">
                <span>TENSION</span>
                <span>{Math.round((soundInfo.tension || 0) * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-cyan-950/80 rounded overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-300"
                  style={{ width: `${Math.round((soundInfo.tension || 0) * 100)}%` }}
                />
              </div>
            </div>

            {/* Modulation Banner */}
            {soundInfo.lastBanner && (
              <div className="text-[7px] text-pink-300/90 text-center font-bold mt-0.5 truncate">
                {soundInfo.lastBanner}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
