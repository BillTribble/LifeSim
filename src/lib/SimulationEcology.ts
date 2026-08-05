import { SimulationEngine } from "./SimulationEngine";
import { Agent } from "./SimulationTypes";

export function performBiomassSweep(engine: SimulationEngine): void {
  if (engine.dyingStrains && engine.dyingStrains.size > 0) {
    // All-at-once whole-organism decay: Mark all stem and appendage segments of dying strains with the exact same timestamp
    const now = engine.unscaledTime;
    for (let i = 0; i < engine.maxDOMs; i++) {
      const seg = engine.segments[i];
      if (seg && !engine.dyingStems.has(i) && engine.dyingStrains.has(seg.strainName)) {
        engine.markDying(engine.segments, engine.dyingStems, i, now);
      }
    }

    for (const app of engine.appendages.values()) {
      const appLim = Math.floor(engine.maxDOMs / 4);
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
          for (let i = 0; i < engine.maxDOMs; i++) {
            const seg = engine.segments[i];
            if (seg && seg.strainName === strainName) {
              if (!seg.dyingStart) engine.markDying(engine.segments, engine.dyingStems, i, now);
            }
          }
          
          for (const app of engine.appendages.values()) {
            const lim = Math.floor(engine.maxDOMs / 4);
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
        
        const healthySpeciesCount = Array.from(engine.biomassMap.keys()).filter(s => !(engine.dyingStrains && engine.dyingStrains.has(s))).length;
        const growingCount = activeAgents.filter(a => a.active && !a.tapering && !a.isFeeler).length;
        if (ratio > 0.03) {
          engine.speciesAbove3Percent.add(strainName);
        } else if (ratio < 0.03 && engine.speciesAbove3Percent.has(strainName) && engine.hasAnyOrganismBred && healthySpeciesCount > Math.max(3, engine.minAgents) && growingCount > Math.max(3, engine.minAgents)) {
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

    const globalLimit = engine.maxAgents * 3.0;
    const survivors = engine.agents.filter(
      (a) => !a.tapering && !a.isFeeler && a.hasBred,
    );
    if (survivors.length > globalLimit) {
      survivors.sort((a, b) => b.age - a.age);
      for (let i = 0; i < overflow; i++) {
        engine.killSpecies(survivors[i].genome.name, "capacity overflow");
      }
    }
  }
}
