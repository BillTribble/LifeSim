import * as THREE from 'three';
import { SimulationEngine } from '../src/lib/SimulationEngine';
import { setupInitialCreatures } from '../src/lib/SimulationSceneSetup';

class MockWebGLRenderer {
  domElement = { clientWidth: 1920, clientHeight: 1080 };
  shadowMap = { enabled: false, type: 0 };
  outputColorSpace = '';
  toneMapping = 0;
  toneMappingExposure = 1;
  autoClear = true;
  setPixelRatio() {}
  setSize() {}
  render() {}
  clearDepth() {}
  dispose() {}
}

async function diagnose() {
  const container = {} as any;
  const renderer = new MockWebGLRenderer() as any;
  const engine = new SimulationEngine(container, renderer);

  // Exact dials from user screenshot:
  engine.growthSpeed = 0.11;
  engine.timeScale = 42.1;
  engine.diebackRate = 6.42;
  engine.terminationProb = 0.13;
  engine.maxAgents = 45;
  engine.minAgents = 5;
  engine.maxSpecies = 19;
  engine.boundarySize = 120;
  engine.maxDOMs = 341000;

  setupInitialCreatures(engine);

  console.log("=== RUNNING FULL DIAGNOSTIC SIMULATION (600 FRAMES) ===");

  for (let frame = 1; frame <= 600; frame++) {
    engine.update();

    if (frame % 60 === 0) {
      const cylMesh = engine.cylinderMesh;
      const matArray = cylMesh.instanceMatrix.array;
      const count = cylMesh.count;

      const packA = cylMesh.geometry.getAttribute("instancePackA") as THREE.InstancedBufferAttribute;
      const packB = cylMesh.geometry.getAttribute("instancePackB") as THREE.InstancedBufferAttribute;

      let nonZeroMatrices = 0;
      let nanMatrices = 0;
      let zeroMatrices = 0;
      let ditherDiscardedStems = 0;
      let decayDiscardedStems = 0;

      const dummyMat = new THREE.Matrix4();

      for (let i = 0; i < count; i++) {
        dummyMat.fromArray(matArray, i * 16);
        const te = dummyMat.elements;
        
        let hasNan = false;
        for (let k = 0; k < 16; k++) {
          if (isNaN(te[k])) hasNan = true;
        }

        if (hasNan) {
          nanMatrices++;
        } else {
          const sx = Math.sqrt(te[0]*te[0] + te[1]*te[1] + te[2]*te[2]);
          const sy = Math.sqrt(te[4]*te[4] + te[5]*te[5] + te[6]*te[6]);
          const sz = Math.sqrt(te[8]*te[8] + te[9]*te[9] + te[10]*te[10]);

          if (sx > 0.0001 && sy > 0.0001 && sz > 0.0001) {
            nonZeroMatrices++;
            const decay = packA ? packA.getZ(i) : 0;
            const growth = packB ? packB.getX(i) : 1;
            if (decay >= 0.98) decayDiscardedStems++;
            if (growth < 0.05) ditherDiscardedStems++;
          } else {
            zeroMatrices++;
          }
        }
      }

      let totalLiveApps = 0;
      for (const app of engine.appendages.values()) {
        const lim = Math.min(app.count, Math.floor(engine.maxDOMs / 4));
        for (let i = 0; i < lim; i++) {
          if (app.segments[i] && !app.dyingSet.has(i)) totalLiveApps++;
        }
      }

      const activeAgents = engine.agents.filter(a => a.active && !a.isFeeler).length;

      console.log(
        `Frame ${frame.toString().padStart(4, ' ')} | Agts: ${activeAgents.toString().padStart(3, ' ')} | CylMeshCount: ${count.toString().padStart(6, ' ')} | VisibleStems: ${nonZeroMatrices.toString().padStart(6, ' ')} | ZeroMat: ${zeroMatrices.toString().padStart(6, ' ')} | NaNMat: ${nanMatrices} | ShaderDecayDiscard: ${decayDiscardedStems} | LiveApps: ${totalLiveApps}`
      );
    }
  }
}

diagnose().catch(console.error);
