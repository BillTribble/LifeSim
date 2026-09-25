import React from "react";
import { SmartDial } from "./SmartDial";

interface Props {
  activeCategory: string;
  searchQuery: string;
  state: any;
  setters: any;
}

export function ArchetypeDesignerDialsB({
  activeCategory,
  searchQuery,
  state,
  setters,
}: Props) {
  return (
    <>
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
    </>
  );
}
