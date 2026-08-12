import React, { useState } from "react";
import {
  RotateCcw,
  Save,
  Leaf,
  Tv,
  Check,
  Sparkles,
  X,
  Sliders,
  Dna,
  Zap,
} from "lucide-react";
import { SmartDial } from "./SmartDial";
import { Archetype, ARCHETYPES } from "../lib/SimulationTypes";

interface ArchetypeDesignerProps {
  currentArchetype: Archetype;
  onSelectArchetype: (arch: Archetype) => void;
  strainName?: string;
  state: any;
  setters: any;
  handleRestart: () => void;
  onCloseDesigner: () => void;
}

const ALL_ARCHETYPES: { id: Archetype; label: string; icon: string }[] = [
  { id: "bush", label: "BUSH", icon: "🌿" },
  { id: "tree", label: "TREE", icon: "🌳" },
  { id: "rhizome", label: "RHIZOME", icon: "🌾" },
];

export function ArchetypeDesigner({
  currentArchetype,
  onSelectArchetype,
  strainName,
  state,
  setters,
  handleRestart,
  onCloseDesigner,
}: ArchetypeDesignerProps) {
  const [appendagesPanelOpen, setAppendagesPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Sync all active state properties into localStorage for persistence
      for (const [key, value] of Object.entries(state)) {
        if (typeof value === "object" && value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
        } else if (value !== undefined) {
          localStorage.setItem(key, String(value));
        }
      }

      // 2. Propagate to backend code / SimulationDefaults.ts via dev server endpoint
      const res = await fetch("/api/save-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (res.ok) {
        setToastMessage("✓ Saved to SimulationDefaults.ts & App state!");
      } else {
        setToastMessage("✓ Saved to App State & LocalStorage!");
      }
    } catch (err) {
      console.warn("Could not save to file endpoint, saved locally:", err);
      setToastMessage("✓ Saved to LocalStorage & App State!");
    } finally {
      setIsSaving(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  const matchesSearch = (labels: string[]) => {
    if (!searchQuery) return true;
    return labels.some((l) =>
      l.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-2 sm:p-4 m-1 sm:m-4 font-mono text-[10px]">
      {/* Toast Notification */}
      {savedToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-400 px-4 py-2 rounded-full shadow-lg shadow-emerald-900/40 text-emerald-200 font-bold text-xs flex items-center gap-2 backdrop-blur-md animate-fade-in pointer-events-auto">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 mb-2 text-[10px] pb-2 pointer-events-none z-20 w-full">
        {/* Top-Left: Mode, Strain Name, Radio Selector, Slow-Mo */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-none flex-wrap sm:flex-nowrap">
          {/* Designer Mode Badge & Strain Name */}
          <div className="flex items-center gap-2 pointer-events-auto shrink-0 bg-[#001220]/80 border border-emerald-500/50 px-2.5 h-7 rounded shadow-sm backdrop-blur-md text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-bold tracking-wider uppercase text-[9px] sm:text-[10px]">
              ARCHETYPE DESIGNER
            </span>
            {strainName && (
              <span className="text-[#D2B48C] border-l border-emerald-500/30 pl-2 text-[9px] font-sans font-bold">
                {strainName}
              </span>
            )}
          </div>

          {/* Archetype Radio Buttons */}
          <div className="flex items-center gap-1 pointer-events-auto shrink-0 bg-[#001220]/70 border border-[#D2B48C]/40 p-0.5 rounded backdrop-blur-md h-7">
            {ALL_ARCHETYPES.map((arch) => {
              const isSelected = currentArchetype === arch.id;
              return (
                <button
                  key={arch.id}
                  onClick={() => onSelectArchetype(arch.id)}
                  className={`h-full px-2 rounded flex items-center gap-1.5 transition-all select-none cursor-pointer text-[9px] ${
                    isSelected
                      ? "bg-emerald-500/30 border border-emerald-400 text-white font-bold shadow-sm shadow-emerald-900/30"
                      : "text-[#D2B48C]/70 hover:text-[#D2B48C] hover:bg-white/5 border border-transparent"
                  }`}
                  title={`Design ${arch.label} Archetype`}
                >
                  <div
                    className={`w-2 h-2 rounded-full border transition-all ${
                      isSelected
                        ? "bg-emerald-400 border-white shadow-[0_0_5px_rgba(52,211,153,0.8)]"
                        : "border-[#D2B48C]/50 bg-transparent"
                    }`}
                  />
                  <span>{arch.label}</span>
                </button>
              );
            })}
          </div>

          {/* SLOW_MO dial */}
          <div className="flex items-center pointer-events-auto shrink-0">
            <div
              className="h-7 pointer-events-auto flex items-center gap-1.5 border border-[#D2B48C]/50 px-2.5 rounded bg-[#001220]/70 backdrop-blur-md shadow-sm opacity-90 hover:opacity-100 transition-opacity shrink-0"
              title="TIME SCALE — Controls simulation speed."
            >
              <span className="text-[9px] sm:text-[10px] text-[#D2B48C]">
                SLOW_MO
              </span>
              <div className="scale-[0.6] origin-center -my-3 -mx-1 shrink-0 flex items-center justify-center">
                <SmartDial
                  state={state}
                  setters={setters}
                  tooltip={"TIME SCALE\nControls creature growth speed."}
                  label=""
                  min={0.1}
                  max={100.0}
                  step={0.1}
                  value={state.timeScale}
                  onChange={setters.setTimeScale}
                  color="#87CEEB"
                  hideValue={true}
                />
              </div>
              <span
                className="text-[9px] shrink-0"
                style={{ color: "#87CEEB" }}
              >
                {state.timeScale.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right: RESTART, SAVE, APPENDAGES / LEAVES TOGGLE, SIMULATION BUTTON */}
        <div className="flex gap-2 sm:gap-3 text-right justify-end text-[9px] sm:text-[10px] items-center pointer-events-none ml-auto shrink-0">
          {/* RESTART */}
          <button
            onClick={handleRestart}
            className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto border border-cyan-500/50 px-2.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md"
            title="Restart creature growth from scratch"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold">RESTART</span>
          </button>

          {/* SAVE */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto border border-emerald-500/60 px-2.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all select-none shrink-0 shadow-sm backdrop-blur-md font-bold"
            title="Save all characteristics to defaults & codebase"
          >
            {isSaving ? (
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            ) : savedToast ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{isSaving ? "SAVING..." : savedToast ? "SAVED!" : "SAVE"}</span>
          </button>

          {/* APPENDAGES / LEAVES TOGGLE */}
          <button
            onClick={() => setAppendagesPanelOpen(!appendagesPanelOpen)}
            className={`h-7 flex items-center gap-1.5 cursor-pointer hover:text-white pointer-events-auto border px-2.5 rounded transition-all select-none shrink-0 shadow-sm backdrop-blur-md ${
              appendagesPanelOpen
                ? "bg-purple-500/30 border-purple-400 text-white font-bold"
                : "bg-[#001220]/60 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
            }`}
            title="Toggle Appendage & Leaf Controls Panel"
          >
            <Leaf className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>APPENDAGES / LEAVES</span>
          </button>

          {/* SIMULATION BUTTON (In exact position as DESIGNER button on main screen) */}
          <button
            onClick={onCloseDesigner}
            className="h-7 flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 px-2.5 rounded text-amber-300 hover:text-white pointer-events-auto backdrop-blur-md transition-all shadow-sm select-none shrink-0 font-bold"
            title="Return to Normal Simulation"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="tracking-wider uppercase">SIMULATION</span>
          </button>

          {/* Placeholder matching width of INTERFACE button so SIMULATION button aligns precisely with DESIGNER button on main HUD */}
          <div className="w-[84px] sm:w-[94px] shrink-0" />
        </div>
      </header>

      {/* RIGHT SLIDE-OUT PANEL: APPENDAGES / LEAF CONTROLS */}
      {appendagesPanelOpen && (
        <aside className="absolute top-16 right-4 sm:right-6 w-80 sm:w-96 max-h-[calc(100vh-140px)] bg-[#001220]/95 border border-purple-500/50 p-4 rounded-lg backdrop-blur-md z-50 pointer-events-auto shadow-2xl shadow-purple-950/50 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-[#D2B48C]">
          <div className="flex justify-between items-center border-b border-purple-500/30 pb-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-purple-400" />
              <span className="font-bold tracking-wider text-purple-300 text-xs">
                APPENDAGES & LEAVES
              </span>
            </div>
            <button
              onClick={() => setAppendagesPanelOpen(false)}
              className="p-1 text-[#D2B48C]/60 hover:text-white hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Leaf Controls Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center border-b border-green-500/20 pb-1">
              <span className="text-green-400 font-bold text-[9px] tracking-wider">
                LEAF MORPHOLOGY
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] opacity-75">BOTANY REALISM:</span>
                <button
                  onClick={() => setters.setBotanyRealism(!state.botanyRealism)}
                  className={`px-2 py-0.5 border rounded text-[8px] font-bold transition-colors ${
                    state.botanyRealism
                      ? "bg-green-500/30 border-green-400 text-green-300"
                      : "bg-red-500/30 border-red-400 text-red-300"
                  }`}
                >
                  {state.botanyRealism ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SmartDial
                state={state}
                setters={setters}
                label="LEAF_SCALE"
                min={0.05}
                max={3.0}
                step={0.05}
                value={state.leafScale}
                onChange={setters.setLeafScale}
                color="#4ADE80"
                tooltip="Global leaf scale"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="GROW_SPD"
                min={0.0005}
                max={0.5}
                step={0.0005}
                value={state.leafGrowthSpeed}
                onChange={setters.setLeafGrowthSpeed}
                color="#4ADE80"
                tooltip="Leaf unroll & expansion speed"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="DIV_ANGLE"
                min={0.0}
                max={360.0}
                step={0.5}
                value={state.phyllotaxisAngle}
                onChange={setters.setPhyllotaxisAngle}
                color="#4ADE80"
                formatValue={(v: number) => `${v.toFixed(0)}°`}
                tooltip="Phyllotaxis angle around stem"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="DENSITY"
                min={0.05}
                max={2.0}
                step={0.05}
                value={state.leafDensity}
                onChange={setters.setLeafDensity}
                color="#4ADE80"
                tooltip="Leaf spawn density along stem"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="SIZE_DIFF"
                min={0.0}
                max={1.0}
                step={0.05}
                value={state.relativeLeafSizeDiff}
                onChange={setters.setRelativeLeafSizeDiff}
                color="#4ADE80"
                tooltip="Size variance along branch"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="LEAF_PROB"
                min={0.0}
                max={1.0}
                step={0.01}
                value={state.leafProbability}
                onChange={setters.setLeafProbability}
                color="#4ADE80"
                formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                tooltip="Likelihood of spawning leaves"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="WIND_VEL"
                min={0.0}
                max={10.0}
                step={0.1}
                value={state.windVelocity}
                onChange={setters.setWindVelocity}
                color="#4ADE80"
                tooltip="Global wind speed"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="FLUTTER"
                min={0.0}
                max={2.0}
                step={0.05}
                value={state.flutterIntensity}
                onChange={setters.setFlutterIntensity}
                color="#4ADE80"
                tooltip="Leaf flutter intensity"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="VEIN_STR"
                min={0}
                max={50}
                step={1}
                value={state.veinStrength}
                onChange={setters.setVeinStrength}
                color="#4ADE80"
                tooltip="Vein pattern definition"
              />
            </div>
          </div>

          {/* Appendage Probabilities Section */}
          <div className="flex flex-col gap-2 border-t border-purple-500/20 pt-2">
            <span className="text-purple-300 font-bold text-[9px] tracking-wider">
              APPENDAGE TRAIT WEIGHTS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <SmartDial
                state={state}
                setters={setters}
                label="APP_FREQ"
                min={0.1}
                max={20.0}
                step={0.1}
                value={state.ornamentFrequency}
                onChange={setters.setOrnamentFrequency}
                color="#a855f7"
                tooltip="Appendage spacing frequency"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="SPAWN_RATE"
                min={0.0}
                max={1.0}
                step={0.05}
                value={state.appendageSpawnRate}
                onChange={setters.setAppendageSpawnRate}
                color="#a855f7"
                formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                tooltip="Appendage spawn rate"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="MULTI_COL"
                min={0.0}
                max={1.0}
                step={0.05}
                value={state.multicolorAppProb}
                onChange={setters.setMulticolorAppProb}
                color="#a855f7"
                formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                tooltip="Multicolor ornament probability"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1">
              {Object.entries(state.traitProbs || {}).map(([trait, prob]) => (
                <div key={trait}>
                  <SmartDial
                    state={state}
                    setters={setters}
                    label={trait.toUpperCase()}
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={prob as number}
                    onChange={(v) => {
                      setters.setTraitProbs((prev: any) => ({
                        ...prev,
                        [trait]: v,
                      }));
                    }}
                    color="#c084fc"
                    tooltip={`Weight for ${trait}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bioluminescence Section */}
          <div className="flex flex-col gap-2 border-t border-purple-500/20 pt-2">
            <span className="text-cyan-300 font-bold text-[9px] tracking-wider">
              BIOLUMINESCENCE & GLOW
            </span>
            <div className="grid grid-cols-3 gap-2">
              <SmartDial
                state={state}
                setters={setters}
                label="GLOW_PROB"
                min={0.0}
                max={1.0}
                step={0.01}
                value={state.glowProbability}
                onChange={setters.setGlowProbability}
                color="#22d3ee"
                formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                tooltip="Glow trait emergence chance"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="INTENSITY"
                min={0.1}
                max={10.0}
                step={0.1}
                value={state.glowTraitIntensity}
                onChange={setters.setGlowTraitIntensity}
                color="#22d3ee"
                tooltip="Bioluminescence intensity"
              />
              <SmartDial
                state={state}
                setters={setters}
                label="DISTANCE"
                min={5.0}
                max={200.0}
                step={5.0}
                value={state.glowTraitDistance}
                onChange={setters.setGlowTraitDistance}
                color="#22d3ee"
                tooltip="Glow light radius"
              />
            </div>
          </div>
        </aside>
      )}

      {/* BOTTOM BAR: ALL DIALS RELATING TO EACH ARCHETYPE */}
      <footer className="w-full bg-[#001220]/90 border border-[#D2B48C]/30 p-2.5 rounded-lg backdrop-blur-md pointer-events-auto shadow-2xl flex flex-col gap-2 z-30">
        {/* Category Navigation & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D2B48C]/20 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#D2B48C]/60 text-[8px] font-bold mr-1">
              CATEGORY:
            </span>
            {[
              { id: "all", label: "ALL CONTROLS" },
              {
                id: "archetype",
                label: `🌟 ${currentArchetype.toUpperCase()} SPECIFIC`,
              },
              { id: "appendages", label: "🌸 APPENDAGES" },
              { id: "branching", label: "BRANCHING" },
              { id: "morphology", label: "MORPHOLOGY" },
              { id: "growth", label: "SPEEDS & GROWTH" },
              { id: "lifecycle", label: "LIFECYCLE & DIEBACK" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-emerald-500/30 border border-emerald-400 text-emerald-200"
                    : "bg-[#001220]/60 border border-[#D2B48C]/20 text-[#D2B48C]/70 hover:text-[#D2B48C] hover:border-[#D2B48C]/50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search dials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#001220]/80 border border-[#D2B48C]/30 px-2 py-0.5 rounded text-[8px] text-[#D2B48C] placeholder-[#D2B48C]/40 focus:outline-none focus:border-emerald-400 w-28 sm:w-36"
            />
          </div>
        </div>

        {/* Dial Scroll Container */}
        <div className="flex items-center gap-4 overflow-x-auto pb-1 custom-scrollbar">
          {/* 1. CURRENT ARCHETYPE SPECIFIC DIALS */}
          {(activeCategory === "all" || activeCategory === "archetype") && (
            <div className="flex flex-col gap-1.5 border border-emerald-500/40 p-2 rounded bg-emerald-950/20 shrink-0">
              <span className="text-[8px] text-emerald-400 font-bold tracking-widest text-center border-b border-emerald-500/30 pb-1">
                {currentArchetype.toUpperCase()} SPECIFIC
              </span>
              <div className="flex gap-2 items-center">
                {currentArchetype === "bush" && (
                  <>
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="BUSH_BR"
                      min={0.1}
                      max={50.0}
                      step={0.5}
                      value={state.bushBranching}
                      onChange={setters.setBushBranching}
                      color="#34d399"
                      tooltip="Bush branching density"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="BUSH_SPD"
                      min={0.1}
                      max={5.0}
                      step={0.05}
                      value={state.bushSpeed}
                      onChange={setters.setBushSpeed}
                      color="#34d399"
                      tooltip="Bush growth speed multiplier"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="BUSH_STEP"
                      min={0.1}
                      max={2.0}
                      step={0.05}
                      value={state.bushStepSize}
                      onChange={setters.setBushStepSize}
                      color="#34d399"
                      tooltip="Bush step size"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="BUSH_MIN"
                      min={1}
                      max={10}
                      step={1}
                      value={state.bushMinBranches}
                      onChange={setters.setBushMinBranches}
                      color="#34d399"
                      tooltip="Minimum branches for bush"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="BUSH_TAPER"
                      min={0.1}
                      max={10.0}
                      step={0.1}
                      value={state.bushTaper ?? 1.0}
                      onChange={setters.setBushTaper}
                      color="#34d399"
                      tooltip="BUSH TAPERING & TWIG LENGTH
Controls how quickly bush twigs taper and terminate.
High: Shorter twigs, faster tapering.
Low: Long, sprawling whispy twigs."
                    />
                  </>
                )}

                {currentArchetype === "tree" && (
                  <>
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_BR"
                      min={0.1}
                      max={50.0}
                      step={0.5}
                      value={state.treeBranching}
                      onChange={setters.setTreeBranching}
                      color="#34d399"
                      tooltip="Tree branching density"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_SPD"
                      min={0.1}
                      max={5.0}
                      step={0.05}
                      value={state.treeSpeed}
                      onChange={setters.setTreeSpeed}
                      color="#34d399"
                      tooltip="Tree growth speed multiplier"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_STEP"
                      min={0.1}
                      max={3.0}
                      step={0.05}
                      value={state.treeStepSize}
                      onChange={setters.setTreeStepSize}
                      color="#34d399"
                      tooltip="Tree step size"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_MIN"
                      min={1}
                      max={10}
                      step={1}
                      value={state.treeMinBranches}
                      onChange={setters.setTreeMinBranches}
                      color="#34d399"
                      tooltip="Minimum branches for tree"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_DELAY"
                      min={0}
                      max={300}
                      step={5}
                      value={state.treeBranchDelay}
                      onChange={setters.setTreeBranchDelay}
                      color="#34d399"
                      tooltip="TRUNK DURATION / BRANCH DELAY
How long the tree grows a straight vertical trunk before canopy branching begins.
Low: Branches almost immediately near base.
High: Grows a tall straight trunk before branching."
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="TREE_TAPER"
                      min={0.1}
                      max={10.0}
                      step={0.1}
                      value={state.treeTaper ?? 1.0}
                      onChange={setters.setTreeTaper}
                      color="#34d399"
                      tooltip="TREE TAPERING & TWIG LENGTH
Controls how quickly tree canopy twigs taper and terminate.
High: Compact woody canopy, shorter twigs.
Low: Long whispy tendrils extending far out."
                    />
                  </>
                )}

                {currentArchetype === "rhizome" && (
                  <>
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="RHIZ_BR"
                      min={0.1}
                      max={50.0}
                      step={0.5}
                      value={state.rhizomeBranching}
                      onChange={setters.setRhizomeBranching}
                      color="#34d399"
                      tooltip="Rhizome branching density"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="RHIZ_SPD"
                      min={0.1}
                      max={5.0}
                      step={0.05}
                      value={state.rhizomeSpeed}
                      onChange={setters.setRhizomeSpeed}
                      color="#34d399"
                      tooltip="Rhizome growth speed multiplier"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="RHIZ_STEP"
                      min={0.1}
                      max={2.0}
                      step={0.05}
                      value={state.rhizomeStepSize}
                      onChange={setters.setRhizomeStepSize}
                      color="#34d399"
                      tooltip="Rhizome step size"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="RHIZ_MIN"
                      min={1}
                      max={10}
                      step={1}
                      value={state.rhizomeMinBranches}
                      onChange={setters.setRhizomeMinBranches}
                      color="#34d399"
                      tooltip="Minimum branches for rhizome"
                    />
                    <SmartDial
                      searchQuery={searchQuery}
                      state={state}
                      setters={setters}
                      label="RHIZ_TAPER"
                      min={0.1}
                      max={10.0}
                      step={0.1}
                      value={state.rhizomeTaper ?? 1.0}
                      onChange={setters.setRhizomeTaper}
                      color="#34d399"
                      tooltip="RHIZOME TAPERING & TWIG LENGTH
Controls how quickly rhizome runners taper and terminate.
High: Compact root clusters, shorter runners.
Low: Expansive long trailing roots."
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* APPENDAGES (GLOBAL) */}
          {(activeCategory === "all" || activeCategory === "appendages") && (
            <div className="flex flex-col gap-1.5 border border-purple-500/40 p-2 rounded bg-purple-950/20 shrink-0">
              <span className="text-[8px] text-purple-300 font-bold tracking-widest text-center border-b border-purple-500/30 pb-1">
                🌸 GLOBAL APPENDAGES & GLOW
              </span>
              <div className="flex gap-2 items-center">
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="APP_SIZE"
                  min={0.2}
                  max={5.0}
                  step={0.1}
                  value={state.flowerSize}
                  onChange={setters.setFlowerSize}
                  color="#c084fc"
                  tooltip="Global appendage ornament size"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="APP_FREQ"
                  min={0.1}
                  max={20.0}
                  step={0.1}
                  value={state.ornamentFrequency}
                  onChange={setters.setOrnamentFrequency}
                  color="#c084fc"
                  tooltip="Appendage spacing frequency"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="SPAWN_RATE"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={state.appendageSpawnRate}
                  onChange={setters.setAppendageSpawnRate}
                  color="#c084fc"
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tooltip="Appendage spawn rate"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="MULTI_COL"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={state.multicolorAppProb}
                  onChange={setters.setMulticolorAppProb}
                  color="#c084fc"
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tooltip="Multicolor ornament probability"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="HYB_SIZE"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={state.hybridSize}
                  onChange={setters.setHybridSize}
                  color="#c084fc"
                  tooltip="Hybrid artifact size"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="GLOW_PROB"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={state.glowProbability}
                  onChange={setters.setGlowProbability}
                  color="#22d3ee"
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tooltip="Glow trait emergence chance"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="GLOW_INT"
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  value={state.glowTraitIntensity}
                  onChange={setters.setGlowTraitIntensity}
                  color="#22d3ee"
                  tooltip="Bioluminescence intensity"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="GLOW_DIST"
                  min={5.0}
                  max={200.0}
                  step={5.0}
                  value={state.glowTraitDistance}
                  onChange={setters.setGlowTraitDistance}
                  color="#22d3ee"
                  tooltip="Glow light radius"
                />
              </div>
            </div>
          )}

          {/* 2. BRANCHING CONTROLS */}
          {(activeCategory === "all" || activeCategory === "branching") && (
            <div className="flex flex-col gap-1.5 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0">
              <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
                BRANCHING
              </span>
              <div className="flex gap-2 items-center">
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="BRANCHING"
                  min={0.1}
                  max={500.0}
                  step={0.1}
                  value={state.branchingMultiplier}
                  onChange={setters.setBranchingMultiplier}
                  color="#87CEEB"
                  tooltip="Overall frequency of branching"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="BRANCH_VAR"
                  min={1}
                  max={50.0}
                  step={1.0}
                  value={state.branchTendencyVar}
                  onChange={setters.setBranchTendencyVar}
                  color="#87CEEB"
                  tooltip="Randomness in branching patterns"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="BRANCH_SPD"
                  min={0.0}
                  max={10.0}
                  step={0.1}
                  value={state.branchGrowthBoost}
                  onChange={setters.setBranchGrowthBoost}
                  color="#87CEEB"
                  tooltip="Growth speed boost from branching"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="TERM_BRANCH"
                  min={0.5}
                  max={10.0}
                  step={0.5}
                  value={state.termProbPostBranch}
                  onChange={setters.setTermProbPostBranch}
                  color="#87CEEB"
                  tooltip="Termination risk after branching"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="BRANCH_BIG"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={state.branchBigger}
                  onChange={setters.setBranchBigger}
                  color="#87CEEB"
                  tooltip="Chance for branches to be thicker"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="LRG_BRANCH"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={state.branchSplitSizeProb}
                  onChange={setters.setBranchSplitSizeProb}
                  color="#87CEEB"
                  tooltip="Large branch probability"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="B_MUTATE"
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  value={state.colorMutationShift}
                  onChange={setters.setColorMutationShift}
                  color="#87CEEB"
                  tooltip="Color shift on branching"
                />
              </div>
            </div>
          )}

          {/* 3. SPEEDS & GROWTH */}
          {(activeCategory === "all" || activeCategory === "growth") && (
            <div className="flex flex-col gap-1.5 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0">
              <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
                SPEEDS & GROWTH
              </span>
              <div className="flex gap-2 items-center">
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="SPEED"
                  min={0.01}
                  max={2.0}
                  step={0.01}
                  value={state.growthSpeed}
                  onChange={setters.setGrowthSpeed}
                  color="#87CEEB"
                  tooltip="Base extrusion speed"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="WIDTH_EFF"
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  value={state.widthGrowthEffect}
                  onChange={setters.setWidthGrowthEffect}
                  color="#87CEEB"
                  tooltip="Width-dependent growth effect"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="PULSE_SPD"
                  min={0.01}
                  max={2.0}
                  step={0.01}
                  value={state.globalPulseSpeed}
                  onChange={setters.setGlobalPulseSpeed}
                  color="#87CEEB"
                  tooltip="Global pulse speed"
                />
              </div>
            </div>
          )}

          {/* 4. MORPHOLOGY & STEMS */}
          {(activeCategory === "all" || activeCategory === "morphology") && (
            <div className="flex flex-col gap-1.5 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0">
              <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
                MORPHOLOGY
              </span>
              <div className="flex gap-2 items-center">
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="MAX_WIDTH"
                  min={0.5}
                  max={30.0}
                  step={0.5}
                  value={state.maxLineWidth}
                  onChange={setters.setMaxLineWidth}
                  color="#87CEEB"
                  tooltip="Maximum line width"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="WIDTH_VAR"
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  value={state.widthVariance}
                  onChange={setters.setWidthVariance}
                  color="#87CEEB"
                  tooltip="Width variance"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="STEM_CURV"
                  min={0.0}
                  max={10.0}
                  step={0.5}
                  value={state.stemCurviness}
                  onChange={setters.setStemCurviness}
                  color="#87CEEB"
                  tooltip="Stem curviness & flex"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="SEG_GAP"
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  value={state.segmentGap}
                  onChange={setters.setSegmentGap}
                  color="#87CEEB"
                  tooltip="Segment gap spacing"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="APP_SIZE"
                  min={0.2}
                  max={5.0}
                  step={0.1}
                  value={state.flowerSize}
                  onChange={setters.setFlowerSize}
                  color="#87CEEB"
                  tooltip="Appendage ornament size"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="HYB_SIZE"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={state.hybridSize}
                  onChange={setters.setHybridSize}
                  color="#87CEEB"
                  tooltip="Hybrid artifact size"
                />
              </div>
            </div>
          )}

          {/* 5. LIFECYCLE & DIEBACK */}
          {(activeCategory === "all" || activeCategory === "lifecycle") && (
            <div className="flex flex-col gap-1.5 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0">
              <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
                LIFECYCLE & DIEBACK
              </span>
              <div className="flex gap-2 items-center">
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="DIEBACK"
                  min={0.0}
                  max={20.0}
                  step={0.1}
                  value={state.diebackRate}
                  onChange={setters.setDiebackRate}
                  color="#87CEEB"
                  tooltip="Dieback decay rate"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="DESICCATION"
                  min={0.0}
                  max={30.0}
                  step={0.5}
                  value={state.desiccationSpeed}
                  onChange={setters.setDesiccationSpeed}
                  color="#87CEEB"
                  tooltip="Desiccation fade speed"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="DIE_AGE"
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  value={state.diebackAgeBias}
                  onChange={setters.setDiebackAgeBias}
                  color="#87CEEB"
                  tooltip="Age bias for dieback"
                />
                <SmartDial
                  searchQuery={searchQuery}
                  state={state}
                  setters={setters}
                  label="TAPER_DUR"
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  value={state.taperDuration}
                  onChange={setters.setTaperDuration}
                  color="#87CEEB"
                  tooltip="Duration of branch tapering"
                />
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
