export function markDyingHelper(engine: any, segments: any[], dyingSet: Set<number>, idx: number, dyingStartOverride?: number) {
  const seg = segments[idx];
  if (seg && !seg.dyingStart) {
    seg.dyingStart = dyingStartOverride !== undefined ? dyingStartOverride : engine.unscaledTime;
    dyingSet.add(idx);
    if (seg.countsForBiomass !== false) {
      const prevBiomass = engine.biomassMap.get(seg.strainName) || 0;
      if (prevBiomass > 0) {
        engine.biomassMap.set(seg.strainName, prevBiomass - 1);
      }
    }
  }
}

/**
 * Returns true when a strain is dying: either tracked in `dyingStrains` or already switched to
 * the END_OF_LIFE lifecycle phase. The lifecycle phase is the durable tombstone: a strain can
 * leave `dyingStrains` while its tips are still tapering, and segments drawn after that point
 * must still be born dying (floating-bits root cause RC-B1).
 */
export function isStrainDying(engine: any, strainName?: string): boolean {
  if (!strainName) return false;
  if (engine.dyingStrains && engine.dyingStrains.has(strainName)) return true;
  return engine.speciesLifecycleMap?.get(strainName)?.phase === "END_OF_LIFE";
}

/**
 * Shared fade clock for a dying strain: segments added after death reuse the strain's
 * `deathStartTick` so the whole body fades together instead of leaving late tips floating.
 */
export function getStrainDeathStart(engine: any, strainName?: string): number | undefined {
  if (!isStrainDying(engine, strainName)) return undefined;
  const tick = engine.speciesLifecycleMap?.get(strainName)?.deathStartTick;
  return typeof tick === "number" ? tick : engine.unscaledTime;
}

/** Marks all live stem + appendage segments drawn by one agent as dying. Returns the count. */
export function markAgentSegmentsDyingHelper(engine: any, agentId?: number): number {
  if (agentId === undefined) return 0;
  const now = engine.unscaledTime;
  let marked = 0;
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (seg && seg.agentId === agentId && !seg.dyingStart) {
      markDyingHelper(engine, engine.segments, engine.dyingStems, i, now);
      marked++;
    }
  }
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      const seg = app.segments[i];
      if (seg && seg.agentId === agentId && !seg.dyingStart) {
        markDyingHelper(engine, app.segments, app.dyingSet, i, now);
        marked++;
      }
    }
  }
  return marked;
}

/** Marks every live stem + appendage segment of a strain as dying. Returns the stem count marked. */
export function markStrainSegmentsDyingHelper(engine: any, strainName?: string): number {
  if (!strainName) return 0;
  const now = engine.unscaledTime;
  if (!engine.dyingStrains) engine.dyingStrains = new Set();
  engine.dyingStrains.add(strainName);
  const liveAgents = engine.agents.filter((a: any) => a.active && !a.tapering && !a.isFeeler && a.genome.name === strainName).length;
  engine.onLog(`🔻 markStrainSegmentsDying(${strainName}) — active living agents: ${liveAgents}`);

  let marked = 0;
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (seg && seg.strainName === strainName && !seg.dyingStart) {
      markDyingHelper(engine, engine.segments, engine.dyingStems, i, now);
      marked++;
    }
  }
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      const seg = app.segments[i];
      if (seg && seg.strainName === strainName && !seg.dyingStart) {
        markDyingHelper(engine, app.segments, app.dyingSet, i, now);
      }
    }
  }
  if (engine.hybridSegments && engine.dyingHybrids) {
    for (let i = 0; i < engine.hybridSegments.length; i++) {
      const seg = engine.hybridSegments[i];
      if (seg && seg.childStrainName === strainName && !seg.dyingStart) {
        markDyingHelper(engine, engine.hybridSegments, engine.dyingHybrids, i, now);
      }
    }
  }
  return marked;
}
