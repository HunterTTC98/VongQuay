import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WheelSlot } from '../../types/index.ts';
import { soundManager } from '../../utils/audio.ts';
import confetti from 'canvas-confetti';
import { detectDeviceGraphicTier, DeviceGraphicTier } from './deviceTier.ts';
import { LuckyWheel } from '../LuckyWheel.tsx';
import { Sparkles, Layers, Volume2, VolumeX, Eye, Zap, AlertCircle } from 'lucide-react';

interface LuckyWheel3DProps {
  slots: WheelSlot[];
  isSpinning: boolean;
  onSpinEnd: () => void;
  onSpinCenter?: () => void;
  targetSlotIndex: number | null;
  spinOutcome: {
    slotName: string;
    amount: number;
    isWin: boolean;
    isTrial?: boolean;
    claimCode?: string;
  } | null;
  disabled?: boolean;
  disabledReason?: string;
}

const SLICE_THEMES = [
  { bg: '#3730a3', icon: '🎫', l1: '10.000đ', l2: 'Ví MoMo' },
  { bg: '#831843', icon: '🌸', l1: 'Bình An', l2: 'Sức Khỏe' },
  { bg: '#c2410c', icon: '🎫', l1: '20.000đ', l2: 'Ví MoMo' },
  { bg: '#581c87', icon: '⭐', l1: 'Tự Tin', l2: 'Tỏa Sáng' },
  { bg: '#991b1b', icon: '🎫', l1: '50.000đ', l2: 'Ví MoMo' },
  { bg: '#b45309', icon: '❤', l1: 'Hạnh Phúc', l2: 'Ngập Tràn' },
  { bg: '#a21caf', icon: '👑', l1: '100.000đ', l2: 'Giải Đặc Biệt' },
  { bg: '#9f1239', icon: '🌹', l1: 'Tri Ân 20/10', l2: 'Lời Chúc Vàng' },
];

/**
 * Creates a high-res procedural dial texture with crisp Vietnamese typography and icons
 */
function createProceduralWheelTexture(slots: WheelSlot[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const center = 512;
  const radius = 500;
  const numSlices = slots.length || 8;
  const anglePerSlice = (Math.PI * 2) / numSlices;

  ctx.clearRect(0, 0, 1024, 1024);

  // Draw 8 Pie Slices
  for (let i = 0; i < numSlices; i++) {
    const slot = slots[i] || {};
    const theme = SLICE_THEMES[i % SLICE_THEMES.length];
    const startAngle = i * anglePerSlice - Math.PI / 2;
    const endAngle = startAngle + anglePerSlice;

    // 1. Slice Background
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = theme.bg;
    ctx.fill();

    // Subtle inner gradient overlay for depth
    const grad = ctx.createRadialGradient(center, center, 80, center, center, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Slice Boundary Divider (Golden wire)
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. Slice Typography & Icons
    ctx.save();
    ctx.translate(center, center);
    const midAngle = startAngle + anglePerSlice / 2;
    ctx.rotate(midAngle + Math.PI / 2);

    // Determine label text
    let line1 = theme.l1;
    let line2 = theme.l2;
    let icon = theme.icon;

    if (slot.isCash && slot.amount > 0) {
      line1 = `${slot.amount.toLocaleString('vi-VN')}đ`;
      line2 = slot.amount >= 100000 ? 'Giải Đặc Biệt' : 'Ví MoMo';
      icon = slot.amount >= 100000 ? '👑' : '🎫';
    } else if (slot.name) {
      const parts = slot.name.split(' ');
      if (parts.length >= 2) {
        line1 = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
        line2 = parts.slice(Math.ceil(parts.length / 2)).join(' ');
      } else {
        line1 = slot.name;
        line2 = 'Lời Chúc';
      }
    }

    // Icon at outer rim
    ctx.font = '46px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(icon, 0, -380);

    // Primary Text (Amount or wish)
    ctx.font = 'bold 36px "Montserrat", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText(line1, 0, -320);

    // Secondary Text (Subtitle or subtext)
    ctx.font = 'bold 24px "Montserrat", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.shadowBlur = 6;
    ctx.fillText(line2, 0, -275);

    ctx.restore();
  }

  // Outer Golden Rim Ring on texture
  ctx.beginPath();
  ctx.arc(center, center, radius - 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 8;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const LuckyWheel3D: React.FC<LuckyWheel3DProps> = ({
  slots,
  isSpinning,
  onSpinEnd,
  onSpinCenter,
  targetSlotIndex,
  spinOutcome,
  disabled = false,
  disabledReason,
}) => {
  // Device & Tier detection
  const deviceTier = useMemo<DeviceGraphicTier>(() => detectDeviceGraphicTier(), []);
  const [renderMode, setRenderMode] = useState<'3D' | '2D'>(() => {
    try {
      const saved = localStorage.getItem('bk_wheel_mode');
      if (saved === '2D' || saved === '3D') return saved;
      return deviceTier.recommendedMode;
    } catch {
      return deviceTier.recommendedMode;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const wheelMeshRef = useRef<THREE.Group | null>(null);
  const pointerMeshRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Rotation physics refs
  const currentRotationRef = useRef<number>(0);
  const isSpinningRef = useRef<boolean>(false);
  const targetRotationRef = useRef<number>(0);

  // Mouse / Pointer parallax tilt
  const targetTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const toggleRenderMode = () => {
    const next = renderMode === '3D' ? '2D' : '3D';
    setRenderMode(next);
    localStorage.setItem('bk_wheel_mode', next);
  };

  // 3D Scene Initialization
  useEffect(() => {
    if (!containerRef.current || renderMode !== '3D') return;

    const container = containerRef.current;
    const initialWidth = Math.max(container.clientWidth || 360, 320);
    const initialHeight = Math.max(container.clientHeight || 360, 320);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Perspective with responsive depth calculation
    const initialAspect = initialWidth / initialHeight;
    const camera = new THREE.PerspectiveCamera(40, initialAspect, 0.1, 100);

    // Dynamic depth calculation ensures pointer (y=1.95) and full wheel rim (r=1.76) fit with safe margin
    const calculateCameraZ = (aspect: number) => {
      const halfAngle = Math.min(
        Math.tan((40 * Math.PI) / 360),
        Math.tan((40 * Math.PI) / 360) * aspect
      );
      // 2.05 accommodates pointer at y=1.95 plus comfort border
      return Math.max(2.05 / halfAngle, 5.2);
    };

    camera.position.set(0, 0.05, calculateCameraZ(initialAspect));
    camera.lookAt(0, 0.05, 0);

    // 3. Renderer with hardware/software detection
    const isSoftware = deviceTier.isSoftwareGl;
    const renderer = new THREE.WebGLRenderer({
      antialias: deviceTier.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(deviceTier.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    if (deviceTier.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // 4. Studio Environment Lighting (PMREMGenerator + RoomEnvironment)
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Safe fallback if room environment unsupported
    }

    // 5. Studio 3-Point Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(2.5, 3.5, 4);
    if (deviceTier.shadows) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xffedd5, 0x1e0520, 1.2);
    scene.add(fillLight);

    const goldRimLight = new THREE.PointLight(0xfbbf24, 2.5, 10);
    goldRimLight.position.set(-2.5, -2, 2.5);
    scene.add(goldRimLight);

    // 6. Assemble 3D Wheel Group (Composite Procedural Model)
    const wheelGroup = new THREE.Group();
    wheelMeshRef.current = wheelGroup;
    scene.add(wheelGroup);

    // A. Main Wheel Dial (Cylinder with procedural face texture)
    const wheelRadius = 1.55;
    const wheelDepth = 0.16;
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelDepth, 64);
    wheelGeom.rotateX(Math.PI / 2); // face camera

    const wheelTex = createProceduralWheelTexture(slots);
    wheelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const faceMaterial = new THREE.MeshStandardMaterial({
      map: wheelTex,
      roughness: 0.22,
      metalness: 0.25,
    });

    const goldEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.15,
      metalness: 0.92,
    });

    // Material array: 0 = side edge, 1 = front top face, 2 = back face
    const wheelMesh = new THREE.Mesh(wheelGeom, [goldEdgeMaterial, faceMaterial, goldEdgeMaterial]);
    if (deviceTier.shadows) wheelMesh.castShadow = true;
    wheelGroup.add(wheelMesh);

    // B. Outer Golden Bevel Rim (Torus)
    const rimGeom = new THREE.TorusGeometry(wheelRadius + 0.05, 0.09, 20, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.12,
      metalness: 0.95,
    });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    rimMesh.position.z = 0.08;
    wheelGroup.add(rimMesh);

    // C. 24 Golden Stud Rivets around Rim
    const studGeom = new THREE.SphereGeometry(0.035, 12, 12);
    const studMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.08,
      metalness: 0.98,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });

    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const stud = new THREE.Mesh(studGeom, studMat);
      stud.position.set(
        Math.cos(angle) * (wheelRadius + 0.03),
        Math.sin(angle) * (wheelRadius + 0.03),
        0.13
      );
      wheelGroup.add(stud);
    }

    // D. Center Metallic Hub & Badge
    const hubGeom = new THREE.CylinderGeometry(0.38, 0.42, 0.14, 32);
    hubGeom.rotateX(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.2,
      metalness: 0.85,
    });
    const hubMesh = new THREE.Mesh(hubGeom, hubMat);
    hubMesh.position.z = 0.12;
    wheelGroup.add(hubMesh);

    const hubRingGeom = new THREE.TorusGeometry(0.4, 0.035, 16, 32);
    const hubRingMesh = new THREE.Mesh(hubRingGeom, rimMat);
    hubRingMesh.position.z = 0.18;
    wheelGroup.add(hubRingMesh);

    // E. Static Pointer at 12 o'clock (Positioned in scene, NOT rotating with wheel)
    const pointerGroup = new THREE.Group();
    pointerMeshRef.current = pointerGroup;
    pointerGroup.position.set(0, wheelRadius + 0.05, 0.22);
    scene.add(pointerGroup);

    // Golden casing box
    const pointerBodyGeom = new THREE.BoxGeometry(0.24, 0.32, 0.08);
    const pointerMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.15,
      metalness: 0.9,
    });
    const pointerBody = new THREE.Mesh(pointerBodyGeom, pointerMat);
    pointerGroup.add(pointerBody);

    // Bullseye ruby target
    const targetGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 20);
    targetGeom.rotateX(Math.PI / 2);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.1,
      metalness: 0.4,
      emissive: 0x991b1b,
      emissiveIntensity: 0.5,
    });
    const targetMesh = new THREE.Mesh(targetGeom, targetMat);
    targetMesh.position.z = 0.045;
    pointerGroup.add(targetMesh);

    // Downward pointer tip (Cone)
    const tipGeom = new THREE.ConeGeometry(0.12, 0.2, 16);
    tipGeom.rotateZ(Math.PI); // point down
    const tipMesh = new THREE.Mesh(tipGeom, pointerMat);
    tipMesh.position.set(0, -0.22, 0);
    pointerGroup.add(tipMesh);

    // Contact Soft Shadow beneath wheel
    const shadowGeom = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    sGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.position.z = -0.15;
    scene.add(shadowMesh);

    // Pointer move listener for parallax tilt
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetTiltRef.current = {
        x: THREE.MathUtils.clamp(y * 0.18, -0.2, 0.2),
        y: THREE.MathUtils.clamp(x * 0.18, -0.2, 0.2),
      };
    };

    container.addEventListener('mousemove', handlePointerMove);

    // Render & Animation Loop
    let lastTime = performance.now();
    const renderLoop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth parallax tilt
      currentTiltRef.current.x = THREE.MathUtils.damp(
        currentTiltRef.current.x,
        targetTiltRef.current.x,
        6,
        delta
      );
      currentTiltRef.current.y = THREE.MathUtils.damp(
        currentTiltRef.current.y,
        targetTiltRef.current.y,
        6,
        delta
      );

      if (wheelGroup) {
        wheelGroup.rotation.x = currentTiltRef.current.x;
        wheelGroup.rotation.y = currentTiltRef.current.y;
        wheelGroup.rotation.z = currentRotationRef.current;
      }

      // Pointer spring wiggle when wheel is spinning
      if (pointerGroup) {
        if (isSpinningRef.current) {
          const wiggle = Math.sin(time * 0.04) * 0.12;
          pointerGroup.rotation.z = wiggle;
        } else {
          pointerGroup.rotation.z = THREE.MathUtils.damp(pointerGroup.rotation.z, 0, 8, delta);
        }
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    // Responsive Resize Handler with ResizeObserver
    const updateSize = () => {
      if (!container || !rendererRef.current) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(rect.width || container.clientWidth || 320, 320);
      const h = Math.max(rect.height || container.clientHeight || 320, 320);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.position.z = calculateCameraZ(aspect);
      camera.position.y = 0.05;
      camera.lookAt(0, 0.05, 0);
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      rendererRef.current.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      container.removeEventListener('mousemove', handlePointerMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.replaceChildren();

      // Clean disposal
      scene.clear();
      wheelGeom.dispose();
      rimGeom.dispose();
      studGeom.dispose();
      hubGeom.dispose();
      hubRingGeom.dispose();
      pointerBodyGeom.dispose();
      targetGeom.dispose();
      tipGeom.dispose();
      shadowGeom.dispose();
      faceMaterial.dispose();
      goldEdgeMaterial.dispose();
      rimMat.dispose();
      studMat.dispose();
      hubMat.dispose();
      pointerMat.dispose();
      targetMat.dispose();
      shadowMat.dispose();
      wheelTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, [renderMode, slots]);

  // Handle Spin Trigger
  useEffect(() => {
    if (!isSpinning || targetSlotIndex === null) {
      isSpinningRef.current = false;
      return;
    }

    isSpinningRef.current = true;
    const numSlices = slots.length || 8;
    const sliceAngleRad = (Math.PI * 2) / numSlices;

    // Slices are laid out clockwise. Pointer is at 12 o'clock.
    // In Three.js, positive rotation around Z is counter-clockwise.
    // To land targetSlotIndex under the 12 o'clock pointer:
    const slotCenter = targetSlotIndex * sliceAngleRad + sliceAngleRad / 2;
    const targetOffset = (Math.PI * 2 - slotCenter) % (Math.PI * 2);

    const minExtraRotations = 6;
    const currentRot = currentRotationRef.current;
    const baseRot = Math.ceil(currentRot / (Math.PI * 2)) * (Math.PI * 2);
    const finalRot = baseRot + minExtraRotations * (Math.PI * 2) + targetOffset;

    targetRotationRef.current = finalRot;

    const startTime = performance.now();
    const duration = 4800; // 4.8s suspense
    const startRot = currentRot;
    let lastTickAngle = startRot;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Custom exponential ease-out curve
      const easeOut = 1 - Math.pow(1 - progress, 3.8);
      const currentAngle = startRot + (finalRot - startRot) * easeOut;

      currentRotationRef.current = currentAngle;

      // Trigger audio tick sound
      if (Math.abs(currentAngle - lastTickAngle) >= sliceAngleRad * 0.75) {
        if (soundEnabled) soundManager.playTick();
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        currentRotationRef.current = finalRot;
        isSpinningRef.current = false;
        if (soundEnabled) soundManager.playSpinStop();

        // Celebration on win
        if (spinOutcome?.isWin && spinOutcome.amount > 0) {
          if (soundEnabled) soundManager.playWin();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#fde047'],
          });
        }

        onSpinEnd();
      }
    };

    requestAnimationFrame(animateSpin);
  }, [isSpinning, targetSlotIndex, slots.length, soundEnabled]);

  // If 2D mode is active, render 2D wheel after all hooks have executed unconditionally
  if (renderMode === '2D') {
    return (
      <div className="relative flex flex-col items-center w-full max-w-full">
        <LuckyWheel
          slots={slots}
          isSpinning={isSpinning}
          onSpinEnd={onSpinEnd}
          onSpinCenter={onSpinCenter}
          targetSlotIndex={targetSlotIndex}
          spinOutcome={spinOutcome}
          disabled={disabled}
          disabledReason={disabledReason}
        />

        {/* Floating Mode Switcher Dock */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={toggleRenderMode}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-md bg-white/10 hover:bg-white/20 text-rose-200 border border-white/15 backdrop-blur-md active:scale-95 cursor-pointer"
            title="Bật giao diện Vòng Quay 3D không gian Three.js"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Chuyển sang Vòng Quay 3D</span>
          </button>
          <span className="text-[11px] text-zinc-400 font-mono">Chế độ: 2D Tiết kiệm</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-full">
      {/* 3D Wheel Viewport Container */}
      <div className="relative w-[min(360px,calc(100vw-2rem))] aspect-square sm:w-[420px] md:w-[450px] flex items-center justify-center">
        {/* Ambient Glow */}
        <div
          className={`absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.35),rgba(225,29,72,0.18)_50%,transparent_75%)] blur-2xl pointer-events-none transition-opacity duration-500 ${
            isSpinning ? 'opacity-100 animate-pulse' : 'opacity-70'
          }`}
          aria-hidden="true"
        />

        {/* Dedicated WebGL Canvas Mounting Box */}
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing rounded-full relative z-10"
          title="Vòng Quay 3D - Di chuyển chuột để đổi góc nhìn không gian"
        />

        {/* Center Spin CTA Button (Overlaid on top of 3D Hub) */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <button
            type="button"
            onClick={onSpinCenter}
            disabled={disabled || isSpinning}
            className={`pointer-events-auto w-18 h-18 sm:w-20 sm:h-20 rounded-full font-black text-xs uppercase tracking-tight flex flex-col items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.6)] border-3 border-amber-300 transition-all ${
              disabled || isSpinning
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-80'
                : 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-red-950 active:scale-95 shadow-glow-gold cursor-pointer'
            }`}
            title={disabled ? (disabledReason || 'Vòng quay đang khóa') : 'Bấm để quay'}
          >
            <span className="font-['Montserrat',sans-serif] text-xs sm:text-sm font-black drop-shadow">
              {isSpinning ? 'ĐANG QUAY' : 'QUAY'}
            </span>
            <span className="text-[9px] text-red-900 font-bold opacity-80 leading-none">
              BÁCH KHOA
            </span>
          </button>
        </div>
      </div>

      {/* Unified Bottom Control Dock (Zero Occlusion) */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg text-xs font-semibold">
        {/* 3D / 2D Toggle */}
        <button
          type="button"
          onClick={toggleRenderMode}
          className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:bg-amber-400/30 transition flex items-center gap-1 active:scale-95 cursor-pointer"
          title="Chuyển sang chế độ 2D tiết kiệm pin"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Đang bật 3D · Đổi sang 2D</span>
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 rounded-full transition border active:scale-95 cursor-pointer ${
            soundEnabled
              ? 'bg-white/15 text-rose-200 border-white/20 hover:bg-white/25'
              : 'bg-black/30 text-zinc-500 border-white/5'
          }`}
          title={soundEnabled ? 'Tắt âm thanh vòng quay' : 'Bật âm thanh vòng quay'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Graphic Tier Badge */}
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono pl-1 border-l border-white/10">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>GPU: {deviceTier.tier}</span>
        </span>
      </div>

      {/* Disabled Reason Banner */}
      {disabled && disabledReason && (
        <div className="mt-3 max-w-sm px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs text-center font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}
    </div>
  );
};
