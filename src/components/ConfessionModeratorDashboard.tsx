import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MessageSquareHeart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Keyboard,
  ArrowDown,
  ArrowUp,
  Tag,
  User,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ChevronRight,
  Send,
  HelpCircle,
  ThumbsUp,
} from 'lucide-react';
import { DEFAULT_SCHOOL_BLACKLIST } from '../server/moderation.ts';

export interface ConfessionQueueItem {
  id: string;
  content: string;
  alias: string;
  recipientTag: string;
  hashtag: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderation: {
    is_clean: boolean;
    highest_level_detected: number;
    filtered_content: string;
    matched_words: string[];
    suggested_action: 'APPROVED' | 'AUTO_MASK' | 'PENDING_MODERATION' | 'REJECTED';
  };
  aiRecommendation: {
    action: 'APPROVE' | 'REJECT' | 'REVIEW';
    reason: string;
    level: number;
  };
  editedContent?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

interface ModerationStats {
  pendingCount: number;
  approvedTodayCount: number;
  rejectedCount: number;
  totalCount: number;
  cleanRate: number;
}

interface ConfessionModeratorDashboardProps {
  adminToken: string;
  adminUsername?: string;
  onRefreshParent?: () => void;
}

export const ConfessionModeratorDashboard: React.FC<ConfessionModeratorDashboardProps> = ({
  adminToken,
  adminUsername = 'Ban Kiểm Duyệt',
  onRefreshParent,
}) => {
  // State
  const [queue, setQueue] = useState<ConfessionQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    pendingCount: 0,
    approvedTodayCount: 0,
    rejectedCount: 0,
    totalCount: 0,
    cleanRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Quick Edit Modal State
  const [editingItem, setEditingItem] = useState<ConfessionQueueItem | null>(null);
  const [editContentText, setEditContentText] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }),
    [adminToken]
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const playFeedbackSound = (type: 'approve' | 'reject' | 'nav') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'approve') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'reject') {
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.14); // A3
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'nav') {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Fetch Queue from API
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/confessions/moderation-queue', {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue || []);
        setStats(data.stats);
      } else {
        showToast('error', data.error || 'Lỗi tải hàng đợi kiểm duyệt');
      }
    } catch (err: any) {
      showToast('error', 'Không thể kết nối đến máy chủ kiểm duyệt');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Filtered List
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hashtag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.recipientTag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [queue, filterStatus, searchQuery]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredQueue.length) {
      setSelectedIndex(Math.max(0, filteredQueue.length - 1));
    }
  }, [filteredQueue.length, selectedIndex]);

  // Auto scroll focused item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle Moderation Action
  const handleModerateAction = async (
    targetItem: ConfessionQueueItem,
    action: 'APPROVE' | 'REJECT' | 'EDIT_AND_APPROVE',
    customEditedContent?: string,
    note?: string
  ) => {
    try {
      if (action === 'APPROVE') playFeedbackSound('approve');
      if (action === 'REJECT') playFeedbackSound('reject');

      const res = await fetch(`/api/admin/confessions/${targetItem.id}/moderate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          action,
          editedContent: customEditedContent,
          note,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Optimistic update local queue state
        setQueue((prev) =>
          prev.map((c) => (c.id === targetItem.id ? { ...c, ...data.item } : c))
        );
        if (data.stats) {
          setStats(data.stats);
        }

        const actionText =
          action === 'APPROVE'
            ? 'Đã duyệt bài'
            : action === 'REJECT'
            ? 'Đã từ chối bài'
            : 'Đã sửa & duyệt bài';
        showToast('success', `${actionText} #${targetItem.id.slice(-4)} thành công`);

        if (onRefreshParent) onRefreshParent();
      } else {
        showToast('error', data.error || 'Thao tác không thành công');
      }
    } catch {
      showToast('error', 'Lỗi mạng khi gửi quyết định kiểm duyệt');
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const activeItem = filteredQueue[selectedIndex];

      // Navigate down: J or ArrowDown
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex < filteredQueue.length - 1) {
          setSelectedIndex((prev) => prev + 1);
          playFeedbackSound('nav');
        }
      }
      // Navigate up: K or ArrowUp
      else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
          playFeedbackSound('nav');
        }
      }
      // Quick Approve: A
      else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (activeItem && activeItem.status === 'PENDING') {
          handleModerateAction(activeItem, 'APPROVE');
        } else if (activeItem) {
          showToast('info', `Bài #${activeItem.id.slice(-4)} đã ở trạng thái ${activeItem.status}`);
        }
      }
      // Quick Reject: R
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (activeItem && activeItem.status === 'PENDING') {
          handleModerateAction(activeItem, 'REJECT');
        } else if (activeItem) {
          showToast('info', `Bài #${activeItem.id.slice(-4)} đã ở trạng thái ${activeItem.status}`);
        }
      }
      // Quick Edit: E
      else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (activeItem) {
          setEditingItem(activeItem);
          setEditContentText(activeItem.editedContent || activeItem.content);
          setEditNote('');
        }
      }
      // Filter Tabs: 1 = PENDING, 2 = APPROVED, 3 = REJECTED, 4 = ALL
      else if (e.key === '1') {
        setFilterStatus('PENDING');
        setSelectedIndex(0);
      } else if (e.key === '2') {
        setFilterStatus('APPROVED');
        setSelectedIndex(0);
      } else if (e.key === '3') {
        setFilterStatus('REJECTED');
        setSelectedIndex(0);
      } else if (e.key === '4') {
        setFilterStatus('ALL');
        setSelectedIndex(0);
      }
      // Toggle shortcut help: ?
      else if (e.key === '?') {
        setShowShortcutHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredQueue, selectedIndex, soundEnabled]);

  // Helper to highlight forbidden words in content
  const renderHighlightedContent = (item: ConfessionQueueItem) => {
    const text = item.editedContent || item.content;
    const matchedWords = item.moderation?.matched_words || [];

    if (!matchedWords || matchedWords.length === 0) {
      return <span>{text}</span>;
    }

    // Build regex to find all matched words
    const patternStr = matchedWords
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    if (!patternStr) return <span>{text}</span>;

    try {
      const regex = new RegExp(`(${patternStr})`, 'gi');
      const parts = text.split(regex);

      return (
        <span>
          {parts.map((part, i) => {
            const isMatch = matchedWords.some(
              (w) => w.toLowerCase() === part.toLowerCase()
            );
            if (isMatch) {
              return (
                <mark
                  key={i}
                  className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-300 ring-1 ring-rose-400 mx-0.5 animate-pulse"
                  title="Từ ngữ vi phạm quy định học đường"
                >
                  {part}
                </mark>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-6 font-['Inter',sans-serif] antialiased">
      {/* 1. TOP WIDGET: Quick Statistics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div
          onClick={() => {
            setFilterStatus('PENDING');
            setSelectedIndex(0);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            filterStatus === 'PENDING'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đang Chờ Duyệt (Pending)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {stats.pendingCount}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
              Cần xử lý
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Phím tắt nhanh: [1]</p>
        </div>

        {/* Approved Today Card */}
        <div
          onClick={() => {
            setFilterStatus('APPROVED');
            setSelectedIndex(0);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đã Duyệt Hôm Nay
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {stats.approvedTodayCount}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
              Đã xuất bản
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Phím tắt nhanh: [2]</p>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => {
            setFilterStatus('REJECTED');
            setSelectedIndex(0);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            filterStatus === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đã Hủy / Từ Chối
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-700 font-mono tracking-tight">
              {stats.rejectedCount}
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
              Chặn vi phạm
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Phím tắt nhanh: [3]</p>
        </div>

        {/* Clean Rate & Efficiency Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tỷ Lệ Lành Mạnh
            </span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-700 font-mono tracking-tight">
              {stats.cleanRate}%
            </span>
            <span className="text-xs font-bold text-slate-600">
              Tổng {stats.totalCount} bài
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đánh giá theo Phương án A</p>
        </div>
      </div>

      {/* 2. TOOLBAR: Search, Filters, Sound Toggle, and Shortcut Helper Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'PENDING', label: 'Chờ duyệt', count: stats.pendingCount, key: '1' },
            { id: 'APPROVED', label: 'Đã duyệt', count: stats.approvedTodayCount, key: '2' },
            { id: 'REJECTED', label: 'Đã hủy', count: stats.rejectedCount, key: '3' },
            { id: 'ALL', label: 'Tất cả', count: stats.totalCount, key: '4' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilterStatus(tab.id as any);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterStatus === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
              <kbd
                className={`hidden lg:inline text-[9px] font-mono px-1 rounded border opacity-70 ${
                  filterStatus === tab.id
                    ? 'bg-blue-700 border-blue-400 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-500'
                }`}
              >
                {tab.key}
              </kbd>
            </button>
          ))}
        </div>

        {/* Center: Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm theo nội dung, hashtag, người gửi..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Quick Controls & Shortcut Trigger */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={soundEnabled ? 'Âm thanh thao tác: Đang bật' : 'Âm thanh thao tác: Đang tắt'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Làm mới hàng đợi"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutHelp(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Phím tắt</span>
            <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-slate-500">
              ?
            </kbd>
          </button>
        </div>
      </div>

      {/* 3. MODERATION QUEUE: Fast Keyboard Card List */}
      <div className="space-y-3" ref={containerRef}>
        {loading && queue.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Đang tải hàng đợi kiểm duyệt...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">
              Không có bài viết nào trong danh sách
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hàng đợi kiểm duyệt hiện tại đang trống hoặc không có kết quả phù hợp với bộ lọc.
            </p>
          </div>
        ) : (
          filteredQueue.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            const hasProfanity = !item.moderation?.is_clean;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => setSelectedIndex(idx)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative cursor-pointer ${
                  isSelected
                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                }`}
              >
                {/* Active selection indicator line on the left */}
                {isSelected && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-blue-600 rounded-r-full" />
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Metadata, Content, AI Badges */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Header: Meta info, hashtag, time */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Active Cursor Badge */}
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Đang Chọn</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {item.status === 'PENDING'
                          ? 'Chờ Duyệt'
                          : item.status === 'APPROVED'
                          ? 'Đã Phê Duyệt'
                          : 'Đã Từ Chối'}
                      </span>

                      {/* Hashtag Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold flex items-center gap-1 border border-slate-200">
                        <Tag className="w-3 h-3 text-blue-600" />
                        <span>{item.hashtag}</span>
                      </span>

                      {/* Recipient Tag */}
                      <span className="text-slate-500 font-medium">
                        Gửi tới: <strong className="text-slate-800">{item.recipientTag}</strong>
                      </span>

                      {/* Sender Alias */}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{item.alias}</span>
                      </span>

                      {/* Timestamp */}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    {/* Confession Content with Highlighted Forbidden Words */}
                    <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-sm sm:text-base font-medium text-slate-800 leading-relaxed break-words">
                      {renderHighlightedContent(item)}
                    </div>

                    {/* Quick Edit notice if edited */}
                    {item.editedContent && (
                      <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>
                          Bài viết đã được Admin chỉnh sửa câu từ trước khi xuất bản.
                        </span>
                      </div>
                    )}

                    {/* AI Recommendation Banner */}
                    <div
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                        item.aiRecommendation?.action === 'REJECT'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : item.aiRecommendation?.action === 'REVIEW'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {item.aiRecommendation?.action === 'REJECT' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : item.aiRecommendation?.action === 'REVIEW' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p>{item.aiRecommendation?.reason}</p>
                        {hasProfanity && item.moderation?.matched_words?.length > 0 && (
                          <p className="text-[11px] mt-0.5 text-rose-700 font-bold">
                            Từ vi phạm phát hiện:{' '}
                            {item.moderation.matched_words.map((w) => `[${w}]`).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons (Duyệt nhanh, Từ chối, Sửa nhanh) */}
                  <div className="flex flex-wrap lg:flex-col items-center justify-start sm:justify-end gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Approve Button (A) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModerateAction(item, 'APPROVE');
                      }}
                      className={`flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title="Duyệt bài đăng công khai [Phím A]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Đã Duyệt' : 'Duyệt nhanh'}</span>
                      <kbd
                        className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                          isApproved
                            ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                            : 'bg-emerald-700 text-white border-emerald-500'
                        }`}
                      >
                        A
                      </kbd>
                    </button>

                    {/* Reject Button (R) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModerateAction(item, 'REJECT');
                      }}
                      className={`flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer ${
                        isRejected
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                      title="Từ chối và loại bỏ bài viết [Phím R]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isRejected ? 'Đã Từ Chối' : 'Từ chối'}</span>
                      <kbd
                        className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                          isRejected
                            ? 'bg-rose-200 text-rose-900 border-rose-400'
                            : 'bg-rose-700 text-white border-rose-500'
                        }`}
                      >
                        R
                      </kbd>
                    </button>

                    {/* Quick Edit Button (E) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setEditContentText(item.editedContent || item.content);
                        setEditNote('');
                      }}
                      className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                      title="Sửa nhanh từ sai chính tả và duyệt [Phím E]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Sửa nhanh</span>
                      <kbd className="text-[9px] font-mono bg-white px-1 py-0.2 rounded border border-slate-300 text-slate-500">
                        E
                      </kbd>
                    </button>
                  </div>
                </div>

                {/* Audit footnote if already moderated */}
                {item.moderatedBy && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Được xử lý bởi: <strong className="text-slate-600">{item.moderatedBy}</strong>
                    </span>
                    {item.moderatedAt && (
                      <span className="font-mono">
                        {new Date(item.moderatedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. KEYBOARD SHORTCUTS DOCK / HELPER BANNER (Bottom Bar) */}
      <div className="sticky bottom-4 z-20 bg-slate-900/90 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Keyboard className="w-4 h-4 text-blue-400" />
          <span>Tốc độ cao với Phím tắt:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 font-mono text-emerald-400 font-bold">
              A
            </kbd>
            <span>Duyệt</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 font-mono text-rose-400 font-bold">
              R
            </kbd>
            <span>Từ chối</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 font-mono text-amber-300 font-bold">
              E
            </kbd>
            <span>Sửa & Duyệt</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 font-mono text-slate-300">
              J / ↓
            </kbd>
            <span>Bài kế tiếp</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 font-mono text-slate-300">
              K / ↑
            </kbd>
            <span>Bài trước</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowShortcutHelp(true)}
          className="text-blue-400 hover:text-blue-300 font-bold text-xs underline underline-offset-2 flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Tất cả phím [?]</span>
        </button>
      </div>

      {/* 5. QUICK EDIT MODAL (Sửa nhanh chính tả / teencode) */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Sửa Nhanh & Phê Duyệt Confession
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung gốc gửi từ học sinh:
                </label>
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 font-mono break-words">
                  {editingItem.content}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung đã chỉnh sửa (Sửa chính tả / viết tắt):
                </label>
                <textarea
                  rows={4}
                  value={editContentText}
                  onChange={(e) => setEditContentText(e.target.value)}
                  placeholder="Nhập nội dung đã được sửa chuẩn mực..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi chú kiểm duyệt (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="VD: Sửa lỗi teencode và dấu cách"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ [Esc]
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit || !editContentText.trim()}
                onClick={async () => {
                  setIsSubmittingEdit(true);
                  await handleModerateAction(
                    editingItem,
                    'EDIT_AND_APPROVE',
                    editContentText,
                    editNote
                  );
                  setIsSubmittingEdit(false);
                  setEditingItem(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingEdit ? 'Đang lưu...' : 'Lưu & Phê Duyệt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SHORTCUT HELPER MODAL */}
      {showShortcutHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowShortcutHelp(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Bảng Phím Tắt Kiểm Duyệt Tốc Độ Cao
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutHelp(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-slate-500 font-medium pb-1">
                Sử dụng các phím bấm trên bàn phím để thao tác liên tục mà không cần dùng chuột:
              </p>

              {[
                { key: 'A', desc: 'Duyệt nhanh bài viết đang chọn (Approve)' },
                { key: 'R', desc: 'Từ chối bài viết đang chọn (Reject)' },
                { key: 'E', desc: 'Mở cửa sổ sửa nhanh chính tả & duyệt (Quick Edit)' },
                { key: 'J / ↓', desc: 'Di chuyển xuống bài viết tiếp theo' },
                { key: 'K / ↑', desc: 'Di chuyển lên bài viết trước đó' },
                { key: '1', desc: 'Chuyển tab danh sách: Chờ duyệt (Pending)' },
                { key: '2', desc: 'Chuyển tab danh sách: Đã duyệt (Approved)' },
                { key: '3', desc: 'Chuyển tab danh sách: Đã hủy (Rejected)' },
                { key: '4', desc: 'Chuyển tab danh sách: Toàn bộ (All)' },
                { key: '?', desc: 'Bật / Tắt bảng hướng dẫn phím tắt này' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="text-slate-700 font-medium">{item.desc}</span>
                  <kbd className="px-2 py-1 bg-white font-mono font-bold text-blue-700 rounded-md border border-slate-300 shadow-2xs">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowShortcutHelp(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Đã Hiểu & Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-slide-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-200" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-300" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
