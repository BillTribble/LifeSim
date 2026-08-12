import React from "react";
import { SmartDial } from "./SmartDial";
import { HUDSectionProps, hasMatch } from "./HUDSectionsA";

export function BranchingSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "BRANCH_VAR",
      "BRANCHING",
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
Default: 4."
          label="RHIZ_MIN"
          min={1}
          max={10}
          step={1}
          value={state.rhizomeMinBranches ?? 4}
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

export function SpeedsSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "SNAKE",
      "S_STEP",
      "S_WAND",
      "BUSH",
      "TREE",
      "RHIZOME",
      "SPEED",
      "STEP",
      "WANDER",
      "crawler",
      "stride",
      "meander",
      "shrub",
      "timber",
      "tuber",
      "segment",
      "length",
      "BUSH_LEN",
      "TREE_LEN",
      "RHIZ_LEN",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        SPEEDS & SEGMENTS
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tendril speed", "crawler velocity", "vine speed"]}
          tooltip="SNAKE SPEED
Movement speed for snake-types.
High: Fast, darting snakes.
Low: Sluggish snakes."
          label="SNAKE"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.snakeSpeed}
          onChange={setters.setSnakeSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tendril stride", "stride length", "crawler segment distance"]}
          tooltip="SNAKE STEP
Step size for snake-types.
High: Snakes cover more ground per tick.
Low: Snakes take smaller steps."
          label="S_STEP"
          min={0.1}
          max={5.0}
          step={0.1}
          value={state.snakeStepSize}
          onChange={setters.setSnakeStepSize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["wiggle curve", "meander intensity", "undulation sway"]}
          tooltip="SNAKE WANDER
Wander intensity for snake-types.
High: Snakes turn frantically.
Low: Snakes move in straight lines."
          label="S_WAND"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.snakeWander}
          onChange={setters.setSnakeWander}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["shrub speed", "bush growth rate", "hedge velocity"]}
          tooltip="BUSH SPEED
Growth speed for bush-types.
High: Rapidly expanding bushes.
Low: Slowly growing bushes."
          label="BUSH"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.bushSpeed}
          onChange={setters.setBushSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bush segment length", "shrub step size", "hedge joint spacing"]}
          tooltip="BUSH SEGMENT LENGTH
Segment length & step size for bush-types.
High: Longer, blockier branch segments.
Low: Shorter, tightly curved smooth tendrils."
          label="BUSH_LEN"
          min={0.05}
          max={3.0}
          step={0.05}
          value={state.bushStepSize}
          onChange={setters.setBushStepSize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["trunk speed", "tree growth rate", "timber velocity"]}
          tooltip="TREE SPEED
Growth speed for tree-types.
High: Fast-sprouting trees.
Low: Slow, ancient trees."
          label="TREE"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.treeSpeed}
          onChange={setters.setTreeSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tree segment length", "trunk step size", "timber joint spacing"]}
          tooltip="TREE SEGMENT LENGTH
Segment length & step size for tree-types.
High: Longer, straighter trunk/branch sections.
Low: Shorter, snug organic tree joints."
          label="TREE_LEN"
          min={0.05}
          max={3.0}
          step={0.05}
          value={state.treeStepSize}
          onChange={setters.setTreeStepSize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["root speed", "tuber advance", "spore velocity"]}
          tooltip="RHIZOME SPEED
Movement speed for rhizome-types.
High: Quick, erratic rhizomes.
Low: Slow, drifting rhizomes."
          label="RHIZOME"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.rhizomeSpeed}
          onChange={setters.setRhizomeSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["rhizome segment length", "tuber step size", "root joint spacing"]}
          tooltip="RHIZOME SEGMENT LENGTH
Segment length & step size for rhizome-types.
High: Long, chunky tuber sections.
Low: Tight, snug, bulbous ginger joints."
          label="RHIZ_LEN"
          min={0.05}
          max={3.0}
          step={0.05}
          value={state.rhizomeStepSize}
          onChange={setters.setRhizomeStepSize}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}

export function MorphologySection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "APPENDAGE SIZE",
      "SEG_GAP",
      "SEGMENT",
      "GAP",
      "SPACING",
      "TAPER_TIME",
      "MAX_WIDTH",
      "WIDTH_VAR",
      "MULTI_COLOR",
      "SAME_COLOR",
      "PULSE_SPD",
      "SATURATION",
      "APPENDAGE",
      "SIZE",
      "TAPER",
      "WIDTH",
      "COLOR",
      "PULSE",
      "blossom",
      "girth",
      "bloom",
      "glow",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        MORPHOLOGY
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["blossom scale", "petal size", "flower radius"]}
          tooltip="APPENDAGE SIZE
Scale of structural appendages.
High: Massive, prominent appendages.
Low: Tiny, subtle appendages."
          label="APPENDAGE SIZE"
          min={0.1}
          max={3.0}
          step={0.1}
          value={state.flowerSize}
          onChange={setters.setFlowerSize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["segment gap", "joint spacing", "ring distance"]}
          tooltip="SEGMENT GAP
Spacing between joints for segmented geometry.
0: Solid, flush continuous stem.
High: Large gaps between segments."
          label="SEG_GAP"
          min={0.0}
          max={0.50}
          step={0.01}
          value={state.segmentGap}
          onChange={setters.setSegmentGap}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["sculptural fade", "dissolve duration", "tip sharpness"]}
          tooltip="TAPER DUR
Duration of line thickness tapering.
High: Long, smooth tapers.
Low: Abrupt, sharp tapers."
          label="TAPER_TIME"
          min={0.5}
          max={3.0}
          step={0.1}
          value={state.taperDuration}
          onChange={setters.setTaperDuration}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["maximum girth", "trunk thickness cap", "stem diameter"]}
          tooltip="MAX WIDTH
Maximum thickness of organisms.
High: Thick, bulky lines.
Low: Thin, delicate lines."
          label="MAX_WIDTH"
          min={1.0}
          max={20.0}
          step={0.5}
          value={state.maxLineWidth}
          onChange={setters.setMaxLineWidth}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["taper asymmetry", "girth fluctuation", "organic lumpiness"]}
          tooltip="WIDTH VARIANCE
Variance in creature width. Wider creatures branch more and rotate more.
High: Extreme thickness differences, lush rhododendron-like bushes.
Low: Uniform thin creatures."
          label="WIDTH_VAR"
          min={0.0}
          max={2.0}
          step={0.1}
          value={state.widthVariance}
          onChange={setters.setWidthVariance}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["rainbow parts", "multicolor ornaments", "chromatic petals"]}
          tooltip="MULTI COLOR APP PROB
Chance of colorful appendages.
High: Rainbow, multi-colored parts.
Low: Monochromatic parts."
          label="MULTI_COLOR"
          min={0}
          max={1.0}
          step={0.05}
          value={state.multicolorAppProb}
          onChange={setters.setMulticolorAppProb}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["matching ornaments", "uniform color petals", "monochrome parts"]}
          tooltip="SAME COLOR APP PROB
Chance appendages match body color.
High: Uniformly colored organisms.
Low: Contrasting appendage colors."
          label="SAME_COLOR"
          min={0.0}
          max={1.0}
          step={0.05}
          value={state.sameColorAppProb}
          onChange={setters.setSameColorAppProb}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bioluminescence rhythm", "glow frequency", "heartbeat rate"]}
          tooltip="PULSE SPEED
Speed of luminescent pulses.
High: Rapid, strobing pulses.
Low: Slow, gentle throbbing."
          label="PULSE_SPD"
          min={0.1}
          max={1.0}
          step={0.1}
          value={state.globalPulseSpeed}
          onChange={setters.setGlobalPulseSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["color clamping", "muted tones", "palette limiter"]}
          tooltip="COLOR CLAMPING (0-100%)
Limits max saturation & lightness clamping of organism colors.
High (100%): Unconstrained vivid colors.
Low (0%): Heavily clamped, muted tones."
          label="COLOR_CLAMP"
          min={0.0}
          max={1.0}
          step={0.01}
          value={state.colorClamp}
          onChange={setters.setColorClamp}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["strata spacing", "floor ceiling gap", "layer distance"]}
          tooltip="LAYER GAP
Relative vertical distance/gap to landscape layers with creature space in middle."
          label="LAYER_GAP"
          min={10}
          max={300}
          step={1}
          value={state.layerGap}
          onChange={setters.setLayerGap}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bottom offset", "ground elevation", "lower strata"]}
          tooltip="FLOOR HEIGHT
Individual height control for the bottom floor landscape layer."
          label="FLOOR_HEIGHT"
          min={-200}
          max={40}
          step={1}
          value={state.floorHeight}
          onChange={setters.setFloorHeight}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["top offset", "sky elevation", "upper strata"]}
          tooltip="CEILING HEIGHT
Individual height control for the top ceiling landscape layer."
          label="CEILING_HEIGHT"
          min={45}
          max={300}
          step={1}
          value={state.ceilingHeight}
          onChange={setters.setCeilingHeight}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["color saturation cap", "vividness limit", "chroma intensity"]}
          tooltip="SATURATION
Overall color intensity limit.
High: Vibrant, neon colors.
Low: Muted, pastel colors."
          label="SATURATION"
          min={0.0}
          max={1.0}
          step={0.05}
          value={state.maxSaturation}
          onChange={setters.setMaxSaturation}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["bloom brightness", "luminescence level", "shine power"]}
          tooltip="GLOW INTENSITY
Intrinsic brightness of glowing organisms."
          label="GLOW_INTENSITY"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.glowTraitIntensity}
          onChange={setters.setGlowTraitIntensity}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["light radius", "glow spill", "illumination range"]}
          tooltip="GLOW DISTANCE
Max spill range of reflected light onto neighboring creatures."
          label="GLOW_DIST"
          min={5.0}
          max={200.0}
          step={5.0}
          value={state.glowTraitDistance}
          onChange={setters.setGlowTraitDistance}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["ambient reflection", "bounce light", "glow bounce"]}
          tooltip="GLOW REFLECT
Multiplier for how intensely nearby creatures reflect ambient glow."
          label="GLOW_REFLECT"
          min={0.0}
          max={5.0}
          step={0.1}
          value={state.glowTraitReflect}
          onChange={setters.setGlowTraitReflect}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}
