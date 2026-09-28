import * as THREE from "three";
import type { SimulationEngine } from "./SimulationEngine";
import type { Agent } from "./SimulationTypes";

/** Clamps an agent to the world boundary (box or ellipsoid) and reflects its direction. Returns true on a bounce. */
export function reflectAtBoundary(engine: SimulationEngine, agent: Agent): boolean {
  const bX = engine.boundarySize;
  const bZ = engine.boundarySize;
  const squash = engine.boundarySquash ?? 1.0;
  const bY = Math.max(5.0, engine.boundarySize * squash);
  const creatureCenterY = engine.creatureCenterY || 18.921075;
  let bounced = false;

  if (engine.boundaryShape === "sphere") {
    const dy = agent.position.y - creatureCenterY;
    const normX = agent.position.x / bX;
    const normY = dy / bY;
    const normZ = agent.position.z / bZ;
    const distSq = normX * normX + normY * normY + normZ * normZ;
    if (distSq > 1.0) {
      const scale = 1.0 / Math.sqrt(distSq);
      agent.position.x *= scale;
      agent.position.y = creatureCenterY + dy * scale;
      agent.position.z *= scale;
      const normal = new THREE.Vector3(
        agent.position.x / (bX * bX),
        (agent.position.y - creatureCenterY) / (bY * bY),
        agent.position.z / (bZ * bZ),
      ).normalize();
      const dot = agent.direction.dot(normal);
      agent.direction.sub(normal.multiplyScalar(2 * dot));
      bounced = true;
    }
  } else {
    if (agent.position.x > bX) {
      agent.position.x = bX;
      agent.direction.x *= -1;
      bounced = true;
    } else if (agent.position.x < -bX) {
      agent.position.x = -bX;
      agent.direction.x *= -1;
      bounced = true;
    }
    const minY = creatureCenterY - bY;
    const maxY = creatureCenterY + bY;
    if (agent.position.y > maxY) {
      agent.position.y = maxY;
      agent.direction.y *= -1;
      bounced = true;
    } else if (agent.position.y < minY) {
      agent.position.y = minY;
      agent.direction.y *= -1;
      bounced = true;
    }
    if (agent.position.z > bZ) {
      agent.position.z = bZ;
      agent.direction.z *= -1;
      bounced = true;
    } else if (agent.position.z < -bZ) {
      agent.position.z = -bZ;
      agent.direction.z *= -1;
      bounced = true;
    }
  }
  return bounced;
}

/** Returns `p` clamped inside the world boundary with a small margin (box or ellipsoid). */
export function clampInsideBounds(engine: SimulationEngine, p: THREE.Vector3, margin = 2): THREE.Vector3 {
  const bX = Math.max(1, engine.boundarySize - margin);
  const squash = engine.boundarySquash ?? 1.0;
  const bY = Math.max(1, Math.max(5.0, engine.boundarySize * squash) - margin);
  const cy = engine.creatureCenterY || 18.921075;
  if (engine.boundaryShape === "sphere") {
    const nx = p.x / bX, ny = (p.y - cy) / bY, nz = p.z / bX;
    const d = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (d > 1) {
      p.x /= d;
      p.y = cy + (p.y - cy) / d;
      p.z /= d;
    }
    return p;
  }
  p.x = THREE.MathUtils.clamp(p.x, -bX, bX);
  p.y = THREE.MathUtils.clamp(p.y, cy - bY, cy + bY);
  p.z = THREE.MathUtils.clamp(p.z, -bX, bX);
  return p;
}
