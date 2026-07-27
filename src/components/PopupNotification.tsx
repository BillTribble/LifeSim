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
}

interface PopupNotificationProps {
  queue: PopupItem[];
  onDismiss: (id: string) => void;
}

export function PopupNotification({ queue, onDismiss }: PopupNotificationProps) {
  const current = queue[0];
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!current) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setProgress(100);

    const duration = current.duration || 8000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onDismiss(current.id);
      }, 450);
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(dismissTimer);
    };
  }, [current?.id]);

  if (!current) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss(current.id);
    }, 450);
  };

  const getHexColor = (colorObj?: any) => {
    if (!colorObj) return "#87CEEB";
    if (typeof colorObj.getHexString === "function") return "#" + colorObj.getHexString();
    return colorObj.toString();
  };

  return (
    <div
      className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm sm:max-w-md w-[92vw] sm:w-full transition-all duration-500 ease-out pointer-events-auto ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
      }`}
    >
      <div className="bg-[#001220]/95 backdrop-blur-xl border border-purple-500/40 rounded-xl p-3.5 sm:p-4 shadow-2xl shadow-purple-950/60 text-[#D2B48C] font-mono relative overflow-hidden">
        {/* 8-second Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-950/40">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-purple-300/70 hover:text-white hover:bg-purple-500/20 transition-colors"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Welcome Popup */}
        {current.type === "welcome" && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-300 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse text-purple-300" />
            </div>
            <div className="flex-1 pr-4">
              <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
                {current.subtitle}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
                {current.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-[#D2B48C]/80 leading-relaxed">
                Welcome to LifeSim! Two distinct founder organisms have been established with randomized procedural genetics. Watch them grow, interact, and develop unique phenotypes.
              </p>
            </div>
          </div>
        )}

        {/* Organism 1 & 2 Phenotype Popups */}
        {(current.type === "organism1" || current.type === "organism2") && current.genome && (
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg border shrink-0 mt-0.5 shadow-md flex items-center justify-center"
              style={{
                backgroundColor: `${getHexColor(current.genome.color)}25`,
                borderColor: getHexColor(current.genome.color),
              }}
            >
              <Dna className="w-5 h-5" style={{ color: getHexColor(current.genome.color) }} />
            </div>
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: getHexColor(current.genome.color) }}>
                  {current.subtitle}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                  style={{ backgroundColor: getHexColor(current.genome.color) }}
                />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
                {current.title}
              </h3>

              {/* Phenotype Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] sm:text-[10px] mt-2 bg-black/30 p-2 rounded border border-purple-500/20">
                <div>
                  <span className="text-purple-300/70">ARCHETYPE:</span>{" "}
                  <span className="text-white font-bold uppercase">{current.genome.archetype}</span>
                </div>
                <div>
                  <span className="text-purple-300/70">STEM FORM:</span>{" "}
                  <span className="text-white">
                    {current.genome.thicknessBase > 3.0 ? "Stout" : "Slender"} ({current.genome.thicknessBase.toFixed(1)})
                  </span>
                </div>
                <div>
                  <span className="text-purple-300/70">VERNATION:</span>{" "}
                  <span className="text-cyan-300 capitalize">{current.genome.vernationType || "Circinate"}</span>
                </div>
                <div>
                  <span className="text-purple-300/70">PHYLLOTAXIS:</span>{" "}
                  <span className="text-cyan-300 capitalize">{current.genome.phyllotaxisMode || "Spiral"}</span>
                </div>
                <div>
                  <span className="text-purple-300/70">CANOPY:</span>{" "}
                  <span className="text-pink-300 capitalize">{current.genome.canopyZone || "Whole"}</span>
                </div>
                <div>
                  <span className="text-purple-300/70">APPENDAGE:</span>{" "}
                  <span className="text-green-300 capitalize">{current.genome.appendage || "Leaves"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* First Mating Event Popup */}
        {current.type === "mating" && current.matingData && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-400/50 text-pink-300 shrink-0 mt-0.5 animate-bounce">
              <Heart className="w-5 h-5 text-pink-400 fill-pink-400/40" />
            </div>
            <div className="flex-1 pr-4">
              <div className="text-[10px] font-bold tracking-widest text-pink-400 uppercase">
                {current.subtitle}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
                {current.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-[#D2B48C]/90 mb-2">
                Organism 1 and Organism 2 physically touched and cross-bred, producing a new hybrid species!
              </p>

              {/* Parents & Child Swatches */}
              <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[10px] bg-black/40 p-2 rounded border border-pink-500/30">
                <div className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full border border-white/40"
                    style={{ backgroundColor: getHexColor(current.matingData.parent1.color) }}
                  />
                  <span className="text-white">{current.matingData.parent1.name.split(' ')[0]}</span>
                </div>
                <span className="text-pink-400 font-bold">+</span>
                <div className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full border border-white/40"
                    style={{ backgroundColor: getHexColor(current.matingData.parent2.color) }}
                  />
                  <span className="text-white">{current.matingData.parent2.name.split(' ')[0]}</span>
                </div>
                <span className="text-pink-400 font-bold">➔</span>
                <div className="flex items-center gap-1 border border-pink-400/50 px-1.5 py-0.5 rounded bg-pink-500/20">
                  <span
                    className="w-3 h-3 rounded-full border border-white/40 animate-pulse"
                    style={{ backgroundColor: getHexColor(current.matingData.child.color) }}
                  />
                  <span className="text-pink-200 font-bold">{current.matingData.child.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
