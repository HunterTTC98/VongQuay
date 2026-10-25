import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Send,
  Gift,
  ArrowRight,
} from 'lucide-react';

export interface MilestoneEvent {
  id: string;
  name: string;
  subtitle: string;
  dateStr: string; // e.g. "20/11"
  fullDate: string; // ISO date for countdown
  isActive: boolean;
  statusLabel: string;
  icon: string;
  gradient: string;
  glowColor: string;
  tag: string;
  highlights: string[];
}

const MILESTONES: MilestoneEvent[] = [
  {
    id: '20_11',
    name: 'Ngày Nhà Giáo Việt Nam',
    subtitle: 'Tri ân Thầy Cô & Mái trường Bách Khoa Sầm Sơn',
    dateStr: '20/11',
    fullDate: '2026-11-20T00:00:00',
    isActive: true,
    statusLabel: 'ĐANG DIỄN RA',
    icon: '👨‍🏫',
    gradient: 'from-purple-900/90 via-pink-900/90 to-rose-950/90',
    glowColor: 'shadow-[0_0_35px_rgba(244,63,94,0.45)] border-pink-400',
    tag: 'TÂM ĐIỂM SỰ KIỆN',
    highlights: ['Vòng quay may mắn tiền mặt MoMo', 'Gửi Confession nhận +1 lượt quay', 'Thiệp điện tử nghệ thuật'],
  },
  {
    id: '01_01',
    name: 'Tết Dương Lịch 2026',
    subtitle: 'Đón Chào Năm Mới & Khởi Đầu Rực Rỡ',
    dateStr: '01/01',
    fullDate: '2027-01-01T00:00:00',
    isActive: false,
    statusLabel: 'SẮP DIỄN RA',
    icon: '🎆',
    gradient: 'from-blue-950/90 via-indigo-950/90 to-cyan-950/90',
    glowColor: 'shadow-[0_0_25px_rgba(56,189,248,0.25)] border-cyan-400/50',
    tag: 'CHÀO NĂM MỚI',
    highlights: ['Lì xì công nghệ đầu xuân', 'Bảng vinh danh sinh viên', 'Đếm ngược giao thừa'],
  },
  {
    id: 'TET',
    name: 'Tết Nguyên Đán Bính Ngọ',
    subtitle: 'Khai Xuân Đắc Lộc - Rộn Ràng Hương Sắc',
    dateStr: '17/02',
    fullDate: '2027-02-17T00:00:00',
    isActive: false,
    statusLabel: 'MÙA LỄ HỘI',
    icon: '🧧',
    gradient: 'from-amber-950/90 via-red-950/90 to-rose-950/90',
    glowColor: 'shadow-[0_0_25px_rgba(251,191,36,0.3)] border-amber-400/50',
    tag: 'TẾT TRUYỀN THỐNG',
    highlights: ['Hái lộc may mắn', 'Cơn mưa bao lì xì may mắn', 'Thiệp chúc Tết truyền thống'],
  },
  {
    id: '08_03',
    name: 'Quốc Tế Phụ Nữ 8/3',
    subtitle: 'Tôn Vinh Phái Đẹp & Nữ Sinh Bách Khoa',
    dateStr: '08/03',
    fullDate: '2027-03-08T00:00:00',
    isActive: false,
    statusLabel: 'SỰ KIỆN NỮ SINH',
    icon: '💐',
    gradient: 'from-rose-950/90 via-pink-950/90 to-fuchsia-950/90',
    glowColor: 'shadow-[0_0_25px_rgba(244,114,182,0.3)] border-pink-400/50',
    tag: 'TÔN VINH PHÁI ĐẸP',
    highlights: ['Bó hoa ảo tri ân', 'Vé quay ưu tiên phái nữ', 'Lời chúc ngọt ngào giấu tên'],
  },
  {
    id: '26_03',
    name: 'Thành Lập Đoàn TNCS HCM',
    subtitle: 'Sức Trẻ Sôi Nổi & Khát Vọng Tương Lai',
    dateStr: '26/03',
    fullDate: '2027-03-26T00:00:00',
    isActive: false,
    statusLabel: 'HỘI TRẠI TUỔI TRẺ',
    icon: '🔥',
    gradient: 'from-cyan-950/90 via-emerald-950/90 to-teal-950/90',
    glowColor: 'shadow-[0_0_25px_rgba(52,211,153,0.3)] border-emerald-400/50',
    tag: 'HỘI TRẠI THANH NIÊN',
    highlights: ['Mini-game rinh quà công nghệ', 'Bình chọn lớp sôi động nhất', 'Huy hiệu Đoàn viên Bách Khoa'],
  },
];

interface EventRoadmapProps {
  theme?: 'dark' | 'light';
  onSelectEvent?: (eventId: string) => void;
  onNavigateSection?: (section: 'WHEEL' | 'CARDS') => void;
}

export const EventRoadmap: React.FC<EventRoadmapProps> = ({
  theme = 'dark',
  onSelectEvent,
  onNavigateSection,
}) => {
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('20_11');

  // Real-time Countdown Clocks
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateTimeLeft = (targetIso: string) => {
    const diff = new Date(targetIso).getTime() - now;
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, isPast: false };
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="event-roadmap"
      className={`scroll-mt-24 rounded-3xl p-5 sm:p-7 transition-colors duration-300 border relative overflow-hidden shadow-2xl ${
        isDark
          ? 'bg-[#1e071c]/90 border-amber-400/20 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]'
          : 'bg-white border-rose-200/90 shadow-[0_10px_35px_rgba(244,63,94,0.06)]'
      }`}
    >
      {/* Ambient background decorative light spots */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-pink-500/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-gradient-to-tl from-amber-500/20 to-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar of Roadmap */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-rose-500/15">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1.5 shadow-sm bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-400/30">
            <Flame className="w-3.5 h-3.5 text-pink-400" />
            <span>Bản Đồ Hành Trình Lễ Hội · Growth Roadmap</span>
          </div>
          <h2
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            Các Dịp Lễ & Sự Kiện Hot Bách Khoa
          </h2>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${
              isDark ? 'text-rose-200/70' : 'text-stone-600'
            }`}
          >
            Đếm ngược thời gian thực, hoàn thành nhiệm vụ confession để rinh lượt quay may mắn theo từng chặng.
          </p>
        </div>

        {/* Horizontal Navigation Arrows */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className={`p-2 rounded-xl border transition shadow-sm ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700'
            }`}
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className={`p-2 rounded-xl border transition shadow-sm ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700'
            }`}
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Roadmap Cards Container */}
      <div
        ref={scrollRef}
        className="relative z-10 flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory focus:outline-none scrollbar-thin scrollbar-thumb-amber-400/40"
        style={{ scrollbarWidth: 'thin' }}
      >
        {MILESTONES.map((m) => {
          const timeLeft = calculateTimeLeft(m.fullDate);
          const isSelected = selectedMilestoneId === m.id;

          return (
            <div
              key={m.id}
              onClick={() => {
                setSelectedMilestoneId(m.id);
                onSelectEvent && onSelectEvent(m.id);
              }}
              className={`snap-start shrink-0 w-[290px] sm:w-[330px] rounded-2xl p-5 border transition-all duration-300 cursor-pointer relative flex flex-col justify-between group ${
                m.isActive
                  ? `${m.glowColor} ring-2 ring-pink-500/60 ${
                      isDark
                        ? `bg-gradient-to-b ${m.gradient}`
                        : 'bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50 border-rose-400 shadow-lg'
                    }`
                  : isDark
                  ? `bg-gradient-to-b ${m.gradient} border-white/10 hover:border-white/25`
                  : 'bg-stone-50 hover:bg-white border-stone-200/90 hover:border-stone-300 shadow-sm'
              }`}
            >
              {/* Active Glowing Pulse Pin */}
              {m.isActive && (
                <div className="absolute -top-2.5 -right-2.5 z-20">
                  <span className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[10px] items-center justify-center font-black shadow-md">
                      ★
                    </span>
                  </span>
                </div>
              )}

              {/* Card Top: Date & Status */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl filter drop-shadow">{m.icon}</span>
                    <span
                      className={`text-xl font-black font-['Montserrat',sans-serif] tracking-tight ${
                        isDark ? 'text-amber-300' : 'text-rose-700'
                      }`}
                    >
                      {m.dateStr}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                      m.isActive
                        ? 'bg-pink-500 text-white border-pink-300 animate-pulse'
                        : isDark
                        ? 'bg-white/15 text-rose-200 border-white/20'
                        : 'bg-stone-200 text-stone-700 border-stone-300'
                    }`}
                  >
                    {m.statusLabel}
                  </span>
                </div>

                <h3
                  className={`text-base sm:text-lg font-black tracking-tight mb-1 group-hover:text-amber-300 transition ${
                    isDark ? 'text-white' : 'text-stone-900'
                  }`}
                >
                  {m.name}
                </h3>
                <p
                  className={`text-xs line-clamp-2 mb-4 ${
                    isDark ? 'text-rose-100/75' : 'text-stone-600'
                  }`}
                >
                  {m.subtitle}
                </p>

                {/* Countdown Timer Display */}
                <div
                  className={`p-3 rounded-xl border mb-4 backdrop-blur-md ${
                    isDark
                      ? 'bg-black/35 border-white/10 text-white'
                      : 'bg-white/90 border-rose-200 text-stone-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5 text-amber-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {m.isActive ? 'Thời Gian Còn Lại' : 'Đếm Ngược Khai Mạc'}
                    </span>
                    <span>2026</span>
                  </div>

                  {m.isActive ? (
                    <div className="flex items-center justify-center py-1">
                      <span className="px-3 py-1 rounded-lg text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-pulse">
                        SỰ KIỆN ĐANG MỞ · THAM GIA NGAY
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1 text-center font-mono">
                      <div className="p-1 rounded bg-black/20">
                        <span className="text-base font-black text-amber-300">{timeLeft.days}</span>
                        <span className="block text-[8px] uppercase tracking-tighter text-zinc-400">Ngày</span>
                      </div>
                      <div className="p-1 rounded bg-black/20">
                        <span className="text-base font-black text-amber-300">{timeLeft.hours}</span>
                        <span className="block text-[8px] uppercase tracking-tighter text-zinc-400">Giờ</span>
                      </div>
                      <div className="p-1 rounded bg-black/20">
                        <span className="text-base font-black text-amber-300">{timeLeft.minutes}</span>
                        <span className="block text-[8px] uppercase tracking-tighter text-zinc-400">Phút</span>
                      </div>
                      <div className="p-1 rounded bg-black/20">
                        <span className="text-base font-black text-amber-300">{timeLeft.seconds}</span>
                        <span className="block text-[8px] uppercase tracking-tighter text-zinc-400">Giây</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlights List */}
                <div className="space-y-1.5 mb-4">
                  {m.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span
                        className={`truncate ${
                          isDark ? 'text-rose-100/90' : 'text-stone-700 font-medium'
                        }`}
                      >
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Interactive CTA */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateSection) onNavigateSection('WHEEL');
                    else document.getElementById('lucky-wheel')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition ${
                    m.isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 hover:brightness-110 shadow-glow-gold'
                      : isDark
                      ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                      : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{m.isActive ? 'Vòng Quay Ngay' : 'Khám Phá Quà'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
