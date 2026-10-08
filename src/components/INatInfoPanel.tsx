import React, { useState, useEffect } from "react";
import { Activity, Radio, HelpCircle, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { inatService, INatSighting } from "../lib/SimulationINatService";

export interface INatInfoPanelProps {
  onClose?: () => void;
}

const TAXON_EMOJI_MAP: Record<string, string> = {
  Plantae: "🌿",
  Fungi: "🍄",
  Insecta: "🦋",
  Amphibia: "🐸",
  Reptilia: "🦎",
  Arachnida: "🕷️",
  Mollusca: "🐚",
  Aves: "🦅",
  Mammalia: "🦊",
  Actinopterygii: "🐟",
  Animalia: "🐾",
  Protozoa: "🦠",
  Chromista: "🪸",
};

function getCreatureEmoji(s: INatSighting): string {
  const lower = s.species.toLowerCase();
  if (lower.includes("orchid") || lower.includes("flower") || lower.includes("lily") || lower.includes("rose")) return "🌸";
  if (lower.includes("maple") || lower.includes("oak") || lower.includes("pine") || lower.includes("tree")) return "🌳";
  if (lower.includes("bee") || lower.includes("wasp") || lower.includes("hornet")) return "🐝";
  if (lower.includes("beetle") || lower.includes("ladybug") || lower.includes("weevil")) return "🪲";
  if (lower.includes("ant")) return "🐜";
  if (lower.includes("dragonfly") || lower.includes("damselfly") || lower.includes("cricket") || lower.includes("grasshopper")) return "🦗";
  if (lower.includes("snail") || lower.includes("slug")) return "🐌";
  if (lower.includes("octopus") || lower.includes("squid")) return "🐙";
  if (lower.includes("crab") || lower.includes("lobster") || lower.includes("shrimp")) return "🦀";
  if (lower.includes("turtle") || lower.includes("tortoise")) return "🐢";
  if (lower.includes("snake") || lower.includes("viper") || lower.includes("python")) return "🐍";
  if (lower.includes("owl")) return "🦉";
  if (lower.includes("duck") || lower.includes("goose") || lower.includes("swan")) return "🦆";
  if (lower.includes("squirrel") || lower.includes("chipmunk")) return "🐿️";
  if (lower.includes("deer") || lower.includes("elk") || lower.includes("moose")) return "🦌";
  if (lower.includes("bat")) return "🦇";
  return TAXON_EMOJI_MAP[s.taxon] || "🌿";
}

export function INatInfoPanel({ onClose }: INatInfoPanelProps) {
  const [, setTick] = useState(0);
  const [isExplainerOpen, setIsExplainerOpen] = useState(true);

  useEffect(() => {
    return inatService.subscribe(() => setTick((t) => t + 1));
  }, []);

  const broodiness = inatService.getBroodinessCharge();
  const reachBoost = inatService.getSeekReachBoost();
  const recent = inatService.getRecentSightings(5);
  const history = inatService.getWaveformHistory();

  // Oscilloscope geometry
  const width = 310;
  const height = 64;
  const points = history.slice(-50);
  const stepX = width / Math.max(1, points.length - 1);

  // Build emerald curve for broodiness
  const broodPoints = points.map((p, idx) => {
    const x = idx * stepX;
    const y = height - (p.broodiness * (height - 8) + 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const broodPath = broodPoints.length > 0 ? `M ${broodPoints.join(" L ")}` : "";

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#001220]/95 border border-cyan-500/40 rounded-lg text-[#D2B48C] font-mono text-[9px] backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.22)] w-[min(350px,calc(100vw-1.5rem))] max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar pointer-events-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold tracking-widest text-[10px]">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>BIO-LINK // iNATURALIST</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[#87CEEB]/80 hover:text-white px-1.5 py-0.5 border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/30 hover:bg-cyan-900/50 rounded text-[8px] font-bold transition-colors cursor-pointer"
            title="Minimise iNaturalist panel"
            aria-label="Minimise iNaturalist panel"
          >
            <Minus className="w-2.5 h-2.5" />
            <span>MINIMISE</span>
          </button>
        )}
      </div>

      {/* Expandable Explanation: How LifeSim Works & iNaturalist Link (items 1+2 hidden per request) */}
      <div className="border border-[#D2B48C]/20 rounded bg-black/30 overflow-hidden">
        <button
          onClick={() => setIsExplainerOpen(!isExplainerOpen)}
          className="w-full flex items-center justify-between p-1.5 text-left text-[#87CEEB] hover:bg-cyan-950/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[8.5px] font-bold tracking-wide">
            <HelpCircle className="w-3 h-3 text-cyan-400" />
            <span>HOW LIFESIM WORKS & DATA LINK</span>
          </div>
          {isExplainerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {isExplainerOpen && (
          <div className="p-2 border-t border-[#D2B48C]/15 text-[8px] leading-relaxed text-[#D2B48C]/90">
            <div>
              <span className="text-cyan-300 font-bold">Live Citizen Science: </span>
              Real wild organism sightings uploaded worldwide to <span className="text-emerald-300 font-bold">iNaturalist</span> stream in every 1–3s, charging the <span className="text-cyan-300">Broodiness Capacitor</span> to spur feeler growth & hybrid births!
            </div>
          </div>
        )}
      </div>

      {/* Realtime Sci-Fi Event Graph (Oscilloscope) */}
      <div className="relative border border-cyan-500/30 rounded bg-[#000814] p-1.5 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[7.5px] text-cyan-400/80 px-1">
          <div className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" />
            <span>OSCILLOSCOPE // SIGHTING IMPULSE & BROODINESS</span>
          </div>
          <span>CAPACITOR: {Math.round(broodiness * 100)}%</span>
        </div>

        <div className="relative h-[64px] w-full overflow-hidden bg-gradient-to-b from-cyan-950/20 to-black">
          {/* Subtle Reticle Gridlines */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 pointer-events-none opacity-20 border border-cyan-500/40">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="border-r border-b border-cyan-400/30" />
            ))}
          </div>

          <svg width={width} height={height} className="w-full h-full overflow-visible">
            {/* Cyan Impulse Spikes */}
            {points.map((p, idx) => {
              if (p.impulse <= 0.01) return null;
              const x = idx * stepX;
              const spikeH = p.impulse * (height - 12);
              const y = height - spikeH - 2;
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={height}
                    x2={x}
                    y2={y}
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                  />
                  <circle cx={x} cy={y} r="2" fill="#67e8f9" />
                </g>
              );
            })}

            {/* Bioluminescent Emerald Broodiness Waveform */}
            {broodPath && (
              <path
                d={broodPath}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"
              />
            )}
          </svg>
        </div>

        {/* Oscilloscope Legend */}
        <div className="flex items-center justify-between text-[7px] text-[#D2B48C]/70 px-1 pt-0.5 border-t border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full inline-block" />
              <span>iNat Sighting Spike</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#34d399] rounded-full inline-block" />
              <span>Broodiness Charge</span>
            </span>
          </div>
          <span>REACH: {reachBoost.toFixed(2)}x</span>
        </div>
      </div>

      {/* Live Sighting Event Log */}
      <div className="flex flex-col gap-1">
        <span className="text-[7.5px] text-[#87CEEB]/80 font-bold tracking-wider">
          LIVE SIGHTING FEED (GLOBAL TELEMETRY)
        </span>
        <div className="space-y-1 max-h-[96px] overflow-y-auto custom-scrollbar pr-0.5">
          {recent.map((s, idx) => (
            <div
              key={s.id || idx}
              className="flex items-center justify-between px-1.5 py-1 bg-black/40 border border-cyan-500/15 rounded text-[7.5px] hover:border-cyan-400/40 transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate mr-2">
                <span className="text-[10px] leading-none shrink-0" title={s.taxon}>
                  {getCreatureEmoji(s)}
                </span>
                <div className="truncate">
                  <span className="text-white font-bold">{s.species} </span>
                  <span className="text-[#D2B48C]/60 italic">({s.scientificName})</span>
                  <span className="text-cyan-400/70 ml-1">📍 {s.place}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <span className="text-cyan-300/80">Δ{s.deltaSec}s</span>
                <span className="text-emerald-400 font-bold">+{s.boostPct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
