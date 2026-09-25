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

export function markAgentSegmentsDyingHelper(engine: any, agentId?: number) {
  if (agentId === undefined) return;
  const now = engine.unscaledTime;
  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (seg && seg.agentId === agentId && !seg.dyingStart) {
      markDyingHelper(engine, engine.segments, engine.dyingStems, i, now);
    }
  }
  for (const app of engine.appendages.values()) {
    const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    for (let i = 0; i < lim; i++) {
      const seg = app.segments[i];
      if (seg && seg.agentId === agentId && !seg.dyingStart) {
        markDyingHelper(engine, app.segments, app.dyingSet, i, now);
      }
    }
  }
}

export function markStrainSegmentsDyingHelper(engine: any, strainName?: string) {
  if (!strainName) return;
  const now = engine.unscaledTime;
  if (!engine.dyingStrains) engine.dyingStrains = new Set();
  engine.dyingStrains.add(strainName);
  const liveAgents = engine.agents.filter((a: any) => a.active && !a.tapering && !a.isFeeler && a.genome.name === strainName).length;
  engine.onLog(`🔻 markStrainSegmentsDying(${strainName}) — active living agents: ${liveAgents}`);

  const limit = Math.min(engine.pointCount, engine.maxDOMs);
  for (let i = 0; i < limit; i++) {
    const seg = engine.segments[i];
    if (seg && seg.strainName === strainName && !seg.dyingStart) {
      markDyingHelper(engine, engine.segments, engine.dyingStems, i, now);
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
}
