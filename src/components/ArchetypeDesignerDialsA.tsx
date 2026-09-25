import React from "react";
import { SmartDial } from "./SmartDial";
import { Archetype } from "../lib/SimulationTypes";

interface Props {
  activeCategory: string;
  currentArchetype: Archetype;
  searchQuery: string;
  state: any;
  setters: any;
}

export function ArchetypeDesignerDialsA({
  activeCategory,
  currentArchetype,
  searchQuery,
  state,
  setters,
}: Props) {
  return (
    <>
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

    </>
  );
}
