/**
 * Business rules and validation helpers for School Lucky Wheel
 */

export interface WheelSlotDef {
  index: number;
  name: string;
  amount: number;
  isCash: boolean;
  color: string;
  textColor: string;
}

export const WHEEL_SLOTS: WheelSlotDef[] = [
  { index: 0, name: '10.000đ', amount: 10000, isCash: true, color: '#f59e0b', textColor: '#ffffff' },
  { index: 1, name: 'Chúc may mắn lần sau', amount: 0, isCash: false, color: '#3b82f6', textColor: '#ffffff' },
  { index: 2, name: '50.000đ', amount: 50000, isCash: true, color: '#10b981', textColor: '#ffffff' },
  { index: 3, name: 'Thêm năng lượng học tập', amount: 0, isCash: false, color: '#8b5cf6', textColor: '#ffffff' },
  { index: 4, name: '20.000đ', amount: 20000, isCash: true, color: '#ec4899', textColor: '#ffffff' },
  { index: 5, name: 'Nụ cười tỏa sáng', amount: 0, isCash: false, color: '#06b6d4', textColor: '#ffffff' },
  { index: 6, name: '100.000đ (Đặc Biệt)', amount: 100000, isCash: true, color: '#dc2626', textColor: '#ffffff' },
  { index: 7, name: 'Chúc học kỳ rực rỡ', amount: 0, isCash: false, color: '#65a30d', textColor: '#ffffff' },
];

export const WISH_SLOT_INDICES = [1, 3, 5, 7];
export const CASH_SLOT_INDICES = [0, 2, 4, 6];

/**
 * Mask Vietnamese phone number for public privacy (e.g. 0912345678 -> 091****678)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '***';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 6) {
    return clean.slice(0, 2) + '***';
  }
  const start = clean.slice(0, 3);
  const end = clean.slice(-3);
  const middleMask = '*'.repeat(Math.max(3, clean.length - 6));
  return `${start}${middleMask}${end}`;
}

/**
 * Mask student full name for public lookup (e.g. "Nguyễn Văn Nam" -> "Nguyễn V** N**")
 */
export function maskStudentName(name: string): string {
  if (!name) return '***';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const single = parts[0];
    return single.length <= 2 ? single + '*' : single[0] + '*'.repeat(single.length - 1);
  }
  return parts
    .map((p, idx) => {
      if (idx === 0) return p; // Keep family name
      if (p.length <= 2) return p[0] + '*';
      return p[0] + '*'.repeat(p.length - 1);
    })
    .join(' ');
}

/**
 * Mask student class for public lookup (e.g. "12A1" -> "12**")
 */
export function maskStudentClass(cls: string): string {
  if (!cls) return '***';
  const trimmed = cls.trim();
  if (trimmed.length <= 2) return '**';
  return trimmed.slice(0, 2) + '**';
}

/**
 * Mask transaction reference (e.g. "FT26090123891" -> "FT26****891")
 */
export function maskTransactionRef(ref: string): string {
  if (!ref) return '';
  const trimmed = ref.trim();
  if (trimmed.length <= 6) return '****';
  return trimmed.slice(0, 4) + '****' + trimmed.slice(-3);
}

/**
 * Generate secure random alphanumeric ticket code
 */
export function generateTicketCode(prefix = 'SCH'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${part1}-${part2}`;
}

/**
 * Generate unique claim tracking code
 */
export function generateClaimCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CLM-${rand}`;
}

export type ClaimStatus =
  | 'UNSUBMITTED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'PENDING_PAYOUT'
  | 'PAID'
  | 'REJECTED';

/**
 * Strict Claim State Machine transitions
 */
export const ALLOWED_CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  UNSUBMITTED: ['PENDING_VERIFICATION', 'REJECTED'],
  PENDING_VERIFICATION: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['PENDING_PAYOUT', 'REJECTED'],
  PENDING_PAYOUT: ['PAID', 'REJECTED'],
  PAID: [], // Terminal state: cannot change once paid
  REJECTED: ['PENDING_VERIFICATION'], // Can only re-evaluate
};

export function isValidClaimTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_CLAIM_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export interface AvailablePrizeTier {
  slot_index: number;
  remaining: number;
  amount: number;
  probability_weight: number;
  name?: string;
  is_enabled?: boolean;
}

export interface SpinCalculationResult {
  slotIndex: number;
  slotName: string;
  amount: number;
  isWin: boolean;
  isCash: boolean;
}

/**
 * Pure calculation to determine spin outcome strictly based on rules and inventory.
 */
export function determineSpinOutcome(params: {
  spinType: 'TICKET' | 'FREE' | 'TRIAL';
  availablePrizes: AvailablePrizeTier[];
  remainingBudget: number;
  activeSlots?: WheelSlotDef[];
  randomFn?: () => number;
}): SpinCalculationResult {
  const rand = params.randomFn || Math.random;
  const activeSlots = params.activeSlots || WHEEL_SLOTS;
  const wishSlots = activeSlots.filter((slot) => !slot.isCash);
  const pickWish = (): SpinCalculationResult => {
    if (wishSlots.length === 0) throw new Error('Hiện không có ô lời chúc nào được bật');
    const slot = wishSlots[Math.floor(rand() * wishSlots.length)];
    return { slotIndex: slot.index, slotName: slot.name, amount: 0, isWin: false, isCash: false };
  };

  // Free spins or trial spins: only pick from wish slots
  if (params.spinType === 'FREE' || params.spinType === 'TRIAL') {
    return pickWish();
  }

  // Ticket spin: filter cash tiers with remaining inventory and within remaining budget
  const eligibleCashTiers = params.availablePrizes.filter(
    (tier) => tier.is_enabled !== false && tier.remaining > 0 && tier.amount <= params.remainingBudget && tier.amount > 0
  );

  // If no prizes remain or budget exhausted, fall back to a non-cash wish slot
  if (eligibleCashTiers.length === 0) {
    return pickWish();
  }

  const totalCashWeight = eligibleCashTiers.reduce((acc, t) => acc + (t.probability_weight || 10), 0);
  const wishWeight = wishSlots.length > 0 ? Math.max(20, Math.floor(totalCashWeight * 0.4)) : 0;
  const totalWeight = totalCashWeight + wishWeight;

  const roll = rand() * totalWeight;

  if (roll > totalCashWeight) {
    return pickWish();
  }

  let accumulator = 0;
  for (const tier of eligibleCashTiers) {
    accumulator += (tier.probability_weight || 10);
    if (roll <= accumulator) {
      const slot = activeSlots.find((candidate) => candidate.index === tier.slot_index) || WHEEL_SLOTS[tier.slot_index];
      return {
        slotIndex: slot.index,
        slotName: tier.name || slot.name,
        amount: tier.amount,
        isWin: true,
        isCash: true,
      };
    }
  }

  const firstTier = eligibleCashTiers[0];
  const slot = activeSlots.find((candidate) => candidate.index === firstTier.slot_index) || WHEEL_SLOTS[firstTier.slot_index];
  return {
    slotIndex: slot.index,
    slotName: firstTier.name || slot.name,
    amount: firstTier.amount,
    isWin: true,
    isCash: true,
  };
}

/**
 * Validate claim data submitted by student
 */
export function validateClaimInput(data: {
  name: string;
  studentClass: string;
  phone: string;
}): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length < 2) {
    return { valid: false, error: 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự)' };
  }
  if (!data.studentClass || data.studentClass.trim().length < 1) {
    return { valid: false, error: 'Vui lòng nhập lớp hoặc đơn vị công tác' };
  }
  const cleanPhone = (data.phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('0') || cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { valid: false, error: 'Số điện thoại không hợp lệ (cần bắt đầu bằng 0 và gồm 10-11 chữ số)' };
  }
  return { valid: true };
}

/**
 * Validate budget update constraints
 */
export function validateBudgetUpdate(newTotalBudget: number, usedBudget: number): { valid: boolean; error?: string } {
  if (isNaN(newTotalBudget) || newTotalBudget < 0) {
    return { valid: false, error: 'Tổng ngân sách phải là số dương hợp lệ' };
  }
  if (newTotalBudget < usedBudget) {
    return {
      valid: false,
      error: `Tổng ngân sách (${newTotalBudget.toLocaleString('vi-VN')}đ) không được nhỏ hơn số tiền đã trao (${usedBudget.toLocaleString('vi-VN')}đ)`,
    };
  }
  return { valid: true };
}

/**
 * Validate prize tier inventory update constraints
 */
export function validatePrizeTierUpdate(params: {
  remainingQuantity: number;
  totalQuantity: number;
  probabilityWeight?: number;
}): { valid: boolean; error?: string } {
  if (isNaN(params.remainingQuantity) || params.remainingQuantity < 0) {
    return { valid: false, error: 'Số lượng tồn kho không được âm' };
  }
  if (isNaN(params.totalQuantity) || params.totalQuantity < 0) {
    return { valid: false, error: 'Tổng số lượng giải không được âm' };
  }
  if (params.remainingQuantity > params.totalQuantity) {
    return { valid: false, error: 'Số lượng tồn kho không được vượt quá tổng số lượng giải' };
  }
  if (params.probabilityWeight !== undefined && (isNaN(params.probabilityWeight) || params.probabilityWeight < 0)) {
    return { valid: false, error: 'Trọng số xác suất không được âm' };
  }
  return { valid: true };
}
