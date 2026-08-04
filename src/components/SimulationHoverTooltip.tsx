import React from "react";

export interface FormattedSpeciesInfo {
  hoveredStrain: any | null;
  biomassPercent: number;
  textStyle: React.CSSProperties;
  barStyle: React.CSSProperties;
}

export function formatHoveredSpeciesInfo(
  hoveredStrainName: string | null,
  stats?: any
): FormattedSpeciesInfo {
  const hoveredStrain =
    hoveredStrainName && stats?.strains
      ? stats.strains.find((s: any) => s.name === hoveredStrainName)
      : null;
  const totalBiomass =
    stats?.strains
      ? stats.strains.reduce((acc: number, s: any) => acc + s.biomass, 0) || 1
      : 1;
  const biomassPercent = hoveredStrain
    ? (hoveredStrain.biomass / totalBiomass) * 100
    : 0;

  let textStyle: React.CSSProperties = {};
  let barStyle: React.CSSProperties = {};
  if (hoveredStrain) {
    const hasGradient =
      hoveredStrain.color2 && hoveredStrain.color2 !== hoveredStrain.color;
    textStyle = hasGradient
      ? {
          backgroundImage: `linear-gradient(to right, ${hoveredStrain.color}, ${hoveredStrain.color2})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }
      : { color: hoveredStrain.color };
    barStyle = hasGradient
      ? {
          width: `${biomassPercent}%`,
          backgroundImage: `linear-gradient(to right, ${hoveredStrain.color}, ${hoveredStrain.color2})`,
        }
      : { width: `${biomassPercent}%`, backgroundColor: hoveredStrain.color };
  }

  return { hoveredStrain, biomassPercent, textStyle, barStyle };
}

export interface FormattedAgentInfo {
  lifespanPercent: number;
  lifespanColor: string;
  lifespanText: string;
}

export function formatHoveredAgentInfo(
  hoveredAgentInfo: { age: number; tapering: boolean; appendage?: string } | null
): FormattedAgentInfo {
  let lifespanPercent = 100;
  let lifespanColor = "bg-green-500";
  let lifespanText = "Optimal";
  if (hoveredAgentInfo) {
    const remaining = Math.max(
      5,
      Math.min(100, 100 - (hoveredAgentInfo.age / 400) * 100)
    );
    lifespanPercent = remaining;
    if (hoveredAgentInfo.tapering) {
      lifespanColor = "bg-gray-500";
      lifespanText = "Deleting";
    } else if (remaining <= 15 || hoveredAgentInfo.age >= 380) {
      lifespanColor = "bg-red-500 animate-pulse";
      lifespanText = "End of Life";
    } else if (remaining <= 50) {
      lifespanColor = "bg-yellow-500";
      lifespanText = "Maturing";
    } else {
      lifespanColor = "bg-green-500";
      lifespanText = "Flourishing";
    }
  }

  return { lifespanPercent, lifespanColor, lifespanText };
}

export function formatTooltipPosition(mousePos: { x: number; y: number }) {
  const popupLeft =
    typeof window !== "undefined" && mousePos.x + 180 > window.innerWidth
      ? mousePos.x - 170
      : mousePos.x + 15;
  const popupTop =
    typeof window !== "undefined" && mousePos.y + 140 > window.innerHeight
      ? mousePos.y - 130
      : mousePos.y + 15;
  return { popupLeft, popupTop };
}

export interface SimulationHoverTooltipProps {
  hoveredStrainName: string | null;
  hoveredAgentInfo: { age: number; tapering: boolean; appendage?: string } | null;
  mousePos: { x: number; y: number };
  stats?: any;
}

export function SimulationHoverTooltip({
  hoveredStrainName,
  hoveredAgentInfo,
  mousePos,
  stats,
}: SimulationHoverTooltipProps) {
  const { hoveredStrain, biomassPercent, textStyle, barStyle } =
    formatHoveredSpeciesInfo(hoveredStrainName, stats);
  const { lifespanPercent, lifespanColor, lifespanText } =
    formatHoveredAgentInfo(hoveredAgentInfo);
  const { popupLeft, popupTop } = formatTooltipPosition(mousePos);

  if (!hoveredStrain) {
    return null;
  }

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-[#001220]/95 border border-[#87CEEB]/50 p-3 shadow-2xl text-[#87CEEB] text-[10px] rounded min-w-[160px] max-w-[220px]"
      style={{ top: popupTop, left: popupLeft }}
    >
      <div className="flex justify-between items-center mb-1 font-bold pb-1 border-b border-[#87CEEB]/30">
        <span className="truncate mr-2" style={textStyle}>
          {hoveredStrain.name}
        </span>
        {hoveredStrain.isDying && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
        )}
      </div>
      <div className="flex justify-between mb-1 gap-2">
        <span>Archetype:</span>
        <span className="capitalize">{hoveredStrain.archetype || "unknown"}</span>
      </div>
      <div className="flex justify-between mb-1 gap-2">
        <span>Appendage:</span>
        <span className="capitalize">
          {hoveredStrain.appendage || hoveredAgentInfo?.appendage || "none"}
        </span>
      </div>
      <div className="flex justify-between mb-1 gap-2">
        <span>Biomass:</span>
        <span>{biomassPercent.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded mt-1.5 mb-2">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={barStyle as React.CSSProperties}
        />
      </div>
      <div className="flex justify-between mb-1 gap-2 border-t border-[#87CEEB]/20 pt-2">
        <span>Lifespan:</span>
        <span>{lifespanText}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded mt-1">
        <div
          className={`h-full transition-all duration-300 ease-out ${lifespanColor}`}
          style={{ width: `${lifespanPercent}%` }}
        />
      </div>
    </div>
  );
}

export default SimulationHoverTooltip;
