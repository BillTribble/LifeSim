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
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!queue || queue.length === 0) return null;

  const isMobile = viewportWidth < 640;

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
            isMobile={isMobile}
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
  isMobile: boolean;
}

function PopupCardItem({ item, targetPos, onDismiss, stackIndex, side, isMobile }: PopupCardItemProps) {
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

  const W = typeof window !== "undefined" ? window.innerWidth : 1024;
  const H = typeof window !== "undefined" ? window.innerHeight : 768;
  const marginX = isMobile ? 68 : 96;
  const stackStepY = isMobile ? 24 : 28;

  if (isValidTarget) {
    cx = targetPos!.x;
    cy = targetPos!.y;

    if (side === "left") {
      const halfWayLeft = cx * 0.5;
      cardX = Math.max(marginX, Math.min(cx - (isMobile ? 48 : 72), halfWayLeft));
    } else {
      const halfWayRight = cx + (W - cx) * 0.5;
      cardX = Math.min(W - marginX, Math.max(cx + (isMobile ? 48 : 72), halfWayRight));
    }

    const targetY = cy + (isMobile ? 64 : 76) + stackIndex * stackStepY;
    const marginYTop = 80;
    const marginYBottom = 48;
    cardY = Math.max(marginYTop, Math.min(H - marginYBottom, targetY));
  } else {
    cx = side === "left" ? W * 0.3 : W * 0.7;
    cy = H * 0.45;

    const baseCardY = H - 80;
    cardY = baseCardY - stackIndex * stackStepY;
    cardX = side === "left"
      ? Math.max(marginX, W * 0.25)
      : Math.min(W - marginX, W * 0.75);
  }

  // Anchor line point directly above minimal title text on all viewport sizes
  const anchorPointX = cardX;
  const anchorPointY = cardY - (isMobile ? 9 : 11);
  const showLine = isValidTarget || !targetPos?.isBehind;

  return (
    <>
      {/* Clean Vector Line Indicator with Smooth Fade */}
      {showLine && (
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

          {/* Solid Vector Line connecting creature target (cx, cy) to title anchor */}
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

          {/* Anchor Dot at Title */}
          <circle cx={anchorPointX} cy={anchorPointY} r={isMobile ? "2.5" : "3"} fill={strokeColor} />
        </svg>
      )}

      {/* Minimal transparent title only (no opaque panel) across all viewport sizes */}
      <div
        data-popup-notification="true"
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          zIndex,
          transform: `translate(-50%, -50%) scale(${visible ? scale : 0.95})`,
          opacity: visible ? stackOpacity : 0,
          transition: "top 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease, scale 0.45s ease",
        }}
        className="fixed bg-transparent pointer-events-none"
      >
        <div className="bg-transparent text-[10px] sm:text-xs font-mono font-medium text-white whitespace-nowrap tracking-wide">
          {item.title}
        </div>
      </div>
    </>
  );
}
