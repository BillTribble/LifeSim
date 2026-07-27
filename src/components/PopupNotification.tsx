import React, { useEffect, useState } from "react";
import { Sparkles, Dna, Heart, X } from "lucide-react";
import { Genome } from "../lib/SimulationTypes";

export interface PopupItem {
  id: string;
  type: "welcome" | "organism1" | "organism2" | "mating";
  title: string;
  subtitle: string;
  genome?: Genome;
  matingData?: {
    parent1: Genome;
    parent2: Genome;
    child: Genome;
  };
  duration?: number;
  angleDeg?: number;
  distancePx?: number;
}

export interface TrackedPositions {
  org1?: { x: number; y: number; isBehind?: boolean } | null;
  org2?: { x: number; y: number; isBehind?: boolean } | null;
  mating?: { x: number; y: number; isBehind?: boolean } | null;
}

interface PopupNotificationProps {
  queue: PopupItem[];
  trackedPositions?: TrackedPositions | null;
  onDismiss: (id: string) => void;
}

export function PopupNotification({ queue, trackedPositions, onDismiss }: PopupNotificationProps) {
  if (!queue || queue.length === 0) return null;

  return (
    <>
      {queue.map((item) => {
        let targetPos: { x: number; y: number } | null = null;
        let angleDeg = item.angleDeg ?? -90;
        const distancePx = item.distancePx ?? 200;

        if (item.type === "organism1") {
          targetPos = trackedPositions?.org1 || null;
          angleDeg = item.angleDeg ?? -135;
        } else if (item.type === "organism2") {
          targetPos = trackedPositions?.org2 || null;
          angleDeg = item.angleDeg ?? -45;
        } else if (item.type === "mating") {
          targetPos = trackedPositions?.mating || null;
          angleDeg = item.angleDeg ?? -90;
        }

        return (
          <PopupCardItem
            key={item.id}
            item={item}
            targetPos={targetPos}
            angleDeg={angleDeg}
            distancePx={distancePx}
            onDismiss={onDismiss}
          />
        );
      })}
    </>
  );
}

interface PopupCardItemProps {
  item: PopupItem;
  targetPos: { x: number; y: number } | null;
  angleDeg: number;
  distancePx: number;
  onDismiss: (id: string) => void;
}

function PopupCardItem({ item, targetPos, angleDeg, distancePx, onDismiss }: PopupCardItemProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setVisible(true);
    setProgress(100);

    const duration = item.duration || 8000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, intervalTime);

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 450);
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(dismissTimer);
    };
  }, [item.id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onDismiss(item.id), 450);
  };

  const getHexColor = (colorObj?: any) => {
    if (!colorObj) return "#87CEEB";
    if (typeof colorObj.getHexString === "function") return "#" + colorObj.getHexString();
    return colorObj.toString();
  };

  const strokeColor =
    item.type === "mating"
      ? "#ec4899"
      : item.genome
      ? getHexColor(item.genome.color)
      : "#a855f7";

  // Position calculation: creature target point (cx, cy)
  const cx = targetPos ? targetPos.x : window.innerWidth / 2;
  const cy = targetPos ? targetPos.y : window.innerHeight / 2;

  // Offset 200px away on desktop
  const rad = (angleDeg * Math.PI) / 180;
  const preferredX = cx + distancePx * Math.cos(rad);
  const preferredY = cy + distancePx * Math.sin(rad);

  // Clamp card center inside screen bounds with padding
  const cardWidth = 300;
  const cardHeight = 170;
  const cardX = Math.max(cardWidth / 2 + 12, Math.min(window.innerWidth - cardWidth / 2 - 12, preferredX));
  const cardY = Math.max(cardHeight / 2 + 50, Math.min(window.innerHeight - cardHeight / 2 - 16, preferredY));

  return (
    <>
      {/* Real-time Vector Line Indicator */}
      {targetPos && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
          <defs>
            <linearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Connecting Vector Line from Creature Target (cx, cy) to Card Center (cardX, cardY) */}
          <line
            x1={cx}
            y1={cy}
            x2={cardX}
            y2={cardY}
            stroke={`url(#grad-${item.id})`}
            strokeWidth="2"
            strokeDasharray="6 3"
          />

          {/* Pulsing Target Point on 3D Creature */}
          <circle cx={cx} cy={cy} r="12" fill="none" stroke={strokeColor} strokeWidth="1.5" className="animate-ping opacity-75" />
          <circle cx={cx} cy={cy} r="6" fill={strokeColor} fillOpacity="0.3" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />

          {/* Anchor Dot at Card Center */}
          <circle cx={cardX} cy={cardY} r="3.5" fill={strokeColor} />
        </svg>
      )}

      {/* Pop-up Window Card */}
      <div
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          transform: "translate(-50%, -50%)",
        }}
        className={`fixed z-50 w-[280px] sm:w-[310px] transition-all duration-500 ease-out pointer-events-auto ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          className="bg-[#001220]/95 backdrop-blur-xl border rounded-xl p-3.5 shadow-2xl shadow-purple-950/70 text-[#D2B48C] font-mono relative overflow-hidden"
          style={{ borderColor: `${strokeColor}70` }}
        >
          {/* 8-second Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full transition-all duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                backgroundColor: strokeColor,
              }}
            />
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Content based on type */}
          {currentContent(item, getHexColor)}
        </div>
      </div>
    </>
  );
}

function currentContent(item: PopupItem, getHexColor: (c: any) => string) {
  if (item.type === "welcome") {
    return (
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-300 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 animate-pulse text-purple-300" />
        </div>
        <div className="flex-1 pr-3">
          <div className="text-[9px] font-bold tracking-widest text-purple-400 uppercase">
            {item.subtitle}
          </div>
          <h3 className="text-xs font-bold text-white mb-0.5">
            {item.title}
          </h3>
          <p className="text-[10px] text-[#D2B48C]/80 leading-snug">
            Welcome to LifeSim! Founder organisms established. Real-time vector indicators link phenotypes to creatures 200px away.
          </p>
        </div>
      </div>
    );
  }

  if ((item.type === "organism1" || item.type === "organism2") && item.genome) {
    const hex = getHexColor(item.genome.color);
    return (
      <div className="flex items-start gap-2.5">
        <div
          className="p-1.5 rounded-lg border shrink-0 mt-0.5 shadow-md flex items-center justify-center"
          style={{
            backgroundColor: `${hex}25`,
            borderColor: hex,
          }}
        >
          <Dna className="w-4 h-4" style={{ color: hex }} />
        </div>
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: hex }}>
              {item.subtitle}
            </span>
            <span
              className="w-2 h-2 rounded-full inline-block border border-white/30"
              style={{ backgroundColor: hex }}
            />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">
            {item.title}
          </h3>

          <div className="grid grid-cols-2 gap-1 text-[9px] bg-black/40 p-1.5 rounded border border-white/10">
            <div>
              <span className="text-purple-300/70">ARCHETYPE:</span>{" "}
              <span className="text-white font-bold uppercase">{item.genome.archetype}</span>
            </div>
            <div>
              <span className="text-purple-300/70">STEM FORM:</span>{" "}
              <span className="text-white">
                {item.genome.thicknessBase > 3.0 ? "Stout" : "Slender"} ({item.genome.thicknessBase.toFixed(1)})
              </span>
            </div>
            <div>
              <span className="text-purple-300/70">VERNATION:</span>{" "}
              <span className="text-cyan-300 capitalize">{item.genome.vernationType || "Circinate"}</span>
            </div>
            <div>
              <span className="text-purple-300/70">PHYLLOTAXIS:</span>{" "}
              <span className="text-cyan-300 capitalize">{item.genome.phyllotaxisMode || "Spiral"}</span>
            </div>
            <div>
              <span className="text-purple-300/70">CANOPY:</span>{" "}
              <span className="text-pink-300 capitalize">{item.genome.canopyZone || "Whole"}</span>
            </div>
            <div>
              <span className="text-purple-300/70">APPENDAGE:</span>{" "}
              <span className="text-green-300 capitalize">{item.genome.appendage || "Leaves"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "mating" && item.matingData) {
    const parent1Hex = getHexColor(item.matingData.parent1.color);
    const parent2Hex = getHexColor(item.matingData.parent2.color);
    const childHex = getHexColor(item.matingData.child.color);

    return (
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-pink-500/20 border border-pink-400/50 text-pink-300 shrink-0 mt-0.5 animate-bounce">
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400/40" />
        </div>
        <div className="flex-1 pr-3">
          <div className="text-[9px] font-bold tracking-widest text-pink-400 uppercase">
            {item.subtitle}
          </div>
          <h3 className="text-xs font-bold text-white mb-0.5">
            {item.title}
          </h3>
          <p className="text-[10px] text-[#D2B48C]/90 mb-1.5 leading-snug">
            Organisms touched and cross-bred, producing a new hybrid species!
          </p>

          <div className="flex flex-wrap items-center gap-1.5 text-[9px] bg-black/40 p-1.5 rounded border border-pink-500/30">
            <div className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40"
                style={{ backgroundColor: parent1Hex }}
              />
              <span className="text-white">{item.matingData.parent1.name.split(' ')[0]}</span>
            </div>
            <span className="text-pink-400 font-bold">+</span>
            <div className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40"
                style={{ backgroundColor: parent2Hex }}
              />
              <span className="text-white">{item.matingData.parent2.name.split(' ')[0]}</span>
            </div>
            <span className="text-pink-400 font-bold">➔</span>
            <div className="flex items-center gap-1 border border-pink-400/50 px-1 py-0.5 rounded bg-pink-500/20">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 animate-pulse"
                style={{ backgroundColor: childHex }}
              />
              <span className="text-pink-200 font-bold">{item.matingData.child.name}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
