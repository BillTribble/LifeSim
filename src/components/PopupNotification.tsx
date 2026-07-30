import React, { useEffect, useState } from "react";
import { Dna, Heart, Sparkles, GitBranch, X } from "lucide-react";
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

  // Determine targetPos and side for each item
  const mappedItems = queue.map((item) => {
    let targetPos: { x: number; y: number; isBehind?: boolean } | null = null;

    if (item.type === "organism1") {
      targetPos = trackedPositions?.org1 || null;
    } else if (item.type === "organism2") {
      targetPos = trackedPositions?.org2 || null;
    } else if (item.type === "mating") {
      targetPos = trackedPositions?.mating || null;
    } else if (item.type === "feeler") {
      targetPos = (trackedPositions as any)?.feeler || trackedPositions?.org1 || trackedPositions?.org2 || null;
    }

    let side: "left" | "right";
    if (item.type === "organism1") {
      const pos1X = trackedPositions?.org1?.x ?? 0;
      const pos2X = trackedPositions?.org2?.x ?? window.innerWidth;
      side = pos1X <= pos2X ? "left" : "right";
    } else if (item.type === "organism2") {
      const pos1X = trackedPositions?.org1?.x ?? 0;
      const pos2X = trackedPositions?.org2?.x ?? window.innerWidth;
      side = pos2X >= pos1X ? "right" : "left";
    } else {
      // Future event: side depends on whether event target is on left or right half of screen
      const screenX = targetPos?.x ?? (window.innerWidth / 2);
      side = screenX < (window.innerWidth / 2) ? "left" : "right";
    }

    return { item, targetPos, side };
  });

  const leftList = mappedItems.filter((i) => i.side === "left");
  const rightList = mappedItems.filter((i) => i.side === "right");

  return (
    <>
      {mappedItems.map(({ item, targetPos, side }) => {
        const sideList = side === "left" ? leftList : rightList;
        const indexInSideList = sideList.findIndex((i) => i.item.id === item.id);
        const stackIndex = sideList.length - 1 - indexInSideList;

        return (
          <PopupCardItem
            key={item.id}
            item={item}
            targetPos={targetPos}
            onDismiss={onDismiss}
            stackIndex={stackIndex}
            side={side}
          />
        );
      })}
    </>
  );
}

interface PopupCardItemProps {
  key?: string;
  item: PopupItem;
  targetPos: { x: number; y: number; isBehind?: boolean } | null;
  onDismiss: (id: string) => void;
  stackIndex: number;
  side: "left" | "right";
}

function PopupCardItem({ item, targetPos, onDismiss, stackIndex, side }: PopupCardItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry transition on mount
    const entryTimer = setTimeout(() => setVisible(true), 20);

    const duration = Math.max(10000, item.duration || 10000);

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

  // Compute cascading stack positioning and scaling
  const scale = Math.max(0.75, 1 - stackIndex * 0.05);
  const stackOpacity = Math.max(0.35, 1 - stackIndex * 0.15);
  const zIndex = Math.max(5, 20 - stackIndex * 5);

  let cardX: number;
  let cardY: number;
  let cx = targetPos?.x ?? 0;
  let cy = targetPos?.y ?? 0;

  if (isValidTarget) {
    cx = targetPos!.x;
    cy = targetPos!.y;

    const W = window.innerWidth;
    const marginX = 160;

    if (side === "left") {
      // Position card on the LEFT side of cx, halfway to the left edge of screen
      const halfWayLeft = cx * 0.5;
      cardX = Math.max(marginX, Math.min(cx - 150, halfWayLeft));
    } else {
      // Position card on the RIGHT side of cx, halfway to the right edge of screen
      const halfWayRight = cx + (W - cx) * 0.5;
      cardX = Math.min(W - marginX, Math.max(cx + 150, halfWayRight));
    }

    // Position cards lower down below the organisms so they never obscure 3D structures
    const targetY = cy + 135 + (stackIndex * 85);
    const marginYTop = 110;
    const marginYBottom = 60;
    cardY = Math.max(marginYTop, Math.min(window.innerHeight - marginYBottom, targetY));
  } else {
    // Default creature screen position estimate for non-targeted cards
    const defaultCx = side === "left" ? window.innerWidth * 0.25 : window.innerWidth * 0.75;
    cx = defaultCx;
    cy = window.innerHeight / 2;

    const baseCardY = window.innerHeight - 80;
    const verticalShift = stackIndex * 75;
    cardY = baseCardY - verticalShift;
    cardX = side === "left"
      ? Math.max(160, window.innerWidth * 0.20)
      : Math.min(window.innerWidth - 160, window.innerWidth * 0.80);
  }

  // Anchor line point on top/edge of card
  const anchorPointX = cardX < cx ? cardX + 100 : cardX - 100;
  const anchorPointY = cardY - 25;

  return (
    <>
      {/* Clean Vector Line Indicator with Smooth Fade */}
      {isValidTarget && (
        <svg
          style={{ zIndex: zIndex - 1 }}
          className={`fixed inset-0 w-full h-full pointer-events-none overflow-visible transition-all duration-500 ease-in-out ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <defs>
            <linearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={stackOpacity * 0.85} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={stackOpacity * 0.35} />
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
          <circle cx={cx} cy={cy} r="8" fill="none" stroke={strokeColor} strokeWidth="1.2" opacity={stackOpacity * 0.6} />
          <circle cx={cx} cy={cy} r="4" fill={strokeColor} stroke="#ffffff" strokeWidth="1" />

          {/* Anchor Dot at Card */}
          <circle cx={anchorPointX} cy={anchorPointY} r="3" fill={strokeColor} />
        </svg>
      )}

      {/* Pop-up Window Card with Cascading Stack Shift and Scale */}
      <div
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          zIndex,
          transform: `translate(-50%, -50%) scale(${visible ? scale : 0.95})`,
          opacity: visible ? stackOpacity : 0,
          transition: "top 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease, scale 0.45s ease",
        }}
        className="fixed w-[270px] sm:w-[300px] pointer-events-auto"
      >
        <div
          className="bg-[#001220]/95 backdrop-blur-xl border rounded-xl p-3 shadow-2xl shadow-purple-950/70 text-[#D2B48C] font-mono relative overflow-hidden"
          style={{ borderColor: `${strokeColor}70` }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors z-10"
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
            Organism contact established. New hybrid species formed.
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
            {item.feelerData.parent.name.split(' ')[0]} extended a sensory feeler to initiate hybridization.
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

  return null;
}
