import React, { useState, useEffect } from 'react';
import { StudentUser, Ticket, UserSpinRecord, Claim, UserProfileData, ClaimStatus } from '../types/index.ts';
import { STATUS_MAP } from './ClaimLookup.tsx';
import {
  User,
  Ticket as TicketIcon,
  Trophy,
  History,
  X,
  Sparkles,
  Edit2,
  Check,
  AlertCircle,
  ExternalLink,
  Shield,
  Gift,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentUser: StudentUser | null;
  onProfileUpdated: (updatedUser: StudentUser) => void;
  onSelectTicketToSpin: (ticketCode: string) => void;
  onOpenClaimModal: (claimCode: string, prizeAmount: number) => void;
  onSwitchToAdmin?: () => void;
  isAdmin?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUser,
  onProfileUpdated,
  onSelectTicketToSpin,
  onOpenClaimModal,
  onSwitchToAdmin,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TICKETS' | 'SPINS' | 'CLAIMS'>('OVERVIEW');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchUserProfile();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.fullName || '');
      setEditClass(currentUser.studentClass || '');
    }
  }, [currentUser]);

  const fetchUserProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tải hồ sơ cá nhân');
      }
      setProfileData(data.profile);
      if (data.profile.user) {
        setEditFullName(data.profile.user.fullName || '');
        setEditClass(data.profile.user.studentClass || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải hồ sơ cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentUser) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          studentClass: editClass.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật thông tin thất bại');
      }
      const updatedUser: StudentUser = {
        ...currentUser,
        fullName: data.user.fullName,
        studentClass: data.user.studentClass,
      };
      onProfileUpdated(updatedUser);
      setIsEditing(false);
      setSaveSuccessMsg('Đã lưu thông tin cá nhân thành công!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      fetchUserProfile();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu thông tin');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isOpen) return null;

  const user = profileData?.user || currentUser;
  const tickets = profileData?.tickets || [];
  const spins = profileData?.spins || [];
  const claims = profileData?.claims || [];
  const hasAdminPrivilege = profileData?.isAdmin || isAdmin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-amber-600 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName || user.username}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-3 border-amber-300 shadow-md object-cover"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-400 text-red-900 border-3 border-white shadow-md flex items-center justify-center font-black text-2xl">
                  {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {hasAdminPrivilege && (
                <span
                  title="Tài khoản Quản trị viên Bách Khoa"
                  className="absolute -bottom-1 -right-1 bg-zinc-900 text-amber-400 p-1 rounded-full border border-amber-300 shadow"
                >
                  <Shield className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                  {user?.fullName || user?.username}
                </h2>
                {hasAdminPrivilege && (
                  <span className="bg-amber-400 text-red-950 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Ban Quản Trị
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-amber-100 font-medium truncate mt-0.5">
                {user?.email || user?.username}
                {user?.studentClass && ` · Lớp: ${user.studentClass}`}
              </p>

              {/* Quick stats badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="bg-white/20 backdrop-blur-md text-amber-200 border border-white/20 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-300" />
                  {user?.freeSpinsRemaining ?? 0} lượt quay miễn phí
                </span>
                <span className="bg-white/20 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-300" />
                  {user?.totalSpins ?? spins.length} lượt đã quay
                </span>
                <span className="bg-white/20 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                  <TicketIcon className="w-3.5 h-3.5 text-amber-300" />
                  {tickets.length} vé dự thưởng
                </span>
              </div>
            </div>

            {hasAdminPrivilege && onSwitchToAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onSwitchToAdmin();
                }}
                className="mt-2 sm:mt-0 px-3.5 py-2 rounded-xl bg-zinc-950 text-amber-400 font-bold text-xs sm:text-sm border border-amber-400/40 hover:bg-zinc-900 shadow-md inline-flex items-center gap-1.5 transition active:scale-95"
              >
                <Shield className="w-4 h-4" />
                Vào Quản Trị
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-stone-100 border-b border-stone-200 px-4 flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex space-x-1 sm:space-x-2 py-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-white text-red-700 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-4 h-4" />
              Tổng Quan
            </button>
            <button
              onClick={() => setActiveTab('TICKETS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'TICKETS'
                  ? 'bg-white text-red-700 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TicketIcon className="w-4 h-4" />
              Vé Của Tôi ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('SPINS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SPINS'
                  ? 'bg-white text-red-700 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-4 h-4" />
              Lịch Sử Quay ({spins.length})
            </button>
            <button
              onClick={() => setActiveTab('CLAIMS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'CLAIMS'
                  ? 'bg-white text-red-700 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Giải Thưởng ({claims.length})
            </button>
          </div>

          <button
            onClick={fetchUserProfile}
            disabled={loading}
            className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200/60 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" />
                    Thông Tin Tài Khoản
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Họ và tên học sinh / cán bộ
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn Nam"
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Lớp / Đơn vị trực thuộc
                      </label>
                      <input
                        type="text"
                        value={editClass}
                        onChange={(e) => setEditClass(e.target.value)}
                        placeholder="Ví dụ: K17 CNTT, Lớp Điện 2..."
                        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-200 transition"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-1.5 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded-xl border border-stone-200/70">
                      <span className="text-xs text-stone-500 font-medium block">Họ và tên</span>
                      <span className="font-bold text-stone-900">{user?.fullName || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200/70">
                      <span className="text-xs text-stone-500 font-medium block">Lớp / Chi đoàn</span>
                      <span className="font-bold text-stone-900">{user?.studentClass || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200/70">
                      <span className="text-xs text-stone-500 font-medium block">Email đăng nhập</span>
                      <span className="font-semibold text-stone-800 truncate block">
                        {user?.email || user?.username}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200/70">
                      <span className="text-xs text-stone-500 font-medium block">Mã học sinh / UID</span>
                      <span className="font-mono text-xs text-stone-700 truncate block">{user?.id}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Free spins & Lucky wheel banner */}
              <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div>
                  <h4 className="font-black text-lg flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    Bạn còn {user?.freeSpinsRemaining ?? 0} lượt quay chúc mừng miễn phí!
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-100 mt-1">
                    Mỗi tài khoản đăng nhập được tặng ngay 3 lượt quay đón lộc chúc mừng các dịp lễ Bách Khoa.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    document.getElementById('lucky-wheel')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-white text-red-700 font-bold rounded-xl text-sm hover:bg-amber-50 shadow-md transition shrink-0 active:scale-95"
                >
                  Quay ngay
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TICKETS */}
          {activeTab === 'TICKETS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-stone-600 font-medium">
                  Mỗi tài khoản được nhận 1 vé dự thưởng miễn phí cho mỗi dịp lễ để quay giải thưởng tiền mặt.
                </p>
              </div>

              {tickets.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <TicketIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-700">Bạn chưa nhận vé dự thưởng nào</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Hãy bấm nút "Nhận vé dự thưởng dịp này" tại trang chính để nhận vé may mắn!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tickets.map((t) => (
                    <div
                      key={t.code}
                      className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm hover:border-amber-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              t.status === 'UNUSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'USED'
                                ? 'bg-stone-100 text-stone-600'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {t.status === 'UNUSED' ? 'Chưa sử dụng' : t.status === 'USED' ? 'Đã sử dụng' : 'Đã thu hồi'}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">Dịp: {t.occasion}</span>
                        </div>
                        <div className="font-mono font-black text-lg text-red-700 tracking-wider my-1">
                          {t.code}
                        </div>
                        <p className="text-xs text-stone-500">
                          Tạo ngày: {new Date(t.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>

                      {t.status === 'UNUSED' && (
                        <button
                          onClick={() => {
                            onSelectTicketToSpin(t.code);
                            onClose();
                          }}
                          className="mt-3 w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-red-950 font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          Dùng vé quay thưởng
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPINS */}
          {activeTab === 'SPINS' && (
            <div className="space-y-3">
              {spins.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <History className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-700">Chưa có lượt quay nào</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Hãy thử vận may với vòng quay Bách Khoa Events ngay hôm nay!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {spins.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            s.isWin
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {s.isWin ? <Trophy className="w-4 h-4 text-amber-600" /> : '✿'}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{s.prizeName}</div>
                          <div className="text-xs text-stone-500 flex items-center gap-2">
                            <span>{new Date(s.createdAt).toLocaleString('vi-VN')}</span>
                            <span>·</span>
                            <span className="font-semibold text-stone-600">
                              {s.spinType === 'FREE'
                                ? 'Lượt quay miễn phí'
                                : s.spinType === 'TICKET'
                                ? `Vé ${s.ticketCode}`
                                : 'Quay thử'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {s.isWin && s.prizeAmount > 0 ? (
                          <div>
                            <span className="font-black text-emerald-600 text-sm">
                              +{s.prizeAmount.toLocaleString('vi-VN')}đ
                            </span>
                            {s.claimCode && (
                              <div className="font-mono text-[11px] text-stone-500">Mã: {s.claimCode}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-500">Lời chúc</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLAIMS */}
          {activeTab === 'CLAIMS' && (
            <div className="space-y-4">
              {claims.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <Trophy className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-700">Chưa có phần thưởng tiền mặt nào</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Quay trúng các ô tiền mặt (10k, 20k, 50k, 100k) bằng vé dự thưởng để nhận giải!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map((c) => {
                    const statusInfo = STATUS_MAP[c.status as ClaimStatus] || {
                      label: c.status,
                      color: 'bg-stone-100 text-stone-700',
                      desc: '',
                    };
                    const isUnsubmitted = c.status === 'UNSUBMITTED';

                    return (
                      <div
                        key={c.claim_code}
                        className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-red-700 text-base">
                              {c.claim_code}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-stone-900">
                            Giá trị giải:{' '}
                            <span className="text-emerald-600 font-extrabold text-base">
                              {Number(c.prize_amount).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                          <p className="text-xs text-stone-500">
                            Tạo ngày: {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''}
                            {c.payout_method && ` · Hình thức: ${c.payout_method === 'BANK_MOMO' ? 'MoMo / Ngân hàng' : 'Nhận trực tiếp'}`}
                          </p>
                        </div>

                        {isUnsubmitted && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenClaimModal(c.claim_code, Number(c.prize_amount));
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                          >
                            Điền thông tin nhận tiền
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
