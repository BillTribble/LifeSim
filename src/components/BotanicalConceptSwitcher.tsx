import React from "react";
import { Layers, ChevronDown } from "lucide-react";
import {
  BOTANICAL_CONCEPTS,
  BotanicalConcept,
  BotanicalConceptMeta,
} from "../lib/SimulationBotany";

interface BotanicalConceptSwitcherProps {
  activeConcept: BotanicalConcept;
  onSelectConcept: (
    concept: BotanicalConcept,
    meta: BotanicalConceptMeta,
  ) => void;
  evolutionStep?: number;
  onSelectEvolutionStep?: (step: number) => void;
  onOpenEvolutionModal?: () => void;
  compact?: boolean;
}

export function BotanicalConceptSwitcher({
  activeConcept,
  onSelectConcept,
  evolutionStep = 20,
  onSelectEvolutionStep,
  onOpenEvolutionModal,
  compact = false,
}: BotanicalConceptSwitcherProps) {
  const currentMeta =
    BOTANICAL_CONCEPTS.find((c) => c.id === activeConcept) ||
    BOTANICAL_CONCEPTS[0];

  const milestoneSteps = [
    { step: 1, label: "Step 1", hint: "Baseline (Spindly / Clubs)" },
    { step: 10, label: "Step 10", hint: "Midpoint (Da Vinci γ=1.90)" },
    { step: 20, label: "Step 20", hint: "Final Natural Form (γ=2.12 + Crown Shyness)" },
  ];

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-[#001220]/90 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg backdrop-blur-md shadow-lg">
      {/* Botanical Habit Selector */}
      <div className="flex items-center gap-1.5 pr-1.5 border-r border-emerald-500/25 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
        <span className="text-[10px] font-bold tracking-wide text-emerald-300">
          Botanical habit
        </span>
      </div>

      <div className="relative flex items-center">
        <select
          value={activeConcept}
          onChange={(e) => {
            const concept = BOTANICAL_CONCEPTS.find((c) => c.id === e.target.value);
            if (concept) {
              onSelectConcept(concept.id, concept);
            }
          }}
          className="appearance-none bg-[#001220] hover:bg-[#001828] border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 text-[10px] font-mono rounded px-2.5 py-1 pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-sm transition-colors"
          title={currentMeta.subtitle}
        >
          {BOTANICAL_CONCEPTS.map((concept) => (
            <option
              key={concept.id}
              value={concept.id}
              className="bg-[#001220] text-emerald-200 py-1"
            >
              {concept.label} — {concept.subtitle}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-emerald-400 absolute right-1.5 pointer-events-none" />
      </div>

      {/* Step 1 / Step 10 / Step 20 Live Evolution Switcher */}
      {onSelectEvolutionStep && (
        <div className="flex items-center gap-1 pl-2 border-l border-emerald-500/25">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/90 pr-1">
            Algo step:
          </span>
          {milestoneSteps.map((m) => {
            const isStepActive = evolutionStep === m.step;
            return (
              <button
                key={m.step}
                type="button"
                onClick={() => onSelectEvolutionStep(m.step)}
                title={m.hint}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  isStepActive
                    ? "bg-amber-500/35 border border-amber-400 text-white shadow-sm"
                    : "bg-white/5 border border-transparent text-[#D2B48C]/75 hover:text-white hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            );
          })}

          {onOpenEvolutionModal && (
            <button
              type="button"
              onClick={onOpenEvolutionModal}
              title="Open 20-Round Headless Browser Comparison (Step 1 vs 10 vs 20)"
              className="ml-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/40 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Layers className="w-3 h-3 text-cyan-300" />
              <span>Compare 1·10·20</span>
            </button>
          )}
        </div>
      )}

      {!compact && (
        <span className="hidden 2xl:inline-block text-[10px] text-[#D2B48C]/70 pl-1.5 border-l border-white/10 max-w-[260px] truncate">
          {currentMeta.subtitle}
        </span>
      )}
    </div>
  );
}
