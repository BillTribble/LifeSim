import React from "react";
import { SmartDial } from "./SmartDial";
import { Volume2, VolumeX, CloudRain, Sun, Wind, Sparkles, Waves } from "lucide-react";
import { SOUND_ENVIRONMENTS, SoundEnvironmentId } from "../lib/SimulationSound";

interface SoundConfigPanelProps {
  state: any;
  setters: any;
  stats?: any;
}

const MIXER_CHANNELS: { id: string; label: string; color: string; defaultOct: number; tip: string }[] = [
  { id: "pad", label: "PAD", color: "#22D3EE", defaultOct: 4, tip: "Birth & mating harmonic pads" },
  { id: "step", label: "STEP", color: "#4ADE80", defaultOct: 5, tip: "Agent movement plucks (the fast ticks)" },
  { id: "branch", label: "BRANCH", color: "#FBBF24", defaultOct: 5, tip: "Branch bifurcation plucks" },
  { id: "bell", label: "BELL", color: "#F472B6", defaultOct: 6, tip: "Sparkle chimes & celebration tones" },
  { id: "drone", label: "DRONE", color: "#A78BFA", defaultOct: 2, tip: "Sustained bass & mating drones" },
  { id: "perc", label: "PERC", color: "#FB923C", defaultOct: 4, tip: "Bounce impacts & pulse thumps" },
  { id: "weather", label: "WX", color: "#67E8F9", defaultOct: 6, tip: "Rain, breeze & atmospheric droplets" },
];

export function SoundConfigPanel({ state, setters, stats }: SoundConfigPanelProps) {
  const soundInfo = stats?.soundInfo;
  const currentEnv = (state.soundEnvironment || "rain") as SoundEnvironmentId;
  const mixer = state.soundMixer || {};

  const updateMixer = (ch: string, key: "vol" | "rev" | "oct", val: number) => {
    const def = MIXER_CHANNELS.find((c) => c.id === ch);
    setters.setSoundMixer({
      ...mixer,
      [ch]: {
        vol: 70,
        rev: 35,
        oct: def?.defaultOct ?? 4,
        ...(mixer[ch] || {}),
        [key]: val,
      },
    });
  };

  const envButtons: { id: SoundEnvironmentId; label: string; icon: any; desc: string }[] = [
    { id: "sunny", label: "SUNNY", icon: Sun, desc: "Fair meadow · Major · Warm pads" },
    { id: "rain", label: "RAIN", icon: CloudRain, desc: "Rain shower · Dorian · Droplets" },
    { id: "mist", label: "MIST", icon: Wind, desc: "Ethereal mist · Lydian · Reverb" },
    { id: "twilight", label: "TWILIGHT", icon: Sparkles, desc: "Stormy dusk · Minor · Deep drone" },
    { id: "ocean", label: "OCEAN", icon: Waves, desc: "Bioluminescent abyss · Phrygian" },
  ];

  return (
    <div className="absolute top-16 right-4 sm:right-48 bg-[#001220]/95 border border-cyan-500/50 p-4 rounded w-72 sm:w-80 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-cyan-900/30 overflow-y-auto max-h-[85vh] mt-24 sm:mt-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 border-b border-cyan-500/30 pb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {state.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : (
            <VolumeX className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-[10px] font-bold tracking-widest text-cyan-300">SOUND ENGINE</span>
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
        {/* Environment */}
        <div className="flex flex-col gap-1.5 border-b border-cyan-500/20 pb-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[#D2B48C] font-bold text-[8px] tracking-wider">ENVIRONMENT / WEATHER</span>
            <span className="text-[7px] text-cyan-400/80">{SOUND_ENVIRONMENTS[currentEnv]?.label.toUpperCase()}</span>
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

        {/* Cycling */}
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

        {/* Master Volume + Space */}
        <div className="flex justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
          <SmartDial state={state} setters={setters}
            tooltip="MASTER VOLUME\nOverall audio output level."
            label="VOLUME" min={0} max={100} step={1}
            value={state.soundVolume ?? 70} onChange={setters.setSoundVolume}
            color="#22D3EE" formatValue={(v: number) => `${v.toFixed(0)}%`}
          />
          <SmartDial state={state} setters={setters}
            tooltip="SPACE / REVERB\nGlobal wet/dry balance of the convolution reverb."
            label="SPACE" min={0} max={100} step={1}
            value={state.soundSpace ?? 55} onChange={setters.setSoundSpace}
            color="#22D3EE" formatValue={(v: number) => `${v.toFixed(0)}%`}
          />
        </div>

        {/* Mixer Channels */}
        <div className="flex flex-col gap-1.5 border-b border-cyan-500/20 pb-2.5">
          <div className="flex justify-between items-center pb-1">
            <span className="text-[#D2B48C] font-bold text-[8px] tracking-wider">MIXER — VOL / REV / OCTAVE</span>
            <span className="text-[7px] text-cyan-400/70">OCT 1–7</span>
          </div>
          {MIXER_CHANNELS.map((ch) => {
            const chData = mixer[ch.id] || { vol: 70, rev: 35, oct: ch.defaultOct };
            const oct = chData.oct ?? ch.defaultOct;
            return (
              <div key={ch.id} className="flex items-center justify-between gap-1">
                <span className="w-9 text-[7px] font-bold text-right shrink-0" style={{ color: ch.color }} title={ch.tip}>{ch.label}</span>
                <SmartDial state={state} setters={setters}
                  tooltip={`${ch.label} VOLUME\nChannel level in the mix.`}
                  label={`${ch.id.toUpperCase()}_VOL`}
                  min={0} max={100} step={1} value={chData.vol}
                  onChange={(v: number) => updateMixer(ch.id, "vol", v)}
                  color={ch.color} formatValue={(v: number) => `${v.toFixed(0)}%`}
                />
                <SmartDial state={state} setters={setters}
                  tooltip={`${ch.label} REVERB\nAmount sent to reverb.`}
                  label={`${ch.id.toUpperCase()}_REV`}
                  min={0} max={100} step={1} value={chData.rev}
                  onChange={(v: number) => updateMixer(ch.id, "rev", v)}
                  color={ch.color} formatValue={(v: number) => `${v.toFixed(0)}%`}
                />
                {/* Octave Switcher (O1 - O7) */}
                <div
                  className="flex items-center border border-cyan-500/30 rounded bg-black/50 overflow-hidden shrink-0 select-none h-5"
                  title={`${ch.label} OCTAVE (Currently Octave ${oct})\nClick - / + to shift active register (O1–O7), or click O${oct} to reset to default (O${ch.defaultOct}).`}
                >
                  <button
                    type="button"
                    onClick={() => updateMixer(ch.id, "oct", Math.max(1, oct - 1))}
                    disabled={oct <= 1}
                    className="px-1.5 h-full flex items-center justify-center text-[9px] font-bold text-[#D2B48C]/80 hover:text-white hover:bg-cyan-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMixer(ch.id, "oct", ch.defaultOct)}
                    className="px-1 h-full flex items-center justify-center text-[8px] font-bold tracking-tighter min-w-[20px] hover:bg-white/10 transition-colors"
                    style={{ color: ch.color }}
                  >
                    O{oct}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMixer(ch.id, "oct", Math.min(7, oct + 1))}
                    disabled={oct >= 7}
                    className="px-1.5 h-full flex items-center justify-center text-[9px] font-bold text-[#D2B48C]/80 hover:text-white hover:bg-cyan-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reverb Dials */}
        <div className="flex flex-wrap justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
          <SmartDial state={state} setters={setters}
            tooltip="REVERB DECAY\nHow long the reverb tail sustains."
            label="DECAY" min={0} max={100} step={1}
            value={state.soundReverbDecay ?? 50} onChange={setters.setSoundReverbDecay}
            color="#F472B6" formatValue={(v: number) => `${(1.5 + v / 100 * 4.5).toFixed(1)}s`}
          />
          <SmartDial state={state} setters={setters}
            tooltip="REVERB DAMPING\nHigh-frequency roll-off. Higher = darker."
            label="DAMP" min={0} max={100} step={1}
            value={state.soundReverbDamping ?? 40} onChange={setters.setSoundReverbDamping}
            color="#F472B6" formatValue={(v: number) => `${(18 - v / 100 * 17).toFixed(0)}kHz`}
          />
          <SmartDial state={state} setters={setters}
            tooltip="REVERB PRE-DELAY\nDelay before reverb onset."
            label="PRE" min={0} max={100} step={1}
            value={state.soundReverbPreDelay ?? 10} onChange={setters.setSoundReverbPreDelay}
            color="#F472B6" formatValue={(v: number) => `${(v / 100 * 80).toFixed(0)}ms`}
          />
        </div>

        {/* Global Cadence + Toggles */}
        <div className="flex justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
          <SmartDial state={state} setters={setters}
            tooltip="GLOBAL CADENCE\nGlobal rate limit across all step, branch, bounce, and droplet sounds. Higher = slower / sparser notes."
            label="CADENCE" min={0} max={100} step={1}
            value={state.soundStepCadence ?? 25} onChange={setters.setSoundStepCadence}
            color="#4ADE80"
            formatValue={(v: number) => {
              const gap = 0.03 * Math.pow(2.5 / 0.03, Math.max(0, Math.min(100, v)) / 100);
              const rate = 1 / Math.max(0.01, gap);
              return rate < 5 ? `${rate.toFixed(1)}/s` : `${rate.toFixed(0)}/s`;
            }}
          />
          <div className="flex items-center gap-1.5 self-end pb-1">
            <span className="text-[#D2B48C]/80 text-[8px]">STEP:</span>
            <button
              onClick={() => setters.setSoundMovement(!state.soundMovement)}
              className={`px-1.5 py-0.5 border rounded font-bold transition-colors text-[8px] ${
                state.soundMovement ? "bg-cyan-500/30 border-cyan-400 text-cyan-300" : "bg-black/30 border-cyan-500/20 text-red-300/60"
              }`}
            >
              {state.soundMovement ? "ON" : "OFF"}
            </button>
            <span className="text-[#D2B48C]/80 text-[8px]">WX:</span>
            <button
              onClick={() => setters.setSoundWeather(!state.soundWeather)}
              className={`px-1.5 py-0.5 border rounded font-bold transition-colors text-[8px] ${
                state.soundWeather ? "bg-cyan-500/30 border-cyan-400 text-cyan-300" : "bg-black/30 border-cyan-500/20 text-red-300/60"
              }`}
            >
              {state.soundWeather ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Harmony Readout */}
        {soundInfo && (
          <div className="flex flex-col gap-1.5 bg-black/40 border border-cyan-500/20 p-2 rounded text-[8px]">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold tracking-wider">HARMONY READOUT</span>
              <span className="text-cyan-300/70 font-mono">{soundInfo.activeVoices || 0} voices</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center py-1">
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">KEY</div>
                <div className="text-cyan-200 font-bold text-[10px]">{soundInfo.key || "C"}</div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">MODE</div>
                <div className="text-cyan-200 font-bold text-[9px] uppercase">{soundInfo.mode || "DORIAN"}</div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded p-1">
                <div className="text-[7px] opacity-60">CHORD</div>
                <div className="text-cyan-200 font-bold text-[9px] uppercase">{soundInfo.colour || "TRIAD"}</div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex justify-between text-[7px] opacity-70">
                <span>TENSION</span>
                <span>{Math.round((soundInfo.tension || 0) * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-cyan-950/80 rounded overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-300"
                  style={{ width: `${Math.round((soundInfo.tension || 0) * 100)}%` }} />
              </div>
            </div>
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