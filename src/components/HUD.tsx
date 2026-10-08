import React, { useState, useRef } from "react";
import {
  Cpu,
  ChevronDown,
  Search,
} from "lucide-react";
import { HUDTopBar } from "./HUDTopBar";
import {
  SystemSection,
  WindMotionSection,
  LandscapeSection,
  BotanySection,
  ConfigTideSection,
  EcologySection,
  LifecycleSection,
  ReproductionSection,
  BranchingSection,
  SpeedsSection,
  MorphologySection,
} from "./HUDSections";
import { BiomassPanel } from "./BiomassPanel";
import { BotanicalConcept, BotanicalConceptMeta } from "../lib/SimulationBotany";

interface HUDProps {
  showHUD: boolean;
  setShowHUD: (s: boolean) => void;
  stats: any;
  state: any;
  setters: any;
  handleRestart: () => void;
  setRandomizeKey: React.Dispatch<React.SetStateAction<number>>;
  handleCopySettings: () => void;
  copied: boolean;
  uptime: number;
  sessionCode?: string;
  onOpenDesigner?: () => void;
  botanicalConcept?: BotanicalConcept;
  onSelectConcept?: (concept: BotanicalConcept, meta: BotanicalConceptMeta) => void;
  evolutionStep?: number;
  onSelectEvolutionStep?: (step: number) => void;
  onOpenEvolutionModal?: () => void;
}

export function HUD({
  showHUD,
  setShowHUD,
  stats,
  state,
  setters,
  handleRestart,
  setRandomizeKey,
  handleCopySettings,
  copied,
  uptime,
  sessionCode,
  onOpenDesigner,
  botanicalConcept,
  onSelectConcept,
  evolutionStep,
  onSelectEvolutionStep,
  onOpenEvolutionModal,
}: HUDProps) {
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showHUD) {
      setIsControlsExpanded(true);
    }
  }, [showHUD]);

  const handleScroll = () => {
    if (!controlsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = controlsRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveTab(0);
      return;
    }
    const percent = scrollLeft / maxScroll;
    const newIndex = Math.min(6, Math.max(0, Math.round(percent * 6)));
    setActiveTab(newIndex);
  };

  const scrollToTab = (index: number) => {
    if (!controlsRef.current) return;
    const { scrollWidth, clientWidth } = controlsRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (index / 6) * maxScroll;
    controlsRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
    setActiveTab(index);
  };

  const totalBiomass =
    stats.strains.reduce((acc: number, s: any) => acc + s.biomass, 0) || 1;

  return (
    <div
      className={`absolute inset-0 z-40 pointer-events-none flex flex-col p-2 lg:p-4 m-1 lg:m-4 rounded transition-colors duration-500 ${
        showHUD ? "border-2 border-[#D2B48C]/20" : "border-2 border-transparent"
      }`}
    >
      <HUDTopBar
        showHUD={showHUD}
        setShowHUD={setShowHUD}
        stats={stats}
        state={state}
        setters={setters}
        handleRestart={handleRestart}
        setRandomizeKey={setRandomizeKey}
        handleCopySettings={handleCopySettings}
        copied={copied}
        onOpenDesigner={onOpenDesigner}
      />

      <BiomassPanel
        stats={stats}
        totalBiomass={totalBiomass}
        state={state}
        showHUD={showHUD}
      />

      <footer
        className={`w-full shrink-0 mt-auto flex flex-col justify-end text-[9px] font-mono transition-all duration-500 ${
          showHUD ? "opacity-100 visible pointer-events-none" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* Stats Bar */}
        <div className="flex justify-between items-center w-full py-1.5 px-2 sm:px-4 bg-transparent border-none z-20 shrink-0 pointer-events-auto">
          <div className="flex gap-4 sm:gap-6 items-center">
            <div className="flex flex-col items-center gap-0.5">
              <span className="opacity-60 text-[8px] uppercase">Active</span>
              <span>{stats.totalAgents}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="opacity-60 text-[8px] uppercase">Vectors</span>
              <span>{stats.geometryCount.toLocaleString()}</span>
            </div>

            <div
              className="flex items-center gap-1.5 cursor-pointer hover:text-white border border-[#D2B48C]/30 px-2 py-0.5 rounded bg-[#001220]/60 pointer-events-auto ml-2"
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
              title="Toggle System Dials"
            >
              <Cpu className="w-3 h-3 text-[#87CEEB]" />
              <span>DIALS</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-300 ${isControlsExpanded ? "" : "rotate-180"}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[8px] font-mono text-[#87CEEB]/80 tracking-widest select-none">
            <span>v{state.version || "0.3.1"}</span>
            {sessionCode && (
              <span className="text-[#D2B48C]/60 tracking-wider">· {sessionCode}</span>
            )}
          </div>
        </div>

        <div className="w-full flex flex-col bg-[#001220]/95 sm:bg-[#001220]/60 backdrop-blur-md border-t border-[#D2B48C]/30 transition-all duration-500 origin-bottom">
          {/* Mobile Chevron Header */}
          <div
            className="flex justify-center w-full py-2 cursor-pointer hover:bg-white/5 border-b border-[#D2B48C]/20 sm:hidden pointer-events-auto"
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          >
            <ChevronDown
              className={`w-5 h-5 text-[#D2B48C] transition-transform duration-300 ${
                isControlsExpanded ? "" : "rotate-180"
              }`}
            />
          </div>

          {/* Controls Area */}
          <div
            className={`w-full transition-all duration-500 ${
              isControlsExpanded ? "max-h-[60vh] sm:max-h-[50vh]" : "max-h-0"
            } overflow-hidden`}
          >
            <div
              ref={controlsRef}
              onScroll={handleScroll}
              className="flex sm:grid sm:grid-flow-col sm:grid-rows-2 overflow-x-auto gap-3 p-4 pb-3 no-scrollbar snap-x scroll-smooth pointer-events-auto"
            >
              {/* SYSTEM */}
              <SystemSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* WIND & MOTION */}
              <WindMotionSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* LANDSCAPE */}
              <LandscapeSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* LEAVES & BOTANY */}
              <BotanySection
                searchQuery={searchQuery}
                state={state}
                setters={setters}
                botanicalConcept={botanicalConcept}
                onSelectConcept={onSelectConcept}
              />

              {/* CONFIG & TIDE */}
              <ConfigTideSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* ECOLOGY */}
              <EcologySection searchQuery={searchQuery} state={state} setters={setters} />

              {/* LIFECYCLE */}
              <LifecycleSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* REPRODUCTION */}
              <ReproductionSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* BRANCHING */}
              <BranchingSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* SPEEDS */}
              <SpeedsSection searchQuery={searchQuery} state={state} setters={setters} />

              {/* MORPHOLOGY */}
              <MorphologySection searchQuery={searchQuery} state={state} setters={setters} />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 pb-3 pointer-events-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-black/40 border border-[#D2B48C]/30 px-3 py-1 rounded w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#87CEEB]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search controls..."
                    className="bg-transparent text-[10px] text-white focus:outline-none w-full placeholder:text-[#D2B48C]/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="text-[#D2B48C]/60 hover:text-white text-[10px] cursor-pointer"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["SYSTEM", "ECOLOGY", "LIFECYCLE", "REPRODUCTION", "BRANCHING", "SPEEDS", "MORPHOLOGY"].map(
                  (name, idx) => (
                    <button
                      key={name}
                      onClick={() => scrollToTab(idx)}
                      title={name}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeTab === idx ? "w-6 bg-[#87CEEB]" : "w-2 bg-[#D2B48C]/40 hover:bg-[#D2B48C]/80"
                      }`}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
