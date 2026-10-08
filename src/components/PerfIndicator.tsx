import React from "react";
import { Gauge } from "lucide-react";
import { LOD_LABELS, LodMode, requestLodMode } from "../lib/SimulationLOD";

export interface PerfStats {
  fps: number;
  frameMs: number;
  lodTier: number;
  lodMode: LodMode;
  triangles: number;
  trianglesAtHigh: number;
}

const MODE_CYCLE: LodMode[] = ["auto", 0, 1, 2, 3];

function formatTris(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return `${n}`;
}

const DEFAULT_PERF: PerfStats = {
  fps: 60,
  frameMs: 16.7,
  lodTier: 0,
  lodMode: "auto",
  triangles: 0,
  trianglesAtHigh: 0,
};

/**
 * Compact FPS / view-detail chip. Visible only while the HUD (INTERFACE) is open. Click cycles Auto -> High -> Medium -> Low -> Minimal.
 * Detail changes are view-only; they never affect how creatures spawn or grow.
 */
export function PerfIndicator({ perf: rawPerf, showHUD }: { perf?: PerfStats; showHUD: boolean }) {
  if (!showHUD) return null;
  const perf = rawPerf ?? DEFAULT_PERF;
  const reduced = perf.lodTier > 0;

  const modeLabel = perf.lodMode === "auto" ? "Auto" : "Fixed";
  const savedPct = perf.trianglesAtHigh > 0
    ? Math.round((1 - perf.triangles / perf.trianglesAtHigh) * 100)
    : 0;
  const tierColor = ["text-emerald-300", "text-sky-300", "text-amber-300", "text-rose-300"][perf.lodTier] ?? "text-sky-300";

  const cycle = () => {
    const idx = MODE_CYCLE.indexOf(perf.lodMode);
    requestLodMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
  };

  return (
    <button
      onClick={cycle}
      className="h-7 flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 rounded-full bg-[#001220]/80 backdrop-blur-md border border-[#D2B48C]/40 text-[9px] sm:text-[10px] font-mono text-[#D2B48C] pointer-events-auto shadow-sm select-none whitespace-nowrap hover:bg-white/10 transition-colors shrink-0"
      title={`View detail: ${modeLabel} (${LOD_LABELS[perf.lodTier]}). Click to cycle Auto / High / Medium / Low / Minimal.\nView-only: creature growth is unaffected.\n${perf.triangles.toLocaleString()} triangles drawn (${perf.trianglesAtHigh.toLocaleString()} at High).`}
    >
      <Gauge className="w-3.5 h-3.5 text-[#87CEEB] shrink-0" />
      <span className="shrink-0">{perf.fps} FPS</span>
      <span className={`shrink-0 font-bold ${tierColor}`}>
        {modeLabel === "Auto" ? "" : "Fixed · "}{LOD_LABELS[perf.lodTier]}
      </span>
      <span className="hidden lg:inline shrink-0 opacity-70">{formatTris(perf.triangles)} tris</span>
      {reduced && savedPct > 0 && <span className="hidden xl:inline shrink-0 text-emerald-300/80">-{savedPct}%</span>}
    </button>
  );
}
