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
  if (!engine.boundarySize) return p;
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

/**
 * Determines whether the current viewport should use the mobile width target (90%)
 * or desktop width target (80%), respecting ?mobile=1 / ?mobile=0 overrides and window width.
 */
export function isMobileViewport(width: number): boolean {
  if (typeof location !== "undefined") {
    const q = new URLSearchParams(location.search).get("mobile");
    if (q === "1") return true;
    if (q === "0") return false;
  }
  if (width > 0 && width < 768) return true;
  if (width >= 768) return false;
  if (typeof window !== "undefined") {
    if (window.innerWidth > 0 && window.innerWidth < 768) return true;
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px)").matches) return true;
  }
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Computes the camera distance from `controls.target` so the 3D bounding box
 * fills 90% of the screen width on mobile and 80% of the screen width on desktop.
 */
export function getResponsiveBoundaryCameraDistance(engine: SimulationEngine): number {
  const b = Math.max(10, engine.boundarySize || 60);
  const width = engine.width > 0 ? engine.width : (typeof window !== "undefined" ? window.innerWidth || 1280 : 1280);
  const height = engine.height > 0 ? engine.height : (typeof window !== "undefined" ? window.innerHeight || 800 : 800);
  const aspect = Math.max(0.1, width / Math.max(1, height));

  const mobile = isMobileViewport(width);
  const targetWidthFill = mobile ? 0.90 : 0.80;

  const baseFOV = 45.0;
  const proj = engine.cameraProjection !== undefined ? engine.cameraProjection : 1.0;
  const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, proj));
  const tanHalfV = Math.tan((targetFOV * Math.PI) / 360);
  const tanHalfH = Math.max(1e-4, tanHalfV * aspect);
  const k = 1.0 / (targetWidthFill * tanHalfH);

  // For a sphere of radius b, the horizontal silhouette tangent is at b / sqrt(D^2 - b^2) = targetWidthFill * tanHalfH => D = b * sqrt(1 + k^2).
  // For a cuboid of half-extent b, the front face at depth (D - b) has b / (D - b) = targetWidthFill * tanHalfH => D = b * (1 + k).
  if (engine.boundaryShape === "sphere") {
    return b * Math.sqrt(1.0 + k * k);
  }
  return b * (1.0 + k);
}

/**
 * Updates camera FOV, distance along the current view ray, and fog range so the
 * bounding box responsively fills 90% width on mobile and 80% width on desktop.
 */
export function applyResponsiveBoundaryCameraDistance(engine: SimulationEngine): void {
  if (!engine.camera || !engine.controls) return;
  if (engine.designerMode) {
    engine.camera.updateProjectionMatrix();
    return;
  }

  const baseFOV = 45.0;
  const proj = engine.cameraProjection !== undefined ? engine.cameraProjection : 1.0;
  const targetFOV = THREE.MathUtils.lerp(1.0, baseFOV, Math.max(0.01, proj));
  const newDist = getResponsiveBoundaryCameraDistance(engine);

  const dir = new THREE.Vector3().subVectors(engine.camera.position, engine.controls.target);
  if (dir.lengthSq() < 1e-6) {
    dir.set(0, 0, 1);
  } else {
    dir.normalize();
  }

  engine.camera.fov = targetFOV;
  engine.camera.position.copy(engine.controls.target).addScaledVector(dir, newDist);
  engine.camera.updateProjectionMatrix();

  if (engine.scene && engine.scene.fog && engine.scene.fog instanceof THREE.Fog) {
    const baseFogFar = engine.fogVisibility || 780;
    const baseFogNear = Math.max(10, baseFogFar / 4);
    const fogScale = Math.max(1.0, newDist / 137.42);
    engine.scene.fog.near = baseFogNear * fogScale;
    engine.scene.fog.far = baseFogFar * fogScale;
  }

  engine.controls.update();
}

/**
 * Randomizes `engine.boundaryShape` between `"sphere"` and `"cube"` (cuboid)
 * and rebuilds the boundary wireframe mesh.
 */
export function randomizeBoundaryShape(engine: SimulationEngine): void {
  engine.boundaryShape = Math.random() < 0.5 ? "sphere" : "cube";
  engine.updateBoundaryMesh();
}
