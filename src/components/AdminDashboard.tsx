import React, { useState, useEffect } from 'react';
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
  Shield,
  DollarSign,
  Ticket as TicketIcon,
  Trophy,
  FileSpreadsheet,
  History,
  Lock,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Send,
  Users,
  Sparkles,
  Calendar,
  Clock,
  Download,
  Gift,
} from 'lucide-react';

interface AdminDashboardProps {
  adminToken: string;
  adminUser: AdminUser;
  onRefreshPublicEvent: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminToken,
  adminUser,
  onRefreshPublicEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PRIZES' | 'TICKETS' | 'CLAIMS' | 'ADMINS' | 'LOGS' | 'SECURITY'>('OVERVIEW');
  const [activeCategory, setActiveCategory] = useState<'CONFIG' | 'REWARDS' | 'SYSTEM'>('CONFIG');

  const handleSelectCategory = (cat: 'CONFIG' | 'REWARDS' | 'SYSTEM') => {
    setActiveCategory(cat);
    if (cat === 'CONFIG') setActiveTab('OVERVIEW');
    else if (cat === 'REWARDS') setActiveTab('CLAIMS');
    else if (cat === 'SYSTEM') {
      setActiveTab('ADMINS');
      fetchAdmins();
    }
  };

  const handleSelectTab = (tab: 'OVERVIEW' | 'PRIZES' | 'TICKETS' | 'CLAIMS' | 'ADMINS' | 'LOGS' | 'SECURITY') => {
    setActiveTab(tab);
    if (tab === 'OVERVIEW' || tab === 'PRIZES') setActiveCategory('CONFIG');
    else if (tab === 'CLAIMS' || tab === 'TICKETS') setActiveCategory('REWARDS');
    else setActiveCategory('SYSTEM');
    if (tab === 'ADMINS') fetchAdmins();
  };

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Stats & Config
  const [stats, setStats] = useState<any>(null);
  const [currentOccasion, setCurrentOccasion] = useState('20_11');

  // Admins List
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Prizes
  const [prizes, setPrizes] = useState<PrizeTier[]>([]);

  // Tickets
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

  // Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Security
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Event Config Form
  const [eventName, setEventName] = useState('');
  const [totalBudget, setTotalBudget] = useState(3000000);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAutoScheduled, setIsAutoScheduled] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        if (data.stats.event) {
          setEventName(data.stats.event.name);
          setTotalBudget(data.stats.event.total_budget);
          if (data.stats.event.occasion) {
            setCurrentOccasion(data.stats.event.occasion);
          }
          setStartTime(data.stats.event.start_time || '');
          setEndTime(data.stats.event.end_time || '');
          setIsAutoScheduled(Boolean(data.stats.event.is_auto_scheduled));
        }
        if (data.stats.prizeTiers) {
          setPrizes(data.stats.prizeTiers);
        }
      }
    } catch {
      showNotice('error', 'Không thể tải thống kê');
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setAdminsList(data.admins);
      }
    } catch {
      showNotice('error', 'Không thể tải danh sách Quản trị viên');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      showNotice('error', 'Vui lòng nhập email hoặc tên tài khoản');
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
        showNotice('success', data.message);
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi khi thêm Quản trị viên');
    } finally {
      setAddingAdmin(false);
    }
  };

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

  const handleSaveAllConfig = async () => {
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
        showNotice('success', data.message || 'Đã lưu toàn bộ cấu hình thành công!');
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error || 'Lỗi lưu toàn bộ cấu hình');
      }
    } catch {
      showNotice('error', 'Lỗi kết nối khi lưu toàn bộ cấu hình');
    } finally {
      setIsSavingAll(false);
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
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch {
      showNotice('error', 'Không thể tải danh sách vé');
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/admin/claims', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims);
      }
    } catch {
      showNotice('error', 'Không thể tải danh sách yêu cầu nhận thưởng');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch {
      showNotice('error', 'Không thể tải nhật ký');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'OVERVIEW' || activeTab === 'PRIZES') fetchStats();
    if (activeTab === 'TICKETS') fetchTickets();
    if (activeTab === 'CLAIMS') fetchClaims();
    if (activeTab === 'LOGS') fetchLogs();
  }, [activeTab, ticketStatusFilter, ticketSearch]);

  useEffect(() => {
    setSelectedTicketCodes([]);
  }, [ticketStatusFilter, ticketSearch]);

  // Handlers
  const handleSetEventStatus = async (status: 'ACTIVE' | 'PAUSED' | 'ENDED') => {
    try {
      const res = await fetch('/api/admin/event/status', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi kết nối máy chủ');
    }
  };

  const handleUpdateEventConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/event/config', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: eventName,
          totalBudget: Number(totalBudget),
          occasion: currentOccasion,
          startTime: startTime || null,
          endTime: endTime || null,
          isAutoScheduled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi cập nhật');
    }
  };

  const handleUpdatePrizeTier = async (
    slotIndex: number,
    remainingQuantity: number,
    totalQuantity: number,
    probabilityWeight: number,
    name: string,
    isEnabled: boolean
  ) => {
    try {
      const res = await fetch('/api/admin/prizes/update', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          slotIndex,
          remainingQuantity: Number(remainingQuantity),
          totalQuantity: Number(totalQuantity),
          probabilityWeight: Number(probabilityWeight),
          name,
          isEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Đã lưu cấu hình giải!');
        fetchStats();
        onRefreshPublicEvent();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi lưu giải');
    }
  };

  const handleGenerateBatchTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tickets/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ quantity: batchCount, prefix: batchPrefix }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        fetchTickets();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi phát hành vé');
    }
  };

  const handleRevokeTicket = async (code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi vé ${code}?`)) return;
    try {
      const res = await fetch('/api/admin/tickets/revoke', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicketCodes((current) => current.filter((selectedCode) => selectedCode !== code));
        showNotice('success', data.message);
        fetchTickets();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi thu hồi vé');
    }
  };

  const handleRevokeSelectedTickets = async () => {
    const codes = selectedTicketCodes.filter((code) => tickets.some((ticket) => ticket.code === code && ticket.status === 'UNUSED'));
    if (codes.length === 0) {
      showNotice('error', 'Hãy chọn ít nhất một vé chưa sử dụng');
      return;
    }
    if (!confirm(`Thu hồi ${codes.length} vé chưa sử dụng đã chọn? Vé đã dùng sẽ không bị thay đổi.`)) return;
    try {
      const res = await fetch('/api/admin/tickets/revoke-batch', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ codes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể thu hồi vé đã chọn');
      setSelectedTicketCodes([]);
      showNotice('success', data.message);
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      showNotice('error', err.message || 'Lỗi thu hồi vé hàng loạt');
    }
  };

  const handleUpdateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
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
        showNotice('success', data.message);
        setSelectedClaim(null);
        fetchClaims();
        fetchStats();
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi cập nhật giải');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotice('error', 'Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showNotice('error', data.error);
      }
    } catch {
      showNotice('error', 'Lỗi đổi mật khẩu');
    }
  };

  const handleExportTicketsCSV = () => {
    window.location.href = `/api/admin/export/tickets?token=${adminToken}`;
  };

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

  const remainingBudget = stats?.event
    ? Math.max(0, stats.event.total_budget - stats.event.used_budget)
    : 0;

  const filteredClaims = claims.filter((c) => {
    const matchStatus = claimStatusFilter === 'ALL' || c.status === claimStatusFilter;
    const matchSearch =
      !claimSearch ||
      c.claim_code.includes(claimSearch.toUpperCase()) ||
      (c.student_name && c.student_name.toLowerCase().includes(claimSearch.toLowerCase())) ||
      (c.phone && c.phone.includes(claimSearch));
    return matchStatus && matchSearch;
  });
  const visibleUnusedTickets = tickets.filter((ticket) => ticket.status === 'UNUSED');
  const allVisibleUnusedSelected = visibleUnusedTickets.length > 0 &&
    visibleUnusedTickets.every((ticket) => selectedTicketCodes.includes(ticket.code));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-zinc-800 to-gray-900 text-white rounded-3xl p-6 shadow-xl mb-6 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Bảng Quản Trị Vòng Quay Sự Kiện
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-300">
            Quản lý vé, ngân sách, giải thưởng và duyệt danh sách trao thưởng. Quản trị viên:{' '}
            <strong className="text-amber-400">{adminUser.username}</strong>
          </p>
        </div>

        {/* Live Event Status Pills */}
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => handleSetEventStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              stats?.event?.status === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>Mở sự kiện</span>
          </button>
          <button
            onClick={() => handleSetEventStatus('PAUSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              stats?.event?.status === 'PAUSED'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>Tạm dừng</span>
          </button>
          <button
            onClick={() => handleSetEventStatus('ENDED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              stats?.event?.status === 'ENDED'
                ? 'bg-rose-700 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <StopCircle className="w-4 h-4" />
            <span>Kết thúc</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-6 p-4 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm transition animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Multi-Level Hierarchical Navigation Menu (Eliminates Horizontal Scrolling) */}
      <div className="mb-6 space-y-2.5">
        {/* Level 1: Category Pillars */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleSelectCategory('CONFIG')}
            className={`p-2.5 sm:p-3 rounded-2xl border text-center transition flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-sm ${
              activeCategory === 'CONFIG'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white border-red-800 shadow-md ring-2 ring-red-400/40'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-black font-['Montserrat',sans-serif]">Cấu Hình & Giải</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('REWARDS')}
            className={`p-2.5 sm:p-3 rounded-2xl border text-center transition flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-sm ${
              activeCategory === 'REWARDS'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white border-red-800 shadow-md ring-2 ring-red-400/40'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-black font-['Montserrat',sans-serif]">Vé & Trao Thưởng</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('SYSTEM')}
            className={`p-2.5 sm:p-3 rounded-2xl border text-center transition flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-sm ${
              activeCategory === 'SYSTEM'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white border-red-800 shadow-md ring-2 ring-red-400/40'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-black font-['Montserrat',sans-serif]">Phân Quyền & Log</span>
          </button>
        </div>

        {/* Level 2: Sub-Level Tabs (No Horizontal Scroll) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-gray-100/90 p-2 rounded-2xl border border-gray-200 shadow-inner">
          {activeCategory === 'CONFIG' && (
            <>
              <button
                type="button"
                onClick={() => handleSelectTab('OVERVIEW')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Tổng Quan, Ngân Sách & Hẹn Giờ</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('PRIZES')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'PRIZES'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Cơ Cấu 8 Ô Giải Thưởng</span>
              </button>
            </>
          )}

          {activeCategory === 'REWARDS' && (
            <>
              <button
                type="button"
                onClick={() => handleSelectTab('CLAIMS')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'CLAIMS'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Duyệt Trao Thưởng & Xuất Báo Cáo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('TICKETS')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'TICKETS'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <TicketIcon className="w-4 h-4 text-blue-600" />
                <span>Quản Lý Vé Dự Thưởng</span>
              </button>
            </>
          )}

          {activeCategory === 'SYSTEM' && (
            <>
              <button
                type="button"
                onClick={() => handleSelectTab('ADMINS')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'ADMINS'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Ban Quản Trị & Phân Quyền</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('LOGS')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'LOGS'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <History className="w-4 h-4 text-purple-600" />
                <span>Nhật Ký Thao Tác</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('SECURITY')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'SECURITY'
                    ? 'bg-white text-red-700 shadow-sm border border-gray-200 ring-1 ring-red-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Đổi Mật Khẩu & Bảo Mật</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & BUDGET */}
      {activeTab === 'OVERVIEW' && stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Tổng Ngân Sách</span>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {stats.event?.total_budget?.toLocaleString('vi-VN')}đ
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Đã giải ngân:{' '}
                <strong className="text-red-600">
                  {stats.event?.used_budget?.toLocaleString('vi-VN')}đ
                </strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Ngân Sách Còn Lại</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {remainingBudget.toLocaleString('vi-VN')}đ
              </p>
              <div className="w-full bg-gray-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (remainingBudget / (stats.event?.total_budget || 1)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Vé Phát Hành</span>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {stats.tickets?.total || 0}
              </p>
              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>Đã dùng: {stats.tickets?.used || 0}</span>
                <span>Chưa dùng: {stats.tickets?.unused || 0}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Tổng Lượt Quay</span>
              <p className="text-2xl font-black text-purple-600 mt-1">
                {stats.spins?.total || 0}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Lượt trúng tiền:{' '}
                <strong className="text-purple-700">{stats.spins?.win || 0}</strong> (
                {stats.spins?.total
                  ? Math.round((stats.spins.win / stats.spins.total) * 100)
                  : 0}
                %)
              </div>
            </div>
          </div>

          {/* Quick Config Form & Multi-occasion Selector */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-red-600" />
                  <span>Bộ Chọn Dịp Lễ & Cấu Hình Sự Kiện</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thay đổi chủ đề dịp lễ Bách Khoa đang diễn ra, giao diện lễ hội và ngân sách sự kiện.
                </p>
              </div>
            </div>

            {/* Predefined Occasions Selector Grid with Mobile Overflow Protection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-600" />
                <span>Chọn Dịp Lễ Hoạt Động (8 Dịp Lễ Chuẩn Bách Khoa Events)</span>
              </label>

              {/* Mobile Dropdown Selector (<= 640px) */}
              <div className="sm:hidden mb-3">
                <select
                  value={currentOccasion}
                  onChange={(e) => {
                    const occId = e.target.value;
                    setCurrentOccasion(occId);
                    const found = PRESET_OCCASIONS.find((o) => o.id === occId);
                    if (found) setEventName(`Bách Khoa Events - ${found.name}`);
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 truncate focus:ring-2 focus:ring-red-500 outline-none shadow-sm cursor-pointer"
                >
                  {PRESET_OCCASIONS.map((occ) => (
                    <option key={occ.id} value={occ.id} className="text-gray-900 bg-white">
                      [{occ.tag}] {occ.shortLabel} – {occ.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop / Tablet Grid */}
              <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
                {PRESET_OCCASIONS.map((occ) => {
                  const isSelected = currentOccasion === occ.id;
                  return (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => {
                        setCurrentOccasion(occ.id);
                        setEventName(`Bách Khoa Events - ${occ.name}`);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/70 shadow-sm ring-2 ring-red-500/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {occ.tag}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="font-bold text-xs text-gray-900 leading-snug line-clamp-2">
                        {occ.shortLabel}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{occ.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleUpdateEventConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên Hiển Thị Sự Kiện
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tổng Ngân Sách (VNĐ)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Event Scheduling Section */}
              <div className="sm:col-span-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Cơ Chế Khóa Tự Động Theo Giờ (Event Scheduling)
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAutoScheduled}
                      onChange={(e) => setIsAutoScheduled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900">Bật hẹn giờ tự động</span>
                  </label>
                </div>
                <p className="text-[11px] text-gray-600 mb-3">
                  Cài đặt thời gian tự động mở và kết thúc sự kiện (VD: mở từ 08:00 đến 17:00 ngày 20/11). Sau giờ kết thúc, hệ thống sẽ tự động khóa lượt quay sang trạng thái KẾT THÚC mà không cần thức canh thao tác thủ công.
                </p>
                {isAutoScheduled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Thời gian bắt đầu tự động:
                      </label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Thời gian kết thúc tự động:
                      </label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Dịp Lễ & Ngân Sách</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllConfig}
                  disabled={isSavingAll}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingAll ? 'Đang lưu...' : 'Lưu Toàn Bộ Cấu Hình & 8 Ô Giải (1-Click)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PRIZES & INVENTORY */}
      {activeTab === 'PRIZES' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Cấu Hình Ô Vòng Quay & Tồn Kho</h3>
              <p className="text-xs text-gray-500">
                Đổi tên, bật/tắt ô trên vòng quay và cấu hình số lượng, trọng số. Tắt ô sẽ loại ô đó khỏi kết quả quay.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAllConfig}
              disabled={isSavingAll}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSavingAll ? 'Đang lưu...' : 'Lưu Toàn Bộ 8 Ô Giải (1-Click)'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-600 font-bold border-y">
                <tr>
                  <th className="py-3 px-3">Ô số</th>
                  <th className="py-3 px-3">Tên Giải / Lời Chúc</th>
                  <th className="py-3 px-3">Loại</th>
                  <th className="py-3 px-3">Mệnh Giá</th>
                  <th className="py-3 px-3">Hiển thị</th>
                  <th className="py-3 px-3">Tồn Kho</th>
                  <th className="py-3 px-3">Tổng SL</th>
                  <th className="py-3 px-3">Trọng Số</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prizes.map((p) => (
                  <tr key={p.slot_index} className="hover:bg-gray-50/70">
                    <td className="py-3 px-3 font-bold text-gray-800">
                      Ô #{p.slot_index + 1}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        defaultValue={p.name}
                        id={`name-${p.slot_index}`}
                        maxLength={60}
                        className="w-44 min-w-36 px-2 py-1 bg-gray-50 border rounded-lg text-xs font-semibold"
                        aria-label={`Tên ô số ${p.slot_index + 1}`}
                      />
                    </td>
                    <td className="py-3 px-3">
                      {p.is_cash ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                          Tiền mặt
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-medium">
                          Lời chúc
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      {p.amount > 0 ? `${p.amount.toLocaleString('vi-VN')}đ` : '0đ'}
                    </td>
                    <td className="py-3 px-3">
                      <label className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-700">
                        <input
                          type="checkbox"
                          defaultChecked={p.is_enabled !== false}
                          id={`enabled-${p.slot_index}`}
                          className="h-4 w-4 rounded border-gray-300 accent-red-600"
                        />
                        Hiện trên vòng quay
                      </label>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        defaultValue={p.remaining_quantity}
                        id={`rem-${p.slot_index}`}
                        disabled={!p.is_cash}
                        className="w-20 px-2 py-1 bg-gray-50 border rounded-lg text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        defaultValue={p.total_quantity}
                        id={`tot-${p.slot_index}`}
                        disabled={!p.is_cash}
                        className="w-20 px-2 py-1 bg-gray-50 border rounded-lg text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        defaultValue={p.probability_weight}
                        id={`weight-${p.slot_index}`}
                        className="w-16 px-2 py-1 bg-gray-50 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          const rem = (document.getElementById(`rem-${p.slot_index}`) as HTMLInputElement)?.value;
                          const tot = (document.getElementById(`tot-${p.slot_index}`) as HTMLInputElement)?.value;
                          const weight = (document.getElementById(`weight-${p.slot_index}`) as HTMLInputElement)?.value;
                          const name = (document.getElementById(`name-${p.slot_index}`) as HTMLInputElement)?.value;
                          const enabled = (document.getElementById(`enabled-${p.slot_index}`) as HTMLInputElement)?.checked;
                          handleUpdatePrizeTier(p.slot_index, Number(rem), Number(tot), Number(weight), name, enabled);
                        }}
                        className="px-3 py-1 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg transition"
                      >
                        Lưu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TICKETS */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Batch Generator */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" />
              <span>Phát Hành Lô Vé Mới</span>
            </h3>

            <form onSubmit={handleGenerateBatchTickets} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiền tố mã vé
                </label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  placeholder="SCH"
                  className="w-28 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số lượng vé
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-32 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition"
              >
                Tạo Ngay
              </button>

              <button
                type="button"
                onClick={handleExportTicketsCSV}
                className="ml-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất CSV Vé</span>
              </button>
            </form>
          </div>

          {/* Ticket Table */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Tìm kiếm mã vé..."
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono flex-1 max-w-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-semibold">Trạng thái:</span>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="UNUSED">Chưa dùng (UNUSED)</option>
                  <option value="USED">Đã dùng (USED)</option>
                  <option value="REVOKED">Đã thu hồi (REVOKED)</option>
                </select>
                <button
                  onClick={fetchTickets}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  title="Làm mới danh sách vé"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {visibleUnusedTickets.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={allVisibleUnusedSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTicketCodes((current) => Array.from(new Set([...current, ...visibleUnusedTickets.map((ticket) => ticket.code)])));
                      } else {
                        const visibleCodes = new Set(visibleUnusedTickets.map((ticket) => ticket.code));
                        setSelectedTicketCodes((current) => current.filter((code) => !visibleCodes.has(code)));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 accent-red-600"
                  />
                  Chọn toàn bộ {visibleUnusedTickets.length} vé chưa dùng trong danh sách này
                </label>
                <button
                  type="button"
                  onClick={handleRevokeSelectedTickets}
                  disabled={selectedTicketCodes.length === 0}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Thu hồi đã chọn ({selectedTicketCodes.length})
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600 font-bold border-y">
                  <tr>
                    <th className="py-3 px-3" aria-label="Chọn vé" />
                    <th className="py-3 px-3">Mã Vé</th>
                    <th className="py-3 px-3">Dịp Sự Kiện</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3">Thời Gian Dùng</th>
                    <th className="py-3 px-3">Người Dùng</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <tr key={t.code} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-3">
                        {t.status === 'UNUSED' && (
                          <input
                            type="checkbox"
                            checked={selectedTicketCodes.includes(t.code)}
                            onChange={(e) => setSelectedTicketCodes((current) => e.target.checked
                              ? Array.from(new Set([...current, t.code]))
                              : current.filter((code) => code !== t.code))}
                            aria-label={`Chọn vé ${t.code}`}
                            className="h-4 w-4 rounded border-gray-300 accent-red-600"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                        {t.code}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{t.occasion}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            t.status === 'UNUSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'USED'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status === 'UNUSED'
                            ? 'Chưa dùng'
                            : t.status === 'USED'
                            ? 'Đã dùng'
                            : 'Thu hồi'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {t.used_at ? new Date(t.used_at).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 font-medium">
                        {t.used_by || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {t.status === 'UNUSED' && (
                          <button
                            onClick={() => handleRevokeTicket(t.code)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
                          >
                            Thu hồi
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        Không có mã vé nào phù hợp bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLAIMS MANAGEMENT */}
      {activeTab === 'CLAIMS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Danh Sách & Xử Lý Yêu Cầu Nhận Thưởng
                </h3>
                <p className="text-xs text-gray-500">
                  Đối soát thông tin học sinh, phê duyệt và cập nhật mã giao dịch chuyển tiền.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportClaimsCSV('ACCOUNTING')}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-1.5"
                  title="Xuất danh sách các mã đã chi tiền (PAID) và đang chờ (PENDING_PAYOUT) cho bộ phận Kế toán / Ban Giám hiệu đối soát"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Xuất Báo Cáo Kế Toán (PAID + PENDING)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportClaimsCSV('ALL')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5"
                  title="Xuất toàn bộ danh sách trúng thưởng"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Tất Cả</span>
                </button>
                <button
                  onClick={fetchClaims}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                placeholder="Tìm mã CLM, tên, hoặc SĐT..."
                className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm flex-1 min-w-[200px]"
              />

              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNSUBMITTED">Chưa gửi thông tin</option>
                <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                <option value="VERIFIED">Đã xác minh</option>
                <option value="PENDING_PAYOUT">Chờ chuyển tiền</option>
                <option value="PAID">Đã chuyển tiền</option>
                <option value="REJECTED">Bị từ chối</option>
              </select>
            </div>

            {/* Claims Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600 font-bold border-y">
                  <tr>
                    <th className="py-3 px-3">Mã Nhận Thưởng</th>
                    <th className="py-3 px-3">Số Tiền</th>
                    <th className="py-3 px-3">Họ Tên Học Sinh</th>
                    <th className="py-3 px-3">Lớp</th>
                    <th className="py-3 px-3">Số Điện Thoại</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClaims.map((c) => {
                    const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.UNSUBMITTED;
                    return (
                      <tr key={c.claim_code} className="hover:bg-gray-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-red-600">
                          {c.claim_code}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-600">
                          {c.prize_amount.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-800">
                          {c.student_name || <span className="text-gray-400 italic">Chưa điền</span>}
                        </td>
                        <td className="py-3 px-3 text-gray-600">{c.student_class || '—'}</td>
                        <td className="py-3 px-3 font-mono text-gray-700">{c.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedClaim(c);
                              setEditingClaimStatus(c.status);
                              setAdminNote(c.admin_note || '');
                              setTransactionRef(c.transaction_ref || '');
                            }}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition"
                          >
                            Xử lý
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClaims.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        Không có yêu cầu nhận thưởng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Claim Modal */}
          {selectedClaim && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-gray-200">
                <div className="p-5 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-gray-900">
                      Xử Lý Yêu Cầu: <span className="text-red-600 font-mono">{selectedClaim.claim_code}</span>
                    </h4>
                    <p className="text-xs text-gray-500">
                      Giải thưởng: <strong>{selectedClaim.prize_amount.toLocaleString('vi-VN')}đ</strong> (Vé: {selectedClaim.ticket_code})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClaim(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUpdateClaim} className="p-5 space-y-4">
                  {/* Student Details Info */}
                  <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 border border-gray-200">
                    <div>
                      Học sinh: <strong>{selectedClaim.student_name || 'Chưa cung cấp'}</strong>
                    </div>
                    <div>
                      Lớp: <strong>{selectedClaim.student_class || 'Chưa cung cấp'}</strong>
                    </div>
                    <div>
                      SĐT: <strong>{selectedClaim.phone || 'Chưa cung cấp'}</strong>
                    </div>
                    <div>
                      Hình thức nhận:{' '}
                      <strong>
                        {selectedClaim.payout_method === 'BANK_MOMO'
                          ? `Chuyển khoản / MoMo: ${selectedClaim.payout_account || '—'}`
                          : 'Tiền mặt trực tiếp'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cập nhật trạng thái
                    </label>
                    <select
                      value={editingClaimStatus}
                      onChange={(e) => setEditingClaimStatus(e.target.value as ClaimStatus)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold"
                    >
                      <option value="UNSUBMITTED">Chưa gửi thông tin</option>
                      <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                      <option value="VERIFIED">Đã xác minh</option>
                      <option value="PENDING_PAYOUT">Chờ chuyển tiền</option>
                      <option value="PAID">Đã chuyển tiền (Hoàn tất)</option>
                      <option value="REJECTED">Bị từ chối</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mã giao dịch ngân hàng / Số biên lai (nếu có)
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="VD: FT26090123891 hoặc BL-2026-001"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Ghi chú của Ban Tổ Chức (học sinh có thể thấy khi tra cứu)
                    </label>
                    <textarea
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="VD: Đã trao trực tiếp tại phòng Đoàn trường ngày 21/10."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setSelectedClaim(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Lưu Trạng Thái
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Nhật Ký Quản Trị (Audit Logs)</h3>
              <p className="text-xs text-gray-500">
                Ghi nhận các thao tác quan trọng: cấu hình sự kiện, thu hồi vé, duyệt giải thưởng.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-y">
                <tr>
                  <th className="py-2.5 px-3">Thời Gian</th>
                  <th className="py-2.5 px-3">Quản Trị Viên</th>
                  <th className="py-2.5 px-3">Hành Động</th>
                  <th className="py-2.5 px-3">Chi Tiết</th>
                  <th className="py-2.5 px-3">Địa Chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70">
                    <td className="py-2 px-3 text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 font-bold text-gray-800">
                      {log.admin_username}
                    </td>
                    <td className="py-2 px-3 font-semibold text-red-600">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-gray-700 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-2 px-3 text-gray-400 font-mono">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Chưa có nhật ký nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY & OPERATIONAL GUIDE */}
      {activeTab === 'SECURITY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Change Password Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              <span>Đổi Mật Khẩu Quản Trị</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md transition"
              >
                Cập Nhật Mật Khẩu
              </button>
            </form>
          </div>

          {/* Deployment & Operational Instructions Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-3 text-xs leading-relaxed text-gray-700">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Hướng Dẫn Triển Khai & Vận Hành An Toàn</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <strong className="text-blue-900 block mb-1">1. Triển khai Vercel & Serverless Functions:</strong>
                <p>
                  Mã nguồn đã tích hợp sẵn Vercel Serverless Function tại thư mục <code className="bg-white px-1 py-0.5 rounded text-blue-700">api/index.ts</code> và tệp cấu hình <code className="bg-white px-1 py-0.5 rounded text-blue-700">vercel.json</code>. Khi deploy lên Vercel, toàn bộ endpoint <code className="bg-white px-1 py-0.5 rounded text-blue-700">/api/*</code> sẽ tự động ánh xạ vào hàm serverless.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <strong className="text-emerald-900 block mb-1">2. Cơ Sở Dữ Liệu Bền Vững (Firebase Firestore trên Vercel):</strong>
                <p>
                  Dự án sử dụng <strong>Google Firebase Firestore</strong> làm cơ sở dữ liệu phân tán bền vững. Mọi thao tác quan trọng (cấp vé, quay thưởng, trừ tồn kho và tạo claim) được server thực hiện qua <strong>Firestore Transaction</strong> nguyên tử với quy tắc đọc trước - ghi sau, bảo đảm không bao giờ cấp trùng giải dù hàng ngàn học sinh cùng quay một lúc.
                  <br />
                  Để kết nối từ Vercel, hãy vào Firebase Console &gt; Project Settings &gt; Service Accounts &gt; Generate new private key, sau đó thêm vào mục <strong>Environment Variables</strong> trên Vercel:
                  <br />
                  • <code className="bg-white px-1 py-0.5 rounded text-emerald-700 font-bold">FIREBASE_SERVICE_ACCOUNT_KEY</code> (chuỗi JSON của file khóa dịch vụ tải về).
                  <br />
                  • Hoặc bộ 3 biến: <code className="bg-white px-1 py-0.5 rounded text-emerald-700 font-bold">FIREBASE_PROJECT_ID</code>, <code className="bg-white px-1 py-0.5 rounded text-emerald-700 font-bold">FIREBASE_CLIENT_EMAIL</code>, <code className="bg-white px-1 py-0.5 rounded text-emerald-700 font-bold">FIREBASE_PRIVATE_KEY</code>.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <strong className="text-amber-900 block mb-1">3. Bảo Mật Tài Khoản Quản Trị & Học Sinh:</strong>
                <p>
                  • Quản trị viên: Không viết cứng mật khẩu. Đặt mật khẩu ban đầu qua biến môi trường <code className="bg-white px-1 py-0.5 rounded text-amber-700 font-bold">ADMIN_INITIAL_PASSWORD</code>. Nếu không đặt, hệ thống sẽ tự sinh mật khẩu ngẫu nhiên 16 ký tự an toàn khi khởi tạo.
                  <br />
                  • Học sinh: Đăng nhập có mật khẩu riêng để bảo vệ lượt quay và vé dự thưởng của mình, ngăn chặn người khác giả mạo ID.
                </p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <strong className="text-purple-900 block mb-1">4. Chống Gian Lận & Bảo Vệ Quyền Riêng Tư:</strong>
                <p>
                  • Toàn bộ quá trình kiểm tra vé, trừ tồn kho và cấp claim được thực hiện trong <strong>duy nhất 1 transaction</strong> nguyên tử.
                  <br />
                  • Tra cứu mã nhận thưởng công khai được giới hạn tần suất (Rate Limiting) để chống dò mã tự động, đồng thời che họ tên, lớp và số điện thoại (<code className="bg-white px-1 py-0.5 rounded text-purple-700">091****678</code>) để bảo vệ quyền riêng tư của học sinh.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ADMINS MANAGEMENT (Firebase Auth RBAC) */}
      {activeTab === 'ADMINS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white rounded-2xl p-5 border border-amber-500/30 shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-stone-950 rounded-xl shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-200">
                  Phân Quyền Quản Trị Viên Qua Firebase Auth (RBAC)
                </h3>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  Hệ thống kiểm tra danh sách tài khoản được ủy quyền trong bộ sưu tập <code className="bg-stone-800 px-1 py-0.5 rounded text-amber-300 font-mono">admins/</code> trên Firestore. Thầy cô hoặc ban tổ chức chỉ cần đăng nhập bằng tài khoản Google hoặc Email của mình là hệ thống sẽ tự động cấp quyền truy cập toàn bộ trang quản trị mà không cần ghi nhớ mật khẩu riêng.
                </p>
              </div>
            </div>
          </div>

          {/* Add Admin Form */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-600" />
              <span>Cấp Quyền Quản Trị Viên Mới</span>
            </h4>

            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Địa Chỉ Email Google / Tên Tài Khoản
                </label>
                <input
                  type="text"
                  placeholder="vi_du@gmail.com hoặc username"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vai Trò Phân Quyền
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="ADMIN">Quản Trị Viên (ADMIN)</option>
                  <option value="SUPER_ADMIN">Quản Trị Tối Cao (SUPER_ADMIN)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addingAdmin ? 'Đang thêm...' : 'Cấp Quyền'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  Danh Sách Quản Trị Viên Được Cấp Phép ({adminsList.length})
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Các tài khoản sau có quyền điều chỉnh giải thưởng, duyệt claim tiền mặt và phát hành vé sự kiện.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAdmins}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase font-bold">
                    <th className="py-2.5 px-3">Tài Khoản / Email</th>
                    <th className="py-2.5 px-3">Vai Trò</th>
                    <th className="py-2.5 px-3">Định Danh UID</th>
                    <th className="py-2.5 px-3">Ngày Cấp Quyền</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminsList.map((adm) => {
                    const isMasterAdmin = adm.email === 'cuongtt.ptit@gmail.com';
                    return (
                      <tr key={adm.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-3 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-black text-xs">
                              {(adm.username || adm.email || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{adm.email || adm.username}</span>
                                {isMasterAdmin && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-400 text-red-950 rounded uppercase">
                                    Gốc
                                  </span>
                                )}
                              </div>
                              {adm.email && adm.username !== adm.email && (
                                <div className="text-[11px] text-gray-500 font-normal">Tên: {adm.username}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={adm.role}
                            disabled={isMasterAdmin}
                            onChange={(e) => handleUpdateAdminRole(adm.id, e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-75 disabled:bg-gray-100"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MODERATOR">MODERATOR</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-500 max-w-[150px] truncate">
                          {adm.id}
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-500">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString('vi-VN') : 'Mặc định'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isMasterAdmin ? (
                            <span className="text-[11px] font-semibold text-stone-400 italic">
                              Cố định
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(adm.id, adm.email || adm.username)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 hover:border-rose-600 rounded-lg transition active:scale-95"
                              title="Thu hồi quyền quản trị"
                            >
                              Xóa / Thu hồi
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {adminsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        Đang tải danh sách quản trị viên...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
