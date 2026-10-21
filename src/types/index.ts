export interface WheelSlot {
  index: number;
  name: string;
  amount: number;
  isCash: boolean;
  color: string;
  textColor: string;
}

export interface PrizeTier {
  id: string;
  slot_index: number;
  name: string;
  is_cash: number;
  amount: number;
  total_quantity: number;
  remaining_quantity: number;
  probability_weight: number;
}

export interface EventConfig {
  name: string;
  occasion: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  totalCashRemaining: number;
  slots: WheelSlot[];
  prizes: PrizeTier[];
}

export interface Ticket {
  code: string;
  occasion: string;
  status: 'UNUSED' | 'USED' | 'REVOKED';
  created_at: string;
  used_at?: string | null;
  used_by?: string | null;
}

export type ClaimStatus =
  | 'UNSUBMITTED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'PENDING_PAYOUT'
  | 'PAID'
  | 'REJECTED';

export interface Claim {
  claim_code: string;
  claimCode?: string;
  spin_id?: string;
  ticket_code?: string;
  ticketCode?: string;
  prize_amount: number;
  prizeAmount?: number;
  student_name?: string;
  studentName?: string;
  maskedStudentName?: string;
  student_class?: string;
  studentClass?: string;
  maskedClass?: string;
  phone?: string;
  maskedPhone?: string;
  payout_method?: 'CASH_DIRECT' | 'BANK_MOMO';
  payoutMethod?: 'CASH_DIRECT' | 'BANK_MOMO';
  payout_account?: string;
  payoutAccount?: string;
  status: ClaimStatus;
  admin_note?: string;
  adminNote?: string;
  transaction_ref?: string;
  transactionRef?: string;
  maskedTransactionRef?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface StudentUser {
  id: string;
  username: string;
  fullName: string;
  studentClass: string;
  freeSpinsRemaining: number;
}

export interface AdminUser {
  id: string;
  username: string;
  role: string;
}

export interface AuditLog {
  id: string;
  admin_username: string;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}
