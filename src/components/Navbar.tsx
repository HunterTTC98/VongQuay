import React, { useState, useRef, useEffect } from 'react';
import { EventConfig, StudentUser, AdminUser } from '../types/index.ts';
import {
  Sparkles,
  Shield,
  User,
  Search,
  Gift,
  LogOut,
  Sun,
  Moon,
  Flower2,
  Menu,
  X,
  ChevronDown,
  RotateCw,
  Mail,
  Trophy,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  event: EventConfig | null;
  currentUser: StudentUser | null;
  currentAdmin: AdminUser | null;
  onOpenAuth: (defaultTab?: 'STUDENT' | 'ADMIN') => void;
  onOpenLookup: () => void;
  onOpenUserProfile?: () => void;
  onToggleAdminView: () => void;
  isAdminView: boolean;
  onLogoutUser: () => void;
  onLogoutAdmin: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  petalsEnabled?: boolean;
  onTogglePetals?: () => void;
  onNavigateSection?: (section: 'WHEEL' | 'CARDS' | 'PRIZES' | 'LOOKUP') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  event,
  currentUser,
  currentAdmin,
  onOpenAuth,
  onOpenLookup,
  onOpenUserProfile,
  onToggleAdminView,
  isAdminView,
  onLogoutUser,
  onLogoutAdmin,
  theme = 'dark',
  onToggleTheme,
  petalsEnabled = true,
  onTogglePetals,
  onNavigateSection,
}) => {
  const isDark = theme === 'dark';
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsNavMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNavMenuOpen(false);
    };

    if (isNavMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNavMenuOpen]);

  const handleNavClick = (section: 'WHEEL' | 'CARDS' | 'PRIZES' | 'LOOKUP') => {
    setIsNavMenuOpen(false);
    if (isAdminView) onToggleAdminView();
    if (onNavigateSection) {
      onNavigateSection(section);
    } else {
      if (section === 'WHEEL') document.getElementById('lucky-wheel')?.scrollIntoView({ behavior: 'smooth' });
      else if (section === 'CARDS') document.getElementById('greeting-card-studio')?.scrollIntoView({ behavior: 'smooth' });
      else if (section === 'PRIZES') document.getElementById('prize-matrix-showcase')?.scrollIntoView({ behavior: 'smooth' });
      else if (section === 'LOOKUP') onOpenLookup();
    }
  };

  return (
    <header
      className={`text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] sticky top-0 z-40 border-b transition-colors duration-300 backdrop-blur-md ${
        isDark
          ? 'bg-[#240822]/90 border-amber-400/25'
          : 'bg-gradient-to-r from-red-700 via-rose-700 to-amber-600 border-amber-400/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-14 sm:h-18 items-center justify-between gap-2">
          {/* Left: Logo & School Event Title */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink min-w-0"
            onClick={() => {
              if (isAdminView) onToggleAdminView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-red-800 flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(251,191,36,0.5)] border-2 border-white ring-2 ring-amber-300 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-['Montserrat',sans-serif] font-black tracking-tight text-sm sm:text-lg uppercase drop-shadow truncate">
                  Bách Khoa Events
                </span>
                {event && (
                  <span
                    className={`hidden sm:inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold shadow-sm uppercase ${
                      event.status === 'ACTIVE'
                        ? 'bg-emerald-500 text-white'
                        : event.status === 'PAUSED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-600 text-white'
                    }`}
                  >
                    {event.status === 'ACTIVE'
                      ? 'Đang mở'
                      : event.status === 'PAUSED'
                      ? 'Tạm dừng'
                      : 'Kết thúc'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100 hidden md:block font-medium truncate">
                {event?.name || 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn'}
              </p>
            </div>
          </div>

          {/* Center / Right: Multi-Level Navigation Menu + Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0" ref={menuRef}>
            {/* Multi-Level Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all border ${
                  isNavMenuOpen
                    ? 'bg-amber-400 text-red-950 border-white shadow-glow-gold'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
                aria-expanded={isNavMenuOpen}
                aria-haspopup="true"
                title="Khám phá menu đa cấp các hoạt động"
              >
                <Menu className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Khám Phá</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isNavMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Multi-level Dropdown Drawer / Panel */}
              {isNavMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border p-3 z-50 animate-fade-in backdrop-blur-2xl ${
                    isDark
                      ? 'bg-[#220722]/95 border-amber-400/30 text-white shadow-glow-gold'
                      : 'bg-white/95 border-rose-200 text-gray-900'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Nhóm 1: Hoạt động & Trò chơi */}
                    <div>
                      <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-between">
                        <span>Sự Kiện & Trò Chơi</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="space-y-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleNavClick('WHEEL')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left transition ${
                            isDark
                              ? 'hover:bg-white/10 text-rose-100 hover:text-white'
                              : 'hover:bg-rose-50 text-gray-800 hover:text-rose-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-red-950 flex items-center justify-center shrink-0 shadow-sm">
                            <RotateCw className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-['Montserrat',sans-serif]">Vòng Quay May Mắn</div>
                            <div className="text-[10px] text-amber-300/80 font-normal">Quay thưởng MoMo & Lời chúc</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavClick('CARDS')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left transition ${
                            isDark
                              ? 'hover:bg-white/10 text-rose-100 hover:text-white'
                              : 'hover:bg-rose-50 text-gray-800 hover:text-rose-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-['Montserrat',sans-serif]">Studio Thiệp Điện Tử</div>
                            <div className="text-[10px] text-rose-300/80 font-normal">Tạo thiệp nghệ thuật & Lời chúc</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavClick('PRIZES')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left transition ${
                            isDark
                              ? 'hover:bg-white/10 text-rose-100 hover:text-white'
                              : 'hover:bg-rose-50 text-gray-800 hover:text-rose-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-['Montserrat',sans-serif]">Cơ Cấu Giải Thưởng</div>
                            <div className="text-[10px] text-indigo-300/80 font-normal">8 Ô giải thưởng chính thức</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Nhóm 2: Tiện ích & Tra cứu */}
                    <div className="border-t border-white/10 pt-2">
                      <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400">
                        Tiện Ích & Tra Cứu
                      </div>
                      <div className="space-y-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleNavClick('LOOKUP')}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left transition ${
                            isDark
                              ? 'hover:bg-white/10 text-rose-100 hover:text-white'
                              : 'hover:bg-rose-50 text-gray-800 hover:text-rose-700'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div>Tra Cứu Mã Trúng Thưởng</div>
                            <div className="text-[10px] text-emerald-300/80 font-normal">Kiểm tra trạng thái & Nhận tiền MoMo</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Quick Setting Toggles inside Drawer */}
                    <div className="border-t border-white/10 pt-2 flex items-center justify-between px-2 text-xs">
                      <span className="text-gray-300 font-semibold">Tùy biến:</span>
                      <div className="flex items-center gap-1.5">
                        {onTogglePetals && (
                          <button
                            type="button"
                            onClick={onTogglePetals}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                              petalsEnabled
                                ? 'bg-rose-500/30 text-rose-200 border-rose-300/40'
                                : 'bg-white/10 text-white/50 border-white/10'
                            }`}
                            title="Bật/Tắt cánh hoa rơi"
                          >
                            <Flower2 className="w-3 h-3" />
                            <span>Hoa rơi</span>
                          </button>
                        )}
                        {onToggleTheme && (
                          <button
                            type="button"
                            onClick={onToggleTheme}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/15 text-amber-300 border border-white/20 flex items-center gap-1"
                            title="Đổi giao diện sáng/tối"
                          >
                            {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                            <span>{isDark ? 'Sáng' : 'Tối'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tra cứu icon */}
            <button
              onClick={onOpenLookup}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs sm:text-sm font-semibold backdrop-blur-md border border-white/20 shadow-sm"
              title="Tra cứu mã nhận thưởng"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span className="navbar-lookup-label hidden lg:inline">Tra cứu</span>
            </button>

            {/* Falling Petals Toggle Button */}
            {onTogglePetals && (
              <button
                type="button"
                onClick={onTogglePetals}
                className={`p-1.5 sm:p-2 rounded-xl transition active:scale-95 border relative backdrop-blur-md shadow-sm ${
                  petalsEnabled
                    ? 'bg-rose-500/30 text-rose-200 border-rose-300/40 hover:bg-rose-500/40 shadow-glow-rose'
                    : 'bg-white/10 text-white/50 border-white/10 hover:bg-white/20'
                }`}
                title={petalsEnabled ? 'Tắt cánh hoa rơi' : 'Bật cánh hoa rơi'}
                aria-label="Bật tắt cánh hoa rơi"
              >
                <Flower2 className="w-4 h-4" />
                {petalsEnabled && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            )}

            {/* Light / Dark Mode Toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 sm:p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-amber-300 border border-white/20 backdrop-blur-md shadow-sm"
                title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                aria-label="Chuyển đổi giao diện sáng tối"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Student Account Status / Login */}
            {currentUser ? (
              <div className="flex items-center bg-amber-500/25 border border-amber-300/40 rounded-xl p-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm shadow-sm backdrop-blur-md">
                <button
                  type="button"
                  onClick={onOpenUserProfile}
                  className="flex items-center text-left mr-2 group hover:opacity-90 transition"
                  title="Mở hồ sơ cá nhân, lịch sử quay & mã vé"
                >
                  {currentUser.photoUrl ? (
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.fullName || currentUser.username}
                      className="w-7 h-7 rounded-full border border-amber-300 mr-2 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-red-900 font-black flex items-center justify-center mr-2 text-xs shrink-0 shadow-sm">
                      {(currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-100 truncate max-w-[85px] sm:max-w-[130px] group-hover:underline">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <span className="navbar-free-spins text-[10px] text-amber-200">
                      {currentUser.freeSpinsRemaining} lượt free
                    </span>
                  </div>
                </button>
                <button
                  onClick={onLogoutUser}
                  className="p-1 hover:bg-white/20 rounded text-amber-200 hover:text-white"
                  title="Đăng xuất tài khoản"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('STUDENT')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-red-950 font-black text-xs sm:text-sm shadow-glow-gold active:scale-95 transition"
              >
                <Gift className="w-4 h-4 text-red-700" />
                <span className="navbar-reward-label">Nhận 3 lượt</span>
              </button>
            )}

            {/* Admin Switcher */}
            {currentAdmin ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={onToggleAdminView}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition ${
                    isAdminView
                      ? 'bg-zinc-900 text-amber-400 border border-amber-500/50'
                      : 'bg-white text-red-700 hover:bg-amber-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{isAdminView ? 'Về Vòng Quay' : 'Quản Trị'}</span>
                </button>
                <button
                  onClick={onLogoutAdmin}
                  className="p-1.5 hover:bg-red-800 rounded text-red-200"
                  title="Đăng xuất Quản trị viên"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('ADMIN')}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-black/20 hover:bg-black/35 text-xs sm:text-sm font-medium border border-white/10 active:scale-95 transition backdrop-blur-md"
                title="Đăng nhập Ban Tổ Chức"
              >
                <Shield className="w-4 h-4 text-amber-300" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
