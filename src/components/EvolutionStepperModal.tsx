import React, { useState } from "react";
import { EVOLUTION_ROUNDS } from "../lib/EvolutionPresets";
import { BOTANICAL_CONCEPTS } from "../lib/SimulationBotany";

export interface EvolutionStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStep: number;
  activeConcept?: string;
  onSelectStep: (step: number, concept?: string) => void;
}

const MODEL_TYPES = [
  { id: "oak", label: "Gnarled Oak", subtitle: "Sympodial crooked boughs & twig filigree" },
  { id: "elm", label: "Spreading Elm", subtitle: "Deliquescent high-arch vase canopy" },
  { id: "pine", label: "Whorled Pine", subtitle: "Tiered horizontal bough whorls" },
  { id: "willow", label: "Weeping Willow", subtitle: "Pendulous gravity-drooping curtains" },
  { id: "rhizome_web", label: "Vascular Web", subtitle: "Forking subterranean rhizome network" },
];

export function EvolutionStepperModal({
  isOpen,
  onClose,
  activeStep,
  activeConcept = "oak",
  onSelectStep,
}: EvolutionStepperModalProps) {
  const [viewMode, setViewMode] = useState<"matrix" | "single" | "all20">("matrix");
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>(
    activeConcept === "auto" ? "oak" : activeConcept
  );
  const [focusedRound, setFocusedRound] = useState<number>(
    activeStep === 1 || activeStep === 10 || activeStep === 20 ? activeStep : 20
  );

  if (!isOpen) return null;

  const milestones = [1, 10, 20];
  const focusedCfg = EVOLUTION_ROUNDS[focusedRound] || EVOLUTION_ROUNDS[20];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4, 9, 18, 0.84)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: "#111827",
          color: "#f3f4f6",
          boxShadow: "0 28px 64px rgba(0, 0, 0, 0.72)",
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: "rgba(16, 185, 129, 0.18)", color: "#34d399" }}
              >
                5 Model Types × Steps 1 · 10 · 20 Visual Confirmation
              </span>
              <span className="text-xs text-slate-400">
                Headless WebGL Verification + Live 3D Simulator Loader
              </span>
            </div>
            <h2
              className="text-xl font-bold mt-1"
              style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif" }}
            >
              Botanical Model Types & Evolution Progression (Steps 1 → 10 → 20)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1 p-1 rounded-full"
              style={{ background: "rgba(30, 41, 59, 0.95)" }}
            >
              <button
                onClick={() => setViewMode("matrix")}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: viewMode === "matrix" ? "#10b981" : "transparent",
                  color: viewMode === "matrix" ? "#052e16" : "#cbd5e1",
                }}
              >
                All 5 Model Types (1 · 10 · 20 Matrix)
              </button>
              <button
                onClick={() => setViewMode("single")}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: viewMode === "single" ? "#10b981" : "transparent",
                  color: viewMode === "single" ? "#052e16" : "#cbd5e1",
                }}
              >
                Single Model SxS
              </button>
              <button
                onClick={() => setViewMode("all20")}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: viewMode === "all20" ? "#10b981" : "transparent",
                  color: viewMode === "all20" ? "#052e16" : "#cbd5e1",
                }}
              >
                All 20 Refinement Rounds
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(51, 65, 85, 0.85)", color: "#e2e8f0" }}
            >
              Close
            </button>
          </div>
        </div>

        {/* VIEW 1: ALL 5 MODEL TYPES x STEPS 1, 10, 20 VISUAL MATRIX */}
        {viewMode === "matrix" && (
          <div className="flex flex-col gap-5">
            {MODEL_TYPES.map((model) => (
              <div
                key={model.id}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: "#1e293b" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className="text-base font-bold text-emerald-300"
                      style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif" }}
                    >
                      {model.label}
                    </span>
                    <span className="ml-2.5 text-xs text-slate-400">{model.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 10, 20].map((step) => (
                      <button
                        key={step}
                        onClick={() => {
                          onSelectStep(step, model.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                        style={{
                          background:
                            activeStep === step && activeConcept === model.id
                              ? "#10b981"
                              : "rgba(16, 185, 129, 0.16)",
                          color:
                            activeStep === step && activeConcept === model.id
                              ? "#052e16"
                              : "#6ee7b7",
                        }}
                      >
                        Load {model.label} · Step {step} in 3D
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {milestones.map((step) => {
                    const cfg = EVOLUTION_ROUNDS[step];
                    const imgPath = `/LifeSim/evolution_rounds/concept_${model.id}_step_${String(
                      step
                    ).padStart(2, "0")}.png`;
                    return (
                      <div
                        key={step}
                        className="rounded-lg p-2.5 flex flex-col gap-2 cursor-pointer transition-all"
                        style={{ background: "rgba(15, 23, 42, 0.85)" }}
                        onClick={() => {
                          onSelectStep(step, model.id);
                          onClose();
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">
                            Step {step}: {step === 1 ? "Baseline Spindly" : step === 10 ? "Mid Da Vinci" : "Full Filigree"}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            γ={cfg.daVinciGamma.toFixed(2)} · Depth {cfg.maxDepth}
                          </span>
                        </div>
                        <div
                          className="w-full aspect-video rounded overflow-hidden"
                          style={{ background: "#020617" }}
                        >
                          <img
                            src={imgPath}
                            alt={`${model.label} at Step ${step}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `/LifeSim/evolution_rounds/round_${String(
                                step
                              ).padStart(2, "0")}.png`;
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{cfg.tweakSummary}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: SINGLE MODEL SIDE-BY-SIDE (STEP 1 vs 10 vs 20) */}
        {viewMode === "single" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Select Model Type:</span>
              {MODEL_TYPES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedConceptFilter(m.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background:
                      selectedConceptFilter === m.id ? "#10b981" : "rgba(30, 41, 59, 0.95)",
                    color: selectedConceptFilter === m.id ? "#052e16" : "#e2e8f0",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map((step) => {
                const cfg = EVOLUTION_ROUNDS[step];
                const isLive = activeStep === step && activeConcept === selectedConceptFilter;
                const imgPath = `/LifeSim/evolution_rounds/concept_${selectedConceptFilter}_step_${String(
                  step
                ).padStart(2, "0")}.png`;

                return (
                  <div
                    key={step}
                    className="rounded-xl p-4 flex flex-col gap-3 transition-all"
                    style={{
                      background: isLive ? "rgba(6, 78, 59, 0.35)" : "#1e293b",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background:
                            step === 1
                              ? "rgba(239, 68, 68, 0.2)"
                              : step === 10
                              ? "rgba(56, 189, 248, 0.2)"
                              : "rgba(16, 185, 129, 0.25)",
                          color:
                            step === 1 ? "#fca5a5" : step === 10 ? "#7dd3fc" : "#6ee7b7",
                        }}
                      >
                        Step {step} / 20
                      </span>
                      <button
                        onClick={() => {
                          onSelectStep(step, selectedConceptFilter);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                        style={{
                          background: isLive ? "#10b981" : "rgba(16, 185, 129, 0.18)",
                          color: isLive ? "#052e16" : "#34d399",
                        }}
                      >
                        {isLive ? "Active in 3D" : "Load in 3D Sim"}
                      </button>
                    </div>

                    <div
                      className="w-full aspect-video rounded-lg overflow-hidden"
                      style={{ background: "#090d16" }}
                    >
                      <img
                        src={imgPath}
                        alt={`Step ${step} WebGL Capture`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h3
                        className="text-sm font-bold text-slate-100"
                        style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif" }}
                      >
                        {cfg.label}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {cfg.tweakSummary}
                      </p>
                    </div>

                    <div
                      className="rounded-lg p-2.5 text-[11px] font-mono text-emerald-300"
                      style={{ background: "rgba(15, 23, 42, 0.75)" }}
                    >
                      {cfg.formulaNote}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: ALL 20 ROUNDS SCRUBBER */}
        {viewMode === "all20" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((r) => {
                const isSelected = focusedRound === r;
                const isMilestone = r === 1 || r === 10 || r === 20;
                return (
                  <button
                    key={r}
                    onClick={() => setFocusedRound(r)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: isSelected
                        ? "#10b981"
                        : isMilestone
                        ? "rgba(56, 189, 248, 0.22)"
                        : "#1e293b",
                      color: isSelected
                        ? "#052e16"
                        : isMilestone
                        ? "#7dd3fc"
                        : "#cbd5e1",
                    }}
                  >
                    R{r}
                  </button>
                );
              })}
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl"
              style={{ background: "#1e293b" }}
            >
              <div
                className="w-full aspect-video rounded-lg overflow-hidden"
                style={{ background: "#090d16" }}
              >
                <img
                  src={`/LifeSim/evolution_rounds/round_${String(focusedRound).padStart(
                    2,
                    "0"
                  )}.png`}
                  alt={`Round ${focusedRound}`}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      ROUND {focusedRound} OF 20
                    </span>
                    <button
                      onClick={() => {
                        onSelectStep(focusedRound);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: "#10b981", color: "#052e16" }}
                    >
                      Run Step {focusedRound} Live in 3D
                    </button>
                  </div>

                  <h3
                    className="text-lg font-bold text-white mt-1"
                    style={{ fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif" }}
                  >
                    {focusedCfg.label}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {focusedCfg.tweakSummary}
                  </p>

                  <div
                    className="mt-3 p-3 rounded-lg font-mono text-xs text-emerald-300"
                    style={{ background: "rgba(15, 23, 42, 0.8)" }}
                  >
                    {focusedCfg.formulaNote}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
