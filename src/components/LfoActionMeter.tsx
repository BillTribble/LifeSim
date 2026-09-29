import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computeLfoModulatedOverall } from "../lib/SimulationWindMotion";

interface LfoActionMeterProps {
  state: any;
}

export function LfoActionMeter({ state }: LfoActionMeterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posFillRef = useRef<HTMLDivElement>(null);
  const negFillRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const cycleBadgeRef = useRef<HTMLSpanElement>(null);

  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const eng = (typeof window !== "undefined" && (window as any).__LIFESIM_ENGINE__) || null;
      const source = eng || stateRef.current || {};
      const { lfoDelta, lfoMeterNorm, cycleLengthMult } = computeLfoModulatedOverall({
        overallMovement: source.overallMovement ?? stateRef.current?.overallMovement ?? 0.25,
        movementLfoSpeed: source.movementLfoSpeed ?? stateRef.current?.movementLfoSpeed ?? 0.35,
        movementLfoDepth: source.movementLfoDepth ?? stateRef.current?.movementLfoDepth ?? 0.65,
        movementLfoRandom: source.movementLfoRandom ?? stateRef.current?.movementLfoRandom ?? 50,
        movementLfoPhase: source.movementLfoPhase ?? 0.0,
        movementLfoCycleMult: source.movementLfoCycleMult ?? 1.0,
      });

      const clampedNorm = Math.max(-1.0, Math.min(1.0, lfoMeterNorm));
      const posPct = clampedNorm > 0 ? clampedNorm * 50 : 0;
      const negPct = clampedNorm < 0 ? Math.abs(clampedNorm) * 50 : 0;
      const pipTopPct = 50 - clampedNorm * 46;

      if (posFillRef.current) {
        posFillRef.current.style.height = `${posPct.toFixed(1)}%`;
      }
      if (negFillRef.current) {
        negFillRef.current.style.height = `${negPct.toFixed(1)}%`;
      }
      if (pipRef.current) {
        pipRef.current.style.top = `${pipTopPct.toFixed(1)}%`;
        pipRef.current.style.backgroundColor =
          clampedNorm > 0.02 ? "#34d399" : clampedNorm < -0.02 ? "#38bdf8" : "#e2e8f0";
      }
      if (readoutRef.current) {
        const sign = lfoDelta > 0.005 ? "+" : lfoDelta < -0.005 ? "-" : "±";
        readoutRef.current.textContent = `${sign}${Math.abs(lfoDelta).toFixed(2)}`;
        readoutRef.current.style.color =
          lfoDelta > 0.005 ? "#34d399" : lfoDelta < -0.005 ? "#38bdf8" : "#94a3b8";
      }
      if (cycleBadgeRef.current) {
        cycleBadgeRef.current.textContent = `LEN ${cycleLengthMult.toFixed(1)}x`;
      }

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
      className="flex flex-col items-center gap-0.5 relative select-none min-w-[54px] px-1"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setHover(false)}
    >
      {hover &&
        createPortal(
          <div
            className="fixed bg-[#001220]/95 border border-[#D2B48C]/50 text-white text-[10px] px-3 py-2 rounded pointer-events-none w-64 text-left z-[9999] shadow-xl font-sans leading-relaxed backdrop-blur-sm whitespace-pre-line"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {`LFO ± ACTION METER\nLive bipolar (+ / -) modulation added to overall MOVEMENT.\nTop (+): Strong wind gust surge.\nCenter (0): Base movement level.\nBottom (-): Calm wind lull.\nCycle Length resets randomly on each LFO repeat based on LFO_RAND %.`}
          </div>,
          document.body,
        )}

      <span className="text-[9px] text-white font-medium uppercase text-center leading-tight whitespace-nowrap">
        LFO ±
      </span>

      <div className="flex items-center gap-1 h-8">
        <div className="flex flex-col justify-between h-full text-[7px] font-mono leading-none text-[#D2B48C]/80 py-0.5">
          <span className="text-emerald-400 font-bold">+</span>
          <span className="opacity-60">0</span>
          <span className="text-sky-400 font-bold">-</span>
        </div>

        <div
          className="relative w-3.5 h-8 rounded-sm bg-[#001220]/90 border border-[#34d399]/50 overflow-hidden shadow-inner"
          style={{ boxShadow: "0 0 6px rgba(52, 211, 153, 0.2)" }}
        >
          {/* Center zero reference line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/40 z-10" />

          {/* Positive (+) upward bar fill from center */}
          <div
            ref={posFillRef}
            className="absolute left-0.5 right-0.5 bottom-1/2 bg-gradient-to-t from-emerald-500/70 to-emerald-300 rounded-t-[1px]"
            style={{ height: "0%" }}
          />

          {/* Negative (-) downward bar fill from center */}
          <div
            ref={negFillRef}
            className="absolute left-0.5 right-0.5 top-1/2 bg-gradient-to-b from-sky-500/70 to-sky-300 rounded-b-[1px]"
            style={{ height: "0%" }}
          />

          {/* Live moving horizontal indicator pip */}
          <div
            ref={pipRef}
            className="absolute left-0 right-0 h-[2px] -translate-y-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.9)] z-20"
            style={{ top: "50%" }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span
          ref={readoutRef}
          className="text-[8px] font-mono font-bold tracking-tight"
          style={{ color: "#34d399" }}
        >
          ±0.00
        </span>
        <span
          ref={cycleBadgeRef}
          className="text-[6px] font-mono text-[#D2B48C]/60 tracking-tighter mt-0.5"
        >
          LEN 1.0x
        </span>
      </div>
    </div>
  );
}
