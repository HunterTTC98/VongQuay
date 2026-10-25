import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Zap, Gift, Heart, Volume2, VolumeX } from 'lucide-react';

interface TickerItem {
  id: string;
  avatarText: string;
  message: string;
  tag: string;
  tagColor: string;
  timeAgo: string;
}

const INITIAL_TICKER_ITEMS: TickerItem[] = [
  {
    id: 't-1',
    avatarText: '#342',
    message: 'Ẩn danh #342 vừa trúng 100.000đ MoMo tại Vòng quay Bách Khoa!',
    tag: 'GIẢI ĐẶC BIỆT',
    tagColor: 'from-amber-500 to-yellow-300 text-stone-950',
    timeAgo: '1 phút trước',
  },
  {
    id: 't-2',
    avatarText: '#518',
    message: 'Ẩn danh #518 vừa gửi Confession tới Cô Thảo và nhận ngay +1 lượt quay!',
    tag: 'CONFESSION +1 LƯỢT',
    tagColor: 'from-pink-500 to-rose-500 text-white',
    timeAgo: '3 phút trước',
  },
  {
    id: 't-3',
    avatarText: '#209',
    message: 'Ẩn danh #209 vừa trúng 50.000đ MoMo ở sự kiện Tri Ân 20/11!',
    tag: 'TIỀN MẶT',
    tagColor: 'from-emerald-500 to-teal-400 text-white',
    timeAgo: '5 phút trước',
  },
  {
    id: 't-4',
    avatarText: '#881',
    message: 'Ẩn danh #881 vừa trúng Bình giữ nhiệt Lock&Lock phiên bản Bách Khoa!',
    tag: 'QUÀ HIỆN VẬT',
    tagColor: 'from-cyan-500 to-blue-500 text-white',
    timeAgo: '8 phút trước',
  },
  {
    id: 't-5',
    avatarText: '#773',
    message: 'Ẩn danh #773 vừa gửi lời chúc mừng ngày Nhà giáo và nhận vé quay số!',
    tag: 'CONFESSION +1 LƯỢT',
    tagColor: 'from-pink-500 to-rose-500 text-white',
    timeAgo: '11 phút trước',
  },
  {
    id: 't-6',
    avatarText: '#104',
    message: 'Ẩn danh #104 vừa trúng 20.000đ MoMo khi quay thử vận may!',
    tag: 'TIỀN MẶT',
    tagColor: 'from-amber-400 to-orange-400 text-stone-950',
    timeAgo: '14 phút trước',
  },
];

interface LiveMarqueeTickerProps {
  theme?: 'dark' | 'light';
  onItemClick?: (item: TickerItem) => void;
}

export const LiveMarqueeTicker: React.FC<LiveMarqueeTickerProps> = ({
  theme = 'dark',
  onItemClick,
}) => {
  const isDark = theme === 'dark';
  const [isPaused, setIsPaused] = useState(false);
  const [items, setItems] = useState<TickerItem[]>(INITIAL_TICKER_ITEMS);

  // Periodically insert subtle new simulated live events to keep excitement buzzing
  useEffect(() => {
    const interval = setInterval(() => {
      const randomId = Math.floor(100 + Math.random() * 900);
      const gifts = [
        'trúng 100.000đ MoMo',
        'trúng 50.000đ MoMo',
        'trúng 20.000đ MoMo',
        'vừa gửi Confession tri ân và nhận +1 lượt quay',
        'trúng Bình giữ nhiệt Bách Khoa',
      ];
      const selectedGift = gifts[Math.floor(Math.random() * gifts.length)];
      const isConfession = selectedGift.includes('Confession');

      const newItem: TickerItem = {
        id: `t-${Date.now()}`,
        avatarText: `#${randomId}`,
        message: `Ẩn danh #${randomId} vừa ${selectedGift}!`,
        tag: isConfession ? 'CONFESSION +1 LƯỢT' : selectedGift.includes('100.000đ') ? 'GIẢI ĐẶC BIỆT' : 'TRÚNG THƯỞNG',
        tagColor: isConfession
          ? 'from-pink-500 to-rose-500 text-white'
          : selectedGift.includes('100.000đ')
          ? 'from-amber-500 to-yellow-300 text-stone-950'
          : 'from-emerald-500 to-teal-400 text-white',
        timeAgo: 'Vừa xong',
      };

      setItems((prev) => [newItem, ...prev.slice(0, 11)]);
    }, 28000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-300 shadow-lg ${
        isDark
          ? 'bg-gradient-to-r from-[#2a0e28]/95 via-[#1d0620]/95 to-[#2a0e28]/95 border-amber-400/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
          : 'bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-rose-300/80 shadow-[0_4px_20px_rgba(244,63,94,0.08)]'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center h-11 sm:h-12">
        {/* Left Badge: Live Status */}
        <div
          className={`flex items-center gap-1.5 px-3 sm:px-4 h-full shrink-0 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider z-10 border-r ${
            isDark
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 border-amber-300/40'
              : 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-rose-300'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Trực Tiếp</span>
          <span className="sm:hidden">Live</span>
        </div>

        {/* Marquee Scroller Track */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div
            className={`flex items-center whitespace-nowrap gap-8 pl-4 will-change-transform ${
              isPaused ? '' : 'animate-marquee'
            }`}
            style={{
              animationDuration: '32s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          >
            {/* Duplicated list to create continuous loop */}
            {[...items, ...items].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => onItemClick && onItemClick(item)}
                className={`inline-flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded-xl transition ${
                  isDark
                    ? 'hover:bg-white/10 text-rose-100'
                    : 'hover:bg-rose-100/60 text-stone-800'
                }`}
              >
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r ${item.tagColor} shadow-sm`}
                >
                  {item.tag}
                </span>
                <span className="font-semibold">{item.message}</span>
                <span
                  className={`text-[10px] font-mono ${
                    isDark ? 'text-amber-300/70' : 'text-stone-500'
                  }`}
                >
                  ({item.timeAgo})
                </span>
                <span className="text-amber-400/50">✦</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Indicator: Live Pulse hint */}
        <div
          className={`hidden md:flex items-center gap-1 px-3 h-full shrink-0 text-[11px] font-medium border-l ${
            isDark
              ? 'border-white/10 text-rose-200/60 bg-black/20'
              : 'border-rose-200 text-stone-600 bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Real-time</span>
        </div>
      </div>
    </div>
  );
};
