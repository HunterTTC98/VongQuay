import React from 'react';
import { EventConfig, StudentUser, PRESET_OCCASIONS } from '../types/index.ts';
import { Sparkles, LogIn, Gift, Trophy, Heart, Search, Disc, MessageSquareHeart } from 'lucide-react';

interface EventWelcomeProps {
  event: EventConfig | null;
  currentUser: StudentUser | null;
  onOpenAuth: () => void;
  activeSection: 'WHEEL' | 'CONFESSION' | 'CARDS' | 'PRIZES' | 'LOOKUP';
  onSelectSection: (section: 'WHEEL' | 'CONFESSION' | 'CARDS' | 'PRIZES' | 'LOOKUP') => void;
}

function getOccasionLabel(occasionId?: string) {
  if (!occasionId) return '20/10';
  const matched = PRESET_OCCASIONS.find(
    (o) => o.id === occasionId || occasionId.toLowerCase().includes(o.id.toLowerCase())
  );
  return matched ? matched.shortLabel : 'Sự Kiện';
}

export const EventWelcome: React.FC<EventWelcomeProps> = ({
  event,
  currentUser,
  onOpenAuth,
  activeSection,
  onSelectSection,
}) => {
  const occasionLabel = getOccasionLabel(event?.occasion);

  return (
    <div className="w-full text-center pt-2 pb-6 max-w-4xl mx-auto px-4 select-none">
      {/* 1. Golden Eyebrow Badge */}
      <div className="event-eyebrow inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100/90 dark:bg-[#3d1928] border border-rose-200 dark:border-amber-500/40 text-rose-900 dark:text-amber-300 text-xs sm:text-sm font-extrabold shadow-sm dark:shadow-lg mb-4 transition-colors">
        <span>⚡</span>
        <span className="uppercase tracking-wider font-['Montserrat',sans-serif]">
          VÒNG QUAY MAY MẮN {occasionLabel} · LÌ XÌ VÍ MOMO
        </span>
      </div>

      {/* 2. Main Title in Elegant Display Serif matching reference image */}
      <h1 className="event-hero-title text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-950 via-rose-800 to-amber-900 dark:from-white dark:via-rose-100 dark:to-amber-200 tracking-tight font-serif leading-tight drop-shadow-sm dark:drop-shadow-md mb-3 transition-colors">
        Vòng Quay Hồi Hộp – Rinh Quà Yêu Thương
      </h1>

      {/* 3. Concise Subtitle with highlights matching reference image */}
      <p className="event-subtitle text-sm sm:text-base text-slate-700 dark:text-rose-200/90 max-w-2xl mx-auto leading-relaxed mb-5 font-medium transition-colors">
        Chương trình tri ân tại{' '}
        <strong className="text-amber-900 dark:text-amber-300 font-bold">
          Trường TC Công nghiệp Bách Khoa Sầm Sơn
        </strong>
        . Cơ hội nhận lì xì MoMo từ{' '}
        <strong className="text-rose-700 dark:text-pink-400 font-extrabold">10.000đ đến 100.000đ</strong> cùng
        muôn vàn lời chúc ý nghĩa!
      </p>

      {/* 4. Quick Action Callout Pill Bar */}
      <div className="event-callout inline-flex flex-wrap items-center justify-center gap-3 px-5 py-2.5 rounded-full bg-white dark:bg-[#341126]/90 border border-slate-200 dark:border-rose-500/30 text-xs sm:text-sm text-slate-700 dark:text-rose-100 shadow-md dark:shadow-xl mb-6 backdrop-blur-md transition-colors">
        <span className="text-rose-600 dark:text-rose-400 font-bold">ⓘ</span>
        <span>
          Có thể{' '}
          <strong className="text-slate-900 dark:text-white font-bold">Đăng nhập nhận 3 lượt quay</strong> hoặc{' '}
          <strong className="text-slate-900 dark:text-white font-bold">Nhập mã vé dự thưởng</strong> để quay ngay!
        </span>
        {!currentUser && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-red-950 font-black rounded-full text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>

      {/* 5. Section Switcher Bar (Eliminates long scrolling) */}
      <nav aria-label="Điều hướng nhanh" className="inline-flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 overflow-x-auto pb-1.5 no-scrollbar max-w-full shadow-inner">
        <button
          type="button"
          onClick={() => onSelectSection('WHEEL')}
          className={`event-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSection === 'WHEEL'
              ? 'active bg-gradient-to-r from-amber-500 to-orange-500 text-red-950 shadow-md font-bold'
              : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-rose-200 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Vòng Quay May Mắn</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('CONFESSION')}
          className={`event-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSection === 'CONFESSION'
              ? 'active bg-gradient-to-r from-amber-500 to-orange-500 text-red-950 shadow-md font-bold'
              : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-rose-200 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquareHeart className="w-4 h-4" />
          <span>Trạm Confession</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('CARDS')}
          className={`event-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSection === 'CARDS'
              ? 'active bg-gradient-to-r from-amber-500 to-orange-500 text-red-950 shadow-md font-bold'
              : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-rose-200 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Studio Tạo Thiệp</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('PRIZES')}
          className={`event-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSection === 'PRIZES'
              ? 'active bg-gradient-to-r from-amber-500 to-orange-500 text-red-950 shadow-md font-bold'
              : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-rose-200 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>8 Ô Giải Thưởng</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSection('LOOKUP')}
          className={`event-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSection === 'LOOKUP'
              ? 'active bg-gradient-to-r from-amber-500 to-orange-500 text-red-950 shadow-md font-bold'
              : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-rose-200 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Tra Cứu Giải</span>
        </button>
      </nav>
    </div>
  );
};
