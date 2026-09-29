import React from "react";
import { SmartDial } from "./SmartDial";
import { HUDSectionProps, hasMatch } from "./HUDSectionsA";

export function BranchingSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "BRANCH_VAR",
      "BRANCHING",
      "PRUNING",
      "PRUNE",
      "MAX_DEPTH",
      "MAX_BRANCH",
      "DEPTH",
      "TRIM",
      "SIMPLIFY",
      "BRANCH_SPD",
      "BUSH",
      "TREE",
      "SNAKE",
      "RHIZOME",
      "BUSH_BR",
      "TREE_BR",
      "SNAK_BR",
      "RHIZ_BR",
      "BUSH_MIN",
      "RHIZ_MIN",
      "TREE_MIN",
      "SNAK_MIN",
      "MIN_BRANCH",
      "ARCHETYPE",
      "TERM_BRANCH",
      "B_MUTATE",
      "BRANCH_BIG",
      "LRG_BRANCH",
      "VARIANCE",
      "RATE",
      "PENALTY",
      "MUTATION",
      "PROB",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        BRANCHING
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["splitting randomness", "bifurcation chaos", "branch jitter"]}
          tooltip="BRANCH VARIANCE
Randomness in branching patterns.
High: Wild, chaotic branching.
Low: Uniform, predictable branching."
          label="BRANCH_VAR"
          min={1}
          max={50.0}
          step={1.0}
          value={state.branchTendencyVar}
          onChange={setters.setBranchTendencyVar}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["branch frequency", "fork multiplier", "limb splitting"]}
          tooltip="BRANCH RATE
Overall frequency of branching.
High: Dense, bushy structures.
Low: Linear, simple structures."
          label="BRANCHING"
          min={0.1}
          max={500.0}
          step={0.1}
          value={state.branchingMultiplier}
          onChange={setters.setBranchingMultiplier}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["pruning", "branch pruning", "simplify patterns", "trim twigs", "abscission", "thinning"]}
          tooltip="PRUNING STRENGTH
Prunes crowded, excessive, or deep branches to simplify complex patterns and maintain 60 FPS on M1 Mac.
High: Minimalist, clean structural limbs.
Low: Dense, tangled thicket."
          label="PRUNING"
          min={0.0}
          max={2.0}
          step={0.05}
          value={state.pruningStrength ?? 0.8}
          onChange={setters.setPruningStrength}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["max branch depth", "branch hierarchy", "twig levels", "branch layers"]}
          tooltip="MAX BRANCH DEPTH
Hierarchy limit on recursive sub-branches (trunk -> limbs -> twigs).
High: Deep fractal branching.
Low: Clean, primary limbs."
          label="MAX_DEPTH"
          min={1}
          max={8}
          step={1}
          value={state.maxBranchDepth ?? 4}
          onChange={setters.setMaxBranchDepth}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["max branches per species", "branch cap", "limb limit", "branch quota"]}
          tooltip="MAX BRANCHES
Maximum active growing branches per organism before pruning takes over.
Prevents performance drops on M1 Mac."
          label="MAX_BRANCH"
          min={3}
          max={128}
          step={1}
          value={state.maxBranchesPerSpecies ?? 48}
          onChange={setters.setMaxBranchesPerSpecies}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["child branch speed", "twig growth burst", "split velocity"]}
          tooltip="BRANCH SPEED BOOST
Multiplies growth speed for creatures doing lots of branching.
High: Heavily branching bushes explode in rapid growth.
Low: Branching does not speed up growth."
          label="BRANCH_SPD"
          min={0.0}
          max={10.0}
          step={0.1}
          value={state.branchGrowthBoost}
          onChange={setters.setBranchGrowthBoost}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["split abort chance", "post branch stop", "bifurcation end"]}
          tooltip="BRANCH TERM PENALTY
Death risk after creating a branch.
High: Branching is often fatal.
Low: Safe, frequent branching."
          label="TERM_BRANCH"
          min={0.5}
          max={10.0}
          step={0.5}
          value={state.termProbPostBranch}
          onChange={setters.setTermProbPostBranch}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["thicker branches", "heavy limbs", "width expansion"]}
          tooltip="BRANCH BIGGER
Chance for branches to be thicker.
High: Thick, heavy secondary branches.
Low: Thin, wispy branches."
          label="BRANCH_BIG"
          min={0}
          max={1.0}
          step={0.05}
          value={state.branchBigger}
          onChange={setters.setBranchBigger}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["shrub branching", "hedge split rate", "cluster forks"]}
          tooltip="BUSH BRANCHING
Branching multiplier for bush-types.
High: Extremely dense bush branching.
Low: Sparse bush branches."
          label="BUSH_BR"
          min={0.1}
          max={50.0}
          step={0.5}
          value={state.bushBranching}
          onChange={setters.setBushBranching}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["trunk branching", "arbor split rate", "canopy forks"]}
          tooltip="TREE BRANCHING
Branching multiplier for tree-types.
High: Explosive tree canopy.
Low: Single trunk trees."
          label="TREE_BR"
          min={0.1}
          max={50.0}
          step={0.5}
          value={state.treeBranching}
          onChange={setters.setTreeBranching}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tendril branching", "vine fork rate", "crawler splits"]}
          tooltip="SNAKE BRANCHING
Branching multiplier for snake-types.
High: Branching snakes.
Low: Pure single snakes."
          label="SNAK_BR"
          min={0.1}
          max={50.0}
          step={0.5}
          value={state.snakeBranching}
          onChange={setters.setSnakeBranching}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["root branching", "tuber split rate", "spore forks"]}
          tooltip="RHIZOME BRANCHING
Branching multiplier for rhizome-types.
High: Intense, tangled rhizome network.
Low: Minimal rhizome splits."
          label="RHIZ_BR"
          min={0.1}
          max={50.0}
          step={0.5}
          value={state.rhizomeBranching}
          onChange={setters.setRhizomeBranching}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bush minimum branches", "shrub branch floor", "bush survival"]}
          tooltip="BUSH MIN BRANCHES
Minimum active branches kept alive for bush species before any branches can terminate.
Default: 2."
          label="BUSH_MIN"
          min={1}
          max={10}
          step={1}
          value={state.bushMinBranches ?? 2}
          onChange={setters.setBushMinBranches}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["rhizome minimum branches", "ginger branch floor", "root survival"]}
          tooltip="RHIZOME MIN BRANCHES
Minimum active branches kept alive for rhizome species before any branches can terminate.
Default: 6."
          label="RHIZ_MIN"
          min={1}
          max={10}
          step={1}
          value={state.rhizomeMinBranches ?? 6}
          onChange={setters.setRhizomeMinBranches}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tree minimum branches", "tree branch floor", "tree survival"]}
          tooltip="TREE MIN BRANCHES
Minimum active branches kept alive for tree species before any branches can terminate.
Default: 1."
          label="TREE_MIN"
          min={1}
          max={10}
          step={1}
          value={state.treeMinBranches ?? 1}
          onChange={setters.setTreeMinBranches}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tree branch delay", "tree trunk height", "tree trunk length", "branch delay"]}
          tooltip="TREE TRUNK DURATION / BRANCH DELAY
How long the tree grows a straight vertical trunk before canopy branching begins.
Low: Branches almost immediately near base.
High: Grows a tall straight trunk before branching."
          label="TREE_DELAY"
          min={0}
          max={300}
          step={5}
          value={state.treeBranchDelay ?? 60}
          onChange={setters.setTreeBranchDelay}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bush taper", "bush twig length", "bush tapering"]}
          tooltip="BUSH TAPERING & TWIG LENGTH
Controls how quickly bush twigs taper and terminate.
High: Shorter twigs, faster tapering.
Low: Long, sprawling whispy twigs."
          label="BUSH_TAPER"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.bushTaper ?? 1.0}
          onChange={setters.setBushTaper}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tree taper", "tree twig length", "tree canopy tapering"]}
          tooltip="TREE TAPERING & TWIG LENGTH
Controls how quickly tree canopy twigs taper and terminate.
High: Compact woody canopy, shorter twigs.
Low: Long whispy tendrils extending far out."
          label="TREE_TAPER"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.treeTaper ?? 1.0}
          onChange={setters.setTreeTaper}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["rhizome taper", "root runner length", "rhizome tapering"]}
          tooltip="RHIZOME TAPERING & TWIG LENGTH
Controls how quickly rhizome runners taper and terminate.
High: Compact root clusters, shorter runners.
Low: Expansive long trailing roots."
          label="RHIZ_TAPER"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.rhizomeTaper ?? 1.0}
          onChange={setters.setRhizomeTaper}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["snake minimum branches", "snake branch floor", "snake survival"]}
          tooltip="SNAKE MIN BRANCHES
Minimum active agents kept alive for snake species before any can terminate.
Default: 1."
          label="SNAK_MIN"
          min={1}
          max={10}
          step={1}
          value={state.snakeMinBranches ?? 1}
          onChange={setters.setSnakeMinBranches}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}

