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

/**
 * Constructs the sphere (meridian/parallel rings) or box wireframe geometry for the world boundary.
 */
export function buildBoundaryGeometry(engine: SimulationEngine): THREE.BufferGeometry {
  const b = engine.boundarySize;
  const squash = engine.boundarySquash ?? 1.0;
  const bY = b * squash;

  if (engine.boundaryShape === "sphere") {
    const points: THREE.Vector3[] = [];
    const segments = 48;

    // 1. Horizontal Equator Ring (XZ plane at y=0)
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta1) * b, 0, Math.sin(theta1) * b),
        new THREE.Vector3(Math.cos(theta2) * b, 0, Math.sin(theta2) * b)
      );
    }

    // 2. Vertical XY Meridian Ring
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta1) * b, Math.sin(theta1) * bY, 0),
        new THREE.Vector3(Math.cos(theta2) * b, Math.sin(theta2) * bY, 0)
      );
    }

    // 3. Vertical YZ Meridian Ring
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(0, Math.sin(theta1) * bY, Math.cos(theta1) * b),
        new THREE.Vector3(0, Math.sin(theta2) * bY, Math.cos(theta2) * b)
      );
    }

    // 4. Upper and Lower Parallel Rings (at ±45° latitude)
    const latAngle = Math.PI / 4;
    const latR = b * Math.cos(latAngle);
    const latY = bY * Math.sin(latAngle);
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta1) * latR, latY, Math.sin(theta1) * latR),
        new THREE.Vector3(Math.cos(theta2) * latR, latY, Math.sin(theta2) * latR)
      );
      points.push(
        new THREE.Vector3(Math.cos(theta1) * latR, -latY, Math.sin(theta1) * latR),
        new THREE.Vector3(Math.cos(theta2) * latR, -latY, Math.sin(theta2) * latR)
      );
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  const boxGeo = new THREE.BoxGeometry(b * 2, bY * 2, b * 2);
  return new THREE.EdgesGeometry(boxGeo);
}
