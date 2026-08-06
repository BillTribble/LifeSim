import React from "react";
import { SmartDial } from "./SmartDial";

export interface HUDSectionProps {
  searchQuery: string;
  state: any;
  setters: any;
}

export const hasMatch = (searchQuery: string, labels: string[]) =>
  !searchQuery || labels.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase()));

export function SystemSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "ROT_VEL",
      "ROT_X",
      "ROT_Y",
      "YAW",
      "PITCH",
      "MAX_DOMS",
      "MAX_AGENTS",
      "MIN_AGENTS",
      "MAX_SPECIES",
      "RADIUS",
      "SQUASH",
      "ROTATION",
      "MEMORY",
      "ORGANISMS",
      "SPECIES",
      "BOUNDARY",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        SYSTEM
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["camera spin", "orbit speed", "horizontal turn"]}
          tooltip="HORIZONTAL ROTATION VELOCITY (YAW)
Controls camera orbit around the vertical axis.
0 (Top): Stationary.
Right (Pos): Orbit clockwise.
Left (Neg): Orbit counter-clockwise."
          label="ROT_X"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={state.rotationSpeed}
          onChange={setters.setRotationSpeed}
          polar={true}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["camera tilt", "vertical pitch", "elevation angle"]}
          tooltip="VERTICAL ROTATION VELOCITY (PITCH)
Controls camera orbit around the horizontal plane.
0 (Top): Stationary.
Right (Pos): Pitch upwards.
Left (Neg): Pitch downwards."
          label="ROT_Y"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={state.rotationSpeedY}
          onChange={setters.setRotationSpeedY}
          polar={true}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["memory limit", "render capacity", "max segments"]}
          tooltip="MAX MEMORY POINTS
Limits total rendering complexity.
High: Richer visuals, lower performance.
Low: Simpler visuals, faster performance."
          label="MAX_DOMS"
          min={50000}
          max={450000}
          step={1000}
          value={state.maxDOMs}
          onChange={setters.setMaxDOMs}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["branch limit", "active stems", "growth capacity"]}
          tooltip="MAX ORGANISMS
Upper limit for population.
High: Crowded ecosystem.
Low: Sparse ecosystem."
          label="MAX_AGENTS"
          min={1}
          max={200}
          step={1}
          value={state.maxAgents}
          onChange={setters.setMaxAgents}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["population floor", "minimum creatures", "extinction buffer"]}
          tooltip="MIN ORGANISMS
Lower limit for population.
High: Ecosystem never dies out.
Low: Ecosystem can become almost empty."
          label="MIN_AGENTS"
          min={2}
          max={20}
          step={1}
          value={state.minAgents}
          onChange={setters.setMinAgents}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["species capacity", "biodiversity cap", "strain limit"]}
          tooltip="MAX SPECIES
Maximum active genetic strains.
High: High biodiversity.
Low: Monoculture."
          label="MAX_SPECIES"
          min={1}
          max={20}
          step={1}
          value={state.maxSpecies}
          onChange={setters.setMaxSpecies}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["boundary size", "arena width", "world radius"]}
          tooltip="BOUNDARY RADIUS
Size of the simulation area.
High: Vast open space.
Low: Confined, dense space."
          label="RADIUS"
          min={50}
          max={1000}
          step={10}
          value={state.boundarySize}
          onChange={setters.setBoundarySize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["vertical flatten", "height ratio", "aspect shape"]}
          tooltip="BOUNDARY SQUASH
Squashes vertical space height for landscape screens.
1.0: Equal proportions (sphere / cube).
< 1.0: Squashed height (ovoid / rectangular ribbon).
Ceiling & floor track with squashed area height."
          label="SQUASH"
          min={0.1}
          max={2.0}
          step={0.01}
          value={state.boundarySquash}
          onChange={setters.setBoundarySquash}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}

export function LandscapeSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "LAYER_GAP",
      "FLOOR_HEIGHT",
      "CEILING_HEIGHT",
      "LANDSCAPE",
      "LAYER",
      "HEIGHT",
      "GAP",
      "FLOOR",
      "CEILING",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#87CEEB]/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#87CEEB] tracking-widest text-center border-b border-[#87CEEB]/20 pb-1 font-bold">
        LANDSCAPE
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["strata spacing", "floor ceiling gap", "layer distance"]}
          tooltip="LAYER GAP
Relative vertical distance/gap between floor and ceiling landscape layers."
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
Individual vertical offset for the bottom floor landscape layer."
          label="FLOOR_HEIGHT"
          min={-150}
          max={150}
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
Individual vertical offset for the top ceiling landscape layer."
          label="CEILING_HEIGHT"
          min={-150}
          max={150}
          step={1}
          value={state.ceilingHeight}
          onChange={setters.setCeilingHeight}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["orthographic fov", "perspective depth", "lens flat"]}
          tooltip="CAMERA PROJECTION
Slide between flat orthographic (0 = no perspective) and full 3D perspective (1.0)."
          label="PROJECTION"
          min={0.0}
          max={1.0}
          step={0.01}
          value={state.cameraProjection ?? 1.0}
          onChange={setters.setCameraProjection}
          color="#87CEEB"
        />
        <button
          onClick={() => setters.setShowBoundaryBox(!state.showBoundaryBox)}
          className={`px-2 py-1 rounded text-[8px] font-mono tracking-wider border transition-all ${
            state.showBoundaryBox
              ? "border-[#87CEEB] bg-[#87CEEB]/20 text-[#87CEEB]"
              : "border-white/20 bg-black/40 text-white/50 hover:bg-white/10"
          }`}
          title="Toggle 3D Bounding Box Wireframe Edges"
        >
          BOUNDS: {state.showBoundaryBox ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

export function BotanySection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "LEAF_SCALE",
      "LEAF_DENSITY",
      "LEAF_SIZE_DIFF",
      "LEAF_SPD",
      "LEAF_ANGLE",
      "LEAF_PROB",
      "WIND_VEL",
      "FLUTTER",
      "LEAF",
      "LEAVES",
      "BOTANY",
      "foliage",
      "frond",
      "petal",
      "breeze",
      "sway",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-green-500/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-green-400 tracking-widest text-center border-b border-green-500/20 pb-1 font-bold">
        LEAVES & BOTANY
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["foliage size", "frond scale", "petal dimension"]}
          tooltip="LEAF SCALE
Size of foliage leaves."
          label="LEAF_SCALE"
          min={0.05}
          max={10.0}
          step={0.05}
          value={state.leafScale}
          onChange={setters.setLeafScale}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["leaf count", "foliage density", "branch greenery"]}
          tooltip="LEAF DENSITY
Density of foliage coverage along stems."
          label="LEAF_DENSITY"
          min={0.1}
          max={1.0}
          step={0.05}
          value={state.leafDensity}
          onChange={setters.setLeafDensity}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["size variation", "leaf randomness", "foliage diversity"]}
          tooltip="LEAF SIZE DIFF
Variability in individual leaf sizes."
          label="LEAF_SIZE_DIFF"
          min={0.0}
          max={0.5}
          step={0.05}
          value={state.relativeLeafSizeDiff}
          onChange={setters.setRelativeLeafSizeDiff}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["leaf sprout speed", "foliage rate", "bud develop time"]}
          tooltip="LEAF GROWTH SPEED
Rate at which new leaves unfurl."
          label="LEAF_SPD"
          min={0.005}
          max={0.05}
          step={0.005}
          value={state.leafGrowthSpeed}
          onChange={setters.setLeafGrowthSpeed}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["golden ratio angle", "leaf spiral", "phyllotaxis rotation"]}
          tooltip="PHYLLOTAXIS ANGLE
Divergence angle between consecutive leaves."
          label="LEAF_ANGLE"
          min={90}
          max={180}
          step={1}
          value={state.phyllotaxisAngle}
          onChange={setters.setPhyllotaxisAngle}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["leaf spawn chance", "foliage probability", "bloom rate"]}
          tooltip="LEAF PROBABILITY
Chance of spawning leaves on eligible nodes."
          label="LEAF_PROB"
          min={0.1}
          max={1.0}
          step={0.05}
          value={state.leafProbability}
          onChange={setters.setLeafProbability}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["breeze force", "plant sway", "air turbulence"]}
          tooltip="WIND VELOCITY
Sway velocity imparted by wind on foliage."
          label="WIND_VEL"
          min={0.0}
          max={5.0}
          step={0.1}
          value={state.windVelocity}
          onChange={setters.setWindVelocity}
          color="#4ade80"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["leaf shake", "foliage tremble", "wind vibration"]}
          tooltip="FLUTTER INTENSITY
Rapid fluttering motion of individual leaves."
          label="FLUTTER"
          min={0.0}
          max={2.0}
          step={0.1}
          value={state.flutterIntensity}
          onChange={setters.setFlutterIntensity}
          color="#4ade80"
        />
      </div>
    </div>
  );
}

export function ConfigTideSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "TIDE_SPEED",
      "TIDE_THICK",
      "TIDE_OPACITY",
      "TIDE_SAT",
      "FOG_VIS",
      "TIDE",
      "CLOUD",
      "CONFIG",
      "FOG",
      "wave",
      "ocean",
      "water",
      "haze",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-purple-500/30 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-purple-400 tracking-widest text-center border-b border-purple-500/20 pb-1 font-bold">
        CONFIG & TIDE
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["wave speed", "ocean pulse", "water frequency"]}
          tooltip="TIDE SPEED
Speed of tide cloud pulses."
          label="TIDE_SPEED"
          min={0.1}
          max={10.0}
          step={0.1}
          value={state.tideSpeed}
          onChange={setters.setTideSpeed}
          color="#c084fc"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["wave height", "ocean depth", "water thickness"]}
          tooltip="TIDE THICKNESS
Vertical thickness of tide cloud layer."
          label="TIDE_THICK"
          min={20}
          max={500}
          step={10}
          value={state.tideThickness}
          onChange={setters.setTideThickness}
          color="#c084fc"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["water transparency", "wave alpha", "ocean visibility"]}
          tooltip="TIDE OPACITY
Transparency of tide cloud layer."
          label="TIDE_OPACITY"
          min={0.0}
          max={1.0}
          step={0.05}
          value={state.tideOpacity}
          onChange={setters.setTideOpacity}
          color="#c084fc"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["water saturation", "wave color intensity", "ocean vividness"]}
          tooltip="TIDE SATURATION
Color saturation of tide cloud layer."
          label="TIDE_SAT"
          min={0.0}
          max={1.0}
          step={0.05}
          value={state.tideSaturation}
          onChange={setters.setTideSaturation}
          color="#c084fc"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["fog distance", "atmospheric depth", "haze clarity"]}
          tooltip="FOG VISIBILITY
Distance of atmospheric fog fade."
          label="FOG_VIS"
          min={100}
          max={2000}
          step={50}
          value={state.fogVisibility}
          onChange={setters.setFogVisibility}
          color="#c084fc"
        />
      </div>
    </div>
  );
}
