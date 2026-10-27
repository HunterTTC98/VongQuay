import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';
import { detectDeviceGraphicTier, DeviceGraphicTier } from './deviceTier.ts';

export interface Confession3DHeartsRef {
  burst: (x?: number, y?: number, count?: number) => void;
}

interface Confession3DHeartsProps {
  interactive?: boolean;
  className?: string;
}

interface HeartParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

type TierLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export const Confession3DHearts = forwardRef<Confession3DHeartsRef, Confession3DHeartsProps>(
  ({ interactive = true, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const particlesRef = useRef<HeartParticle[]>([]);
    const sharedGeomRef = useRef<THREE.BufferGeometry | null>(null);
    const materialsRef = useRef<THREE.Material[]>([]);
    const tierRef = useRef<TierLevel>('HIGH');

    // Create 3D Heart Extruded Geometry procedurally
    const createHeartGeometry = (tierLevel: TierLevel): THREE.BufferGeometry => {
      const heartShape = new THREE.Shape();
      const x = 0, y = 0;
      heartShape.moveTo(x + 0.25, y + 0.25);
      heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
      heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
      heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 1.0);
      heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
      heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
      heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

      if (tierLevel === 'LOW') {
        // Flat shape geometry for low-end devices
        const geom = new THREE.ShapeGeometry(heartShape, 6);
        geom.center();
        return geom;
      }

      // Extruded 3D Heart
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: tierLevel === 'HIGH' ? 0.22 : 0.12,
        bevelEnabled: true,
        bevelSegments: tierLevel === 'HIGH' ? 3 : 1,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05,
        curveSegments: tierLevel === 'HIGH' ? 12 : 6,
      };

      const geom = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
      geom.center();
      return geom;
    };

    // Color palettes for 20/10 celebration (Ruby, Rose, Sakura, Crimson, Sunset Coral, Gold)
    const HEART_COLORS = [
      0xf43f5e, // Rose 500
      0xec4899, // Pink 500
      0xff2a85, // Vibrant Magenta
      0xe11d48, // Rose 600
      0xfb7185, // Rose 400
      0xfbbf24, // Warm Gold accent
      0xff4081, // Hot Pink
    ];

    const spawnHeart = useCallback(
      (originX = 0, originY = -3, originZ = 0, velocityFactor = 1.0) => {
        const scene = sceneRef.current;
        const geom = sharedGeomRef.current;
        if (!scene || !geom) return;

        // Pick random material
        const mat = materialsRef.current[Math.floor(Math.random() * materialsRef.current.length)];
        const mesh = new THREE.Mesh(geom, mat);

        // Position with slight spread
        mesh.position.set(
          originX + (Math.random() - 0.5) * 1.5,
          originY + (Math.random() - 0.5) * 0.8,
          originZ + (Math.random() - 0.5) * 2
        );

        // Random starting rotations
        mesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );

        const baseScale = (0.28 + Math.random() * 0.35) * (tierRef.current === 'LOW' ? 0.9 : 1.1);
        mesh.scale.setScalar(0.01); // starts tiny, pops open

        scene.add(mesh);

        const p: HeartParticle = {
          mesh,
          vx: (Math.random() - 0.5) * 0.035 * velocityFactor,
          vy: (0.04 + Math.random() * 0.055) * velocityFactor, // float upward
          vz: (Math.random() - 0.5) * 0.03 * velocityFactor,
          rx: (Math.random() - 0.5) * 0.06,
          ry: (Math.random() - 0.5) * 0.07,
          rz: (Math.random() - 0.5) * 0.05,
          life: 0,
          maxLife: 90 + Math.floor(Math.random() * 60), // frames
          baseScale,
        };

        particlesRef.current.push(p);
      },
      []
    );

    // Burst API exposed to parent
    useImperativeHandle(ref, () => ({
      burst: (clientX?: number, clientY?: number, count = 18) => {
        const container = containerRef.current;
        const camera = cameraRef.current;
        let originX = 0;
        let originY = -2;

        if (container && camera && clientX !== undefined && clientY !== undefined) {
          const rect = container.getBoundingClientRect();
          const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

          // Unproject to 3D plane at z=0
          const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
          vector.unproject(camera);
          const dir = vector.sub(camera.position).normalize();
          const distance = -camera.position.z / dir.z;
          const pos = camera.position.clone().add(dir.multiplyScalar(distance));
          originX = THREE.MathUtils.clamp(pos.x, -7, 7);
          originY = THREE.MathUtils.clamp(pos.y, -5, 5);
        }

        const tier = tierRef.current;
        const actualCount = tier === 'LOW' ? Math.min(count, 8) : tier === 'MEDIUM' ? Math.min(count, 14) : count;

        for (let i = 0; i < actualCount; i++) {
          setTimeout(() => {
            spawnHeart(originX, originY, 0, 1.25);
          }, i * 28);
        }
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const detectedTier = detectDeviceGraphicTier();
      tierRef.current = detectedTier.tier;

      const width = container.clientWidth || 300;
      const height = container.clientHeight || 300;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 10);
      cameraRef.current = camera;

      // 3. Renderer with transparent background
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: detectedTier.antialias,
        powerPreference: detectedTier.tier === 'LOW' ? 'low-power' : 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(detectedTier.pixelRatio);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffecd2, 1.8);
      dirLight.position.set(5, 8, 7);
      scene.add(dirLight);

      const rimLight = new THREE.PointLight(0xff3399, 2.2, 20);
      rimLight.position.set(-4, -2, 5);
      scene.add(rimLight);

      // 5. Shared Heart Geometry
      const heartGeom = createHeartGeometry(detectedTier.tier);
      sharedGeomRef.current = heartGeom;

      // 6. Materials
      materialsRef.current = HEART_COLORS.map((hex) => {
        if (detectedTier.tier === 'LOW') {
          return new THREE.MeshBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          });
        }
        return new THREE.MeshPhysicalMaterial({
          color: hex,
          metalness: 0.15,
          roughness: 0.2,
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
          transmission: 0.05,
          transparent: true,
          opacity: 0.92,
        });
      });

      // 7. Ambient background spawner: occasional gentle floating hearts
      let ambientTimer: NodeJS.Timeout | null = null;
      if (detectedTier.tier !== 'LOW') {
        ambientTimer = setInterval(() => {
          if (particlesRef.current.length < 12) {
            const randX = (Math.random() - 0.5) * 8;
            spawnHeart(randX, -5.5, (Math.random() - 0.5) * 3, 0.65);
          }
        }, 1200);
      }

      // 8. Animation Loop
      let lastTime = performance.now();
      const animate = (currentTime: number) => {
        animFrameRef.current = requestAnimationFrame(animate);
        const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += 1;

          // Physics update: upward drift with slight harmonic wobble
          p.mesh.position.x += p.vx + Math.sin(p.life * 0.06) * 0.008;
          p.mesh.position.y += p.vy;
          p.mesh.position.z += p.vz;

          p.mesh.rotation.x += p.rx;
          p.mesh.rotation.y += p.ry;
          p.mesh.rotation.z += p.rz;

          const progress = p.life / p.maxLife;

          // Scale & Opacity curve: pop open, float, fade out
          if (progress < 0.18) {
            const pop = progress / 0.18;
            p.mesh.scale.setScalar(p.baseScale * (1 + 0.3 * Math.sin(pop * Math.PI)));
          } else if (progress > 0.7) {
            const fade = (1 - progress) / 0.3;
            p.mesh.scale.setScalar(p.baseScale * Math.max(0.01, fade));
          }

          // Kill dead particles
          if (p.life >= p.maxLife || p.mesh.position.y > 6.5) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
          }
        }

        renderer.render(scene, camera);
      };

      animFrameRef.current = requestAnimationFrame(animate);

      // 9. Resize Observer
      const resizeObserver = new ResizeObserver(() => {
        if (!container || !renderer || !camera) return;
        const newW = container.clientWidth || 300;
        const newH = container.clientHeight || 300;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      });
      resizeObserver.observe(container);

      // Cleanup
      return () => {
        if (ambientTimer) clearInterval(ambientTimer);
        resizeObserver.disconnect();
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
        particlesRef.current.forEach((p) => scene.remove(p.mesh));
        particlesRef.current = [];

        if (sharedGeomRef.current) {
          sharedGeomRef.current.dispose();
          sharedGeomRef.current = null;
        }
        materialsRef.current.forEach((m) => m.dispose());
        materialsRef.current = [];

        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, [spawnHeart]);

    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-10 ${className}`}
      />
    );
  }
);

Confession3DHearts.displayName = 'Confession3DHearts';
