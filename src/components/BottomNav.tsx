import React from 'react';
import {
  RotateCw,
  MessageSquareHeart,
  CalendarDays,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react';

export type NavTabId = 'WHEEL' | 'CONFESSION' | 'TIMELINE' | 'CARDS' | 'LOOKUP';

interface BottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  theme?: 'dark' | 'light';
  freeSpins?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  theme = 'dark',
  freeSpins = 0,
}) => {
  const isDark = theme === 'dark';

  const navItems: { id: NavTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'WHEEL',
      label: 'Vòng Quay',
      icon: <RotateCw className="w-5 h-5" />,
      badge: freeSpins > 0 ? `${freeSpins}` : undefined,
    },
    {
      id: 'CONFESSION',
      label: 'Confession',
      icon: <MessageSquareHeart className="w-5 h-5" />,
      badge: '+1 Quay',
    },
    {
      id: 'TIMELINE',
      label: 'Sự Kiện',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'CARDS',
      label: 'Tạo Thiệp',
      icon: <Mail className="w-5 h-5" />,
    },
    {
      id: 'LOOKUP',
      label: 'Tra Cứu',
      icon: <Search className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-colors duration-300 pb-safe ${
        isDark
          ? 'bg-[#1e071c]/95 border-t border-amber-400/25 shadow-[0_-8px_25px_rgba(0,0,0,0.7)] backdrop-blur-2xl'
          : 'bg-white/95 border-t border-rose-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-2xl'
      }`}
      aria-label="Thanh điều hướng ứng dụng"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center h-full py-1 transition-all ${
                isActive
                  ? isDark
                    ? 'text-amber-300 font-extrabold scale-105'
                    : 'text-rose-700 font-extrabold scale-105'
                  : isDark
                  ? 'text-rose-200/60 hover:text-white font-medium'
                  : 'text-stone-500 hover:text-stone-900 font-medium'
              }`}
            >
              {/* Active Tab Glow Dot */}
              {isActive && (
                <span
                  className={`absolute top-1.5 w-1.5 h-1.5 rounded-full ${
                    isDark ? 'bg-amber-400 shadow-[0_0_8px_#fde047]' : 'bg-rose-600'
                  }`}
                />
              )}

              {/* Badge for Gamification Incentive */}
              {item.badge && (
                <span
                  className={`absolute top-1 right-2 sm:right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black leading-tight tracking-tighter ${
                    item.id === 'CONFESSION'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white animate-pulse shadow-sm'
                      : 'bg-amber-400 text-stone-950 shadow-sm'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              <div
                className={`p-1 rounded-xl transition ${
                  isActive
                    ? isDark
                      ? 'bg-amber-400/15'
                      : 'bg-rose-100'
                    : 'bg-transparent'
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
