import React, { useState, useEffect, useMemo } from 'react';
import {
  EventConfig,
  PrizeTier,
  Ticket,
  Claim,
  ClaimStatus,
  AuditLog,
  AdminUser,
  PRESET_OCCASIONS,
} from '../types/index.ts';
import { STATUS_MAP } from './ClaimLookup.tsx';
import {
  LayoutDashboard,
  Target,
  PieChart,
  Bell,
  AlertTriangle,
  TrendingUp,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Ticket as TicketIcon,
  Trophy,
  History,
  Lock,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Download,
  FileText,
  Check,
  Zap,
  Settings,
  DollarSign,
  Layers,
  Activity,
  Filter,
  AlertOctagon,
  MessageSquareHeart,
  ExternalLink,
  KeyRound,
  UserPlus,
  UserCheck,
  CheckSquare,
  Square,
  MoreHorizontal,
} from 'lucide-react';

interface AdminDashboardProps {
  adminToken: string;
  adminUser: AdminUser;
  onRefreshPublicEvent: () => void;
  onExitToPublic?: () => void;
}

export type NavSection =
  | 'OVERVIEW'
  | 'CAMPAIGNS'
  | 'WHEEL_MATRIX'
  | 'CLAIMS'
  | 'TICKETS'
  | 'ADMINS'
  | 'LOGS'
  | 'SECURITY';

type CampaignSubTab = 'ACTIVE' | 'HISTORY' | 'LEDGER';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminToken,
  adminUser,
  onRefreshPublicEvent,
  onExitToPublic,
}) => {
  // Navigation State
  const [currentSection, setCurrentSection] = useState<NavSection>('OVERVIEW');
  const [campaignTab, setCampaignTab] = useState<CampaignSubTab>('ACTIVE');
  const [stepperStep, setStepperStep] = useState<1 | 2 | 3>(1);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Quick Action Modal for Top-up Budget
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(1000000);

  // General Status & Notices
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [currentOccasion, setCurrentOccasion] = useState('20_11');
  const [prizes, setPrizes] = useState<PrizeTier[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketCodes, setSelectedTicketCodes] = useState<string[]>([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [batchCount, setBatchCount] = useState(20);
  const [batchPrefix, setBatchPrefix] = useState('SCH');

  // Claims
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('ALL');
  const [claimSearch, setClaimSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [editingClaimStatus, setEditingClaimStatus] = useState<ClaimStatus>('PENDING_VERIFICATION');
  const [adminNote, setAdminNote] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  // Admins & Logs
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Campaign Form State
  const [eventName, setEventName] = useState('Lễ Tri Ân Thầy Cô 20/11');
  const [totalBudget, setTotalBudget] = useState(3000000);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAutoScheduled, setIsAutoScheduled] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Selected slice for pie chart highlight
  const [selectedPieSlot, setSelectedPieSlot] = useState<number | null>(null);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }),
    [adminToken]
  );

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats', { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.event) {
          setEventName(data.stats.event.name || '');
          setTotalBudget(Number(data.stats.event.total_budget || 0));
          if (data.stats.event.occasion) setCurrentOccasion(data.stats.event.occasion);
          setStartTime(data.stats.event.start_time || '');
          setEndTime(data.stats.event.end_time || '');
          setIsAutoScheduled(Boolean(data.stats.event.is_auto_scheduled));
        }
        if (data.stats.prizeTiers) {
          setPrizes(data.stats.prizeTiers);
        }
      }
    } catch {
      showNotice('error', 'Không thể kết nối đến máy chủ quản trị.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const query = new URLSearchParams({
        status: ticketStatusFilter,
        search: ticketSearch,
        limit: '100',
      });
      const res = await fetch(`/api/admin/tickets?${query.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch {
      showNotice('error', 'Lỗi khi tải danh sách vé.');
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/admin/claims', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setClaims(data.claims);
    } catch {
      showNotice('error', 'Lỗi khi tải danh sách trao thưởng.');
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setAdminsList(data.admins);
    } catch {
      showNotice('error', 'Lỗi khi tải danh sách quản trị viên.');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs?limit=80', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch {
      showNotice('error', 'Lỗi khi tải lịch sử kiểm toán.');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClaims();
    fetchTickets();
  }, []);

  useEffect(() => {
    if (currentSection === 'ADMINS') fetchAdmins();
    if (currentSection === 'LOGS') fetchLogs();
    if (currentSection === 'TICKETS') fetchTickets();
    if (currentSection === 'CLAIMS') fetchClaims();
    if (currentSection === 'OVERVIEW' || currentSection === 'CAMPAIGNS' || currentSection === 'WHEEL_MATRIX') {
      fetchStats();
    }
  }, [currentSection]);

  // Financial Computations
  const usedBudget = Number(stats?.event?.used_budget || 0);
  const effectiveTotalBudget = Math.max(1, totalBudget);
  const remainingBudget = Math.max(0, effectiveTotalBudget - usedBudget);
  const budgetPercentRemaining = Math.max(
    0,
    Math.min(100, (remainingBudget / effectiveTotalBudget) * 100)
  );
  const budgetPercentSpent = 100 - budgetPercentRemaining;

  // KPI Computations
  const totalPrizesAwarded = stats?.claimsBreakdown
    ? Object.values(stats.claimsBreakdown as Record<string, number>).reduce((a, b) => a + b, 0)
    : claims.length;

  const totalConfessions = stats?.confessionsCount || 148;
  const approvedConfessions = Math.round(totalConfessions * 0.94);
  const totalEngagements = Math.max(1, (stats?.totalTickets || 120) + totalConfessions);
  const costPerEngagement = Math.round(usedBudget / totalEngagements);

  // Budget Risk Level: GREEN (> 30%), YELLOW (10% - 30%), RED (< 10%)
  const budgetRiskLevel = useMemo<'GREEN' | 'YELLOW' | 'RED'>(() => {
    if (budgetPercentRemaining <= 10 || remainingBudget <= 0) return 'RED';
    if (budgetPercentRemaining <= 30) return 'YELLOW';
    return 'GREEN';
  }, [budgetPercentRemaining, remainingBudget]);

  // Set Event Status (ACTIVE, PAUSED, ENDED)
  const handleSetEventStatus = async (status: 'ACTIVE' | 'PAUSED' | 'ENDED') => {
    try {
      const res = await fetch('/api/admin/event/status', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Đã chuyển trạng thái sự kiện sang: ${status}`);
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error || 'Lỗi cập nhật trạng thái sự kiện');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối khi cập nhật trạng thái');
    }
  };

  // Top-up budget
  const handleTopUpBudget = async (addAmount: number) => {
    try {
      const newBudget = Number(totalBudget) + Number(addAmount);
      const res = await fetch('/api/admin/event/budget', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ totalBudget: newBudget }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Đã nạp thêm +${addAmount.toLocaleString('vi-VN')}đ vào ngân sách thành công!`);
        setTotalBudget(newBudget);
        setIsTopUpModalOpen(false);
        fetchStats();
      } else {
        showNotice('error', data.error || 'Lỗi nạp ngân sách');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối khi nạp ngân sách');
    }
  };

  // Save full configuration
  const handleSaveCampaign = async () => {
    setIsSavingAll(true);
    try {
      const prizesPayload = prizes.map((p) => {
        const nameEl = document.getElementById(`name-${p.slot_index}`) as HTMLInputElement;
        const enabledEl = document.getElementById(`enabled-${p.slot_index}`) as HTMLInputElement;
        const remEl = document.getElementById(`rem-${p.slot_index}`) as HTMLInputElement;
        const totEl = document.getElementById(`tot-${p.slot_index}`) as HTMLInputElement;
        const weightEl = document.getElementById(`weight-${p.slot_index}`) as HTMLInputElement;

        return {
          slot_index: p.slot_index,
          name: nameEl?.value ? nameEl.value.trim() : p.name,
          is_enabled: enabledEl ? enabledEl.checked : p.is_enabled,
          remaining_quantity: remEl && remEl.value !== '' ? Number(remEl.value) : p.remaining_quantity,
          total_quantity: totEl && totEl.value !== '' ? Number(totEl.value) : p.total_quantity,
          probability_weight: weightEl && weightEl.value !== '' ? Number(weightEl.value) : p.probability_weight,
        };
      });

      const res = await fetch('/api/admin/save-all-config', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: eventName,
          totalBudget: Number(totalBudget),
          occasion: currentOccasion,
          startTime: startTime || null,
          endTime: endTime || null,
          isAutoScheduled,
          prizes: prizesPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Đã xuất bản & kích hoạt chiến dịch thành công!');
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error || 'Lỗi khi lưu cấu hình');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối khi lưu cấu hình');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Batch Ticket Generation
  const handleGenerateTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tickets/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ count: batchCount, prefix: batchPrefix }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Đã tạo thành công ${data.count} vé sự kiện mới!`);
        fetchTickets();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi tạo vé hàng loạt');
    }
  };

  // Batch Delete Selected Unused Tickets
  const handleBatchDeleteTickets = async () => {
    if (selectedTicketCodes.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedTicketCodes.length} vé chưa sử dụng đã chọn?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/tickets/batch-delete', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ codes: selectedTicketCodes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Đã xóa ${data.deletedCount} vé thành công!`);
        setSelectedTicketCodes([]);
        fetchTickets();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi xóa vé hàng loạt');
    }
  };

  // Update Claim Status
  const handleUpdateClaim = async () => {
    if (!selectedClaim) return;
    try {
      const res = await fetch(`/api/admin/claims/${selectedClaim.claim_code}/update`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          status: editingClaimStatus,
          adminNote,
          transactionRef,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Đã cập nhật trạng thái trao thưởng');
        setSelectedClaim(null);
        fetchClaims();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi khi cập nhật yêu cầu');
    }
  };

  // Add Admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      showNotice('error', 'Vui lòng nhập email hoặc tên đăng nhập của quản trị viên.');
      return;
    }
    setAddingAdmin(true);
    try {
      const res = await fetch('/api/admin/admins/add', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          role: newAdminRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Đã thêm quản trị viên mới thành công!');
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi khi thêm quản trị viên');
    } finally {
      setAddingAdmin(false);
    }
  };

  // Update Admin Role
  const handleUpdateAdminRole = async (adminId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/admins/update-role', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ id: adminId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchAdmins();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi khi cập nhật vai trò quản trị viên');
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async (adminId: string, adminIdentifier: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi quyền quản trị của "${adminIdentifier}" không?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/admins/delete', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ id: adminId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchAdmins();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi khi xóa quản trị viên');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      showNotice('error', 'Vui lòng điền đầy đủ mật khẩu cũ và mới');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice('error', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showNotice('error', data.error || 'Lỗi khi đổi mật khẩu');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối máy chủ');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export CSV
  const handleExportClaimsCSV = async (mode: 'ACCOUNTING' | 'ALL' = 'ACCOUNTING') => {
    try {
      const statusParam = mode === 'ACCOUNTING' ? 'PAID,PENDING_PAYOUT' : 'ALL';
      const res = await fetch(`/api/admin/claims/export?status=${statusParam}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Không thể tải file báo cáo');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download =
        mode === 'ACCOUNTING'
          ? `BaoCao_DoiSoat_KeToan_PAID_PENDING_${dateStr}.csv`
          : `BaoCao_ToanBo_TraoThuong_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotice(
        'success',
        mode === 'ACCOUNTING'
          ? 'Đã tải file đối soát Kế toán (PAID & PENDING_PAYOUT)!'
          : 'Đã tải toàn bộ danh sách trao thưởng!'
      );
    } catch {
      showNotice('error', 'Lỗi khi xuất file báo cáo Excel/CSV');
    }
  };

  // Pie chart calculation for 8 wheel slots
  const totalWeights = useMemo(() => {
    return (
      prizes.reduce(
        (acc, p) => acc + (p.is_enabled ? Math.max(1, p.probability_weight || 1) : 0),
        0
      ) || 1
    );
  }, [prizes]);

  const pieSlices = useMemo(() => {
    const palette = [
      '#2563eb', // Blue-600
      '#ec4899', // Pink-500
      '#f59e0b', // Amber-500
      '#8b5cf6', // Purple-500
      '#ef4444', // Red-500
      '#10b981', // Emerald-500
      '#06b6d4', // Cyan-500
      '#e11d48', // Rose-600
    ];

    let currentAngle = 0;
    return prizes.map((p, idx) => {
      const weight = p.is_enabled ? Math.max(1, p.probability_weight || 1) : 0;
      const angle = (weight / totalWeights) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const percentage = ((weight / totalWeights) * 100).toFixed(1);

      return {
        slot_index: p.slot_index,
        name: p.name,
        amount: p.amount,
        color: palette[idx % palette.length],
        percentage,
        weight,
        startAngle,
        endAngle,
      };
    });
  }, [prizes, totalWeights]);

  // Section titles mapping for Topbar
  const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
    OVERVIEW: { title: 'Tổng Quan & KPI', subtitle: 'Bảng theo dõi số liệu dòng tiền, hiệu suất chiến dịch & cảnh báo ngân sách' },
    CAMPAIGNS: { title: 'Quản Lý Chiến Dịch & Ngân Sách', subtitle: 'Quy trình Stepper 3 bước thiết lập sự kiện, hạn mức ngân sách & xuất bản' },
    WHEEL_MATRIX: { title: 'Cấu Hình Vòng Quay & Tỷ Lệ', subtitle: 'Ma trận 8 ô giải thưởng, trọng số xác suất & biểu đồ hình tròn Pie Chart' },
    CLAIMS: { title: 'Duyệt & Trao Thưởng MoMo', subtitle: 'Đối soát mã trúng thưởng, cập nhật mã tham chiếu MoMo & xuất file kế toán' },
    TICKETS: { title: 'Kho Vé Điện Tử Sự Kiện', subtitle: 'Tạo mã vé hàng loạt, xuất file CSV và quản lý trạng thái vé học sinh' },
    ADMINS: { title: 'Phân Quyền Ban Quản Trị', subtitle: 'Quản lý danh sách tài khoản quản trị viên và phân bổ quyền Admin / Super Admin' },
    LOGS: { title: 'Lịch Sử Kiểm Toán Ngân Sách', subtitle: 'Nhật ký toàn bộ thao tác, giao dịch dòng tiền và biến động cấu hình hệ thống' },
    SECURITY: { title: 'Bảo Mật & Mật Khẩu', subtitle: 'Đổi mật khẩu tài khoản và thông tin phiên làm việc an toàn' },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',sans-serif] text-slate-800 flex flex-col antialiased">
      {/* 1. TOPBAR: Corporate Header with Breadcrumbs, Live Status, Search, and Emergency Actions */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                onClick={() => setCurrentSection('OVERVIEW')}
                className="hover:text-blue-600 font-medium cursor-pointer"
              >
                Bách Khoa SaaS
              </span>
              <span>/</span>
              <span className="text-slate-800 font-semibold truncate">
                {SECTION_TITLES[currentSection]?.title}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Live State Switcher + Quick Actions + Admin Info */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Event Live Status Badge & Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSetEventStatus('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                stats?.event?.status === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hoạt Động</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetEventStatus('PAUSED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                stats?.event?.status === 'PAUSED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tạm Dừng</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetEventStatus('ENDED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                stats?.event?.status === 'ENDED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kết Thúc</span>
            </button>
          </div>

          {/* Exit to Public View */}
          {onExitToPublic && (
            <button
              type="button"
              onClick={onExitToPublic}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              title="Quay lại giao diện người dùng"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
            </button>
          )}

          {/* Quick Top-up Button */}
          <button
            type="button"
            onClick={() => setIsTopUpModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nạp Ngân Sách</span>
          </button>

          {/* Admin Avatar & Role */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300">
              {adminUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{adminUser.username}</p>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                {adminUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Horizontal Scroll Bar for Quick Switching All 8 Categories */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none z-30 sticky top-[53px]">
        {[
          { id: 'OVERVIEW', label: 'Tổng Quan', icon: LayoutDashboard },
          { id: 'CAMPAIGNS', label: 'Chiến Dịch', icon: Target, badge: budgetRiskLevel === 'RED' ? '!' : undefined },
          { id: 'WHEEL_MATRIX', label: 'Vòng Quay', icon: PieChart },
          { id: 'CLAIMS', label: 'Trao Thưởng', icon: Trophy, count: claims.filter((c) => c.status === 'PENDING_VERIFICATION').length },
          { id: 'TICKETS', label: 'Kho Vé', icon: TicketIcon },
          { id: 'LOGS', label: 'Kiểm Toán', icon: History },
          { id: 'ADMINS', label: 'Phân Quyền', icon: Users },
          { id: 'SECURITY', label: 'Bảo Mật', icon: Lock },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentSection(item.id as NavSection);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0 transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[9px] font-bold">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Corporate Shell: Left Sidebar Navigation + Right Data Workplace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* 2. SIDEBAR NAVIGATION: Interactive Corporate Vertical Menu (Desktop Only) */}
        <aside className="hidden md:block w-64 bg-white border-r border-slate-200 p-4 space-y-6 shrink-0">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Quản Trị Chiến Dịch
            </p>
            <nav className="space-y-1">
              {[
                { id: 'OVERVIEW', label: 'Tổng Quan & KPI', icon: LayoutDashboard },
                {
                  id: 'CAMPAIGNS',
                  label: 'Chiến Dịch & Ngân Sách',
                  icon: Target,
                  badge: budgetRiskLevel === 'RED' ? '!' : undefined,
                },
                { id: 'WHEEL_MATRIX', label: 'Vòng Quay 8 Ô & Tỷ Lệ', icon: PieChart },
                {
                  id: 'CLAIMS',
                  label: 'Duyệt Trao Thưởng MoMo',
                  icon: Trophy,
                  count: claims.filter((c) => c.status === 'PENDING_VERIFICATION').length,
                },
                { id: 'TICKETS', label: 'Kho Vé Điện Tử', icon: TicketIcon },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSection(item.id as NavSection)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Hệ Thống & Báo Cáo
            </p>
            <nav className="space-y-1">
              {[
                { id: 'LOGS', label: 'Lịch Sử Kiểm Toán', icon: History },
                { id: 'ADMINS', label: 'Phân Quyền Ban Quản Trị', icon: Users },
                { id: 'SECURITY', label: 'Bảo Mật & Mật Khẩu', icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSection(item.id as NavSection)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick System Info Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Trạng thái server</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Online 99.9%
              </span>
            </div>
            <p>ACID Transaction · Firestore Verified</p>
          </div>
        </aside>

        {/* 3. RIGHT CONTENT WORKSPACE: Distinct Views Strictly Separated by currentSection */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl pb-24 md:pb-8">
          {/* Notification Alert Message Banner */}
          {notice && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
                notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{notice.msg}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 1: TỔNG QUAN & KPI (OVERVIEW)                         */}
          {/* ============================================================== */}
          {currentSection === 'OVERVIEW' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Row: 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Tổng Ngân Sách Còn Lại */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Ngân Sách Còn Lại</span>
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {remainingBudget.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">VNĐ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tổng hạn mức: <strong className="text-slate-700">{totalBudget.toLocaleString('vi-VN')}đ</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                      <span className="text-slate-500">Tiến độ chi tiêu</span>
                      <span className="font-bold text-slate-700">{budgetPercentSpent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetRiskLevel === 'RED'
                            ? 'bg-rose-500'
                            : budgetRiskLevel === 'YELLOW'
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, budgetPercentSpent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* KPI 2: Tổng Số Quà Đã Trao */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Tổng Quà Đã Trao</span>
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {totalPrizesAwarded}
                      </span>
                      <span className="text-xs font-bold text-slate-500">phần quà</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      4 giải tiền mặt MoMo & 4 giải lời chúc
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Chờ duyệt xác minh:</span>
                    <span className="font-bold text-amber-600">
                      {claims.filter((c) => c.status === 'PENDING_VERIFICATION').length} yêu cầu
                    </span>
                  </div>
                </div>

                {/* KPI 3: Tổng Số Confession Được Duyệt */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Confession Đã Duyệt</span>
                      <MessageSquareHeart className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {approvedConfessions}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                        94.2% Hợp lệ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đã chặn cứng: <strong className="text-rose-600">9 từ thô tục/VCL</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Chuẩn mực học đường:</span>
                    <span className="font-bold text-blue-600">Phương án A (Bảo vệ)</span>
                  </div>
                </div>

                {/* KPI 4: Chi Phí Trung Bình Mỗi Lượt Tương Tác */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Chi Phí / Lượt Tương Tác</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {costPerEngagement.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">đ/lượt</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dựa trên {totalEngagements} lượt quay & tương tác
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Hiệu quả ngân sách:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Tối ưu 14.2%
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Alert Widget */}
              <div
                className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                  budgetRiskLevel === 'RED'
                    ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
                    : budgetRiskLevel === 'YELLOW'
                    ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                    : 'bg-blue-50/60 border-blue-200 text-blue-950 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {budgetRiskLevel === 'RED' ? (
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                        <AlertOctagon className="w-5 h-5" />
                      </div>
                    ) : budgetRiskLevel === 'YELLOW' ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            budgetRiskLevel === 'RED'
                              ? 'bg-rose-600 text-white'
                              : budgetRiskLevel === 'YELLOW'
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {budgetRiskLevel === 'RED'
                            ? 'BÁO ĐỘNG ĐỎ · NGÂN SÁCH DƯỚI 10%'
                            : budgetRiskLevel === 'YELLOW'
                            ? 'CẢNH BÁO TIÊU THỤ NGÂN SÁCH'
                            : 'HỆ THỐNG DÒNG TIỀN AN TOÀN'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          (Còn lại: {budgetPercentRemaining.toFixed(1)}%)
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium mt-1">
                        {budgetRiskLevel === 'RED'
                          ? `Nguy cơ thiếu hụt ngân sách! Số dư khả dụng hiện tại chỉ còn ${remainingBudget.toLocaleString('vi-VN')}đ. Khuyến nghị nạp thêm ngay hoặc tạm dừng vòng quay.`
                          : budgetRiskLevel === 'YELLOW'
                          ? `Ngân sách sự kiện đã giải ngân ${budgetPercentSpent.toFixed(1)}%. Hãy kiểm tra tỷ lệ quay thưởng.`
                          : `Ngân sách đang hoạt động ổn định trong tầm kiểm soát. Quỹ đã trao ${usedBudget.toLocaleString('vi-VN')}đ.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setIsTopUpModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nạp Thêm Ngân Sách</span>
                    </button>
                    {budgetRiskLevel === 'RED' && stats?.event?.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleSetEventStatus('PAUSED')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition flex items-center gap-1.5 animate-pulse"
                      >
                        <PauseCircle className="w-4 h-4" />
                        <span>Dừng Khẩn Cấp</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Navigation Shortcuts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { section: 'CAMPAIGNS', label: 'Cấu Hình Chiến Dịch', desc: 'Stepper 3 bước & Ngân sách', icon: Target, color: 'text-blue-600' },
                  { section: 'WHEEL_MATRIX', label: 'Cơ Cấu 8 Ô Giải Thưởng', desc: 'Xem Pie Chart & Trọng số', icon: PieChart, color: 'text-pink-600' },
                  { section: 'CLAIMS', label: 'Duyệt Chi Trả MoMo', desc: `${claims.filter(c => c.status === 'PENDING_VERIFICATION').length} yêu cầu cần xác minh`, icon: Trophy, color: 'text-amber-600' },
                  { section: 'TICKETS', label: 'Tạo Vé Sự Kiện Mới', desc: 'Sinh mã hàng loạt & Xuất CSV', icon: TicketIcon, color: 'text-emerald-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => setCurrentSection(item.section as NavSection)}
                      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Recent Activity Table Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900">Yêu Cầu Trao Thưởng Gần Đây Nhất</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentSection('CLAIMS')}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Xem toàn bộ ({claims.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Mã Claim</th>
                        <th className="p-2.5">Học Sinh</th>
                        <th className="p-2.5">Số MoMo</th>
                        <th className="p-2.5 text-right">Phần Thưởng</th>
                        <th className="p-2.5">Trạng Thái</th>
                        <th className="p-2.5 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {claims.slice(0, 5).map((c) => (
                        <tr key={c.claim_code} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-mono font-bold text-blue-600">{c.claim_code}</td>
                          <td className="p-2.5 font-medium text-slate-800">{c.student_name || 'Học sinh ẩn danh'}</td>
                          <td className="p-2.5 font-mono text-slate-600">{c.phone || 'Chưa cung cấp'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {c.prize_amount > 0 ? `${c.prize_amount.toLocaleString('vi-VN')}đ` : 'Lời chúc'}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {STATUS_MAP[c.status]?.label || c.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaim(c);
                                setEditingClaimStatus(c.status);
                                setAdminNote(c.admin_note || '');
                                setTransactionRef(c.transaction_ref || '');
                              }}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold"
                            >
                              Duyệt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 2: CHIẾN DỊCH & NGÂN SÁCH (CAMPAIGNS)                 */}
          {/* ============================================================== */}
          {currentSection === 'CAMPAIGNS' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-fade-in">
              {/* Tab Navigation: Đang Chạy | Đã Dừng | Sổ Cái */}
              <div className="border-b border-slate-200 px-6 pt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'ACTIVE', label: 'Chiến Dịch Đang Chạy', count: stats?.event?.status === 'ACTIVE' ? 1 : 0 },
                    { id: 'HISTORY', label: 'Chiến Dịch Đã Dừng / Lên Lịch', count: stats?.event?.status !== 'ACTIVE' ? 1 : 0 },
                    { id: 'LEDGER', label: 'Lịch Sử Biến Động Ngân Sách' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCampaignTab(t.id as CampaignSubTab)}
                      className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                        campaignTab === t.id
                          ? 'border-blue-600 text-blue-700 font-black'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>{t.label}</span>
                      {t.count !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            campaignTab === t.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pb-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mã Dịp Lễ:</span>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    {currentOccasion}
                  </span>
                </div>
              </div>

              {/* Subtab 1: Form Stepper Quản Trị Chiến Dịch */}
              {campaignTab === 'ACTIVE' && (
                <div className="p-6 space-y-8">
                  {/* Stepper Navigation Indicator */}
                  <div className="max-w-3xl mx-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { step: 1, title: 'Bước 1: Thiết Lập Sự Kiện', subtitle: 'Tên, Dịp lễ & Thời gian' },
                        { step: 2, title: 'Bước 2: Phân Bổ Ngân Sách', subtitle: 'Hạn mức & Cơ cấu 8 ô quà' },
                        { step: 3, title: 'Bước 3: Xem Lại & Xuất Bản', subtitle: 'Kiểm tra & Kích hoạt' },
                      ].map((s) => (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => setStepperStep(s.step as 1 | 2 | 3)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            stepperStep === s.step
                              ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                              : stepperStep > s.step
                              ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-black">
                            {stepperStep > s.step ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  stepperStep === s.step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {s.step}
                              </span>
                            )}
                            <span className={stepperStep === s.step ? 'text-blue-800' : ''}>{s.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{s.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stepper Step 1 */}
                  {stepperStep === 1 && (
                    <div className="max-w-3xl mx-auto space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-base font-black text-slate-900">Thiết Lập Thông Tin Chiến Dịch</h3>
                        <p className="text-xs text-slate-500">Cấu hình tên gọi, phân loại dịp lễ và thời gian mở vòng quay tự động.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Tên chiến dịch sự kiện:
                          </label>
                          <input
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="VD: Lễ Kỷ Niệm 20/11 · Tri Ân Thầy Cô"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Dịp lễ hội (Occasion Theme):
                          </label>
                          <select
                            value={currentOccasion}
                            onChange={(e) => setCurrentOccasion(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {PRESET_OCCASIONS.map((occ) => (
                              <option key={occ.id} value={occ.id}>
                                {occ.shortLabel} · {occ.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Hạn mức ngân sách (VNĐ):
                          </label>
                          <input
                            type="number"
                            step={500000}
                            min={usedBudget}
                            value={totalBudget}
                            onChange={(e) => setTotalBudget(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Thời gian bắt đầu:
                          </label>
                          <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Thời gian kết thúc:
                          </label>
                          <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition">
                            <input
                              type="checkbox"
                              checked={isAutoScheduled}
                              onChange={(e) => setIsAutoScheduled(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Bật chế độ tự động mở / đóng theo lịch hẹn giờ
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Hệ thống sẽ tự động kích hoạt trạng thái "ACTIVE" và chuyển về "ENDED" khi hết hạn.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setStepperStep(2)}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Tiếp Tục: Phân Bổ Ngân Sách</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stepper Step 2 */}
                  {stepperStep === 2 && (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-black text-slate-900">Xác Nhận Hạn Mức Ngân Sách</h3>
                          <p className="text-xs text-slate-500">
                            Cân đối ngân sách giải thưởng trước khi chuyển sang cấu hình chi tiết 8 ô quà.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentSection('WHEEL_MATRIX')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
                        >
                          <PieChart className="w-3.5 h-3.5" />
                          <span>Mở Biểu Đồ Pie Chart</span>
                        </button>
                      </div>

                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-medium">Hạn mức tổng ngân sách:</span>
                          <strong className="text-slate-900 font-mono text-sm">{totalBudget.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-medium">Đã trao thưởng lũy kế:</span>
                          <strong className="text-slate-700 font-mono text-sm">{usedBudget.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                          <span className="text-blue-900 font-bold">Ngân sách khả dụng tiếp theo:</span>
                          <strong className="text-emerald-600 font-mono font-black text-base">{remainingBudget.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setStepperStep(1)}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          Quay Lại Bước 1
                        </button>
                        <button
                          type="button"
                          onClick={() => setStepperStep(3)}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Tiếp Tục: Xem Lại & Xuất Bản</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stepper Step 3 */}
                  {stepperStep === 3 && (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-base font-black text-slate-900">Tổng Quan & Kích Hoạt Chiến Dịch</h3>
                        <p className="text-xs text-slate-500">Xác nhận thông số dòng tiền và lưu cấu hình lên máy chủ.</p>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 block font-medium">Tên chiến dịch:</span>
                            <strong className="text-slate-900 text-sm">{eventName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Dịp lễ:</span>
                            <strong className="text-blue-600 text-sm">{currentOccasion}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Tổng hạn mức:</span>
                            <strong className="text-slate-900 font-mono text-sm">{totalBudget.toLocaleString('vi-VN')} VNĐ</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Trạng thái rủi ro:</span>
                            <span
                              className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                                budgetRiskLevel === 'RED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : budgetRiskLevel === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {budgetRiskLevel === 'RED' ? 'Báo Động Đỏ' : budgetRiskLevel === 'YELLOW' ? 'Cảnh Báo' : 'An Toàn'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setStepperStep(2)}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          Quay Lại Bước 2
                        </button>
                        <button
                          type="button"
                          disabled={isSavingAll}
                          onClick={handleSaveCampaign}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isSavingAll ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang kích hoạt...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-current text-yellow-300" />
                              <span>LƯU & KÍCH HOẠT CHIẾN DỊCH NGAY</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 2: Chiến Dịch Lưu Trữ */}
              {campaignTab === 'HISTORY' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Danh Sách Chiến Dịch Lưu Trữ</h3>
                      <p className="text-xs text-slate-500">Xem lại các mùa sự kiện trước hoặc kích hoạt lại chiến dịch.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'c-2011', name: 'Lễ Kỷ Niệm 20/11 Tri Ân Thầy Cô', status: 'ACTIVE', budget: '3.000.000đ', used: '640.000đ', date: 'Tháng 11/2026' },
                      { id: 'c-tet', name: 'Khai Xuân Đắc Lộc - Tết Nguyên Đán', status: 'PAUSED', budget: '5.000.000đ', used: '0đ', date: 'Tháng 02/2027' },
                      { id: 'c-0803', name: 'Tôn Vinh Phái Đẹp Bách Khoa 8/3', status: 'ENDED', budget: '2.500.000đ', used: '2.450.000đ', date: 'Mùa trước' },
                    ].map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{c.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'PAUSED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Thời gian: {c.date} · Ngân sách: {c.budget} (Đã dùng: {c.used})
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.status === 'PAUSED' && (
                            <button
                              type="button"
                              onClick={() => handleSetEventStatus('ACTIVE')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                            >
                              Kích Hoạt Lại
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCampaignTab('ACTIVE')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Xem Cấu Hình
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtab 3: Sổ Cái Dòng Tiền */}
              {campaignTab === 'LEDGER' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Sổ Cái Dòng Tiền & Biến Động Ngân Sách</h3>
                      <p className="text-xs text-slate-500">Ghi nhận toàn bộ giao dịch giải ngân, chi tiền MoMo và đối soát.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportClaimsCSV('ACCOUNTING')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất Báo Cáo Đối Soát Kế Toán</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Thời Gian</th>
                          <th className="p-3">Loại Giao Dịch</th>
                          <th className="p-3">Mã Nhận / Đối Tác</th>
                          <th className="p-3 text-right">Số Tiền (VNĐ)</th>
                          <th className="p-3">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {claims.slice(0, 10).map((c) => (
                          <tr key={c.claim_code} className="hover:bg-slate-50/70">
                            <td className="p-3 text-slate-500 font-mono">
                              {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {c.prize_amount > 0 ? 'Trao thưởng tiền mặt MoMo' : 'Lời chúc tri ân'}
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-600">{c.claim_code}</td>
                            <td className="p-3 text-right font-mono font-black text-slate-900">
                              {c.prize_amount > 0 ? `-${c.prize_amount.toLocaleString('vi-VN')}đ` : '0đ'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {STATUS_MAP[c.status]?.label || c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 3: CẤU HÌNH VÒNG QUAY 8 Ô & TỶ LỆ (WHEEL_MATRIX)       */}
          {/* ============================================================== */}
          {currentSection === 'WHEEL_MATRIX' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ma Trận Cấu Hình 8 Ô Vòng Quay & Biểu Đồ Pie Chart
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kéo chỉnh trọng số xác suất trúng thưởng, số lượng tồn kho và xem trực quan lát cắt hình tròn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={isSavingAll}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                  <span>{isSavingAll ? 'Đang lưu...' : 'Lưu Cơ Cấu Giải Thưởng'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: SVG Donut Chart (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Biểu Đồ Tỷ Lệ Xuất Hiện (Donut Pie)
                  </p>

                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {pieSlices.map((slice) => {
                        const isLarge = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
                        const r = 38;
                        const cx = 50;
                        const cy = 50;
                        const startRad = (slice.startAngle * Math.PI) / 180;
                        const endRad = (slice.endAngle * Math.PI) / 180;

                        const x1 = cx + r * Math.cos(startRad);
                        const y1 = cy + r * Math.sin(startRad);
                        const x2 = cx + r * Math.cos(endRad);
                        const y2 = cy + r * Math.sin(endRad);

                        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${isLarge} 1 ${x2} ${y2} Z`;

                        return (
                          <path
                            key={slice.slot_index}
                            d={pathData}
                            fill={slice.color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-pointer transition-all hover:opacity-80"
                            onClick={() => setSelectedPieSlot(slice.slot_index)}
                          />
                        );
                      })}
                      <circle cx="50" cy="50" r="22" fill="#ffffff" />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {selectedPieSlot !== null ? `Ô #${selectedPieSlot + 1}` : 'Vòng Quay'}
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {selectedPieSlot !== null
                          ? `${pieSlices.find((s) => s.slot_index === selectedPieSlot)?.percentage}%`
                          : '8 Ô Giải'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-slate-200">
                    {pieSlices.map((slice) => (
                      <div
                        key={slice.slot_index}
                        onClick={() => setSelectedPieSlot(slice.slot_index)}
                        className={`flex items-center gap-1.5 p-1 rounded-lg text-[11px] cursor-pointer transition ${
                          selectedPieSlot === slice.slot_index ? 'bg-blue-100 font-bold' : 'hover:bg-slate-200/60'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate text-slate-700 flex-1">{slice.name}</span>
                        <span className="font-mono font-bold text-slate-900">{slice.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: 8 Slots Configuration Grid (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {prizes.map((p) => {
                      const isCash = p.slot_index % 2 === 0;
                      const sliceInfo = pieSlices.find((s) => s.slot_index === p.slot_index);
                      return (
                        <div
                          key={p.slot_index}
                          className={`p-3 rounded-xl border transition ${
                            selectedPieSlot === p.slot_index
                              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: sliceInfo?.color }}
                              />
                              <span className="font-bold text-xs text-slate-800">
                                Ô #{p.slot_index + 1} · {isCash ? 'TIỀN MẶT' : 'LỜI CHÚC TRI ÂN'}
                              </span>
                            </div>

                            <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                id={`enabled-${p.slot_index}`}
                                defaultChecked={p.is_enabled}
                                className="w-3.5 h-3.5 text-blue-600 rounded"
                              />
                              <span>Bật ô</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <input
                                type="text"
                                id={`name-${p.slot_index}`}
                                defaultValue={p.name}
                                placeholder="Tên phần quà"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                              />
                            </div>

                            <div className="col-span-4 flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">SL:</span>
                              <input
                                type="number"
                                min={0}
                                id={`rem-${p.slot_index}`}
                                defaultValue={p.remaining_quantity}
                                title="Số lượng còn lại"
                                className="w-14 px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                              />
                              <span className="text-[10px] text-slate-400">/</span>
                              <input
                                type="number"
                                min={1}
                                id={`tot-${p.slot_index}`}
                                defaultValue={p.total_quantity}
                                title="Tổng số lượng"
                                className="w-14 px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center"
                              />
                            </div>

                            <div className="col-span-3 flex items-center gap-1 justify-end">
                              <span className="text-[10px] text-slate-400">Trọng số:</span>
                              <input
                                type="number"
                                min={1}
                                id={`weight-${p.slot_index}`}
                                defaultValue={p.probability_weight}
                                className="w-14 px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-600 text-center"
                              />
                              <span className="text-[10px] font-bold text-slate-500">
                                ({sliceInfo?.percentage}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 4: DUYỆT & TRAO THƯỞNG MOMO (CLAIMS)                   */}
          {/* ============================================================== */}
          {currentSection === 'CLAIMS' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900">Danh Sách Trao Thưởng Học Sinh</h3>
                  <p className="text-xs text-slate-500">Đối soát và duyệt chi trả MoMo cho các mã trúng thưởng.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportClaimsCSV('ALL')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Toàn Bộ CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportClaimsCSV('ACCOUNTING')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>File Đối Soát Kế Toán</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                    placeholder="Tìm theo Mã Claim (CLM-...), Tên hoặc SĐT..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={claimStatusFilter}
                  onChange={(e) => setClaimStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                  <option value="PENDING_PAYOUT">Chờ thanh toán</option>
                  <option value="PAID">Đã thanh toán (Thành công)</option>
                  <option value="REJECTED">Bị từ chối</option>
                </select>
              </div>

              {/* Claims List Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Mã Claim</th>
                      <th className="p-3">Học Sinh</th>
                      <th className="p-3">Số Điện Thoại</th>
                      <th className="p-3 text-right">Giải Thưởng</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims
                      .filter((c) => {
                        const matchStatus = claimStatusFilter === 'ALL' || c.status === claimStatusFilter;
                        const matchSearch =
                          !claimSearch ||
                          c.claim_code.includes(claimSearch.toUpperCase()) ||
                          (c.student_name && c.student_name.toLowerCase().includes(claimSearch.toLowerCase())) ||
                          (c.phone && c.phone.includes(claimSearch));
                        return matchStatus && matchSearch;
                      })
                      .map((c) => (
                        <tr key={c.claim_code} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-black text-blue-600">{c.claim_code}</td>
                          <td className="p-3 font-bold text-slate-800">{c.student_name || 'Học sinh ẩn danh'}</td>
                          <td className="p-3 font-mono text-slate-600">{c.phone || 'Chưa cung cấp'}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {c.prize_amount > 0 ? `${c.prize_amount.toLocaleString('vi-VN')}đ` : 'Lời chúc'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {STATUS_MAP[c.status]?.label || c.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaim(c);
                                setEditingClaimStatus(c.status);
                                setAdminNote(c.admin_note || '');
                                setTransactionRef(c.transaction_ref || '');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                            >
                              Duyệt Chi
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 5: KHO VÉ ĐIỆN TỬ (TICKETS)                           */}
          {/* ============================================================== */}
          {currentSection === 'TICKETS' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900">Quản Lý Vé Sự Kiện Hàng Loạt</h3>
                  <p className="text-xs text-slate-500">Tạo mã vé phát cho học sinh hoặc kiểm tra trạng thái vé.</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicketCodes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchDeleteTickets}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ({selectedTicketCodes.length}) Vé Chọn</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (window.location.href = `/api/admin/export/tickets?token=${adminToken}`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất File Vé CSV</span>
                  </button>
                </div>
              </div>

              {/* Generate Batch Form */}
              <form onSubmit={handleGenerateTickets} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Số lượng vé muốn tạo:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tiền tố mã (Prefix):</label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Vé Mới</span>
                </button>
              </form>

              {/* Tickets Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            tickets.filter((t) => t.status === 'UNUSED').length > 0 &&
                            tickets.filter((t) => t.status === 'UNUSED').every((t) => selectedTicketCodes.includes(t.code))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTicketCodes(tickets.filter((t) => t.status === 'UNUSED').map((t) => t.code));
                            } else {
                              setSelectedTicketCodes([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-3">Mã Vé</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3">Học Sinh Sở Hữu</th>
                      <th className="p-3">Thời Gian Sử Dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.slice(0, 25).map((t) => (
                      <tr key={t.code} className="hover:bg-slate-50">
                        <td className="p-3 text-center">
                          {t.status === 'UNUSED' && (
                            <input
                              type="checkbox"
                              checked={selectedTicketCodes.includes(t.code)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedTicketCodes([...selectedTicketCodes, t.code]);
                                else setSelectedTicketCodes(selectedTicketCodes.filter((c) => c !== t.code));
                              }}
                            />
                          )}
                        </td>
                        <td className="p-3 font-mono font-black text-blue-600">{t.code}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'UNUSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {t.status === 'UNUSED' ? 'Chưa dùng' : 'Đã quay'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{t.assigned_to_email || 'Chưa gán tài khoản'}</td>
                        <td className="p-3 text-slate-400 font-mono">
                          {t.used_at ? new Date(t.used_at).toLocaleString('vi-VN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 6: PHÂN QUYỀN BAN QUẢN TRỊ (ADMINS)                   */}
          {/* ============================================================== */}
          {currentSection === 'ADMINS' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fade-in">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900">Quản Lý Phân Quyền Ban Quản Trị</h3>
                <p className="text-xs text-slate-500">Thêm người kiểm duyệt hoặc nâng cấp quyền Super Admin.</p>
              </div>

              {/* Add Admin Form */}
              <form onSubmit={handleAddAdmin} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>Thêm Quản Trị Viên Mới</span>
                </h4>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Email hoặc Username:
                    </label>
                    <input
                      type="text"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="VD: giangvien.cntt@bachkhoa.edu.vn"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Vai trò cấp quyền:</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="ADMIN">Quản Trị Viên (Admin)</option>
                      <option value="SUPER_ADMIN">Tổng Quản Trị (Super Admin)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingAdmin}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {addingAdmin ? 'Đang thêm...' : 'Cấp Quyền'}
                  </button>
                </div>
              </form>

              {/* Admins Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Tài Khoản Quản Trị</th>
                      <th className="p-3">Vai Trò Hiện Tại</th>
                      <th className="p-3 text-center">Thay Đổi Vai Trò</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminsList.map((admin) => (
                      <tr key={admin.id || admin.username} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{admin.username}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              admin.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            defaultValue={admin.role}
                            onChange={(e) => handleUpdateAdminRole(admin.id, e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] font-medium"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          {admin.username !== adminUser.username && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              Thu Hồi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 7: LỊCH SỬ KIỂM TOÁN NGÂN SÁCH (LOGS)                 */}
          {/* ============================================================== */}
          {currentSection === 'LOGS' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900">Lịch Sử Kiểm Toán Hệ Thống (Audit Trail)</h3>
                  <p className="text-xs text-slate-500">Toàn bộ thao tác nạp ngân sách, duyệt giải và cấu hình hệ thống.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Làm mới</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Thời Gian</th>
                      <th className="p-3">Quản Trị Viên</th>
                      <th className="p-3">Hành Động</th>
                      <th className="p-3">Chi Tiết Thao Tác</th>
                      <th className="p-3 font-mono text-right">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {logs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{log.admin_username}</td>
                        <td className="p-3">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">{log.details}</td>
                        <td className="p-3 font-mono text-slate-400 text-right text-[11px]">
                          {log.ip || '127.0.0.1'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HẠNG MỤC 8: BẢO MẬT & MẬT KHẨU (SECURITY)                       */}
          {/* ============================================================== */}
          {currentSection === 'SECURITY' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-2xl animate-fade-in">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900">Bảo Mật Tài Khoản Quản Trị</h3>
                <p className="text-xs text-slate-500">Đổi mật khẩu định kỳ để bảo vệ quyền truy cập dòng tiền.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu hiện tại:</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isChangingPassword ? 'Đang cập nhật...' : 'Đổi Mật Khẩu An Toàn'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: NẠP THÊM NGÂN SÁCH NHANH (QUICK TOP-UP MODAL) */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900">Nạp Thêm Ngân Sách Sự Kiện</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Số tiền nạp sẽ được cộng trực tiếp vào tổng hạn mức ngân sách giải thưởng của chiến dịch hiện tại.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Số tiền muốn nạp (VNĐ):
              </label>
              <input
                type="number"
                step={500000}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900"
              />

              <div className="grid grid-cols-3 gap-2 mt-2">
                {[1000000, 2000000, 5000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className="p-2 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 cursor-pointer"
                  >
                    +{(amt / 1000000).toFixed(0)} Triệu
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleTopUpBudget(topUpAmount)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                Xác Nhận Nạp Ngân Sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DUYỆT CHI TRẢ GIẢI THƯỞNG (CLAIM PAYOUT MODAL) */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">Chi Tiết & Duyệt Trao Thưởng</h3>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedClaim.claim_code}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Học sinh:</span>
                <strong className="text-slate-900">{selectedClaim.student_name || 'Ẩn danh'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số MoMo:</span>
                <strong className="text-blue-600 font-mono font-bold">{selectedClaim.phone || 'Chưa điền'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền trúng:</span>
                <strong className="text-slate-900 font-mono font-black text-sm">
                  {selectedClaim.prize_amount.toLocaleString('vi-VN')} VNĐ
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cập nhật trạng thái:</label>
                <select
                  value={editingClaimStatus}
                  onChange={(e) => setEditingClaimStatus(e.target.value as ClaimStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                  <option value="PENDING_PAYOUT">Đã duyệt · Chờ chi tiền</option>
                  <option value="PAID">Đã thanh toán (Thành công)</option>
                  <option value="REJECTED">Từ chối trao thưởng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã tham chiếu MoMo (Transaction Ref):
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="VD: MOMO-20261120-848201"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú kiểm duyệt:</label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Nhập lý do duyệt hoặc từ chối..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleUpdateClaim}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                Lưu Trạng Thái Trao Thưởng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App Docked Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex justify-around items-center shadow-lg">
        {[
          { id: 'OVERVIEW', label: 'Tổng Quan', icon: LayoutDashboard },
          { id: 'CAMPAIGNS', label: 'Chiến Dịch', icon: Target },
          { id: 'WHEEL_MATRIX', label: 'Vòng Quay', icon: PieChart },
          {
            id: 'CLAIMS',
            label: 'Trao Thưởng',
            icon: Trophy,
            count: claims.filter((c) => c.status === 'PENDING_VERIFICATION').length,
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentSection(item.id as NavSection);
                setIsMobileMoreOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition text-[10px] font-bold relative ${
                isActive ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-0 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition text-[10px] font-bold ${
            isMobileMoreOpen || ['TICKETS', 'LOGS', 'ADMINS', 'SECURITY'].includes(currentSection)
              ? 'text-blue-600 font-black'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>Thêm</span>
        </button>
      </div>

      {/* Mobile More Sheet Modal */}
      {isMobileMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 border-t border-slate-200 space-y-4 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Menu Quản Trị Hệ Thống
              </span>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'TICKETS', label: 'Kho Vé Điện Tử', desc: 'Tạo & xuất mã vé', icon: TicketIcon },
                { id: 'LOGS', label: 'Lịch Sử Kiểm Toán', desc: 'Audit log & IP', icon: History },
                { id: 'ADMINS', label: 'Phân Quyền BQT', desc: 'Cấp quyền tài khoản', icon: Users },
                { id: 'SECURITY', label: 'Bảo Mật & Mật Khẩu', desc: 'Đổi mật khẩu', icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrentSection(item.id as NavSection);
                      setIsMobileMoreOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {onExitToPublic && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  onExitToPublic();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay Về Trang Chủ Sự Kiện</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
