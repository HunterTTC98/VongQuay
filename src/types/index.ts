export interface WheelSlot {
  index: number;
  name: string;
  amount: number;
  isCash: boolean;
  color: string;
  textColor: string;
  isEnabled?: boolean;
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
  is_enabled?: boolean;
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
  startTime?: string | null;
  endTime?: string | null;
  isAutoScheduled?: boolean;
  scheduledReason?: string;
}

export interface Ticket {
  code: string;
  occasion: string;
  status: 'UNUSED' | 'USED' | 'REVOKED';
  created_at: string;
  used_at?: string | null;
  used_by?: string | null;
  assigned_to_email?: string | null;
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
  email?: string;
  fullName: string;
  studentClass: string;
  photoUrl?: string;
  freeSpinsRemaining: number;
  totalSpins?: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: string;
}

export interface AuditLog {
  id: string;
  admin_username: string;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
  created_at?: string;
  ip?: string;
}

export interface OccasionOption {
  id: string;
  name: string;
  shortLabel: string;
  themeColor: string;
  bannerSubtitle: string;
  greetingExample: string;
  tag: string;
}

export const PRESET_OCCASIONS: OccasionOption[] = [
  {
    id: '20_11',
    name: 'Ngày Nhà giáo Việt Nam 20/11',
    shortLabel: '20/11 - Tri ân Thầy Cô',
    themeColor: '#be123c',
    bannerSubtitle: 'Tri ân những người gieo hạt, thắp sáng ước mơ dưới mái trường Bách Khoa Sầm Sơn.',
    greetingExample: 'Kính chúc quý Thầy Cô luôn dồi dào sức khỏe, tràn đầy nhiệt huyết và hạnh phúc trên bục giảng!',
    tag: 'Tri Ân',
  },
  {
    id: '20_10',
    name: 'Ngày Phụ nữ Việt Nam 20/10',
    shortLabel: '20/10 - Phụ Nữ Việt Nam',
    themeColor: '#db2777',
    bannerSubtitle: 'Tôn vinh vẻ đẹp, sự dịu dàng và cống hiến của nữ cán bộ, giáo viên và nữ sinh Bách Khoa.',
    greetingExample: 'Chúc các cô, các chị và các bạn nữ luôn xinh đẹp, tự tin, rạng rỡ và ngập tràn niềm vui!',
    tag: 'Phụ Nữ',
  },
  {
    id: '08_03',
    name: 'Ngày Quốc tế Phụ nữ 8/3',
    shortLabel: '8/3 - Quốc Tế Phụ Nữ',
    themeColor: '#e11d48',
    bannerSubtitle: 'Gửi ngàn lời chúc yêu thương và những món quà ý nghĩa nhất đến một nửa thế giới tuyệt vời.',
    greetingExample: 'Chúc phái đẹp Bách Khoa luôn rạng ngời như đóa hoa xuân, hạnh phúc và thành công!',
    tag: 'Phụ Nữ',
  },
  {
    id: 'TET',
    name: 'Tết Cổ Truyền & Lễ Hội Xuân',
    shortLabel: 'Tết Nguyên Đán',
    themeColor: '#d97706',
    bannerSubtitle: 'Mừng xuân mới an khang thịnh vượng, đón lộc may mắn đầu năm cùng thầy trò Bách Khoa.',
    greetingExample: 'Kính chúc năm mới An Khang Thịnh Vượng - Vạn Sự Như Ý - Học Tập & Công Tác Xuất Sắc!',
    tag: 'Tết Xuân',
  },
  {
    id: 'THANH_LAP',
    name: 'Ngày Thành Lập Trường Trung Cấp CN Bách Khoa Sầm Sơn',
    shortLabel: 'Thành Lập Trường',
    themeColor: '#b45309',
    bannerSubtitle: 'Tự hào truyền thống đào tạo tay nghề, chắp cánh tương lai cho thế hệ trẻ Sầm Sơn.',
    greetingExample: 'Chúc mừng ngày truyền thống trường! Tự hào là học viên Bách Khoa Sầm Sơn năng động, vững nghề!',
    tag: 'Kỷ Niệm',
  },
  {
    id: 'VALENTINE',
    name: 'Lễ Tình Nhân & Gắn Kết Yêu Thương Valentine',
    shortLabel: 'Valentine Yêu Thương',
    themeColor: '#f43f5e',
    bannerSubtitle: 'Gửi gắm lời chúc ngọt ngào, tri ân tình bạn và lưu giữ thanh xuân tươi đẹp dưới mái trường.',
    greetingExample: 'Chúc bạn một mùa Valentine ấm áp, luôn được yêu thương và lan tỏa năng lượng tích cực!',
    tag: 'Yêu Thương',
  },
  {
    id: 'DOAN_26_03',
    name: 'Ngày Thành Lập Đoàn TNCS Hồ Chí Minh 26/3',
    shortLabel: '26/3 - Tháng Thanh Niên',
    themeColor: '#0284c7',
    bannerSubtitle: 'Tuổi trẻ Bách Khoa Sầm Sơn xung kích, sáng tạo, rèn đức luyện tài, dựng xây tương lai.',
    greetingExample: 'Chúc các bạn đoàn viên, thanh niên Bách Khoa luôn rực cháy ngọn lửa nhiệt huyết tuổi trẻ!',
    tag: 'Thanh Niên',
  },
  {
    id: 'HOI_TRUONG',
    name: 'Ngày Hội Học Sinh - Sinh Viên Bách Khoa',
    shortLabel: 'Hội Trường Bách Khoa',
    themeColor: '#7c3aed',
    bannerSubtitle: 'Bách Khoa Events: Không gian gắn kết, chia sẻ niềm vui và nhận những phần quà may mắn bất ngờ.',
    greetingExample: 'Chúc toàn thể học viên một mùa hội trường bùng nổ, nhiều tiếng cười và may mắn trúng lớn!',
    tag: 'Lễ Hội',
  },
];

export interface UserSpinRecord {
  id: string;
  spinType: 'TICKET' | 'FREE' | 'TRIAL';
  ticketCode?: string | null;
  prizeAmount: number;
  prizeName: string;
  slotIndex: number;
  isWin: boolean;
  claimCode?: string | null;
  createdAt: string;
}

export interface UserProfileData {
  user: StudentUser;
  tickets: Ticket[];
  spins: UserSpinRecord[];
  claims: Claim[];
  isAdmin: boolean;
}

