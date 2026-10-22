import React, { useState, useEffect, useRef } from 'react';
import { WheelSlot } from '../types/index.ts';
import { soundManager } from '../utils/audio.ts';
import confetti from 'canvas-confetti';
import { Trophy, Gift, AlertCircle, LoaderCircle, Play } from 'lucide-react';

interface LuckyWheelProps {
  slots: WheelSlot[];
  isSpinning: boolean;
  onSpinEnd: () => void;
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

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  slots,
  isSpinning,
  onSpinEnd,
  targetSlotIndex,
  spinOutcome,
  disabled = false,
  disabledReason,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const currentRotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Trigger spin animation when targetSlotIndex is provided and isSpinning becomes true
  useEffect(() => {
    if (!isSpinning || targetSlotIndex === null) return;

    // Calculate target rotation:
    // Slices are 45 deg each, centered at (index * 45 + 22.5) from top (12 o'clock).
    // Target rotation aligns top pointer with center of targetSlotIndex.
    const sliceAngle = 360 / slots.length;
    const slotCenter = targetSlotIndex * sliceAngle + sliceAngle / 2;
    const targetOffset = (360 - slotCenter) % 360;

    // We add at least 5-6 full rotations for suspense
    const minExtraSpins = 5;
    const currentRot = currentRotationRef.current;
    const currentBase = Math.ceil(currentRot / 360) * 360;
    const finalRot = currentBase + minExtraSpins * 360 + targetOffset;

    const startTime = performance.now();
    const duration = 4600; // 4.6 seconds
    const startRot = currentRot;
    let lastTickAngle = startRot;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Custom cubic ease-out curve for wheel deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3.8);
      const currentAngle = startRot + (finalRot - startRot) * easeOut;

      currentRotationRef.current = currentAngle;
      setRotation(currentAngle);

      // Play soft tick every slice angle passed
      if (Math.abs(currentAngle - lastTickAngle) >= 30) {
        soundManager.playTick();
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished
        currentRotationRef.current = finalRot;
        setRotation(finalRot);
        soundManager.playSpinStop();

        // Sound & celebratory confetti if cash won
        if (spinOutcome?.isWin && spinOutcome.amount > 0) {
          soundManager.playWin();
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899'],
          });
        }

        onSpinEnd();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, targetSlotIndex]);

  // Colors & icons for 8 slices
  const sliceColors = [
    { bg: '#d97706', text: '#ffffff', label: '10.000đ', icon: 'cash' }, // 0
    { bg: '#2563eb', text: '#ffffff', label: 'Chúc may mắn', icon: 'wish' }, // 1
    { bg: '#059669', text: '#ffffff', label: '50.000đ', icon: 'cash' }, // 2
    { bg: '#7c3aed', text: '#ffffff', label: 'Năng lượng +', icon: 'wish' }, // 3
    { bg: '#db2777', text: '#ffffff', label: '20.000đ', icon: 'cash' }, // 4
    { bg: '#0891b2', text: '#ffffff', label: 'Nụ cười tươi', icon: 'wish' }, // 5
    { bg: '#dc2626', text: '#ffffff', label: '100.000đ', icon: 'star' }, // 6 (Đặc biệt)
    { bg: '#65a30d', text: '#ffffff', label: 'Học kỳ tốt', icon: 'wish' }, // 7
  ];

  const size = 380;
  const radius = size / 2;
  const center = radius;
  const numSlices = slots.length || 8;
  const anglePerSlice = 360 / numSlices;

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      {/* Outer Glow & Decorative Lights */}
      <div className="relative w-[min(340px,calc(100vw-3.5rem))] aspect-square sm:w-[420px] flex items-center justify-center">
        <div className={`absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.32),rgba(220,38,38,0.12)_55%,transparent_72%)] blur-md transition-opacity duration-500 ${isSpinning ? 'opacity-100 animate-pulse' : 'opacity-70'}`} aria-hidden="true" />
        {/* Pointer at top (pointing down) */}
        <div className="absolute -top-3 z-30 flex flex-col items-center drop-shadow-xl filter">
          <div className="w-8 h-10 sm:w-10 sm:h-12 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 clip-pointer rounded-t-sm border-2 border-white flex items-center justify-center shadow-lg">
            <div className="w-2.5 h-2.5 bg-red-700 rounded-full mb-2"></div>
          </div>
        </div>

        {/* Outer Wheel Golden Rim */}
        <div className="relative w-full h-full rounded-full p-2.5 sm:p-3 bg-gradient-to-tr from-amber-700 via-yellow-300 to-amber-500 shadow-[0_18px_55px_rgba(120,53,15,0.42)] border-4 border-amber-200 flex items-center justify-center">
          {/* Inner dark rim */}
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_25%,#7f1d1d,#450a0a_72%)] p-2 sm:p-2.5 shadow-[inset_0_0_18px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden">
            {/* Studded lights on rim */}
            {Array.from({ length: 16 }).map((_, i) => {
              const deg = (i * 360) / 16;
              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-200 shadow-[0_0_8px_#fde047] border border-amber-400 z-10"
                  style={{
                    transform: `rotate(${deg}deg) translate(0, -${radius - 12}px)`,
                  }}
                />
              );
            })}

            {/* Rotating Wheel Surface */}
            <svg
              className="w-full h-full rounded-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.38)]"
              viewBox={`0 0 ${size} ${size}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: '50% 50%',
              }}
            >
              <defs>
                <filter id="inner-shadow">
                  <feOffset dx="0" dy="2" />
                  <feGaussianBlur stdDeviation="2" result="offset-blur" />
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                  <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                  <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                </filter>
              </defs>

              <g transform={`translate(${center}, ${center})`}>
                {slots.map((slot, index) => {
                  const startAngle = (index * anglePerSlice - 90) * (Math.PI / 180);
                  const endAngle = ((index + 1) * anglePerSlice - 90) * (Math.PI / 180);
                  const x1 = (radius - 16) * Math.cos(startAngle);
                  const y1 = (radius - 16) * Math.sin(startAngle);
                  const x2 = (radius - 16) * Math.cos(endAngle);
                  const y2 = (radius - 16) * Math.sin(endAngle);

                  const pathData = numSlices === 1
                    ? `M 0 0 L 0 ${-(radius - 16)} A ${radius - 16} ${radius - 16} 0 1 1 0 ${radius - 16} A ${radius - 16} ${radius - 16} 0 1 1 0 ${-(radius - 16)} Z`
                    : `M 0 0 L ${x1} ${y1} A ${radius - 16} ${radius - 16} 0 0 1 ${x2} ${y2} Z`;
                  const colorConfig = sliceColors[index % sliceColors.length];
                  const midAngle = (index * anglePerSlice + anglePerSlice / 2);

                  return (
                    <g key={slot.index}>
                      {/* Segment wedge */}
                      <path
                        d={pathData}
                        fill={colorConfig.bg}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                      />

                      {/* Text & label rotated along slice radius, flipped if on bottom half so it is always upright */}
                      {(() => {
                        const isBottomHalf = midAngle > 90 && midAngle < 270;
                        return (
                          <g
                            transform={`rotate(${midAngle}) translate(0, -${radius * 0.62}) ${
                              isBottomHalf ? 'rotate(180)' : ''
                            }`}
                          >
                            <text
                              textAnchor="middle"
                              fill="#ffffff"
                              className="font-black text-[12px] sm:text-[13px] select-none"
                              style={{
                                paintOrder: 'stroke',
                                stroke: '#0f172a',
                                strokeWidth: '2.5px',
                              }}
                            >
                              {slot.name}
                            </text>
                            {slot.isCash ? (
                              <text
                                y="13"
                                textAnchor="middle"
                                fill="#fef08a"
                                className="text-[10px] sm:text-[10px] font-extrabold uppercase select-none"
                                style={{
                                  paintOrder: 'stroke',
                                  stroke: '#000000',
                                  strokeWidth: '1.5px',
                                }}
                              >
                                Tiền Mặt
                              </text>
                            ) : (
                              <text
                                y="13"
                                textAnchor="middle"
                                fill="#e2e8f0"
                                className="text-[9px] sm:text-[10px] font-medium select-none"
                                style={{
                                  paintOrder: 'stroke',
                                  stroke: '#000000',
                                  strokeWidth: '1px',
                                }}
                              >
                                Lời Chúc
                              </text>
                            )}
                          </g>
                        );
                      })()}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Center Golden Pin */}
            <div className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 p-1.5 shadow-2xl flex items-center justify-center border-2 border-white ring-2 ring-amber-500/80">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-red-700 to-red-900 flex flex-col items-center justify-center text-white shadow-inner">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-200">
                  MAY MẮN
                </span>
              </div>
            </div>
          </div>
        </div>

        {isSpinning && targetSlotIndex === null && (
          <div className="absolute inset-2 z-40 flex flex-col items-center justify-center gap-3 rounded-full bg-slate-950/75 text-center text-white backdrop-blur-[2px]" role="status" aria-live="polite">
            <LoaderCircle className="h-10 w-10 animate-spin text-amber-300" aria-hidden="true" />
            <span className="max-w-[190px] px-3 text-sm font-bold">Đang xác nhận lượt quay an toàn…</span>
          </div>
        )}
      </div>

      {/* Disabled / Paused Alert if any */}
      {disabled && disabledReason && (
        <div className="mt-4 px-4 py-2 bg-amber-50 text-amber-800 text-xs sm:text-sm rounded-lg border border-amber-200 flex items-center gap-2 max-w-sm text-center">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}
    </div>
  );
};
