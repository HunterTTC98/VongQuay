import React, { useState, useEffect, useRef } from 'react';
import { WheelSlot } from '../types/index.ts';
import { soundManager } from '../utils/audio.ts';
import confetti from 'canvas-confetti';
import { RotateCw, LoaderCircle, AlertCircle } from 'lucide-react';

interface LuckyWheelProps {
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

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  slots,
  isSpinning,
  onSpinEnd,
  onSpinCenter,
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

    // Slices are 45 deg each, centered at (index * 45 + 22.5) clockwise from 12 o'clock.
    const sliceAngle = 360 / (slots.length || 8);
    const slotCenter = targetSlotIndex * sliceAngle + sliceAngle / 2;
    const targetOffset = (360 - slotCenter) % 360;

    // 6 full rotations for suspense
    const minExtraSpins = 6;
    const currentRot = currentRotationRef.current;
    const currentBase = Math.ceil(currentRot / 360) * 360;
    const finalRot = currentBase + minExtraSpins * 360 + targetOffset;

    const startTime = performance.now();
    const duration = 4800;
    const startRot = currentRot;
    let lastTickAngle = startRot;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Custom cubic ease-out curve
      const easeOut = 1 - Math.pow(1 - progress, 3.8);
      const currentAngle = startRot + (finalRot - startRot) * easeOut;

      currentRotationRef.current = currentAngle;
      setRotation(currentAngle);

      if (Math.abs(currentAngle - lastTickAngle) >= 30) {
        soundManager.playTick();
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentRotationRef.current = finalRot;
        setRotation(finalRot);
        soundManager.playSpinStop();

        if (spinOutcome?.isWin && spinOutcome.amount > 0) {
          soundManager.playWin();
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

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, targetSlotIndex, slots.length]);

  // Exact Jewel-Tone Palette matching the reference design image:
  // 0: Deep Indigo/Violet (10.000đ)
  // 1: Deep Maroon/Wine (Bình An)
  // 2: Warm Amber/Orange (20.000đ)
  // 3: Deep Purple (Tự Tin)
  // 4: Ruby Red (50.000đ)
  // 5: Rich Gold/Amber (Hạnh Phúc)
  // 6: Deep Magenta/Fuchsia (100.000đ)
  // 7: Crimson Red (Tri Ân)
  const sliceThemes = [
    { bg: '#3730a3', icon: '🎫', defaultL1: '10.000đ', defaultL2: 'Ví MoMo' },
    { bg: '#831843', icon: '🌸', defaultL1: 'Bình An', defaultL2: 'Sức Khỏe' },
    { bg: '#c2410c', icon: '🎫', defaultL1: '20.000đ', defaultL2: 'Ví MoMo' },
    { bg: '#581c87', icon: '⭐', defaultL1: 'Tự Tin', defaultL2: 'Tỏa Sáng' },
    { bg: '#991b1b', icon: '🎫', defaultL1: '50.000đ', defaultL2: 'Ví MoMo' },
    { bg: '#b45309', icon: '❤', defaultL1: 'Hạnh Phúc', defaultL2: 'Ngập Tràn' },
    { bg: '#a21caf', icon: '👑', defaultL1: '100.000đ', defaultL2: 'Giải Đặc Biệt' },
    { bg: '#9f1239', icon: '🌹', defaultL1: 'Tri Ân 20/10', defaultL2: 'Lời Chúc Vàng' },
  ];

  const size = 390;
  const radius = size / 2;
  const center = radius;
  const numSlices = slots.length || 8;
  const anglePerSlice = 360 / numSlices;

  // Format content for slice
  const getSliceDetails = (slot: WheelSlot, index: number) => {
    const theme = sliceThemes[index % sliceThemes.length];

    if (slot.isCash && slot.amount > 0) {
      const fullAmount = `${slot.amount.toLocaleString('vi-VN')}đ`;
      const isJackpot = slot.amount >= 100000;
      return {
        icon: isJackpot ? '👑' : '🎫',
        line1: fullAmount,
        line2: isJackpot ? 'Giải Đặc Biệt' : 'Ví MoMo',
        isCash: true,
        bg: theme.bg,
      };
    }

    const name = slot.name || theme.defaultL1;
    // Map wish texts to concise paired lines
    if (name.includes('Bình An') || name.includes('Sức Khỏe')) {
      return { icon: '🌸', line1: 'Bình An', line2: 'Sức Khỏe', isCash: false, bg: theme.bg };
    }
    if (name.includes('Tự Tin') || name.includes('Tỏa Sáng')) {
      return { icon: '⭐', line1: 'Tự Tin', line2: 'Tỏa Sáng', isCash: false, bg: theme.bg };
    }
    if (name.includes('Hạnh Phúc') || name.includes('Ngập Tràn')) {
      return { icon: '❤', line1: 'Hạnh Phúc', line2: 'Ngập Tràn', isCash: false, bg: theme.bg };
    }
    if (name.includes('Tri Ân') || name.includes('Lời Chúc Vàng')) {
      return { icon: '🌹', line1: 'Tri Ân 20/10', line2: 'Lời Chúc Vàng', isCash: false, bg: theme.bg };
    }
    if (name.includes('lần sau') || name.includes('Chúc may mắn')) {
      return { icon: '🍀', line1: 'Chúc May Mắn', line2: 'Lần Sau Nhé', isCash: false, bg: theme.bg };
    }
    if (name.includes('năng lượng')) {
      return { icon: '⚡', line1: 'Năng Lượng', line2: 'Học Tập +', isCash: false, bg: theme.bg };
    }
    if (name.includes('nụ cười')) {
      return { icon: '😊', line1: 'Nụ Cười', line2: 'Rạng Rỡ', isCash: false, bg: theme.bg };
    }
    if (name.includes('học kỳ')) {
      return { icon: '🎓', line1: 'Học Kỳ', line2: 'Rực Rỡ', isCash: false, bg: theme.bg };
    }

    const words = name.split(' ');
    if (words.length >= 2) {
      const mid = Math.ceil(words.length / 2);
      return {
        icon: theme.icon,
        line1: words.slice(0, mid).join(' '),
        line2: words.slice(mid).join(' '),
        isCash: false,
        bg: theme.bg,
      };
    }

    return {
      icon: theme.icon,
      line1: name,
      line2: theme.defaultL2,
      isCash: false,
      bg: theme.bg,
    };
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-full">
      {/* Outer Glow matching reference image */}
      <div className="relative w-[min(340px,calc(100vw-2.5rem))] aspect-square sm:w-[410px] md:w-[430px] flex items-center justify-center">
        <div
          className={`absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.38),rgba(219,39,119,0.18)_50%,transparent_75%)] blur-xl transition-opacity duration-500 ${
            isSpinning ? 'opacity-100 animate-pulse' : 'opacity-80'
          }`}
          aria-hidden="true"
        />

        {/* POINTER AT 12 O'CLOCK: Golden badge with white circle and red dot target, pointing down */}
        <div className="absolute -top-4 sm:-top-5 z-40 flex flex-col items-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
          <div className="w-9 h-12 sm:w-11 sm:h-14 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-t-lg rounded-b-sm border-2 border-amber-100 flex flex-col items-center justify-start pt-1.5 shadow-2xl relative">
            {/* Bullseye target circle */}
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white flex items-center justify-center shadow-inner border border-amber-300">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-600 shadow-sm" />
            </div>
            {/* Pointer downward tip */}
            <div className="absolute -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-amber-600" />
          </div>
        </div>

        {/* Outer Wheel Golden Rim with incandescent studs */}
        <div className="relative w-full h-full rounded-full p-3 sm:p-3.5 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border-4 border-amber-300 flex items-center justify-center">
          {/* Inner dark bezel with studded lights */}
          <div className="w-full h-full rounded-full bg-[#380e2b] p-2.5 shadow-[inset_0_0_18px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden">
            {/* Incandescent gold light studs */}
            {Array.from({ length: 24 }).map((_, i) => {
              const deg = (i * 360) / 24;
              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-200 shadow-[0_0_6px_#fde047] border border-amber-400 z-10"
                  style={{
                    transform: `rotate(${deg}deg) translate(0, -${radius - 12}px)`,
                  }}
                />
              );
            })}

            {/* Rotating SVG Surface */}
            <svg
              className="w-full h-full rounded-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              viewBox={`0 0 ${size} ${size}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: '50% 50%',
              }}
            >
              <g transform={`translate(${center}, ${center})`}>
                {slots.map((slot, index) => {
                  const startAngle = (index * anglePerSlice - 90) * (Math.PI / 180);
                  const endAngle = ((index + 1) * anglePerSlice - 90) * (Math.PI / 180);
                  const outerR = radius - 14;
                  const x1 = outerR * Math.cos(startAngle);
                  const y1 = outerR * Math.sin(startAngle);
                  const x2 = outerR * Math.cos(endAngle);
                  const y2 = outerR * Math.sin(endAngle);

                  const pathData = `M 0 0 L ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} Z`;
                  const midAngle = index * anglePerSlice + anglePerSlice / 2;
                  const details = getSliceDetails(slot, index);

                  const textR = radius * 0.63;

                  return (
                    <g key={slot.index}>
                      {/* Segment wedge path */}
                      <path
                        d={pathData}
                        fill={details.bg}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />

                      {/* Golden divider spoke */}
                      <line
                        x1="0"
                        y1="0"
                        x2={x1}
                        y2={y1}
                        stroke="#fde047"
                        strokeWidth="1.5"
                        strokeOpacity="0.8"
                      />

                      {/* Text & Icon Block - All oriented radially facing towards the center hub */}
                      <g transform={`rotate(${midAngle}) translate(0, -${textR})`}>
                        {/* Slice Icon near outer edge */}
                        <text
                          y="-20"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[12px] sm:text-[13px] select-none"
                        >
                          {details.icon}
                        </text>

                        {/* Primary Label (Amount or Wish Title) */}
                        <text
                          y="-5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          className={`font-black select-none tracking-tight font-['Montserrat',sans-serif] ${
                            details.isCash
                              ? 'text-[13px] sm:text-[14px]'
                              : 'text-[11px] sm:text-[12px]'
                          }`}
                          style={{
                            paintOrder: 'stroke',
                            stroke: '#0f172a',
                            strokeWidth: '2.5px',
                          }}
                        >
                          {details.line1}
                        </text>

                        {/* Secondary Subtitle (e.g. Ví MoMo, Sức Khỏe) facing towards the center */}
                        <text
                          y="9"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={details.isCash ? '#fef08a' : '#fed7aa'}
                          className="select-none font-bold text-[8.5px] sm:text-[9.5px] font-['Inter',sans-serif]"
                          style={{
                            paintOrder: 'stroke',
                            stroke: '#000000',
                            strokeWidth: '1.8px',
                          }}
                        >
                          {details.line2}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* INTERACTIVE CENTER SPIN BUTTON: matches reference image */}
            <button
              type="button"
              onClick={onSpinCenter}
              disabled={disabled || isSpinning}
              className={`absolute z-30 w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.65)] flex items-center justify-center border-2 border-white ring-4 ring-amber-400/90 transition-all duration-200 group ${
                disabled
                  ? 'opacity-85 cursor-not-allowed'
                  : isSpinning
                  ? 'cursor-wait scale-100'
                  : 'hover:scale-108 active:scale-95 cursor-pointer hover:ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.7)]'
              }`}
              aria-label={isSpinning ? 'Đang quay...' : 'Bấm để quay ngay'}
              title={isSpinning ? 'Đang quay...' : 'Bấm để quay'}
            >
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center text-white shadow-inner transition-colors duration-200 ${
                  isSpinning
                    ? 'bg-gradient-to-b from-amber-700 to-red-950 animate-pulse'
                    : disabled
                    ? 'bg-gradient-to-b from-stone-600 to-stone-800'
                    : 'bg-gradient-to-b from-red-600 via-rose-600 to-red-900 group-hover:from-red-500 group-hover:to-red-800'
                }`}
              >
                {isSpinning ? (
                  <>
                    <LoaderCircle className="w-6 h-6 text-amber-300 animate-spin mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-tight text-amber-200">
                      ĐANG QUAY
                    </span>
                  </>
                ) : disabled ? (
                  <span className="text-[9px] font-black uppercase tracking-tight text-stone-300 text-center px-1">
                    TẠM DỪNG
                  </span>
                ) : (
                  <>
                    <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow group-hover:rotate-180 transition duration-500 mb-0.5" />
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-100 drop-shadow">
                      QUAY NGAY
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Loading overlay if spinning before outcome arrives */}
        {isSpinning && targetSlotIndex === null && (
          <div
            className="absolute inset-2 z-40 flex flex-col items-center justify-center gap-2 rounded-full bg-slate-950/80 text-center text-white backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="h-9 w-9 animate-spin text-amber-300" aria-hidden="true" />
            <span className="max-w-[170px] px-2 text-xs font-bold text-amber-100">
              Đang xác nhận kết quả…
            </span>
          </div>
        )}
      </div>

      {disabled && disabledReason && (
        <div className="mt-3 px-3 py-1.5 bg-amber-950/80 text-amber-200 text-xs rounded-xl border border-amber-500/40 flex items-center gap-2 max-w-sm text-center">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}
    </div>
  );
};
