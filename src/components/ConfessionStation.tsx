import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareHeart,
  Send,
  Heart,
  ShieldCheck,
  RefreshCw,
  Smile,
  AlertOctagon,
  CheckCircle2,
  Database,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  validateConfessionSubmission,
  DEFAULT_SCHOOL_BLACKLIST,
} from '../server/moderation.ts';
import { Confession3DHearts, Confession3DHeartsRef } from './3d/Confession3DHearts.tsx';

export interface ConfessionItem {
  id: string;
  alias: string;
  recipientTag: string;
  category: string;
  content: string;
  likes: number;
  timeAgo: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ConfessionStationProps {
  theme?: 'dark' | 'light';
  onShowToast: (type: 'info' | 'success' | 'error', message: string) => void;
}

export const ConfessionStation: React.FC<ConfessionStationProps> = ({
  theme = 'dark',
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
  const [confessionList, setConfessionList] = useState<ConfessionItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [mobileView, setMobileView] = useState<'FEED' | 'FORM'>('FEED');
  const heartsRef = useRef<Confession3DHeartsRef>(null);

  const generateNewAlias = () => {
    setAlias(`#BKS_${Math.floor(100 + Math.random() * 900)}`);
  };

  // Helper formatting relative time
  const formatTimeAgo = (isoDateStr?: string) => {
    if (!isoDateStr) return 'Vừa xong';
    const diff = Math.floor((Date.now() - new Date(isoDateStr).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  // Load public approved confessions from real Firestore API
  const fetchConfessions = async () => {
    try {
      setIsLoadingFeed(true);
      const res = await fetch('/api/confessions');
      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.confessions)) {
        const mapped: ConfessionItem[] = data.confessions.map((item: any) => ({
          id: item.id,
          alias: item.alias || 'Ẩn danh BKS',
          recipientTag: item.recipientTag || 'Gửi Thầy Cô giáo',
          category: item.category || 'Tri Ân',
          content: item.content,
          likes: Number(item.likes) || 0,
          timeAgo: formatTimeAgo(item.createdAt),
        }));
        setConfessionList(mapped);
      }
    } catch (err: any) {
      console.error('[ConfessionStation] Failed to fetch real confessions:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchConfessions();
  }, []);

  // Handle like button with real backend Firestore call & 3D heart celebration
  const handleLike = async (id: string, e?: React.MouseEvent) => {
    try {
      // Trigger 3D heart particle burst at click coordinates
      if (e) {
        heartsRef.current?.burst(e.clientX, e.clientY, 10);
      } else {
        heartsRef.current?.burst(undefined, undefined, 10);
      }

      // Optimistic update
      setConfessionList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c))
      );

      const res = await fetch(`/api/confessions/${encodeURIComponent(id)}/like`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi thả tim');
      }
      // Reconcile with exact server likes count
      if (typeof data.likes === 'number') {
        setConfessionList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, likes: data.likes } : c))
        );
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Không thể thả tim, vui lòng thử lại');
    }
  };

  // Submit confession with real Firestore backend integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setViolationError(null);
    setViolatedWords([]);

    const cleanMsg = message.trim();
    if (!cleanMsg || cleanMsg.length < 8) {
      onShowToast('error', 'Lời nhắn confession cần ít nhất 8 ký tự!');
      return;
    }

    // Client-side quick filter check
    const clientValidation = validateConfessionSubmission(cleanMsg, DEFAULT_SCHOOL_BLACKLIST);
    if (!clientValidation.isValid) {
      setViolationError(clientValidation.errorMessage || 'Nội dung chứa từ ngữ không phù hợp học đường.');
      setViolatedWords(clientValidation.matchedWords);
      onShowToast('error', `Bị từ chối: Phát hiện từ viết tắt/tục tĩu ("${clientValidation.matchedWords.map((w) => w.toUpperCase()).join(', ')}").`);
      return;
    }

    setIsSubmitting(true);

    try {
      const targetLabel =
        recipientCategory === 'TEACHER'
          ? 'Gửi Thầy Cô giáo kính yêu'
          : recipientCategory === 'CRUSH'
          ? 'Gửi Người thương giấu tên'
          : recipientCategory === 'FRIEND'
          ? 'Gửi Bạn bè / Tập thể lớp'
          : 'Gửi Mái trường Bách Khoa';

      const res = await fetch('/api/confessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: cleanMsg,
          alias,
          recipientTag: targetLabel,
          category: tag,
          hashtag: `#${tag.replace(/\s+/g, '')}`,
        }),
      });

      const data = await res.json();

      // CẤM THÔNG BÁO GIẢ NẾU BACKEND BỊ LỖI
      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Lỗi lưu trữ confession vào hệ thống';
        setViolationError(errorMsg);
        if (data.matchedWords && Array.isArray(data.matchedWords)) {
          setViolatedWords(data.matchedWords);
        }
        onShowToast('error', errorMsg);
        return;
      }

      // Đã lưu thành công vào CSDL Firestore ở trạng thái PENDING
      // Tuyệt đối KHÔNG hiển thị lên bảng tin công khai trước khi Admin phê duyệt
      setMessage('');
      setSubmittedSuccess(true);
      setViolationError(null);
      setViolatedWords([]);
      setMobileView('FEED');

      // Confetti gamification celebration & 3D floating hearts burst
      try {
        heartsRef.current?.burst(undefined, undefined, 24);
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f43f5e', '#ec4899', '#fde047', '#38bdf8'],
        });
      } catch {
        // Safe fallback
      }

      onShowToast('success', data.message || 'Gửi lời chúc thành công! Lời nhắn của bạn đang chờ Ban Quản Trị phê duyệt.');

      setTimeout(() => setSubmittedSuccess(false), 6000);
    } catch (err: any) {
      setViolationError(err.message || 'Lỗi kết nối máy chủ khi gửi confession');
      onShowToast('error', err.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="confession-station"
      className={`scroll-mt-24 rounded-3xl p-4 sm:p-7 transition-colors duration-300 border relative overflow-hidden shadow-xl ${
        isDark
          ? 'bg-slate-900/90 border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
          : 'bg-white border-slate-200/90 shadow-[0_15px_35px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* 3D Floating Hearts Interactive Ambient Background */}
      <Confession3DHearts ref={heartsRef} />

      {/* Background radial accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Hero Banner */}
      <div
        className={`relative z-10 rounded-2xl p-4 sm:p-5 mb-5 border transition-all ${
          isDark
            ? 'bg-slate-950/70 border-slate-700/60 shadow-md'
            : 'bg-gradient-to-r from-rose-50 via-slate-50 to-amber-50 border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <MessageSquareHeart className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                  KHÔNG GIAN TRI ÂN
                </span>
                <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" />
                  Lưu trữ CSDL Firestore
                </span>
              </div>
              <h2
                className={`text-base sm:text-xl font-black tracking-tight mt-0.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Trạm Lời Chúc & Confession Tri Ân Học Đường
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                100% ẩn danh an toàn. Thỏa sức gửi gắm tâm tư, tri ân Thầy Cô giáo và lưu giữ kỷ niệm tuổi học trò.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            <div
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-sm ${
                isDark
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>KIỂM DUYỆT TỰ ĐỘNG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher: View feed or write confession instantly without vertical scroll */}
      <div className="lg:hidden flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold gap-1 mb-4 relative z-10">
        <button
          type="button"
          onClick={() => setMobileView('FEED')}
          className={`flex-1 py-2 px-2 rounded-lg transition text-center truncate cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileView === 'FEED'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>Tường Confession ({confessionList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('FORM')}
          className={`flex-1 py-2 px-2 rounded-lg transition text-center truncate cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileView === 'FORM'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi Lời Chúc Mới</span>
        </button>
      </div>

      {/* Main Grid: Form (Left) & Live Feed (Right) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Confession Form (7 cols) */}
        <div className={`lg:col-span-7 ${mobileView === 'FORM' ? 'block' : 'hidden lg:block'}`}>
          <form
            onSubmit={handleSubmit}
            className={`p-4 sm:p-5 rounded-2xl border space-y-4 backdrop-blur-md transition ${
              isDark
                ? 'bg-slate-950/60 border-slate-800'
                : 'bg-slate-50/80 border-slate-200 shadow-xs'
            }`}
          >
            {/* Header of Form */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
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
                      ? 'bg-slate-900 border-slate-700 text-rose-300'
                      : 'bg-white border-slate-300 text-rose-800'
                  }`}
                >
                  {alias}
                </span>
                <button
                  type="button"
                  onClick={generateNewAlias}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
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
                  isDark ? 'text-slate-300' : 'text-slate-700'
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
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      recipientCategory === item.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
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
                  isDark ? 'text-slate-300' : 'text-slate-700'
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      tag === t
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-xs'
                        : isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
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
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  3. Nội dung Confession:
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    message.length > 280
                      ? 'text-rose-500 font-bold'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
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
                placeholder="Nhập tâm tư, kỷ niệm hoặc lời chúc tri ân của bạn tại đây... (Nội dung sẽ được kiểm duyệt tự động)"
                className={`w-full p-3 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 transition leading-relaxed ${
                  violationError
                    ? 'border-2 border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20 text-rose-100'
                    : isDark
                    ? 'bg-slate-900 border border-slate-700/70 text-slate-100 placeholder-slate-500 focus:ring-rose-500'
                    : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-rose-500 shadow-xs'
                }`}
              />
            </div>

            {/* Violation Alert Banner */}
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
                      Quy định: Học sinh Trường TC Công nghiệp Bách Khoa Sầm Sơn cần làm gương, giữ gìn nét đẹp văn hóa ứng xử. Lời nhắn chỉ được duyệt khi 100% trong sáng.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span
                className={`text-[11px] flex items-center gap-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-rose-500" />
                Lưu trực tiếp vào CSDL Firestore
              </span>

              <button
                type="submit"
                disabled={isSubmitting || message.trim().length < 8}
                className={`py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all ${
                  message.trim().length >= 8 && !isSubmitting
                    ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:brightness-110 shadow-rose-950/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm duyệt & lưu...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi Lời Chúc Tri Ân</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Notification Alert */}
            {submittedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Đã gửi lời chúc thành công! Lời nhắn của bạn đã được tiếp nhận và đang chờ Ban Quản Trị phê duyệt trước khi hiển thị công khai.
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Confession Feed Preview (5 cols) */}
        <div className={`lg:col-span-5 space-y-3 ${mobileView === 'FEED' ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-rose-500" />
              <h3
                className={`font-black text-xs sm:text-sm uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Tường Confession Mới Nhất
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchConfessions}
              className={`text-[11px] font-mono flex items-center gap-1 transition cursor-pointer ${
                isDark ? 'text-amber-300 hover:text-amber-200' : 'text-rose-700 hover:text-rose-900 font-bold'
              }`}
              title="Tải lại từ CSDL"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingFeed ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-rose-500/30">
            {isLoadingFeed && confessionList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                <span>Đang tải lời chúc từ cơ sở dữ liệu...</span>
              </div>
            ) : confessionList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-100/50 dark:bg-slate-950/40 rounded-2xl p-6">
                Chưa có lời chúc nào được hiển thị. Hãy là người đầu tiên gửi lời chúc tri ân!
              </div>
            ) : (
              confessionList.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isDark
                      ? 'bg-slate-950/70 hover:bg-slate-950/90 border-slate-800/80 text-slate-200 shadow-xs'
                      : 'bg-white hover:bg-rose-50/30 border-slate-200 shadow-xs text-slate-800'
                  }`}
                >
                  {/* Meta header */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-rose-500 truncate">
                        {c.alias}
                      </span>
                      <span className="text-slate-500 text-[10px]">·</span>
                      <span
                        className={`text-[10px] font-semibold truncate ${
                          isDark ? 'text-amber-300' : 'text-slate-700'
                        }`}
                      >
                        {c.recipientTag}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {c.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                          ⏳ Chờ duyệt
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isDark ? 'bg-slate-800 text-rose-300 border border-slate-700' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        #{c.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p
                    className={`text-xs leading-relaxed mb-2.5 font-medium ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    "{c.content}"
                  </p>

                  {/* Footer with Like & Timestamp */}
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-700/20">
                    <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                      {c.timeAgo}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleLike(c.id, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-900 border-slate-700/70 text-rose-300 hover:bg-rose-950/40 active:scale-95'
                          : 'bg-slate-50 border-slate-200 text-rose-700 hover:bg-rose-50 active:scale-95'
                      }`}
                      title="Thả tim bay 3D"
                    >
                      <Heart className="w-3 h-3 text-rose-500 fill-current" />
                      <span className="font-semibold">{c.likes}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
