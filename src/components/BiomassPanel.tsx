import React, { useState } from "react";
import { Share2, ChevronDown } from "lucide-react";

export interface BiomassPanelProps {
  stats: any;
  totalBiomass: number;
  state: any;
  showHUD: boolean;
}

export function BiomassPanel({ stats, totalBiomass, state, showHUD }: BiomassPanelProps) {
  const [isBiomassCollapsed, setIsBiomassCollapsed] = useState(() => window.innerWidth < 640);

  return (
    <div className={`flex-1 flex flex-col items-start pointer-events-none transition-all duration-500 ${showHUD ? "opacity-100 visible pointer-events-none" : "opacity-0 invisible pointer-events-none"}`}>
      <div className="border border-[#D2B48C]/30 p-2 sm:p-3 bg-[#001220]/60 backdrop-blur-sm pointer-events-auto shadow-lg w-36 sm:w-48 mt-1 max-h-[calc(100vh-140px)] flex flex-col">
        <h2 
          className="text-[8px] font-mono mb-2 text-[#87CEEB] flex items-center justify-between gap-1.5 tracking-widest cursor-pointer select-none shrink-0"
          onClick={() => setIsBiomassCollapsed(!isBiomassCollapsed)}
        >
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3 h-3" />
            BIOMASS ({stats.strains.filter((s: any) => !s.name.startsWith("Feeler-")).length})
          </div>
          <div className="flex items-center gap-1.5">
            <ChevronDown className={`w-3 h-3 transition-transform ${isBiomassCollapsed ? "rotate-180" : ""}`} />
          </div>
        </h2>
        {!isBiomassCollapsed && (
          <div className="space-y-3 text-[8px] sm:text-[9px] font-mono overflow-y-auto custom-scrollbar pr-1 flex-1">
            {(() => {
              const filteredStrains = stats.strains.filter((s: any) => !s.name.startsWith("Feeler-"));
              const archetypeTotals: Record<string, number> = {};
              filteredStrains.forEach((s: any) => {
                const arch = s.archetype || "unknown";
                archetypeTotals[arch] = (archetypeTotals[arch] || 0) + s.biomass;
              });
              return Object.entries(archetypeTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([arch, mass]) => {
                  const pct = ((mass / totalBiomass) * 100).toFixed(1);
                  return (
                    <div key={arch} className="flex justify-between text-[#87CEEB] opacity-80 border-b border-[#87CEEB]/20 pb-1 mb-1">
                      <span className="capitalize">{arch}</span>
                      <span>{pct}%</span>
                    </div>
                  );
                });
            })()}
            {stats.strains.filter((s: any) => !s.name.startsWith("Feeler-")).map((strain: any, i: number) => {
              const percent = (strain.biomass / totalBiomass) * 100;
              const hasGradient =
                strain.color2 && strain.color2 !== strain.color;
              const textStyle = hasGradient
                ? {
                    backgroundImage: `linear-gradient(to right, ${strain.color}, ${strain.color2})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }
                : { color: strain.color };
              const barStyle = hasGradient
                ? {
                    width: `${percent}%`,
                    backgroundImage: `linear-gradient(to right, ${strain.color}, ${strain.color2})`,
                  }
                : { width: `${percent}%`, backgroundColor: strain.color };

              return (
                <div
                  key={i}
                  className="group relative cursor-pointer pointer-events-auto"
                >
                  <div className="flex justify-between mb-0.5 items-center">
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <span className="truncate" style={textStyle}>
                        {strain.name}
                      </span>
                      {strain.isDying && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.8)]" 
                          title="Marked for gradual die-off"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span 
                        className={`text-[7px] px-1 py-0.2 rounded font-mono font-bold ${
                          (strain.matingCount || 0) > 0 
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" 
                            : "bg-white/5 text-[#87CEEB]/50"
                        }`} 
                        title={`Hybridizations: ${strain.matingCount || 0} / ${state.maxMatings || 1}`}
                      >
                        ⚡{strain.matingCount || 0}
                      </span>
                      <span>{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={barStyle as React.CSSProperties}
                    />
                  </div>
                  {strain.genome && (
                    <div className="fixed left-40 sm:left-48 top-32 hidden group-hover:flex flex-col bg-[#001220]/95 border border-[#87CEEB]/50 p-3 z-[9999] min-w-[200px] shadow-2xl text-[#87CEEB] text-[9px] sm:text-[10px] pointer-events-none rounded whitespace-nowrap">
                      <div className="font-bold text-[10px] sm:text-[11px] border-b border-[#87CEEB]/30 pb-1 mb-1 shadow-sm">
                        {strain.name} traits
                      </div>
                      <div className="flex justify-between">
                        <span>Hybrids:</span>
                        <span className="font-mono text-[#87CEEB]">
                          {strain.matingCount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Color:</span>
                        <span style={{ color: strain.color }}>
                          {strain.color}
                        </span>
                      </div>
                      {strain.color2 && strain.color2 !== strain.color && (
                        <div className="flex justify-between">
                          <span>Tip Color:</span>
                          <span style={{ color: strain.color2 }}>
                            {strain.color2}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Thickness:</span>
                        <span>
                          {strain.genome.thicknessBase?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thickness Decay:</span>
                        <span>
                          {strain.genome.thicknessDecay?.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min Thickness:</span>
                        <span>
                          {strain.genome.minThickness?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Step Size:</span>
                        <span>{strain.genome.stepSize?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wander:</span>
                        <span>
                          {strain.genome.wanderIntensity?.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bifurcation:</span>
                        <span>
                          {strain.genome.bifurcationRate?.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Branch Tendency:</span>
                        <span>
                          {strain.genome.branchTendency?.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Waving Speed:</span>
                        <span>{strain.genome.wavingSpeed?.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Waving Amp:</span>
                        <span>
                          {strain.genome.wavingAmplitude?.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Geometry:</span>
                        <span>{strain.genome.geometryType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Appendage:</span>
                        <span>{strain.genome.appendage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multicolor App:</span>
                        <span>
                          {strain.genome.multicolorAppendage ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Same Color App:</span>
                        <span>
                          {strain.genome.sameColorAppendage ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pulse Target:</span>
                        <span>{strain.genome.pulseTarget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pulse Speed:</span>
                        <span>{strain.genome.pulseSpeed?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gradient Growth:</span>
                        <span>
                          {strain.genome.gradientGrowth ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stability:</span>
                        <span>{strain.genome.stability?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
