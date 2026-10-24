import React, { useEffect, useRef } from 'react';

interface FallingPetalsProps {
  enabled: boolean;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  swaySpeed: number;
  swayAngle: number;
  swayRange: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  opacity: number;
  petalType: number;
}

const PETAL_COLORS = [
  '#fb7185', // rose-400
  '#f472b6', // pink-400
  '#fbcfe8', // pink-200
  '#fda4af', // rose-300
  '#fef08a', // yellow-200
  '#fbbf24', // amber-400
  '#e11d48', // rose-600
];

export const FallingPetals: React.FC<FallingPetalsProps> = ({ enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Generate 22 lightweight flower petals
    const count = Math.min(26, Math.max(12, Math.floor(width / 50)));
    const petals: Petal[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 9 + Math.random() * 11,
      speedY: 0.9 + Math.random() * 1.4,
      speedX: -0.4 + Math.random() * 0.8,
      swaySpeed: 0.015 + Math.random() * 0.03,
      swayAngle: Math.random() * Math.PI * 2,
      swayRange: 18 + Math.random() * 26,
      rotation: Math.random() * 360,
      rotSpeed: -1.2 + Math.random() * 2.4,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      opacity: 0.55 + Math.random() * 0.35,
      petalType: Math.floor(Math.random() * 2),
    }));

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x + Math.sin(p.swayAngle) * p.swayRange, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      if (p.petalType === 0) {
        // Classic curved cherry / peach petal shape
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.8, 0, p.size);
        ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.8, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
      } else {
        // Rounded soft teardrop petal
        ctx.ellipse(0, 0, p.size * 0.55, p.size, Math.PI / 6, 0, Math.PI * 2);
      }
      ctx.fill();

      // Subtle vein / highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.7);
      ctx.lineTo(0, p.size * 0.6);
      ctx.stroke();

      ctx.restore();
    };

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const dt = Math.min(32, currentTime - lastTime);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.speedY * (dt / 16);
        p.x += p.speedX * (dt / 16);
        p.swayAngle += p.swaySpeed * (dt / 16);
        p.rotation += p.rotSpeed * (dt / 16);

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x < -30) p.x = width + 20;
        else if (p.x > width + 30) p.x = -20;

        drawPetal(p);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30 w-full h-full"
      aria-hidden="true"
    />
  );
};
