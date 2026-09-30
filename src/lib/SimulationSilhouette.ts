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

  // FAST-PATH: Mobile or low-LOD tiers skip offscreen GPU readback entirely (0 readRenderTargetPixels calls).
  // Approximates silhouette coverage analytically from active biomass distribution.
  const skipGPUReadback = Boolean(engine.isMobile || (engine.lod && (engine.lod.tier >= 2 || engine.lod.emaFrameMs > 22)));
  if (skipGPUReadback) {
    let totalBiomass = 0;
    const speciesBreakdown: {
      name: string;
      archetype: string;
      fillPct: number;
      pixels: number;
      biomass: number;
    }[] = [];

    engine.biomassMap.forEach((biomass, name) => {
      if (biomass > 0 && !name.startsWith("Feeler-")) {
        totalBiomass += biomass;
        const genome = engine.genomeMap.get(name);
        speciesBreakdown.push({
          name,
          archetype: genome?.archetype || "unknown",
          fillPct: 0,
          pixels: 0,
          biomass,
        });
      }
    });

    const activeCapacity = Math.max(100, Math.min(engine.pointCount || 1, engine.maxDOMs || 1000));
    // Asymptotic coverage approximation capped at 75% screen fill
    const estimatedFillRatio = Math.min(0.75, (totalBiomass / activeCapacity) * 0.55);
    const totalOccupied = Math.round(estimatedFillRatio * totalPixels);
    const totalFillPct = estimatedFillRatio * 100;

    for (const sp of speciesBreakdown) {
      const frac = totalBiomass > 0 ? sp.biomass / totalBiomass : 0;
      sp.pixels = Math.round(totalOccupied * frac);
      sp.fillPct = (sp.pixels / totalPixels) * 100;
    }

    return {
      totalFillPct,
      totalOccupiedPixels: totalOccupied,
      totalPixels,
      speciesBreakdown,
    };
  }

  if (!engine.renderer || !engine.scene || !engine.camera) return null;

  if (!engine.silhouetteTarget) {
    const savedRandom = Math.random;
    try {
      Math.random = () => 0.5;
      engine.silhouetteTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
    } finally {
      Math.random = savedRandom;
    }
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
