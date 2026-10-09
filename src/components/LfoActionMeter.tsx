import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computeLfoModulatedOverall } from "../lib/SimulationWindMotion";

interface LfoActionMeterProps {
  state: any;
}

export function LfoActionMeter({ state }: LfoActionMeterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lfoFillRef = useRef<HTMLDivElement>(null);
  const lfoPipRef = useRef<HTMLDivElement>(null);
  const lfoReadoutRef = useRef<HTMLSpanElement>(null);

  const randBoxRef = useRef<HTMLDivElement>(null);
  const randFillRef = useRef<HTMLDivElement>(null);
  const randPipRef = useRef<HTMLDivElement>(null);
  const randReadoutRef = useRef<HTMLSpanElement>(null);
  const cycleBadgeRef = useRef<HTMLSpanElement>(null);

  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastCycleCountRef = useRef<number>(-1);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const eng = (typeof window !== "undefined" && (window as any).__LIFESIM_ENGINE__) || null;
      const source = eng || stateRef.current || {};
      const {
        lfoDelta,
        lfoMeterNorm,
        cycleLengthMult,
        cycleRandomInfluence,
        cycleGustMult,
        cycleRandomMeterNorm,
      } = computeLfoModulatedOverall({
        overallMovement: source.overallMovement ?? stateRef.current?.overallMovement ?? 0.40,
        branchMovement: source.branchMovement ?? stateRef.current?.branchMovement ?? 0.32,
        movementLfoSpeed: source.movementLfoSpeed ?? stateRef.current?.movementLfoSpeed ?? 0.14,
        movementLfoDepth: source.movementLfoDepth ?? stateRef.current?.movementLfoDepth ?? 0.12,
        movementLfoPeak: source.movementLfoPeak ?? stateRef.current?.movementLfoPeak ?? 0.42,
        movementLfoRandom: source.movementLfoRandom ?? stateRef.current?.movementLfoRandom ?? 73,
        movementLfoPhase: source.movementLfoPhase ?? 0.0,
        movementLfoCycleMult: source.movementLfoCycleMult ?? 1.0,
        movementLfoCycleRand: source.movementLfoCycleRand ?? 0.65,
      });

      // LFO + Positive-Only Meter (0% to 100% filling upward from bottom)
      const clampedNorm = Math.max(0.0, Math.min(1.0, lfoMeterNorm));
      const lfoFillPct = clampedNorm * 100;
      const lfoPipTopPct = 100 - clampedNorm * 92;

      if (lfoFillRef.current) {
        lfoFillRef.current.style.height = `${lfoFillPct.toFixed(1)}%`;
      }
      if (lfoPipRef.current) {
        lfoPipRef.current.style.top = `${lfoPipTopPct.toFixed(1)}%`;
        lfoPipRef.current.style.backgroundColor = clampedNorm > 0.02 ? "#34d399" : "#94a3b8";
      }
      if (lfoReadoutRef.current) {
        lfoReadoutRef.current.textContent = `+${Math.max(0, lfoDelta).toFixed(2)}`;
        lfoReadoutRef.current.style.color = lfoDelta > 0.005 ? "#34d399" : "#94a3b8";
      }

      // RAND Meter (0% to 100% based on cycleRandomMeterNorm)
      const clampedRand = Math.max(0.0, Math.min(1.0, cycleRandomMeterNorm));
      const randFillPct = clampedRand * 100;
      const randPipTopPct = 100 - clampedRand * 92;

      if (randFillRef.current) {
        randFillRef.current.style.height = `${randFillPct.toFixed(1)}%`;
      }
      if (randPipRef.current) {
        randPipRef.current.style.top = `${randPipTopPct.toFixed(1)}%`;
        randPipRef.current.style.backgroundColor = clampedRand > 0.02 ? "#fbbf24" : "#94a3b8";
      }
      if (randReadoutRef.current) {
        if (cycleRandomInfluence > 0.005) {
          randReadoutRef.current.textContent = `+${Math.round(cycleRandomInfluence * 100)}%`;
          randReadoutRef.current.style.color = "#fbbf24";
        } else {
          randReadoutRef.current.textContent = "0%";
          randReadoutRef.current.style.color = "#94a3b8";
        }
      }
      if (cycleBadgeRef.current) {
        cycleBadgeRef.current.textContent = `LEN ${cycleLengthMult.toFixed(1)}x`;
      }

      // Pulse border when a new cycle rolls in
      const cycleCount = source.movementLfoCycleCount ?? 0;
      if (lastCycleCountRef.current !== -1 && cycleCount !== lastCycleCountRef.current) {
        if (randBoxRef.current) {
          randBoxRef.current.style.borderColor = "#fbbf24";
          randBoxRef.current.style.boxShadow = "0 0 10px rgba(251, 191, 36, 0.9)";
          setTimeout(() => {
            if (randBoxRef.current) {
              randBoxRef.current.style.borderColor = "rgba(251, 191, 36, 0.5)";
              randBoxRef.current.style.boxShadow = "0 0 6px rgba(251, 191, 36, 0.2)";
            }
          }, 400);
        }
      }
      lastCycleCountRef.current = cycleCount;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const onMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    }
    setHover(true);
  };

  return (
    <div
      ref={containerRef}
      data-testid="lfo-action-meter"
      className="flex items-center gap-2 relative select-none px-1"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setHover(false)}
    >
      {hover &&
        createPortal(
          <div
            className="fixed bg-[#001220]/95 border border-[#D2B48C]/50 text-white text-[10px] px-3 py-2 rounded pointer-events-none w-72 text-left z-[9999] shadow-xl font-sans leading-relaxed backdrop-blur-sm whitespace-pre-line"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {`LFO + ACTION METER
Live unipolar (+) wind surge modulation added to BRANCH_MOVE only (does not affect SHIMMER or WAVY).
Top (+): Peak branch movement gust surge.
Bottom (0): Flat baseline lull (strictly positive additions).
LFO_PEAK shapes the wave into a narrow squashed curved sine peak (default 1/3 width) with a flat baseline lull between gusts.

CYC RAND METER
Current cycle's random influence rolled from LFO_RAND %.
Adds up to +85% extra wind gust surge (1.0x - 1.85x).
Cycle length (LEN) and random gust boost re-roll cleanly each cycle.`}
          </div>,
          document.body,
        )}

      {/* Meter 1: LFO + Positive Surge Meter */}
      <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
        <span className="text-[9px] text-white font-medium uppercase text-center leading-tight whitespace-nowrap">
          LFO +
        </span>

        <div className="flex items-center gap-1 h-8">
          <div className="flex flex-col justify-between h-full text-[7px] font-mono leading-none text-[#D2B48C]/80 py-0.5">
            <span className="text-emerald-400 font-bold">+</span>
            <span className="opacity-60">0</span>
          </div>

          <div
            className="relative w-3.5 h-8 rounded-sm bg-[#001220]/90 border border-[#34d399]/50 overflow-hidden shadow-inner"
            style={{ boxShadow: "0 0 6px rgba(52, 211, 153, 0.2)" }}
          >
            {/* Positive upward bar fill from bottom */}
            <div
              ref={lfoFillRef}
              className="absolute left-0.5 right-0.5 bottom-0 bg-gradient-to-t from-emerald-600/70 via-emerald-400/80 to-emerald-200 rounded-t-[1px]"
              style={{ height: "0%" }}
            />

            {/* Live moving horizontal indicator pip */}
            <div
              ref={lfoPipRef}
              className="absolute left-0 right-0 h-[2px] -translate-y-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.9)] z-20"
              style={{ top: "100%" }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center leading-none">
          <span
            ref={lfoReadoutRef}
            className="text-[8px] font-mono font-bold tracking-tight text-emerald-400"
          >
            +0.00
          </span>
          <span className="text-[6px] font-mono text-[#D2B48C]/60 tracking-tighter mt-0.5">
            SURGE
          </span>
        </div>
      </div>

      {/* Meter 2: RAND Per-Cycle Random Influence Meter */}
      <div
        data-testid="lfo-random-meter"
        className="flex flex-col items-center gap-0.5 min-w-[48px]"
      >
        <span className="text-[9px] text-[#fbbf24] font-medium uppercase text-center leading-tight whitespace-nowrap">
          CYC RAND
        </span>

        <div className="flex items-center gap-1 h-8">
          <div className="flex flex-col justify-between h-full text-[7px] font-mono leading-none text-[#D2B48C]/80 py-0.5">
            <span className="text-amber-400 font-bold">+</span>
            <span className="opacity-60">0</span>
          </div>

          <div
            ref={randBoxRef}
            className="relative w-3.5 h-8 rounded-sm bg-[#001220]/90 border border-amber-400/50 overflow-hidden shadow-inner transition-colors duration-300"
            style={{ boxShadow: "0 0 6px rgba(251, 191, 36, 0.2)" }}
          >
            {/* Warm amber bar fill from bottom */}
            <div
              ref={randFillRef}
              className="absolute left-0.5 right-0.5 bottom-0 bg-gradient-to-t from-amber-600/70 via-amber-400/80 to-amber-200 rounded-t-[1px]"
              style={{ height: "0%" }}
            />

            {/* Live moving horizontal indicator pip at rolled random level */}
            <div
              ref={randPipRef}
              className="absolute left-0 right-0 h-[2px] -translate-y-1/2 bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.9)] z-20"
              style={{ top: "100%" }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center leading-none">
          <span
            ref={randReadoutRef}
            className="text-[8px] font-mono font-bold tracking-tight text-amber-400"
          >
            +0%
          </span>
          <span
            ref={cycleBadgeRef}
            className="text-[6px] font-mono text-[#D2B48C]/60 tracking-tighter mt-0.5"
          >
            LEN 1.0x
          </span>
        </div>
      </div>
    </div>
  );
}
