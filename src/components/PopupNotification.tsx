import React, { useEffect, useState } from "react";
import { Dna, Heart, Sparkles, X } from "lucide-react";
import { Genome } from "../lib/SimulationTypes";

export interface PopupItem {
  id: string;
  type: "organism1" | "organism2" | "mating" | "feeler";
  title: string;
  subtitle: string;
  genome?: Genome;
  matingData?: {
    parent1: Genome;
    parent2: Genome;
    child: Genome;
  };
  feelerData?: {
    parent: Genome;
    feeler: Genome;
  };
  duration?: number;
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

        if (item.type === "organism1") {
          targetPos = trackedPositions?.org1 || null;
        } else if (item.type === "organism2") {
          targetPos = trackedPositions?.org2 || null;
        } else if (item.type === "mating") {
          targetPos = trackedPositions?.mating || null;
        } else if (item.type === "feeler") {
          targetPos = trackedPositions?.org1 || trackedPositions?.org2 || null;
        }

        return (
          <PopupCardItem
            key={item.id}
            item={item}
            targetPos={targetPos}
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
  onDismiss: (id: string) => void;
}

function PopupCardItem({ item, targetPos, onDismiss }: PopupCardItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry transition on mount
    const entryTimer = setTimeout(() => setVisible(true), 20);

    const duration = item.duration || 8000;

    // Smooth exit transition before dismiss
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 750); // 750ms matches smooth CSS fade duration
    }, duration);

    return () => {
      clearTimeout(entryTimer);
      clearTimeout(dismissTimer);
    };
  }, [item.id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onDismiss(item.id), 750);
  };

  const getHexColor = (colorObj?: any) => {
    if (!colorObj) return "#87CEEB";
    if (typeof colorObj.getHexString === "function") return "#" + colorObj.getHexString();
    return colorObj.toString();
  };

  const strokeColor =
    item.type === "mating"
      ? "#ec4899"
      : item.type === "feeler"
      ? "#00e5ff"
      : item.genome
      ? getHexColor(item.genome.color)
      : "#a855f7";

  // Validate 3D-to-2D projected creature target point (cx, cy)
  const isValidTarget =
    targetPos &&
    Number.isFinite(targetPos.x) &&
    Number.isFinite(targetPos.y) &&
    !targetPos.isBehind &&
    (targetPos.x > 5 || targetPos.y > 5);

  // Default creature screen X position estimate
  const defaultCx = item.type === "organism1" ? window.innerWidth * 0.75 : window.innerWidth * 0.25;
  const cx = isValidTarget ? targetPos.x : defaultCx;
  const cy = isValidTarget ? targetPos.y : window.innerHeight / 2;

  // Uncrossed card positioning: place card on screen left if creature is on left half, screen right if creature is on right half
  const isLeftHalf = cx < window.innerWidth / 2;
  let cardX = window.innerWidth / 2;
  let cardY = window.innerHeight - 110;
  let anchorPointX = cardX;
  let anchorPointY = cardY - 45;

  if (item.type === "organism1" || item.type === "organism2") {
    if (isLeftHalf) {
      cardX = Math.min(185, window.innerWidth * 0.25);
      cardY = window.innerHeight - 110;
      anchorPointX = cardX + 110;
      anchorPointY = cardY - 30;
    } else {
      cardX = Math.max(window.innerWidth - 185, window.innerWidth * 0.75);
      cardY = window.innerHeight - 110;
      anchorPointX = cardX - 110;
      anchorPointY = cardY - 30;
    }
  } else if (item.type === "mating" || item.type === "feeler") {
    cardX = window.innerWidth / 2;
    cardY = window.innerHeight - 110;
    anchorPointX = cardX;
    anchorPointY = cardY - 45;
  }

  return (
    <>
      {/* Clean Vector Line Indicator with Smooth Fade */}
      {isValidTarget && (
        <svg
          className={`fixed inset-0 w-full h-full pointer-events-none z-40 overflow-visible transition-opacity duration-700 ease-in-out ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <defs>
            <linearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Solid Vector Line connecting creature target (cx, cy) to card edge anchor */}
          <line
            x1={cx}
            y1={cy}
            x2={anchorPointX}
            y2={anchorPointY}
            stroke={`url(#grad-${item.id})`}
            strokeWidth="1.5"
          />

          {/* Clean Target Dot on Creature */}
          <circle cx={cx} cy={cy} r="8" fill="none" stroke={strokeColor} strokeWidth="1.2" opacity="0.6" />
          <circle cx={cx} cy={cy} r="4" fill={strokeColor} stroke="#ffffff" strokeWidth="1" />

          {/* Anchor Dot at Card */}
          <circle cx={anchorPointX} cy={anchorPointY} r="3" fill={strokeColor} />
        </svg>
      )}

      {/* Pop-up Window Card with Smooth Fade */}
      <div
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          transform: "translate(-50%, -50%)",
        }}
        className={`fixed z-50 w-[270px] sm:w-[300px] transition-all duration-700 ease-in-out pointer-events-auto ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          className="bg-[#001220]/95 backdrop-blur-xl border rounded-xl p-3 shadow-2xl shadow-purple-950/70 text-[#D2B48C] font-mono relative overflow-hidden"
          style={{ borderColor: `${strokeColor}70` }}
        >
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
        <div className="p-1.5 rounded-lg bg-pink-500/20 border border-pink-400/50 text-pink-300 shrink-0 mt-0.5">
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
                className="w-2.5 h-2.5 rounded-full border border-white/40"
                style={{ backgroundColor: childHex }}
              />
              <span className="text-pink-200 font-bold">{item.matingData.child.name}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "feeler" && item.feelerData) {
    const parentHex = getHexColor(item.feelerData.parent.color);

    return (
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 pr-3">
          <div className="text-[9px] font-bold tracking-widest text-cyan-400 uppercase">
            {item.subtitle}
          </div>
          <h3 className="text-xs font-bold text-white mb-0.5">
            {item.title}
          </h3>
          <p className="text-[10px] text-[#D2B48C]/90 mb-1.5 leading-snug">
            {item.feelerData.parent.name.split(' ')[0]} extended a fast feeler tendril seeking a mate to hybridize!
          </p>

          <div className="flex items-center gap-1 text-[9px] bg-black/40 p-1.5 rounded border border-cyan-500/30">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40"
              style={{ backgroundColor: parentHex }}
            />
            <span className="text-white font-bold">{item.feelerData.parent.name}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
