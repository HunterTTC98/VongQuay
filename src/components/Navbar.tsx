import React from 'react';
import { EventConfig, StudentUser, AdminUser } from '../types/index.ts';
import { Sparkles, Shield, User, Search, Gift, LogOut } from 'lucide-react';

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
}) => {
  return (
    <header className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white shadow-lg sticky top-0 z-40 border-b border-amber-400/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 sm:h-18 items-center justify-between gap-2">
          {/* Logo & School Event Title */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink min-w-0"
            onClick={() => isAdminView && onToggleAdminView()}
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-400 text-red-700 flex items-center justify-center font-black text-lg shadow-md border-2 border-white ring-2 ring-amber-300 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold tracking-tight text-sm sm:text-lg uppercase drop-shadow-sm truncate">
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

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Tra cứu nhận thưởng */}
            <button
              onClick={onOpenLookup}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs sm:text-sm font-semibold backdrop-blur-sm border border-white/20"
              title="Tra cứu mã nhận thưởng"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span className="navbar-lookup-label hidden md:inline">Tra cứu giải</span>
              <span className="navbar-lookup-label md:hidden">Tra cứu</span>
            </button>

            {/* Student Account Status / Login */}
            {currentUser ? (
              <div className="flex items-center bg-amber-500/30 border border-amber-300/40 rounded-lg p-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm">
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
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-red-900 font-black flex items-center justify-center mr-2 text-xs shrink-0">
                      {(currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-100 truncate max-w-[90px] sm:max-w-[130px] group-hover:underline">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <span className="navbar-free-spins text-[10px] sm:text-[11px] text-amber-200">
                      {currentUser.freeSpinsRemaining} lượt quay free
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
                className="inline-flex items-center space-x-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-red-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition"
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
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md transition ${
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
                className="p-2 sm:px-3 sm:py-2 rounded-lg bg-black/20 hover:bg-black/35 text-xs sm:text-sm font-medium border border-white/10 active:scale-95 transition"
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
