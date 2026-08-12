# Archetype Tuning Guide & Simulation Controls

This guide details how to tune organism archetypes (Trees, Bushes, Rhizomes), dial in realistic plant silhouettes while preventing overgrowth and whispy wire-like twig explosions, and configure mutual organism attraction and mating mechanics.

---

## 🌳 Realistic Tree Architecture & Whispy Twig Prevention

When generating tree archetypes, simulation dials can sometimes produce "sea-urchin" or "porcupine" patterns where hundreds of microscopic, needle-thin tendrils shoot out endlessly from every segment of the trunk.

To achieve a classic tree silhouette (**Sturdy Trunk $\rightarrow$ Heavy Wooden Boughs $\rightarrow$ Compact Leafy Canopy**), use the following dial settings and principles.

---

### 1. Recommended Dial Settings for Classic Trees

| Control | Parameter Name | Suggested Range | Purpose / Effect |
| :--- | :--- | :--- | :--- |
| **`TREE_TAPER`** | `treeTaper` | `3.0` – `6.0` | **Crucial:** Forces high-order twigs to rapidly taper to a point and terminate rather than shooting infinitely across the viewport. |
| **`TREE_DELAY`** | `treeBranchDelay` | `80` – `160` | Keeps the lower 60–70% of the trunk clean and bare; forces major forks and boughs to emerge at the crown. |
| **`TREE_BR`** | `treeBranching` | `0.5` – `1.5` | Reduces the branch split probability along the stem so branches emerge at distinct nodal intervals rather than every single step. |
| **`BRANCH_BIG`** | `branchBigger` | `0.7` – `0.9` | Ensures child branches inherit substantial thickness (50–70% of parent), forming heavy wooden limbs instead of thin wire threads. |
| **`LRG_BRANCH`** | `branchSplitSizeProb`| `0.6` – `0.85` | Boosts the chance of large structural bough formation. |
| **`TERM_BRANCH`** | `termProbPostBranch` | `2.0` – `5.0` | Increases terminal budget consumption post-branching so outer twigs naturally stop growing once canopy volume is reached. |
| **`TREE_STEP`** | `treeStepSize` | `0.35` – `0.60`| Reduces the extrusion distance per tick for fine twigs, creating a compact crown. |
| **`STEM_CURV`** | `stemCurviness` | `1.0` – `3.0` | Low-to-moderate curvature ensures limbs stay rigid and wooden rather than curving like vines or noodles. |

---

### 2. The 3 Golden Rules for Tree Morphologies

```
              ┌───────────────────────────┐
              │    FINE LEAFY CANOPY      │  <-- High TREE_TAPER & High TERM_BRANCH
              │  (Short, finite twigs)    │      (Twigs stop after 5-10 segments)
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              │    PRIMARY WOODEN BOUGHS  │  <-- High BRANCH_BIG & High LRG_BRANCH
              │   (Heavy structural arms) │      (Limbs inherit 50-70% thickness)
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              │    BARE VERTICAL TRUNK    │  <-- High TREE_DELAY & Low TREE_BR
              │ (Zero lower side-sprouts) │      (Keeps lower stem clean)
              └───────────────────────────┘
```

1. **Bare Lower Trunk:**
   - *Problem:* Side shoots sprout continuously from the ground all the way up the main trunk.
   - *Fix:* Increase `TREE_DELAY` to `100+` and keep `TREE_BR` moderate (`~1.0`).

2. **Substantial Limb Thickness:**
   - *Problem:* Child branches spawn as 1-pixel micro-threads.
   - *Fix:* Set `BRANCH_BIG` $\ge 0.70$ so child limbs inherit parent girth.

3. **Finite Twig Lifespans:**
   - *Problem:* Twigs never stop growing and trail endlessly across the screen.
   - *Fix:* Increase `TREE_TAPER` ($\ge 3.0$) and `TERM_BRANCH` ($\ge 2.5$) to ensure branches taper to zero and complete their growth.

---

### 3. Archetype Characteristics Summary

- **🌿 Bush (`bush`):** Multi-stemmed shrub morphology with low branching delays, spreading hemispherical canopy, and moderate branch density.
- **🌳 Tree (`tree`):** Apical-dominant vertical trunk that delays branching until crown elevation, then divides into heavy boughs and fine terminal twigs.
- **🌾 Rhizome (`rhizome`):** Dense horizontal root/tuber network with frequent low-altitude bifurcations and creeping runners.

---

### 4. Seeking & Attraction Controls in the Main App

The simulation has **4 controls** governing how organisms seek and attract each other (located in the **Ecosystem / Breeding** sections of the main HUD):

1. **`MAGNET` (`magnetism`)**:
   - Mutual attraction physics between organisms.
   - Higher values aggressively pull all living tips toward nearby organisms.
   - Lower values result in lone drifters and solitary expansion.

2. **`SEEK_AMT` (`seekAmount`)**:
   - Feeler-like target homing lock-on.
   - **`0.0` (0%):** Organisms wander with natural curvature and gentle steering.
   - **`1.0` (100%):** Organisms actively lock onto and track mating partners with direct segment homing.

3. **`PROXIM` (`proximity`)**:
   - Detection range in 3D world units.
   - Determines how far away organisms can sense potential mates (high = long-range interactions, low = myopic local interactions only).

4. **`DESPERATION` (`desperation`)**:
   - Mating urgency multiplier.
   - Speed and attraction boost that increases as organisms grow older without mating.

---

### 5. Saving & Propagating Archetype Configurations

In the **Archetype Designer**:
- Adjust dials in real-time while observing single-organism upward growth.
- Click **SAVE** in the top-right header to persist your calibrated values directly to `src/hooks/SimulationDefaults.ts` and active application state.
