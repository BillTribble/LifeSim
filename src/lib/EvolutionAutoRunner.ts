import { SimulationEngine } from "./SimulationEngine";
import { updateSimulation } from "./SimulationUpdate";
import { getEvolutionStepConfig } from "./EvolutionPresets";

export function runHeadless20RoundsIfRequested(engine: SimulationEngine) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const stepParam = params.get("step");
  const conceptParam = params.get("concept");
  const fastForward = params.get("fastforward") === "1";

  const round = stepParam ? Math.max(1, Math.min(20, parseInt(stepParam, 10) || 20)) : 20;
  const concept = conceptParam || "oak";

  if (conceptParam) {
    engine.botanicalConcept = concept;
  }
  if (stepParam) {
    engine.evolutionStep = round;
  }

  if (fastForward) {
    const progress = (round - 1) / 19.0;
    const cfg = getEvolutionStepConfig(round);
    engine.designerMode = true;
    engine.botanicalConcept = concept;
    engine.designerArchetype =
      concept === "rhizome_web" ? "rhizome" : concept === "willow" ? "bush" : "tree";
    engine.evolutionStep = round;

    engine.treeBranching = 15.0 + progress * 32.0;
    engine.bushBranching = 26.0 + progress * 44.0;
    engine.rhizomeBranching = 9.0 + progress * 25.0;
    engine.branchingMultiplier = 130.0 + progress * 270.0;
    engine.maxBranchesPerSpecies = Math.round(18 + progress * 82);
    engine.maxBranchDepth = cfg.maxDepth;
    engine.pruningStrength = 1.45 - progress * 0.78;
    engine.rhizomeTaper = 0.12 + progress * 0.68;
    engine.treeTaper = 0.34 + progress * 0.46;
    engine.bushTaper = 0.34 + progress * 0.46;
    engine.stemCurviness = 0.8 + progress * 3.4;
    engine.timeScale = 2.4;
    engine.growthSpeed = 0.22;

    engine.executeReset();

    const hueMap: Record<string, number> = {
      oak: 0.34,
      elm: 0.42,
      pine: 0.48,
      willow: 0.28,
      rhizome_web: 0.08,
    };
    if (engine.agents.length > 0) {
      const baseAgent = engine.agents[0];
      baseAgent.genome.growthHabit = concept;
      baseAgent.genome.color.setHSL(hueMap[concept] ?? 0.35, 0.82, 0.56);
      baseAgent.thickness = 2.45 - progress * 0.32;
    }

    if (engine.camera && engine.controls) {
      engine.controls.target.set(0, 17 + progress * 3, 0);
      const camYaw = (round - 1) * 0.14;
      const dist = 68 - progress * 6;
      engine.camera.position.set(
        Math.sin(camYaw) * dist * 0.36,
        17 + progress * 5,
        -Math.cos(camYaw) * dist
      );
      engine.camera.lookAt(engine.controls.target);
      engine.controls.update();
    }

    const totalSteps = 125 + Math.round(progress * 55);
    for (let s = 0; s < totalSteps; s++) {
      updateSimulation(engine);
    }
    engine.renderer.render(engine.scene, engine.camera);
  }
}
