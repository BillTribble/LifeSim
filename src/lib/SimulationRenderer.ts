import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationEngine } from './SimulationEngine';
import { MAX_POINTS } from './SimulationTypes';
import { setupShaderMaterial } from './SimulationGenetics';

export function setupSimulationScene(engine: SimulationEngine, width: number, height: number) {
    engine.scene = new THREE.Scene();
    engine.scene.fog = new THREE.Fog('#001220', 200, 800);
    
    const aspect = width / height;
    const d = 180;
    engine.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    engine.camera.position.set(-138.72339373186549, 66.42053119728962, -310.39351324888355);
    engine.camera.zoom = 1.916305230244903;
    engine.camera.updateProjectionMatrix();
    engine.camera.lookAt(engine.scene.position);
    
    engine.renderer = new THREE.WebGLRenderer({ canvas: engine.canvas, alpha: true, antialias: true });
    engine.renderer.setSize(width, height);
    engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    engine.controls = new OrbitControls(engine.camera, engine.renderer.domElement);
    engine.controls.enableDamping = true;
    engine.controls.dampingFactor = 0.05;
    engine.controls.autoRotate = true;
    engine.controls.autoRotateSpeed = 0.4;
    engine.controls.enablePan = true;
    engine.controls.enableZoom = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    engine.scene.add(ambientLight);
    
    const d1 = new THREE.DirectionalLight('#F9D29D', 1.5);
    d1.position.set(100, 200, 100);
    engine.scene.add(d1);

    const d2 = new THREE.DirectionalLight('#00E5FF', 1.0);
    d2.position.set(-100, -50, -100);
    engine.scene.add(d2);

    engine.dummy = new THREE.Object3D();

    const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
    cylinderGeo.translate(0, 0.5, 0); 
    cylinderGeo.rotateX(-Math.PI / 2);

    const material = setupShaderMaterial(new THREE.MeshPhysicalMaterial({
      transparent: false,
      depthWrite: true,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.3,
      clearcoat: 0.5,
      reflectivity: 1.0
    }));

    const initMeshAttributes = (mesh: THREE.InstancedMesh, count: number) => {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (mesh.instanceColor === null) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
      }
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      
      const glowArray = new Float32Array(count).fill(0.0);
      const decayArray = new Float32Array(count).fill(0.0);
      const growthArray = new Float32Array(count).fill(1.0);
      const hashArray = new Float32Array(count);
      for (let i = 0; i < count; i++) hashArray[i] = Math.random();
      
      const glowAttr = new THREE.InstancedBufferAttribute(glowArray, 1);
      const decayAttr = new THREE.InstancedBufferAttribute(decayArray, 1);
      const growthAttr = new THREE.InstancedBufferAttribute(growthArray, 1);
      const hashAttr = new THREE.InstancedBufferAttribute(hashArray, 1);
      
      glowAttr.setUsage(THREE.DynamicDrawUsage);
      decayAttr.setUsage(THREE.DynamicDrawUsage);
      growthAttr.setUsage(THREE.DynamicDrawUsage);
      hashAttr.setUsage(THREE.DynamicDrawUsage); // Dynamic since it now changes per creature
      
      mesh.geometry.setAttribute('instanceGlow', glowAttr);
      mesh.geometry.setAttribute('instanceDecay', decayAttr);
      mesh.geometry.setAttribute('instanceGrowth', growthAttr);
      mesh.geometry.setAttribute('instanceHash', hashAttr);
    };

    engine.cylinderMesh = new THREE.InstancedMesh(cylinderGeo, material, MAX_POINTS);
    initMeshAttributes(engine.cylinderMesh, MAX_POINTS);

    const appendagesConfig: Record<string, THREE.BufferGeometry> = {
      flowers: new THREE.ConeGeometry(0.5, 1, 12).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
      leaves: new THREE.SphereGeometry(0.5, 8, 8),
      petals: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      needles: new THREE.ConeGeometry(0.1, 1, 4).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
      thorns: new THREE.ConeGeometry(0.3, 0.6, 4).translate(0, 0.3, 0).rotateX(-Math.PI / 2),
      hair: new THREE.CylinderGeometry(0.04, 0.04, 3, 5).translate(0, 1.5, 0).rotateX(-Math.PI / 2),
      curlyHair: new THREE.TorusKnotGeometry(0.4, 0.08, 64, 8),
      crystals: new THREE.OctahedronGeometry(0.6),
      spores: new THREE.DodecahedronGeometry(0.5),
      scales: new THREE.PlaneGeometry(0.8, 0.8),
      spirals: new THREE.TorusGeometry(0.5, 0.15, 8, 16)
    };

    const appendageCount = Math.floor(MAX_POINTS / 4);
    for (const [key, geo] of Object.entries(appendagesConfig)) {
        const mesh = new THREE.InstancedMesh(geo, material, appendageCount);
        initMeshAttributes(mesh, appendageCount);
        engine.scene.add(mesh);
        engine.appendages.set(key, { mesh, segments: [], dyingSet: new Set(), count: 0 });
    }

    const hybridMat = setupShaderMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffffff, wireframe: true, transparent: false, depthWrite: true }));
    
    function createStellatedGeometry(baseGeometry: THREE.BufferGeometry, spikeHeight: number) {
        const geo = baseGeometry.clone().toNonIndexed();
        const position = geo.attributes.position;
        const newPositions = [];
        
        for ( let i = 0; i < position.count; i += 3 ) {
            const v1 = new THREE.Vector3().fromBufferAttribute(position as THREE.BufferAttribute, i);
            const v2 = new THREE.Vector3().fromBufferAttribute(position as THREE.BufferAttribute, i+1);
            const v3 = new THREE.Vector3().fromBufferAttribute(position as THREE.BufferAttribute, i+2);
            
            const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
            const normal = new THREE.Vector3();
            new THREE.Triangle(v1, v2, v3).getNormal(normal);
            
            // Push the face center outward along its normal
            const peak = center.clone().add(normal.multiplyScalar(spikeHeight));
            
            // Create three new triangles to form a pyramid on the face
            newPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, peak.x, peak.y, peak.z);
            newPositions.push(v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, peak.x, peak.y, peak.z);
            newPositions.push(v3.x, v3.y, v3.z, v1.x, v1.y, v1.z, peak.x, peak.y, peak.z);
        }
        
        const stellatedGeo = new THREE.BufferGeometry();
        stellatedGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        stellatedGeo.computeVertexNormals();
        return stellatedGeo;
    }
    
    const hybridGeos = [
        createStellatedGeometry(new THREE.TetrahedronGeometry(1.2, 0), 1.5),         // 4 spikes
        createStellatedGeometry(new THREE.OctahedronGeometry(1.2, 0), 1.8),          // 8 spikes
        createStellatedGeometry(new THREE.IcosahedronGeometry(1.2, 0), 2.0),         // 20 spikes
        createStellatedGeometry(new THREE.IcosahedronGeometry(0.8, 1), 1.2),         // 80 small spikes
        createStellatedGeometry(createStellatedGeometry(new THREE.TetrahedronGeometry(0.8, 0), 1.5), 0.8) // Double stellated
    ];

    engine.hybridMeshes = hybridGeos.map(geo => {
        const mesh = new THREE.InstancedMesh(geo, hybridMat, 2000);
        initMeshAttributes(mesh, 2000);
        engine.scene.add(mesh);
        // By default, scale everything down to 0 so they don't show up.
        // We handle this via count/matrices in SimulationUpdate but to be safe:
        const dummyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        for(let i=0; i<2000; i++) {
            mesh.setMatrixAt(i, dummyMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.count = 2000; 
        return mesh;
    });

    const connectionGeo = new THREE.BufferGeometry();
    connectionGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60000), 3));
    connectionGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(80000), 4));
    const connectionMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1.0 });
    engine.hybridConnectionMesh = new THREE.LineSegments(connectionGeo, connectionMat);
    engine.hybridConnectionMesh.frustumCulled = false;
    engine.scene.add(engine.hybridConnectionMesh);

    engine.scene.add(engine.cylinderMesh);

    const tideGeo = new THREE.PlaneGeometry(1000, 1000);
    const tideMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        tideValue: { value: 0 },
        pulseOffset: { value: 0 },
        colorBottom: { value: new THREE.Color("#FF4500") },
        colorTop: { value: new THREE.Color("#8A2BE2") },
        thickness: { value: 140.0 },
        tideOpacity: { value: 0.5 },
        tideSaturation: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float tideValue;
        uniform float pulseOffset;
        uniform vec3 colorBottom;
        uniform vec3 colorTop;
        uniform float thickness;
        uniform float tideOpacity;
        uniform float tideSaturation;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        float random (vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise (vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          float dist = abs(vWorldPosition.y - pulseOffset);
          float gaussian = exp(-pow(dist / thickness, 2.0));
          
          vec2 noiseUv = vUv * 6.0 + vec2(time * 0.1, time * 0.15) + (vWorldPosition.y * 0.02);
          float n = noise(noiseUv);
          float alpha = gaussian * tideValue * (0.1 + 0.9 * n);
          
          vec3 color = mix(colorBottom, colorTop, smoothstep(-250.0, 250.0, vWorldPosition.y));
          color += colorBottom * gaussian * 0.5;
          
          float edgeFade = 1.0 - smoothstep(0.2, 0.5, distance(vUv, vec2(0.5)));
          
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(luminance), color, tideSaturation);
          
          gl_FragColor = vec4(color, alpha * tideOpacity * edgeFade);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    engine.tideMesh = new THREE.InstancedMesh(tideGeo, tideMat, 25) as any;
    const tMat = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI/2);
    const tideInstMesh = engine.tideMesh as unknown as THREE.InstancedMesh;
    for(let i=0; i<25; i++) {
        tMat.compose(new THREE.Vector3(0, (i - 12) * 15, 0), q, new THREE.Vector3(1,1,1));
        tideInstMesh.setMatrixAt(i, tMat);
    }
    engine.scene.add(engine.tideMesh);
}
