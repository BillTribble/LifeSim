# Botanical Pruning & Performance Optimization Guide

## 1. Overview & Goals

As organisms in LifeSim grow, reproduce, and branch, complex fractal geometries can quickly proliferate. On hardware such as an Apple Silicon M1 MacBook running Google Chrome, unrestricted branching can cause:
- **Frame Rate Degradation**: GPU vertex buffer saturation and $O(N^2)$ CPU collision/breeding checks when active branch agents multiply unchecked.
- **Visual Clutter**: Dense, tangled, chaotic balls of twigs where individual botanical forms and negative space are lost.
- **Base/Trunk Erasure**: Blind ring-buffer overwriting or oldest-first segment deletion destroying the root and trunk, leaving floating disconnected twigs in the air.

This system introduces **Botanical Pattern Simplification** and **Trunk Preservation** to maintain clean sculptural plant silhouettes and a consistent 60 FPS performance envelope (targeting a 32,000 line budget).

---

## 2. How Botanical Pruning Works

Unlike simplistic FIFO buffers that delete the oldest segments first (which destroyed the base trunk and root anchored to the ground), pruning in LifeSim operates like **bonsai cultivation, topiary art, and orchard pruning**:

### A. Structural Trunk & Limb Immunity
- **The Rule**: The foundation of the tree is permanent.
- Any agent or segment with `branchDepth <= 1` (the main trunk at depth 0 and primary structural limbs at depth 1) or thickness `>= 0.45 * genome.thicknessBase` is flagged as **structural**.
- Structural stems are **100% immune** from branch pruning, crowding culling, and ring-buffer overwriting.
- In [`SimulationMeshUpdate.ts`](file:///Users/tribble/Sites/LifeSim/src/lib/SimulationMeshUpdate.ts), the first 2,000 slots (`trunkReserved`) are permanently shielded from ring-buffer reuse.

### B. Depth Simplification (Fractal De-Cluttering)
- Enforces `maxBranchDepth` (configurable from 1 to 8, default 4).
- Peripheral shoots that exceed this hierarchy depth are immediately snipped and capped with an elegant terminal needle cap (`extrudePointedTerminalCap`).
- This prevents fractal tangles and keeps the branching hierarchy clean and legible.

### C. Quota Simplification (Species Branch Balancing)
- Limits active growing tips per species based on `maxBranchesPerSpecies` (default 24, modulated by `pruningStrength` and archetype).
- Archetype branch budgets:
  - **Bush**: 100% base budget (sprawling canopy).
  - **Tree**: 75% base budget (tall structural trunk transitioning to crown).
  - **Rhizome**: 55% base budget (low ground-creeping runner nodes).
  - **Snake**: 10% base budget (single dominant undulating body).
- When a species exceeds its quota, surplus branches are clipped:
  - Highest-order outer twigs (`branchDepth`) are pruned first.
  - Thinnest branches are pruned first.
  - Outermost tips furthest from the root base are pruned first.

### D. Canopy Self-Thinning (Spatial Crowding)
- Branches that grow too close together compete for space.
- When two tips are closer than `crowdingRadius`, the subordinate branch (higher depth or thinner) is pruned.
- This creates clean, sculptural negative space throughout the canopy.

### E. Over-Capacity Twig Culling
- When total scene segments approach the line limit (`maxDOMs >= 95%`):
  - Instead of clearing the oldest base segments, the system scans backwards from the newest segments and dissolves **only fine peripheral twigs** (`thickness < 0.20`).
  - The trunk and primary boughs remain anchored to the ground.
  - Dissolved segment indices are collected into `engine.freeStemIndices` and recycled immediately.

---

## 3. Immediate Tip Extrusion & Zero-Zombie Lifecycle

### The Zombie Agent Bug (Fixed)
Previously, marking an agent for tapering (`agent.tapering = true`) placed it into a 360-tick (6-second) loop designed for whole-species extinction. Its thickness was clamped to `Math.max(0.1, ...)`, preventing it from completing its taper. Consequently, over 115 tapering agents accumulated, continuing growth iterations and distance checks every frame.

### The Solution
- **Species-Wide Extinction vs. Branch Pruning**:
  - Species extinction (`isStrainDying`) retains the smooth 3-second sculptural fade.
  - Individual branch pruning and natural tip conclusions immediately call [`extrudePointedTerminalCap()`](file:///Users/tribble/Sites/LifeSim/src/lib/SimulationUpdateAgents.ts), add 4 smooth conical micro-segments tapering to a needle point (0.01), and deactivate (`agent.active = false`).
- Active agent count remains rock-solid at **7–12 agents**, eliminating CPU bottlenecks.

---

## 4. Benchmark & Performance Verification

Verified via 2,500-frame headless benchmark ([`scripts/test_framerate.ts`](file:///Users/tribble/Sites/LifeSim/scripts/test_framerate.ts)):

| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :--- | :--- | :--- |
| **Average Frame Time** | 5.24 ms (~191 FPS) | **0.39 ms (~2,532 FPS)** | **13.4x Faster** |
| **Frame 1500+ Time** | 8.69 ms (~115 FPS) | **0.38 ms (~2,608 FPS)** | **22.8x Faster** |
| **95th Percentile** | 9.54 ms | **1.29 ms** | **7.4x Faster** |
| **Max Frame Spike** | 18.55 ms | **4.13 ms** | **4.5x Smoother** |
| **Active Agents** | 123 (117 zombies) | **7 – 10 active** | **Stable & Controlled** |
| **Frames > 25 ms** | 0 / 2500 | **0 / 2500** | **100% Steady** |
| **Mating Rate** | 98% | **99.0% (avg 6.83s)** | **Fully Preserved** |

### Growth Cooldown Phase & Anti-Clustering Benchmark
Verified via 20-run trial ([`scripts/test_mating_rate.ts`](file:///Users/tribble/Sites/LifeSim/scripts/test_mating_rate.ts)):
- **3-Second Growth Immunity**: **Zero matings occur before 3.0s** (earliest mating: **4.73s**; average: **9.38s**). Organisms spend at least 3 seconds (180 ticks) in pure vegetative growth, branching outward and developing their botanical silhouettes before seeking mates.
- **Overall Mating Success**: **100.0%** (20/20 runs mated within 30 seconds).
- **Anti-Cluster Spacing**: Multi-mating intervals measured at **7.3s – 8.8s** between consecutive matings (no instant re-mating clusters).
- **Cooldown Execution**: `cooldown` decrements every simulation frame (`engine.timeScale`), ensuring that both parent organisms and newborn offspring experience a clean 3+ second growth separation before re-engaging in seeking.
- **Canopy Separation**: During cooldown, nearby organisms gently repel (`avoidanceForce`) so offspring and parents radiate outward from the mating site into distinct plant forms.

---

## 5. UI Controls & Tuning Dials

Available in the HUD and preset configuration:

- **`PRUNING` (`pruningStrength`)**: Ranges from `0.0` (wild, dense, sprawling growth) to `2.0` (tight, minimalist bonsai aesthetic). Default: `0.8`.
- **`MAX_DEPTH` (`maxBranchDepth`)**: Maximum allowed branch hierarchy depth before tips are capped. Ranges from `1` to `8`. Default: `4`.
- **`MAX_BRANCH` (`maxBranchesPerSpecies`)**: Botanical branch budget per species. Ranges from `4` to `64`. Default: `24`.
- **`MAX_DOMS` (`maxDOMs`)**: Maximum instanced mesh segment capacity. Default: `32,000` (optimized for M1 MacBook in Chrome).
- **`FEELER_DELAY` (`feelerDelay`)**: Minimum delay in seconds before creatures can extend sensory feelers (Default: `6.0s` / 360 ticks). Allows creatures to grow toward each other and mate via direct physical body contact before feelers activate.
- **`HYBRID_COOL` (`hybridCooldown`)**: Growth cooldown interval after mating or birth (Default: `340–393 ticks`, minimum `180 ticks` / 3.0s). Organisms pause seeking to grow outward and expand their canopy before seeking a mate again.
- **`SEEK_AMT` (`seekAmount`)**: Precision and homing steering strength of creatures tracking other species (Default: `0.65`, increased from `0.38`). Dampens random wander noise and guides organism tips directly toward prospective mates once their growth cooldown has elapsed.
