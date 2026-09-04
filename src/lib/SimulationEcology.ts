import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";

export function performBiomassSweep(engine: SimulationEngine): void {
  if (engine.dyingStrains && engine.dyingStrains.size > 0) {
    // All-at-once whole-organism decay: Mark all stem and appendage segments of dying strains with the exact same timestamp
    const now = engine.unscaledTime;
    const stemLimit = Math.min(engine.pointCount, engine.maxDOMs);
    for (let i = 0; i < stemLimit; i++) {
      const seg = engine.segments[i];
      if (seg && !engine.dyingStems.has(i) && engine.dyingStrains.has(seg.strainName)) {
        engine.markDying(engine.segments, engine.dyingStems, i, now);
      }
    }

    for (const app of engine.appendages.values()) {
      const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
      for (let i = 0; i < appLim; i++) {
        const seg = app.segments[i];
        if (seg && !app.dyingSet.has(i) && engine.dyingStrains.has(seg.strainName)) {
          engine.markDying(app.segments, app.dyingSet, i, now);
        }
      }
    }
  }
}

export function performRatioCulling(engine: SimulationEngine, activeAgents: Agent[]): void {
  if (engine.lastBiomassCheckTime === undefined || engine.time - engine.lastBiomassCheckTime >= 120) {
    engine.lastBiomassCheckTime = engine.time;
    let totalBiomass = 0;
    engine.biomassMap.forEach((v) => (totalBiomass += v));

    if (totalBiomass > 0) {
      engine.biomassMap.forEach((biomass, strainName) => {
        const ratio = biomass / totalBiomass;
        const isDying = engine.dyingStrains && engine.dyingStrains.has(strainName);

        if (isDying) {
          const now = engine.unscaledTime;
          const stemLimit = Math.min(engine.pointCount, engine.maxDOMs);
          for (let i = 0; i < stemLimit; i++) {
            const seg = engine.segments[i];
            if (seg && seg.strainName === strainName) {
              if (!seg.dyingStart) engine.markDying(engine.segments, engine.dyingStems, i, now);
            }
          }
          
          for (const app of engine.appendages.values()) {
            const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
            for (let i = 0; i < lim; i++) {
              const seg = app.segments[i];
              if (seg && seg.strainName === strainName) {
                if (!seg.dyingStart) engine.markDying(app.segments, app.dyingSet, i, now);
              }
            }
          }
          
          for (let i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i].genome.name === strainName) {
              activeAgents[i].tapering = true;
            }
          }

          if (biomass <= 5 || ratio < 0.01) {
            engine.biomassMap.delete(strainName);
            engine.dyingStrains.delete(strainName);
            if (engine.speciesAbove3Percent) engine.speciesAbove3Percent.delete(strainName);
            const genome = engine.genomeMap?.get(strainName);
            const arch = genome?.archetype || 'bush';
            engine.onLog(`☠️ Species ${strainName} [${arch.toUpperCase()}] was fully eradicated.`);
          }
          return;
        }

        if (!engine.speciesAbove3Percent) engine.speciesAbove3Percent = new Set();
        
        if (ratio > 0.03) {
          engine.speciesAbove3Percent.add(strainName);
        } else if (
          ratio < 0.03 &&
          engine.speciesAbove3Percent.has(strainName) &&
          engine.hasAnyOrganismBred &&
          engine.getLivingOrganismCount() - 1 >= engine.minCreatures
        ) {
          engine.speciesAbove3Percent.delete(strainName);
          engine.killSpecies(strainName, 'dropped below 3% ratio');
          const genome3 = engine.genomeMap?.get(strainName);
          const arch3 = genome3?.archetype || 'bush';
          engine.onLog(`📉 Species ${strainName} [${arch3.toUpperCase()}] dropped below 3% and was culled to make space.`);
        }
      });
    }
  }
}

export function performCapacityCulling(
  engine: SimulationEngine,
  activeNotTapering: Agent[],
): void {
  if (
    engine.hasAnyOrganismBred &&
    activeNotTapering.length > engine.maxAgents * 3.0
  ) {
    const strainGroups = new Map<string, typeof activeNotTapering>();
    activeNotTapering.forEach((a) => {
      const arr = strainGroups.get(a.genome.name);
      if (arr) arr.push(a);
      else strainGroups.set(a.genome.name, [a]);
    });

    // NOTHING should get marked for deleting if we don't have 4+ creatures
    if (strainGroups.size < 4) {
      return;
    }

    // Kill only ONE oldest bred species per frame to prevent mass die-off
    let oldestName: string | null = null;
    let oldestAge = -Infinity;
    for (const a of activeNotTapering) {
      if (a.hasBred && !a.isFeeler) {
        const age = engine.time - (a.genome.createdAt || 0);
        if (age > oldestAge) {
          oldestAge = age;
          oldestName = a.genome.name;
        }
      }
    }
    if (oldestName) {
      const livingOrganisms = engine.getLivingOrganismCount();
      if (livingOrganisms - 1 >= engine.minCreatures) {
        engine.onLog(`⚠️ Capacity overflow (${activeNotTapering.length} agents > ${engine.maxAgents * 3.0} limit) — culling oldest: ${oldestName}`);
        engine.killSpecies(oldestName, "capacity overflow");
      }
    }
  }
}
