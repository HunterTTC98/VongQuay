import confetti from 'canvas-confetti';

export interface CashFireworksOptions {
  amount?: number;
  isGrandPrize?: boolean;
  onFinish?: () => void;
}

/**
 * Validates whether a spin outcome qualifies as a celebratory cash prize.
 */
export function isCashPrizeOutcome(outcome: {
  isWin?: boolean;
  amount?: number;
  isTrial?: boolean;
  claimCode?: string;
} | null | undefined): boolean {
  if (!outcome) return false;
  if (outcome.isTrial) return false;
  if (!outcome.isWin) return false;
  return typeof outcome.amount === 'number' && outcome.amount > 0;
}

/**
 * Determines whether a cash prize is the grand special prize (>= 100.000đ).
 */
export function isGrandCashPrize(amount?: number): boolean {
  return typeof amount === 'number' && amount >= 100000;
}

/**
 * Fires an exhilarating, multi-stage fireworks and confetti celebration:
 * 1. Immediate center burst of golden stars & lucky confetti.
 * 2. Left & Right high-angle cannons shooting upward from screen corners.
 * 3. Blooming aerial fireworks bursts across the sky for 3.8s to 5s.
 * 
 * Returns a cleanup function to cancel all pending bursts/intervals.
 */
export function triggerCashFireworks(options?: CashFireworksOptions): () => void {
  const isGrandPrize = options?.isGrandPrize ?? (options?.amount ? isGrandCashPrize(options.amount) : false);
  const duration = isGrandPrize ? 5000 : 3800;
  const animationEnd = Date.now() + duration;

  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];

  // Festive Gold, Crimson, Emerald, Amber, Pink palette for Vietnamese school celebrations
  const cashColors = ['#FFD700', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#FBBF24', '#38BDF8'];
  const grandColors = ['#FFE600', '#FFB703', '#FB8500', '#D90429', '#FFFFFF', '#06D6A0', '#A855F7'];
  const colors = isGrandPrize ? grandColors : cashColors;

  try {
    // Stage 1: Immediate explosive center blast with stars & golden coins
    confetti({
      particleCount: isGrandPrize ? 180 : 130,
      spread: 110,
      origin: { x: 0.5, y: 0.52 },
      colors,
      shapes: ['star', 'circle'],
      startVelocity: 45,
      scalar: 1.25,
      ticks: 120,
      zIndex: 99999,
    });

    // Stage 2: Dual high-angle cannons firing across each other from bottom corners
    timeouts.push(
      setTimeout(() => {
        // Left cannon shooting towards center-right
        confetti({
          particleCount: isGrandPrize ? 90 : 70,
          angle: 60,
          spread: 75,
          origin: { x: 0.05, y: 0.82 },
          colors,
          shapes: ['star', 'circle'],
          startVelocity: 55,
          zIndex: 99999,
        });
        // Right cannon shooting towards center-left
        confetti({
          particleCount: isGrandPrize ? 90 : 70,
          angle: 120,
          spread: 75,
          origin: { x: 0.95, y: 0.82 },
          colors,
          shapes: ['star', 'circle'],
          startVelocity: 55,
          zIndex: 99999,
        });
      }, 200)
    );

    timeouts.push(
      setTimeout(() => {
        // Secondary cross cannons for dense atmospheric celebration
        confetti({
          particleCount: isGrandPrize ? 80 : 60,
          angle: 70,
          spread: 65,
          origin: { x: 0.18, y: 0.85 },
          colors,
          shapes: ['star', 'circle'],
          startVelocity: 50,
          zIndex: 99999,
        });
        confetti({
          particleCount: isGrandPrize ? 80 : 60,
          angle: 110,
          spread: 65,
          origin: { x: 0.82, y: 0.85 },
          colors,
          shapes: ['star', 'circle'],
          startVelocity: 50,
          zIndex: 99999,
        });
      }, 550)
    );

    // Stage 3: Continuous blooming aerial fireworks bursts
    const fireworkInterval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(fireworkInterval);
        options?.onFinish?.();
        return;
      }

      const count = isGrandPrize ? 45 : 32;
      const xLeft = Math.random() * 0.35 + 0.1;
      const xRight = Math.random() * 0.35 + 0.55;
      const yPos = Math.random() * 0.32 + 0.12;

      // Aerial firework bloom (left sky)
      confetti({
        particleCount: count,
        spread: 360,
        startVelocity: 30,
        ticks: 85,
        origin: { x: xLeft, y: yPos },
        colors,
        shapes: ['circle', 'star'],
        scalar: 1.15,
        zIndex: 99999,
      });

      // Aerial firework bloom (right sky)
      confetti({
        particleCount: count,
        spread: 360,
        startVelocity: 30,
        ticks: 85,
        origin: { x: xRight, y: yPos + (Math.random() * 0.08 - 0.04) },
        colors,
        shapes: ['circle', 'star'],
        scalar: 1.15,
        zIndex: 99999,
      });
    }, 320);

    intervals.push(fireworkInterval);
  } catch (err) {
    console.warn('[Fireworks] Error triggering celebration confetti:', err);
  }

  return () => {
    timeouts.forEach((t) => clearTimeout(t));
    intervals.forEach((i) => clearInterval(i));
  };
}
