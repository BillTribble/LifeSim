# LifeSim Simulation Hierarchy

This document formally defines the architectural and conceptual hierarchy of LifeSim.
Whenever modifying simulation logic, population limits, lifecycle rules, or UI displays, agents and developers must strictly observe these distinctions.

---

## The 4 Hierarchy Levels

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. ECOSYSTEM (Simulation Engine)                                       │
│    The 3D environment containing boundaries, tides, lighting, physics  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ contains 1..N
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. ORGANISM / CREATURE / STRAIN / SPECIES                              │
│    • A distinct biological entity with a unique Genome (Alpha, Beta...) │
│    • Has archetype, color palette, biomass, mating stats, lifecycle    │
│    • Listed individually in the HUD Side Panel (BIOMASS list)          │
│    • Controlled by MIN_CREATURES (minimum creatures) & MAX_SPECIES     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ composed of 1..N
┌───────────────────────────────────▼────────────────────────────────────┐
│ 3. AGENT / BRANCH TIP / GROWTH POINT                                   │
│    • An active 3D vector extruding cylinder slices                     │
│    • One organism can have multiple active agents (trunk + branches)   │
│    • Also includes sensory feeler tips searching for mates             │
│    • Controlled by MAX_CREATURES (total population cap) / active tips  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ extrudes 1..N
┌───────────────────────────────────▼────────────────────────────────────┐
│ 4. SEGMENT / VECTOR / GEOMETRY (DOM)                                   │
│    • The instanced 3D cylinder meshes and leaf/flower appendages       │
│    • Deposited along the trail of each active agent                    │
│    • Controlled by MAX_DOMS (segment buffer capacity, e.g. 32,000)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Definitions & Terminology

### 1. Ecosystem
- **Class**: `SimulationEngine` (`src/lib/SimulationEngine.ts`)
- The container for all state, meshes, camera, and dials.
- Manages the global tick loop, theme transitions, and boundary constraints.

### 2. Organism / Creature / Strain / Species
- **Data Model**: `Genome` (`src/lib/SimulationTypes.ts`), mapped by `strainName` in `engine.genomeMap` and `engine.biomassMap`.
- **UI Representation**: The distinct rows in the HUD **BIOMASS side panel**.
- **Population Controls**:
  - **`minCreatures` / `minAgents` (MIN CREATURES)**: The hard floor for distinct living creatures in the ecosystem (e.g. 9).
    - While the number of living organisms is $< \text{minCreatures}$, **death is strictly halted**.
    - Once reached, the simulation maintains this number as a **hard floor**; no organism can die unless $\text{livingOrganisms} > \text{minCreatures}$.
  - **`maxSpecies` (MAX SPECIES)**: The upper ceiling for distinct genetic strains. Must always be $\ge \text{minCreatures}$.
- **Living Status**: An organism is living if:
  1. It has active non-tapering agents (`engine.agents.some(a => a.active && !a.tapering && !a.isFeeler && a.genome.name === strain)`).
  2. It has positive biomass in `engine.biomassMap`.
  3. It is not currently marked in `engine.dyingStrains`.

### 3. Agent / Branch Tip / Growth Point
- **Data Model**: `Agent` (`src/lib/SimulationTypes.ts`).
- **Description**: An active growth vector. A single tree or bush organism branches into multiple agents as it grows.
- **Feeler Agents**: Temporary sensory tendrils (`agent.isFeeler === true`) that travel outward to locate partners for breeding. Feelers do not count as separate organisms.
- **Population Control**: `maxCreatures` / `maxAgents` regulates the maximum population and active tips across the entire ecosystem.

### 4. Segment / Vector / Geometry (DOM)
- **Data Model**: `Segment` in `engine.segments` and `engine.appendages`.
- **Description**: The 3D geometry rendered using `THREE.InstancedMesh`.
- **Capacity**: Governed by `maxDOMs`.

---

## Critical Rules for Agents & Developers

1. **Never conflate Agent with Organism**:
   - When the user asks for "minimum organisms" or references the "creatures listed in the side panel", this refers to **Level 2: Organisms / Strains**, NOT branch tips.
   - 9 branches belonging to 2 trees is NOT 9 organisms. It is 2 organisms with 9 agents.
2. **Hard Population Floor (`minCreatures` / `minAgents`)**:
   - If `livingOrganisms < engine.minAgents`, NO organism may die of age, mating, culling, or sacrifice.
   - If `livingOrganisms == engine.minAgents`, NO organism may die.
   - An organism may only enter end-of-life if $\text{livingOrganisms} - 1 \ge \text{engine.minAgents}$.
3. **Feelers Are Temporary Extensions, NEVER Organisms**:
   - A feeler (`agent.isFeeler === true`) is strictly a temporary sensory growth tip extending outward from a plant to locate a mating partner.
   - **No Snake Archetype**: Feelers inherit their parent organism's archetype (`bush`, `tree`, `rhizome`). They must never be assigned `"snake"` or an independent species identity.
   - **No Feeler Procreation**: Feelers cannot sprout other feelers. Only living, non-feeler vegetative branches can emit a feeler.
   - **Parent Genome Inheritance**: When a feeler mates, offspring MUST be bred from the `realGenome` of the root parent organisms. Offspring must never inherit temporary feeler navigation properties.
   - **Feeler Dissolution / Lifespan**: Feelers must automatically taper and dissolve if they fail to mate within 10 seconds, if their parent organism dies, or once their parent reaches its mating limit (`maxMatings`).
4. **Valid Organism Archetypes**:
   - Organisms in LifeSim are strictly botanical: **`bush`**, **`tree`**, and **`rhizome`**.
   - `ARCHETYPES` array must strictly contain valid botanical archetypes. Mendelian inheritance in `breedGenomes` must never produce non-botanical archetypes.
5. **Side Panel Synchronization**:
   - The side panel (`stats.strains` in `emitStateUpdate`) must never arbitrarily truncate the list below `maxSpecies` or `minAgents` (e.g. do not `.slice(0, 8)`).
