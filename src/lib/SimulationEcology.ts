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
          if (typeof (engine as any).killSpecies === 'function') {
            (engine as any).killSpecies(strainName, 'dropped below 3% ratio');
          } else {
            for (let i = 0; i < activeAgents.length; i++) {
              if (activeAgents[i].genome.name === strainName && activeAgents[i].hasBred) {
                activeAgents[i].tapering = true;
                activeAgents[i].forceTapering = true;
                activeAgents[i].fadeAge = activeAgents[i].fadeAge || 0;
              }
            }
            if (!engine.dyingStrains) engine.dyingStrains = new Set();
            engine.dyingStrains.add(strainName);
          }
          const genome3 = engine.genomeMap?.get(strainName);
          const arch3 = genome3?.archetype || 'bush';
          engine.onLog(`📉 Species ${strainName} [${arch3.toUpperCase()}] dropped below 3% and was culled to make space.`);
        }
      });
    }
  }
}

export function performCapacityCulling(engine: SimulationEngine, activeNotTapering: Agent[]): void {
  if (engine.hasAnyOrganismBred && activeNotTapering.length > engine.maxAgents * 0.5) { // Optimization: only run if mildly crowded
    const strainGroups = new Map<string, typeof activeNotTapering>();
    activeNotTapering.forEach(a => {
      const arr = strainGroups.get(a.genome.name);
      if (arr) arr.push(a);
      else strainGroups.set(a.genome.name, [a]);
    });

    if (strainGroups.size <= Math.max(3, engine.minAgents)) {
      return;
    }

    const activeSpeciesCount = strainGroups.size || 1;
    const globalLimit = engine.maxAgents;
    // The "fair share" if ecoFade is 1:
    const perSpeciesLimit = Math.max(1, Math.floor(globalLimit / activeSpeciesCount));
    const fade = engine.ecoFade || 0;

    // What's the max agents this specific species is allowed to have before culling?
    const effectiveLimitPerSpecies = Math.max(1, Math.floor(fade * perSpeciesLimit + (1 - fade) * globalLimit));

    // Pass 1: Cull species that have exceeded their effective quota
    for (const [strainName, agents] of strainGroups.entries()) {
      if (agents.length > effectiveLimitPerSpecies) {
        agents.sort((a, b) => b.age - a.age); // Oldest first
        const numToTaper = agents.length - effectiveLimitPerSpecies;
        for (let i = 0; i < numToTaper; i++) {
          agents[i].tapering = true;
          agents[i].forceTapering = true;
        }
      }
    }
    
    // Pass 2: Failsafe global cut (in case ecoFade < 1 and sum exceeds maxAgents)
    const survivors = engine.agents.filter(a => !a.tapering && !a.isFeeler && a.hasBred);
    if (survivors.length > globalLimit) {
      survivors.sort((a, b) => b.age - a.age);
      const overflow = survivors.length - globalLimit;
      for (let i = 0; i < overflow; i++) {
        survivors[i].tapering = true;
        survivors[i].forceTapering = true;
      }
    }
  }
}
