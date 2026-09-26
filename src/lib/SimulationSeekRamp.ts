import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

/** Simulation ticks per second at speed=1 (timeScale=1 at 60 FPS). */
export const TICKS_PER_SECOND = 60;
/** Default hybrid cooldown in seconds at speed=1. */
export const DEFAULT_HYBRID_COOLDOWN_SECONDS = 3;
/** Duration (in seconds at speed=1) over which seeking ramps from 0% to 100% after the free-growth window. */
export const SEEK_RAMP_SECONDS = 2;

/**
 * Returns `engine.hybridCooldown` normalized to seconds (at speed=1).
 * Legacy tick values (> 30, e.g. 50, 300, 481.46, 650 from old localStorage or test scripts)
 * are automatically converted via `val / 60`.
 */
export function getHybridCooldownSeconds(engine: SimulationEngine): number {
  const raw = engine.hybridCooldown;
  if (raw === undefined || raw === null || isNaN(raw) || raw <= 0) {
    return DEFAULT_HYBRID_COOLDOWN_SECONDS;
  }
  return raw > 30 ? raw / TICKS_PER_SECOND : raw;
}

/**
 * Returns `hybridCooldown` in simulation ticks (`seconds * 60`).
 * At the default 3.0s cooldown, this returns 180 ticks.
 */
export function getHybridCooldownTicks(engine: SimulationEngine): number {
  return getHybridCooldownSeconds(engine) * TICKS_PER_SECOND;
}

/**
 * Minimum strain age (in ticks) before an organism can physically mate (`max(3s, hybridCooldown)`).
 */
export function getFertilityMinTicks(engine: SimulationEngine): number {
  return Math.max(
    DEFAULT_HYBRID_COOLDOWN_SECONDS * TICKS_PER_SECOND,
    getHybridCooldownTicks(engine),
  );
}

/**
 * Computes a creature's seeking ramp factor in `[0, 1]`:
 * - First 1/3 of `hybridCooldown` (`1.0s` = `60` ticks at default `3.0s`, `speed=1`):
 *   returns `0` (100% seek-free growth so the creature expresses its natural shape).
 * - Over the next `2.0s` (`120` ticks at `speed=1`, i.e. `1.0s -> 3.0s` at default `3.0s`):
 *   linearly ramps from `0.0` to `1.0` (`0% -> 100%` seeking).
 */
export function getSeekRamp(
  engine: SimulationEngine,
  agent: Agent,
  strainAge?: number,
): number {
  if (agent.isFeeler) return 1.0;
  const evalGenome =
    agent.isFeeler && agent.realGenome ? agent.realGenome : agent.genome;
  const ageTicks =
    strainAge !== undefined
      ? strainAge
      : evalGenome?.createdAt !== undefined
        ? engine.time - evalGenome.createdAt
        : engine.time;

  const cooldownTicks = getHybridCooldownTicks(engine);
  const freeGrowthTicks = cooldownTicks / 3;
  const rampTicks = Math.max(1, SEEK_RAMP_SECONDS * TICKS_PER_SECOND);

  if (ageTicks <= freeGrowthTicks) {
    return 0;
  }
  return THREE.MathUtils.clamp((ageTicks - freeGrowthTicks) / rampTicks, 0, 1);
}
