import React, { useState } from 'react';
import {
  MessageSquareHeart,
  Sparkles,
  Send,
  Heart,
  ShieldCheck,
  RotateCw,
  Gift,
  Flame,
  CheckCircle2,
  RefreshCw,
  Smile,
  AlertOctagon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  validateConfessionSubmission,
  DEFAULT_SCHOOL_BLACKLIST,
} from '../server/moderation.ts';

export interface ConfessionItem {
  id: string;
  alias: string;
  recipientTag: string;
  category: string;
  content: string;
  likes: number;
  timeAgo: string;
}

const PRESET_CONFESSIONS: ConfessionItem[] = [
  {
    id: 'cf-1',
    alias: 'Ẩn danh #BKS_342',
    recipientTag: 'Gửi Thầy Chủ Nhiệm K15',
    category: 'Tri Ân',
    content: 'Cảm ơn Thầy đã luôn kiên nhẫn chỉ dạy chúng em từng dòng code và kỹ thuật thực hành. Chúc Thầy mùa 20/11 thật nhiều niềm vui và sức khỏe!',
    likes: 24,
    timeAgo: '10 phút trước',
  },
  {
    id: 'cf-2',
    alias: 'Ẩn danh #BKS_819',
    recipientTag: 'Gửi bạn bàn bên lớp CNTT 2',
    category: 'Tỏ Tình',
    content: 'Mỗi ngày đi học chỉ mong được nhìn thấy nụ cười của cậu. Cố gắng cùng nhau đạt học bổng kỳ này nhé!',
    likes: 41,
    timeAgo: '25 phút trước',
  },
  {
    id: 'cf-3',
    alias: 'Ẩn danh #BKS_105',
    recipientTag: 'Gửi Cô giáo Tiếng Anh',
    category: 'Tri Ân',
    content: 'Nhờ có cô truyền cảm hứng mà môn tiếng Anh chuyên ngành không còn là nỗi sợ của em nữa. Kính chúc Cô luôn trẻ trung và nhiệt huyết!',
    likes: 18,
    timeAgo: '40 phút trước',
  },
];

interface ConfessionStationProps {
  theme?: 'dark' | 'light';
  onEarnSpin: () => void;
  onShowToast: (type: 'info' | 'success' | 'error', message: string) => void;
}

export const ConfessionStation: React.FC<ConfessionStationProps> = ({
  theme = 'dark',
  onEarnSpin,
  onShowToast,
}) => {
  const isDark = theme === 'dark';

  const [alias, setAlias] = useState(() => `#BKS_${Math.floor(100 + Math.random() * 900)}`);
  const [recipientCategory, setRecipientCategory] = useState<'TEACHER' | 'CRUSH' | 'FRIEND' | 'SCHOOL'>('TEACHER');
  const [tag, setTag] = useState<'Tri Ân' | 'Tỏ Tình' | 'Động Lực' | 'Kỷ Niệm'>('Tri Ân');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [violationError, setViolationError] = useState<string | null>(null);
  const [violatedWords, setViolatedWords] = useState<string[]>([]);
  const [confessionList, setConfessionList] = useState<ConfessionItem[]>(PRESET_CONFESSIONS);

  const generateNewAlias = () => {
    setAlias(`#BKS_${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleLike = (id: string) => {
    setConfessionList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViolationError(null);
    setViolatedWords([]);

    const cleanMsg = message.trim();
    if (!cleanMsg || cleanMsg.length < 8) {
      onShowToast('error', 'Lời nhắn confession cần ít nhất 8 ký tự để được nhận lượt quay!');
      return;
    }

    // [PHƯƠNG ÁN A]: Chặn cứng tuyệt đối từ ngữ thô tục / từ viết tắt (VCL, VKL, ĐM...)
    const validation = validateConfessionSubmission(cleanMsg, DEFAULT_SCHOOL_BLACKLIST);
    if (!validation.isValid) {
      setViolationError(validation.errorMessage || 'Nội dung chứa từ ngữ không phù hợp học đường.');
      setViolatedWords(validation.matchedWords);
      onShowToast('error', `Bị từ chối: Phát hiện từ viết tắt/tục tĩu ("${validation.matchedWords.map((w) => w.toUpperCase()).join(', ')}").`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Create new confession
      const targetLabel =
        recipientCategory === 'TEACHER'
          ? 'Gửi Thầy Cô giáo kính yêu'
          : recipientCategory === 'CRUSH'
          ? 'Gửi Người thương giấu tên'
          : recipientCategory === 'FRIEND'
          ? 'Gửi Bạn bè / Tập thể lớp'
          : 'Gửi Mái trường Bách Khoa';

      const newConfession: ConfessionItem = {
        id: `cf-${Date.now()}`,
        alias,
        recipientTag: targetLabel,
        category: tag,
        content: cleanMsg,
        likes: 1,
        timeAgo: 'Vừa xong',
      };

      setConfessionList([newConfession, ...confessionList]);
      setMessage('');
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setViolationError(null);
      setViolatedWords([]);

      // Trigger Confetti Gamification Blast
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#f43f5e', '#ec4899', '#fde047', '#38bdf8'],
        });
      } catch {
        // Fallback safe
      }

      // Award +1 spin to user
      onEarnSpin();
      onShowToast('success', 'Gửi Confession thành công! Bạn nhận ngay +1 LƯỢT QUAY MIỄN PHÍ! 🎉');

      // Reset success banner after 6 seconds
      setTimeout(() => setSubmittedSuccess(false), 6000);
    }, 600);
  };

  return (
    <section
      id="confession-station"
      className={`scroll-mt-24 rounded-3xl p-5 sm:p-7 transition-colors duration-300 border relative overflow-hidden shadow-2xl ${
        isDark
          ? 'bg-gradient-to-br from-[#240822]/95 via-[#1a051d]/95 to-[#2d0928]/95 border-amber-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
          : 'bg-gradient-to-br from-white via-rose-50/60 to-pink-50/70 border-rose-300/80 shadow-[0_15px_35px_rgba(244,63,94,0.08)]'
      }`}
    >
      {/* Background radial accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Gamification Mission Hero Banner */}
      <div
        className={`relative z-10 rounded-2xl p-4 sm:p-5 mb-6 border transition-all ${
          isDark
            ? 'bg-gradient-to-r from-pink-950/70 via-purple-950/60 to-rose-950/70 border-pink-500/40 shadow-glow-rose'
            : 'bg-gradient-to-r from-rose-100 via-pink-100 to-amber-100 border-rose-300 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <MessageSquareHeart className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                  NHIỆM VỤ TĂNG LƯỢT QUAY
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  Growth Hacking
                </span>
              </div>
              <h2
                className={`text-base sm:text-xl font-black tracking-tight mt-0.5 ${
                  isDark ? 'text-white' : 'text-stone-900'
                }`}
              >
                Gửi 1 Confession Ẩn Danh = Nhận Ngay +1 Lượt Quay!
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-rose-200/80' : 'text-stone-600'
                }`}
              >
                100% ẩn danh an toàn. Thỏa sức gửi gắm tâm tư, tri ân Thầy Cô hoặc crush và nhận vé quay liền tay.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            <div
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-black shadow-sm ${
                isDark
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-rose-600 text-white border-rose-500'
              }`}
            >
              <RotateCw className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              <span>+1 LƯỢT QUAY / LẦN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Live Feed (Right) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Streamlined Confession Form (7 cols) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className={`p-5 rounded-2xl border space-y-4 backdrop-blur-md transition ${
              isDark
                ? 'bg-black/30 border-white/10'
                : 'bg-white border-rose-200 shadow-sm'
            }`}
          >
            {/* Header of Form */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/15">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  Bảo Mật Danh Tính Tuyệt Đối
                </span>
              </div>

              {/* Alias badge with refresh button */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'bg-purple-950/70 border-purple-400/40 text-purple-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {alias}
                </span>
                <button
                  type="button"
                  onClick={generateNewAlias}
                  className={`p-1.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                  }`}
                  title="Đổi mã định danh ngẫu nhiên"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Recipient Target Tabs */}
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-rose-200' : 'text-stone-700'
                }`}
              >
                1. Gửi lời nhắn đến ai?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'TEACHER', label: 'Thầy Cô', icon: '👨‍🏫' },
                  { id: 'CRUSH', label: 'Crush / Yêu', icon: '💌' },
                  { id: 'FRIEND', label: 'Bạn bè', icon: '🎒' },
                  { id: 'SCHOOL', label: 'Mái trường', icon: '🏫' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRecipientCategory(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      recipientCategory === item.id
                        ? isDark
                          ? 'bg-pink-600 text-white border-pink-400 shadow-sm'
                          : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-rose-100 border-white/10'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Tag Selection */}
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-rose-200' : 'text-stone-700'
                }`}
              >
                2. Chủ đề lời nhắn:
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Tri Ân', 'Tỏ Tình', 'Động Lực', 'Kỷ Niệm'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      tag === t
                        ? isDark
                          ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold'
                          : 'bg-amber-400 text-stone-950 border-amber-400 font-bold'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-rose-200/80 border-white/10'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-rose-200' : 'text-stone-700'
                  }`}
                >
                  3. Nội dung Confession:
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    message.length > 280
                      ? 'text-rose-500 font-bold'
                      : isDark
                      ? 'text-zinc-400'
                      : 'text-stone-500'
                  }`}
                >
                  {message.length}/300
                </span>
              </div>
              <textarea
                rows={3}
                value={message}
                maxLength={300}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (violationError) setViolationError(null);
                }}
                placeholder="Nhập tâm tư, kỷ niệm hoặc lời chúc tri ân của bạn tại đây... (Nhận ngay +1 lượt quay sau khi gửi)"
                className={`w-full p-3 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 transition leading-relaxed ${
                  violationError
                    ? 'border-2 border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20 text-rose-100'
                    : isDark
                    ? 'bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:ring-pink-500'
                    : 'bg-stone-50 border border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-pink-500'
                }`}
              />
            </div>

            {/* Violation Alert Banner (Phương án A - Hard Reject Guard) */}
            {violationError && (
              <div
                className={`p-3.5 sm:p-4 rounded-xl border animate-fade-in ${
                  isDark
                    ? 'bg-rose-950/60 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-rose-50 border-rose-400 text-rose-950 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs uppercase tracking-wider text-rose-500">
                        BỊ TỪ CHỐI · KIỂM DUYỆT VĂN HÓA HỌC ĐƯỜNG
                      </span>
                      {violatedWords.length > 0 && (
                        <div className="flex items-center gap-1">
                          {violatedWords.map((w, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-600 text-white uppercase shadow-sm"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed font-medium">
                      {violationError}
                    </p>
                    <p className="text-[11px] opacity-80 italic">
                      Quy định: Học sinh Trường TC Công nghiệp Bách Khoa Sầm Sơn cần làm gương, giữ gìn nét đẹp văn hóa ứng xử. Lời nhắn chỉ được duyệt và tặng +1 lượt quay khi 100% trong sáng.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span
                className={`text-[11px] ${
                  isDark ? 'text-rose-200/70' : 'text-stone-500'
                }`}
              >
                ✓ Tự động cộng +1 lượt quay vào tài khoản sau khi gửi
              </span>

              <button
                type="submit"
                disabled={isSubmitting || message.trim().length < 8}
                className={`py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                  message.trim().length >= 8 && !isSubmitting
                    ? 'bg-gradient-to-r from-pink-500 via-rose-600 to-amber-500 text-white hover:brightness-110 shadow-glow-rose cursor-pointer animate-pulse'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm duyệt & gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi Ngay · Nhận +1 Quay</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Notification Alert */}
            {submittedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Đã kiểm duyệt đạt chuẩn & gửi thành công! +1 lượt quay may mắn đã được kích hoạt. Hãy lướt lên trên và quay thưởng ngay!
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Confession Feed Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-pink-400" />
              <h3
                className={`font-black text-xs sm:text-sm uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-stone-900'
                }`}
              >
                Tường Confession Mới Nhất
              </h3>
            </div>
            <span
              className={`text-[11px] font-mono ${
                isDark ? 'text-amber-300/80' : 'text-rose-700 font-bold'
              }`}
            >
              Trực tuyến
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-pink-500/30">
            {confessionList.map((c) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border transition ${
                  isDark
                    ? 'bg-black/30 hover:bg-black/45 border-white/10'
                    : 'bg-white hover:bg-rose-50/50 border-rose-200 shadow-sm'
                }`}
              >
                {/* Meta header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-pink-400 truncate">
                      {c.alias}
                    </span>
                    <span className="text-zinc-500 text-[10px]">·</span>
                    <span
                      className={`text-[10px] font-semibold truncate ${
                        isDark ? 'text-amber-300/90' : 'text-stone-700'
                      }`}
                    >
                      {c.recipientTag}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                      isDark ? 'bg-white/10 text-rose-200' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    #{c.category}
                  </span>
                </div>

                {/* Content */}
                <p
                  className={`text-xs leading-relaxed mb-2.5 font-normal ${
                    isDark ? 'text-stone-200' : 'text-stone-800'
                  }`}
                >
                  "{c.content}"
                </p>

                {/* Footer with Like & Timestamp */}
                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                  <span className={isDark ? 'text-zinc-500' : 'text-stone-500'}>
                    {c.timeAgo}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleLike(c.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition ${
                      isDark
                        ? 'border-white/10 text-rose-300 hover:bg-white/10'
                        : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <Heart className="w-3 h-3 text-pink-500 fill-current" />
                    <span>{c.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
