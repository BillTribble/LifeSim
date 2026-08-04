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
          tooltip="DESPAIR AGE
Age at which desperation begins.
High: Only elders become desperate.
Low: Youthful desperation."
          label="DESP_AGE"
          min={100}
          max={5000}
          step={100}
          value={state.despairAge}
          onChange={setters.setDespairAge}
          color="#87CEEB"
        />
        <SmartDial
          searchQuery={searchQuery}
          state={state}
          setters={setters}
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
      "EXTRUSION",
      "SPEED",
      "DECAY",
      "VELOCITY",
      "AGE",
      "BIAS",
      "TERMINATION",
      "FEELER",
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
      "BREED",
      "COOLDOWN",
      "SIZE",
      "DECAY",
      "SPIN",
      "REPRODUCTION",
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
          tooltip="HYBRID BREED COOL
Delay between breeding attempts.
High: Infrequent, rare breeding.
Low: Rapid, continuous breeding."
          label="HYBRID_COOL"
          min={10}
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
      </div>
    </div>
  );
}
