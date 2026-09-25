import * as THREE from "three";
import { SimulationEngine } from "./SimulationEngine";
import { Genome, Agent } from "./SimulationTypes";
import { processAgents, extrudePointedTerminalCap } from "./SimulationUpdateAgents";
import {
  performBiomassSweep,
  performRatioCulling,
  performCapacityCulling,
} from "./SimulationEcology";
import { performBranchPruning } from "./SimulationPruning";
import { isTreeModelAgent } from "./SimulationTreeArchitecture";
import { emitStateUpdate } from "./SimulationSceneSetup";
import {
  updateCameraAndThemeUniforms,
  updateMeshesAndStemsGrowth,
  updateHybridConnectionMesh,
} from "./SimulationUpdateVisuals";

export function updateSimulation(engine: SimulationEngine) {
  engine.time += engine.timeScale;
  engine.unscaledTime += 1;
  engine.frameCount++;

  updateCameraAndThemeUniforms(engine);

  const uniqueGenomes = new Map<string, Genome>();
  engine.agents.forEach((a) => {
    if (a.active) uniqueGenomes.set(a.genome.name, a.genome);
  });

  const pulsingGenomes = Array.from(uniqueGenomes.values()).filter(
    (g) => g.pulseTarget !== "none",
  );

  updateMeshesAndStemsGrowth(engine, uniqueGenomes, pulsingGenomes);

  const speedFactor = engine.growthSpeed < 1.0 ? Math.pow(engine.growthSpeed, 2) : engine.growthSpeed;
  const effectiveDieback = (engine.diebackRate / 100.0) * speedFactor * engine.timeScale;

  performBiomassSweep(engine);

  // INSTANT APPENDAGE SYNC (CRITICAL FIX: Bug #4 — Appendage Sync & Orphan Cleanup):
  // Ensure appendages dissolve both when parent stem is dying AND when parent stem has been removed or overwritten
  for (const [, app] of engine.appendages.entries()) {
    const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
    if (appLim > 0) {
      let appChanged = false;
      for (let i = 0; i < appLim; i++) {
        const seg = app.segments[i];
        if (seg && !app.dyingSet.has(i)) {
          const isStrainDying = engine.dyingStrains && engine.dyingStrains.has(seg.strainName);

          if (isStrainDying) {
            engine.markDying(app.segments, app.dyingSet, i, engine.unscaledTime);
          } else if (seg.parentIndex !== undefined) {
            const parentSeg = engine.segments[seg.parentIndex];
            const parentDying = engine.dyingStems.has(seg.parentIndex);
            const parentGoneOrOverwritten =
              !parentSeg ||
              parentSeg.strainName !== seg.strainName ||
              parentSeg.timestamp !== seg.parentTimestamp;

            if (parentGoneOrOverwritten) {
              engine.markDying(app.segments, app.dyingSet, i, engine.unscaledTime);
            } else if (parentDying && parentSeg.dyingStart) {
              engine.markDying(app.segments, app.dyingSet, i, parentSeg.dyingStart);
            }
          }
        }
      }
      if (appChanged) {
        app.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  engine.processDying(engine.segments, engine.dyingStems, engine.cylinderMesh);
  for (const app of engine.appendages.values()) {
    engine.processDying(app.segments, app.dyingSet, app.mesh, true);
  }

  for (const mesh of engine.hybridMeshes) {
    engine.processDying(engine.hybridSegments, engine.dyingHybrids, mesh);
  }

  updateHybridConnectionMesh(engine);

  // Instant Comprehensive Cleanup: Remove breeding polygon artifacts as soon as parent organisms die or taper out
  const activeAgentIds = new Set(engine.agents.filter(a => a.active && !a.tapering).map(a => a.id));

  for (let idx = 0; idx < engine.hybridSegments.length; idx++) {
    const seg = engine.hybridSegments[idx];
    if (seg && !engine.dyingHybrids.has(idx)) {
      const age = engine.time - seg.timestamp;
      const maxHybridLife = engine.hybridStickiness * 30 + 3;

      if (age > maxHybridLife) {
        engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
      } else if (effectiveDieback > 0.000001) {
        const deathProb = Math.min(
          1.0,
          Math.pow(age / 1000, engine.diebackAgeBias) * Math.max(0.000001, effectiveDieback) * 0.2,
        );
        if (Math.random() < deathProb) {
          engine.markDying(engine.hybridSegments, engine.dyingHybrids, idx);
        }
      }
    }
  }

  const activeAgents: Agent[] = [];
  for (let i = 0; i < engine.agents.length; i++) {
    if (engine.agents[i].active) {
      activeAgents.push(engine.agents[i]);
    }
  }
  engine.agents = activeAgents;

  performRatioCulling(engine, activeAgents);

  let newAgents: Agent[] = [];
  const bredThisFrame = new Set<Agent>();

  let currentActiveCount = 0;
  const strainCounts = new Map<string, number>();
  for (const a of activeAgents) {
    if (a.active && !a.tapering && !a.isFeeler) {
      currentActiveCount++;
      strainCounts.set(a.genome.name, (strainCounts.get(a.genome.name) || 0) + 1);
    }
  }

  for (let i = 0; i < activeAgents.length; i++) {
    const a1 = activeAgents[i];
    if (!a1.active || a1.tapering) continue;

    for (let j = i + 1; j < activeAgents.length; j++) {
      const a2 = activeAgents[j];
      if (!a2.active || a2.tapering) continue;

      if (a1.genome.name === a2.genome.name && !isTreeModelAgent(a1)) {
        const dSq = a1.position.distanceToSquared(a2.position);
        if (dSq < 25) {
          const activeStrainsCount = strainCounts.size || 1;
          const minPerStrain = Math.max(1, Math.floor(engine.minCreatures / activeStrainsCount));
          const myStrainCount = strainCounts.get(a2.genome.name) || 1;

          if (currentActiveCount - 1 >= engine.minCreatures && myStrainCount > minPerStrain) {
            const combinedThickness = a1.thickness + a2.thickness * 0.4;
            a1.thickness = Math.min(
              combinedThickness,
              a1.genome.thicknessBase * 3.0,
            );
            a1.direction.add(a2.direction).normalize();
            extrudePointedTerminalCap(engine, a2, a2.genome, a2.thickness);
            a2.active = false;
            a2.tapering = false;
            currentActiveCount--;
            strainCounts.set(a2.genome.name, myStrainCount - 1);
            engine.onLog(`Branch Merge: ${a1.genome.name}`);
            break;
          }
        }
      }
    }
  }

  performBranchPruning(engine, activeAgents);

  processAgents(engine, activeAgents, newAgents, bredThisFrame);
  newAgents.forEach(a => {
    if (a.id === undefined) {
      a.id = engine.nextAgentId++;
    }
  });
  engine.agents.push(...newAgents);

  engine.agents = engine.agents.filter((a) => a.active);

  const activeNotTapering = engine.agents.filter(a => !a.tapering && !a.isFeeler && a.hasBred);

  performCapacityCulling(engine, activeNotTapering);

  // Periodic archetype census breakdown logged every 300 frames (~5s)
  if (engine.frameCount % 300 === 0 && activeNotTapering.length > 0) {
    const archetypeCounts: Record<string, number> = { rhizome: 0, bush: 0, tree: 0 };
    let totalAge = 0;
    let maxAge = 0;
    for (const agent of activeNotTapering) {
      let arch = agent.genome.archetype || "bush";
      if (arch !== "rhizome" && arch !== "tree" && arch !== "bush") {
        arch = "bush";
      }
      archetypeCounts[arch] = (archetypeCounts[arch] || 0) + 1;
      totalAge += agent.age;
      if (agent.age > maxAge) maxAge = agent.age;
    }
    const total = activeNotTapering.length;
    const avgAgeSecs = (totalAge / total / 60.0).toFixed(1);
    const maxAgeSecs = (maxAge / 60.0).toFixed(1);

    const activeStemCount = Math.max(
      0,
      Math.min(engine.pointCount, engine.maxDOMs) -
        (engine.freeStemIndices ? engine.freeStemIndices.length : 0) -
        engine.dyingStems.size
    );
    const screenFillPct = ((activeStemCount / engine.maxDOMs) * 100).toFixed(1);

    const gPct = Math.round(((archetypeCounts.rhizome || 0) / total) * 100);
    const bPct = Math.round(((archetypeCounts.bush || 0) / total) * 100);
    const tPct = Math.round(((archetypeCounts.tree || 0) / total) * 100);

    engine.onLog(
      `📊 [CENSUS] Pop: ${total} (Avg Age: ${avgAgeSecs}s, Max: ${maxAgeSecs}s) | Screen Fill: ${screenFillPct}% | Rhizome: ${gPct}% | Bush: ${bPct}% | Tree: ${tPct}%`
    );
  }

  // Geometry diagnostics every 180 frames (~3s) — track live vs dying stems
  if (engine.frameCount % 180 === 0) {
    let liveSegs = 0;
    let dyingSegs = engine.dyingStems.size;
    let emptySlots = 0;
    const strainLiveSegs: Record<string, number> = {};
    for (let i = 0; i < engine.maxDOMs; i++) {
      if (engine.segments[i]) {
        if (!engine.dyingStems.has(i)) {
          liveSegs++;
          const sName = engine.segments[i].strainName || "unknown";
          strainLiveSegs[sName] = (strainLiveSegs[sName] || 0) + 1;
        }
      } else {
        emptySlots++;
      }
    }
    const activeAgentCount = engine.agents.filter(a => a.active && !a.isFeeler).length;
    const taperingCount = engine.agents.filter(a => a.active && a.tapering && !a.isFeeler).length;
    const dyingStrainsList = engine.dyingStrains ? Array.from(engine.dyingStrains).join(",") : "none";
    const strainSegSummary = Object.entries(strainLiveSegs).map(([k, v]) => `${k}:${v}`).join(", ");

    engine.onLog(
      `🔬 [GEOM] live=${liveSegs} dying=${dyingSegs} empty=${emptySlots} meshCount=${engine.cylinderMesh.count} | agents=${activeAgentCount} (tap=${taperingCount}) | liveSegs=[${strainSegSummary || "none"}] | dyingStrains=[${dyingStrainsList}]`
    );

    // ALERT: geometry vanished while agents alive
    if (liveSegs < 10 && activeAgentCount > 0) {
      engine.onLog(
        `🚨 [INVISIBLE BUG DETECTED] Only ${liveSegs} live segments but ${activeAgentCount} active agents! Ring buffer head=${engine.pointCount % engine.maxDOMs} maxDOMs=${engine.maxDOMs}`
      );
    }
  }

  // Appendage Health & Diagnostics Census logged every 240 frames (~4s)
  if (engine.frameCount % 240 === 0) {
    const appCounts: Record<string, { alive: number; dying: number }> = {};
    let totalLiveAppendages = 0;

    for (const [appName, app] of engine.appendages.entries()) {
      const appLim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
      let alive = 0;
      let dying = 0;
      for (let i = 0; i < appLim; i++) {
        const seg = app.segments[i];
        if (seg) {
          if (app.dyingSet.has(i)) {
            dying++;
          } else {
            alive++;
            totalLiveAppendages++;
          }
        }
      }
      if (alive > 0 || dying > 0) {
        appCounts[appName] = { alive, dying };
      }
    }

    const agentAppGenes: Record<string, number> = {};
    for (const agent of engine.agents) {
      if (agent.active && !agent.isFeeler && agent.genome.appendage && (agent.genome.appendage as string) !== "none") {
        agentAppGenes[agent.genome.appendage] = (agentAppGenes[agent.genome.appendage] || 0) + 1;
      }
    }

    const appBreakdown = Object.entries(appCounts)
      .map(([k, v]) => `${k}:${v.alive} (dying:${v.dying})`)
      .join(", ");
    const geneSummary = Object.entries(agentAppGenes)
      .map(([k, v]) => `${k}:${v} agt`)
      .join(", ");

    engine.onLog(
      `🌸 [APPENDAGE CENSUS] Total Live: ${totalLiveAppendages} | Active: [${appBreakdown || "none"}] | Genome Traits: [${geneSummary || "none"}]`
    );

    // Warning: If agents with appendage genes exist but 0 live appendages render on screen
    if (Object.keys(agentAppGenes).length > 0 && totalLiveAppendages === 0 && engine.frameCount > 60) {
      engine.onLog(
        `⚠️ [APPENDAGE DISAPPEARANCE WARNING] ${Object.keys(agentAppGenes).length} strains carry appendage traits (${geneSummary}), but 0 appendages are alive!`
      );
    }
  }

  if (engine.frameCount % 15 === 0) {
    emitStateUpdate(engine);
  }
}
