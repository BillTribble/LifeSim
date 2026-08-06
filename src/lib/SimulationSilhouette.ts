import * as THREE from 'three';
import { SimulationEngine } from './SimulationEngine';

export interface ScreenFillData {
  totalFillPct: number;
  totalOccupiedPixels: number;
  totalPixels: number;
  speciesBreakdown: {
    name: string;
    archetype: string;
    fillPct: number;
    pixels: number;
    biomass: number;
  }[];
}

export function measureScreenFillSilhouette(engine: SimulationEngine): ScreenFillData | null {
  if (!engine.renderer || !engine.scene || !engine.camera) return null;

  const w = 128;
  const h = 72;
  const totalPixels = w * h;

  if (!engine.silhouetteTarget) {
    engine.silhouetteTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });
    engine.silhouettePixelBuffer = new Uint8Array(w * h * 4);
  }

  const currentTarget = engine.renderer.getRenderTarget();
  
  // Render low-res offscreen silhouette target
  engine.renderer.setRenderTarget(engine.silhouetteTarget);
  engine.renderer.render(engine.scene, engine.camera);
  engine.renderer.readRenderTargetPixels(
    engine.silhouetteTarget,
    0,
    0,
    w,
    h,
    engine.silhouettePixelBuffer
  );
  engine.renderer.setRenderTarget(currentTarget);

  const pixels = engine.silhouettePixelBuffer;
  if (!pixels) return null;

  // Background color RGB in 0-255
  let bgR = 0, bgG = 0, bgB = 0;
  if (engine.bgColor) {
    const bgCol = new THREE.Color(engine.bgColor);
    bgR = Math.round(bgCol.r * 255);
    bgG = Math.round(bgCol.g * 255);
    bgB = Math.round(bgCol.b * 255);
  }

  // Active species color lookup for nearest color attribution
  const activeSpecies: {
    name: string;
    archetype: string;
    colorR: number;
    colorG: number;
    colorB: number;
    biomass: number;
    pixelCount: number;
  }[] = [];

  engine.biomassMap.forEach((biomass, name) => {
    if (biomass > 0 && !name.startsWith("Feeler-")) {
      const genome = engine.genomeMap.get(name);
      if (genome) {
        activeSpecies.push({
          name,
          archetype: genome.archetype || "unknown",
          colorR: Math.round(genome.color.r * 255),
          colorG: Math.round(genome.color.g * 255),
          colorB: Math.round(genome.color.b * 255),
          biomass,
          pixelCount: 0,
        });
      }
    }
  });

  let totalOccupied = 0;

  for (let i = 0; i < totalPixels; i++) {
    const pIdx = i * 4;
    const r = pixels[pIdx];
    const g = pixels[pIdx + 1];
    const b = pixels[pIdx + 2];
    const a = pixels[pIdx + 3];

    if (a < 10) continue;

    // Check difference from background color (Euclidean color dist > 25 threshold)
    const dR = r - bgR;
    const dG = g - bgG;
    const dB = b - bgB;
    const distSqToBg = dR * dR + dG * dG + dB * dB;

    if (distSqToBg > 625) { // Euclidean distance > 25 from background
      totalOccupied++;

      // Attribute pixel to closest matching active species
      if (activeSpecies.length > 0) {
        let bestIdx = 0;
        let bestDistSq = Infinity;
        for (let s = 0; s < activeSpecies.length; s++) {
          const sp = activeSpecies[s];
          const sDr = r - sp.colorR;
          const sDg = g - sp.colorG;
          const sDb = b - sp.colorB;
          const sDistSq = sDr * sDr + sDg * sDg + sDb * sDb;
          if (sDistSq < bestDistSq) {
            bestDistSq = sDistSq;
            bestIdx = s;
          }
        }
        activeSpecies[bestIdx].pixelCount++;
      }
    }
  }

  const totalFillPct = (totalOccupied / totalPixels) * 100;
  const speciesBreakdown = activeSpecies.map((sp) => ({
    name: sp.name,
    archetype: sp.archetype,
    fillPct: (sp.pixelCount / totalPixels) * 100,
    pixels: sp.pixelCount,
    biomass: sp.biomass,
  }));

  return {
    totalFillPct,
    totalOccupiedPixels: totalOccupied,
    totalPixels,
    speciesBreakdown,
  };
}
