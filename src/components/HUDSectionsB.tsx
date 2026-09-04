import React from "react";
import { SmartDial } from "./SmartDial";
import { HUDSectionProps, hasMatch } from "./HUDSectionsA";

export function EcologySection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "MAGNET",
      "PROXIM",
      "DESPAIR",
      "DESP_AGE",
      "ENTROPY",
      "ECO_FADE",
      "CULL_RATE",
      "SWARM",
      "COHESION",
      "DETECTION",
      "RANGE",
      "DESPERATION",
      "AGE",
      "POPULATION",
      "LIMIT",
      "FADE",
      "CULL",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        ECOLOGY
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["swarm attraction", "creature pull", "cohesion force"]}
          tooltip="SWARM COHESION
How strongly organisms attract each other.
High: Tight, dense swarms.
Low: Independent, scattered movement."
          label="MAGNET"
          min={0}
          max={0.1}
          step={0.002}
          value={state.magnetism}
          onChange={setters.setMagnetism}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["feeler similarity", "homing precision", "mating seek strength"]}
          tooltip="SEEK AMOUNT (FEELER SIMILARITY)
Controls how directly regular creatures track and home in on mating partners (similar to feelers).
0.0 (0%): Standard gentle creature steering.
1.0 (100%): Direct feeler-like target lock-on and omniscient segment tracking."
          label="SEEK_AMT"
          min={0.0}
          max={1.0}
          step={0.01}
          value={state.seekAmount}
          onChange={setters.setSeekAmount}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["sensor radius", "detection distance", "vision range"]}
          tooltip="DETECTION RANGE
How far organisms can sense others.
High: Long-range interactions.
Low: Myopic, local interactions only."
          label="PROXIM"
          min={1}
          max={2000.0}
          step={10.0}
          value={state.proximity}
          onChange={setters.setProximity}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["erratic search", "panic speed", "frenzy multiplier"]}
          tooltip="DESPERATION
Erratic movement when seeking food/mates.
High: Frantic, fast searching.
Low: Calm, methodical movement."
          label="DESPAIR"
          min={1}
          max={10.0}
          step={0.1}
          value={state.desperation}
          onChange={setters.setDesperation}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["desperation threshold", "senescence trigger", "old age panic"]}
          tooltip="DESPAIR AGE
Age at which desperation begins.
High: Only elders become desperate.
Low: Youthful desperation."
          label="DESP_AGE"
          min={50}
          max={600}
          step={25}
          value={state.despairAge}
          onChange={setters.setDespairAge}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["extinction dissolve", "corpse cleanup", "decay time"]}
          tooltip="ECO FADE
Rate at which environment marks disappear.
High: Trails fade quickly.
Low: Long-lasting environmental impact."
          label="ECO_FADE"
          min={0.0}
          max={1.0}
          step={0.01}
          value={state.ecoFade}
          onChange={setters.setEcoFade}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["population ceiling", "overcrowd purge", "agent cap trim"]}
          tooltip="CULL RATE
Speed of population control.
High: Rapid culling of excess organisms.
Low: Slow, gradual culling."
          label="CULL_RATE"
          min={0.0}
          max={50.0}
          step={0.01}
          value={state.cullRate}
          onChange={setters.setCullRate}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}

export function LifecycleSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "GROW_SPD",
      "DEATH RATE",
      "DIE_BIAS",
      "TERM_PROB",
      "FADE_SPEED",
      "FEELER_FADE",
      "FEELER_DELAY",
      "DELAY",
      "EXTRUSION",
      "SPEED",
      "WIDTH_SPD",
      "WIDTH_GROWTH",
      "THICKNESS",
      "WIDTH",
      "DECAY",
      "VELOCITY",
      "AGE",
      "BIAS",
      "TERMINATION",
      "FEELER",
      "wither",
      "corpse",
      "death",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        LIFECYCLE
      </span>
      <div className="flex gap-1 flex-wrap justify-center max-w-[280px] sm:max-w-none">
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["global extrusion", "growth rate", "stem push speed"]}
          tooltip="EXTRUSION SPEED
Growth rate of organisms.
High: Fast, explosive growth.
Low: Slow, deliberate growth."
          label="GROW_SPD"
          min={0.01}
          max={5.0}
          step={0.01}
          value={state.growthSpeed}
          onChange={setters.setGrowthSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["thickening speed", "girth growth", "radius expansion"]}
          tooltip="WIDTH SPEED EFFECT
How stem thickness influences growth rate.
0 (Top): Width has no effect on speed.
Right (Pos): Thicker stems grow slower (mass inertia).
Left (Neg): Thicker stems grow faster."
          label="WIDTH_SPD"
          min={-1.0}
          max={1.0}
          step={0.05}
          value={state.widthGrowthEffect}
          onChange={setters.setWidthGrowthEffect}
          polar={true}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["decay rate", "wither speed", "shrink velocity"]}
          tooltip="DECAY VELOCITY
Speed of organism deterioration.
High: Rapid decay and death.
Low: Slow, lingering decline."
          label="DEATH RATE"
          min={0.0}
          max={100.0}
          step={0.01}
          value={state.diebackRate}
          onChange={setters.setDiebackRate}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["ancient pruning", "old limb death", "age decay bias"]}
          tooltip="AGE BIAS
Impact of age on death rate.
High: Old age is strictly fatal.
Low: Age matters less for survival."
          label="DIE_BIAS"
          min={0.5}
          max={5.0}
          step={0.1}
          value={state.diebackAgeBias}
          onChange={setters.setDiebackAgeBias}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tip termination", "branch stop chance", "growth halt"]}
          tooltip="TERMINATION
Base chance of death for old creatures."
          label="TERM_PROB"
          min={0.0}
          max={1.0}
          step={0.0001}
          value={state.terminationProb}
          onChange={setters.setTerminationProb}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["sculptural fade", "corpse dissolve", "ghost duration"]}
          tooltip="FADE SPEED
How fast dead organisms vanish.
High: Corpses disappear quickly.
Low: Ghostly remains linger."
          label="FADE_SPEED"
          min={0.1}
          max={100.0}
          step={0.5}
          value={state.desiccationSpeed}
          onChange={setters.setDesiccationSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["tendril lifespan", "feeler decay", "sensory duration"]}
          tooltip="FEELER FADE
Decay rate of sensory appendages.
High: Feelers are short-lived.
Low: Long, persistent feelers."
          label="FEELER_FADE"
          min={1.0}
          max={50.0}
          step={1.0}
          value={state.feelerFade}
          onChange={setters.setFeelerFade}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["feeler delay", "sensory wait", "mating delay", "feeler timing"]}
          tooltip="FEELER DELAY
Minimum time in seconds before organisms can extend sensory feelers.
Allows creatures to seek and mate naturally before deploying feelers."
          label="FEELER_DELAY"
          min={0.0}
          max={20.0}
          step={0.5}
          value={state.feelerDelay}
          onChange={setters.setFeelerDelay}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}

export function ReproductionSection({ searchQuery, state, setters }: HUDSectionProps) {
  if (
    !hasMatch(searchQuery, [
      "HUE_SHIFT",
      "HYBRID_COOL",
      "HYBRID_SIZE",
      "HYBRID_DECAY",
      "HYBRID_SPIN",
      "BREED_LIMIT",
      "BREED",
      "MATING",
      "COOLDOWN",
      "SIZE",
      "DECAY",
      "SPIN",
      "REPRODUCTION",
      "color mutation",
      "offspring",
      "embryo",
      "fertility",
    ])
  ) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 border border-[#D2B48C]/20 p-2 rounded bg-black/20 shrink-0 min-w-[max-content] snap-start">
      <span className="text-[8px] text-[#D2B48C]/70 tracking-widest text-center border-b border-[#D2B48C]/20 pb-1">
        REPRODUCTION
      </span>
      <div className="flex gap-1 flex-wrap justify-center items-center max-w-[280px] sm:max-w-none">
        <button
          onClick={() => setters.setAllowBreeding(!state.allowBreeding)}
          className={`px-2 py-1 rounded text-[8px] font-mono tracking-wider border transition-all ${
            state.allowBreeding
              ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
              : "border-red-500/50 bg-red-950/40 text-red-400 opacity-80 hover:bg-red-900/50"
          }`}
          title="Toggle whether organisms can breed and produce offspring"
        >
          BREEDING: {state.allowBreeding ? "ON" : "OFF"}
        </button>
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["color mutation", "hue drift", "genetic color shift"]}
          tooltip="HUE SHIFT
Amount of hue shift when offspring inherit a parent's color (90% chance).
High: Strong hue shifts across the color wheel.
Low: Subtle analogous color shifts."
          label="HUE_SHIFT"
          min={0.0}
          max={0.25}
          step={0.01}
          value={state.colorMutationShift}
          onChange={setters.setColorMutationShift}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["mating delay", "fertility interval", "breeding pause", "growth cooldown"]}
          tooltip="HYBRID BREED COOL
Growth cooldown interval after mating or birth (min 180 ticks / 3.0s).
During cooldown, organisms pause seeking to grow outward and expand their canopy.
High: Long vegetative growth phase, infrequent mating.
Low: Faster return to seeking after 3s growth."
          label="HYBRID_COOL"
          min={180}
          max={2000}
          step={10}
          value={state.hybridCooldown}
          onChange={setters.setHybridCooldown}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["mating orb size", "hybrid embryo scale", "offspring core"]}
          tooltip="HYBRID SIZE
Starting size of new offspring.
High: Massive newborns.
Low: Tiny, fragile newborns."
          label="HYBRID_SIZE"
          min={0.5}
          max={10.0}
          step={0.1}
          value={state.hybridSize}
          onChange={setters.setHybridSize}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["creature adhesive", "mating bond", "contact friction"]}
          tooltip="HYBRID DECAY
Duration that hybridization artifacts persist before fading.
High: Artifacts linger for a long time.
Low: Artifacts fade away quickly."
          label="HYBRID_DECAY"
          min={0.01}
          max={1.0}
          step={0.01}
          value={state.hybridStickiness}
          onChange={setters.setHybridStickiness}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["mating tumble", "contact rotation", "fertilization swirl"]}
          tooltip="HYBRID SPIN
Rotation speed of hybridization artifact polygons.
High: Spinning rapidly.
Low: Extremely slow rotation."
          label="HYBRID_SPIN"
          min={0.0}
          max={2.0}
          step={0.05}
          value={state.hybridSpinSpeed}
          onChange={setters.setHybridSpinSpeed}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
          keywords={["mating quota", "max offspring", "semelparity count"]}
          tooltip="BREEDING LIMIT
Number of times an organism can breed before dying.
High: Organisms survive multiple matings.
Low: Single-mating die-off (semelparity)."
          label="BREED_LIMIT"
          min={1}
          max={10}
          step={1}
          value={state.maxMatings}
          onChange={setters.setMaxMatings}
          color="#87CEEB"
        />
      </div>
    </div>
  );
}
