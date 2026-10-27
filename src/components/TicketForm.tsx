import React from 'react';
import { StudentUser } from '../types/index.ts';
import {
  Ticket as TicketIcon,
  Search,
  Zap,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  LogIn,
  Gift,
} from 'lucide-react';

interface TicketFormProps {
  ticketCode: string;
  setTicketCode: (code: string) => void;
  onVerifyTicket: () => Promise<void>;
  verificationResult: {
    valid: boolean;
    status?: string;
    message: string;
  } | null;
  isVerifying: boolean;
  onSpinTicket: () => void;
  onSpinFree: () => void;
  onSpinTrial: () => void;
  isSpinning: boolean;
  canSpin: boolean;
  currentUser: StudentUser | null;
  onClaimStudentTicket: () => Promise<void>;
  isClaimingTicket: boolean;
  eventStatus: string;
  onOpenAuth?: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  ticketCode,
  setTicketCode,
  onVerifyTicket,
  verificationResult,
  isVerifying,
  onSpinTicket,
  onSpinFree,
  onSpinTrial,
  isSpinning,
  canSpin,
  currentUser,
  onClaimStudentTicket,
  isClaimingTicket,
  eventStatus,
  onOpenAuth,
}) => {
  const isEventActive = eventStatus === 'ACTIVE';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketCode(e.target.value.toUpperCase());
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Main Participation Card matching reference design */}
      <div className="ticket-main-card bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white transition-colors">
        {/* Card Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/40 shrink-0">
            <TicketIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="ticket-card-title text-base sm:text-lg font-black tracking-tight text-white font-['Montserrat',sans-serif]">
              Tham Gia Bằng Mã Vé / Tài Khoản
            </h2>
            <p className="ticket-card-subtitle text-xs text-slate-400">
              Đăng nhập hoặc nhập mã vé dự thưởng để quay
            </p>
          </div>
        </div>

        {/* Warning / Callout Banner matching reference image */}
        <div className="ticket-callout-banner mb-5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5 transition-colors">
          <span className="text-amber-400 font-bold shrink-0">ⓘ</span>
          <div className="flex-1 leading-relaxed">
            {currentUser ? (
              <span>
                Chào mừng <strong className="text-amber-300 font-bold">{currentUser.fullName || currentUser.username}</strong>! Bạn còn <strong className="text-amber-300 font-bold">{currentUser.freeSpinsRemaining}</strong> lượt quay miễn phí hoặc nhận vé sự kiện để rinh tiền mặt.
              </span>
            ) : (
              <span>
                Vui lòng <strong className="font-bold text-white">Đăng nhập</strong> để nhận 3 lượt quay miễn phí hoặc <strong className="font-bold text-white">Nhập mã vé dự thưởng</strong> từ nhà trường để quay!
              </span>
            )}
          </div>
          {!currentUser && onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg shrink-0 transition"
            >
              Đăng nhập
            </button>
          )}
        </div>

        {/* Ticket Input Section */}
        <div className="space-y-2 mb-5">
          <label className="ticket-input-label block text-xs font-semibold text-slate-300">
            Mã vé dự thưởng <span className="ticket-input-hint text-slate-400 font-normal">(Do ban tổ chức cấp riêng)</span>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={ticketCode}
              onChange={handleInputChange}
              placeholder="Nhập mã vé BKS-2010-XXX..."
              disabled={isSpinning}
              className="ticket-input-field flex-1 px-4 py-3 bg-slate-950/70 border border-slate-700/60 rounded-2xl text-xs sm:text-sm font-mono font-bold tracking-wider uppercase text-amber-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
            />

            <button
              type="button"
              onClick={onVerifyTicket}
              disabled={!ticketCode.trim() || isVerifying || isSpinning}
              className="ticket-verify-btn px-4 py-3 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-4 h-4 text-white" />
              <span>{isVerifying ? 'Kiểm...' : 'Kiểm tra'}</span>
            </button>
          </div>

          {/* Verification Result Banner */}
          {verificationResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 border transition ${
                verificationResult.valid
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-200 border-rose-500/40'
              }`}
            >
              {verificationResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{verificationResult.message}</span>
            </div>
          )}

          {/* Shortcut to claim 1 ticket for logged-in student */}
          {currentUser && (
            <div className="ticket-student-box bg-amber-500/10 border border-amber-400/25 rounded-2xl p-3 flex items-center justify-between mt-2 transition-colors">
              <div className="text-[11px] text-amber-200">
                <span className="font-bold block text-white">Bạn là học sinh Bách Khoa?</span>
                Nhận vé sự kiện độc bản cho tài khoản của bạn.
              </div>
              <button
                type="button"
                onClick={onClaimStudentTicket}
                disabled={isClaimingTicket || isSpinning}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-red-950 font-bold rounded-xl text-xs shadow-md transition active:scale-95 shrink-0"
              >
                {isClaimingTicket ? 'Đang cấp...' : 'Nhận vé của tôi'}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons matching reference image */}
        <div className="space-y-2.5">
          {/* Main Primary Button: QUAY LẤY MAY (gradient) */}
          <button
            type="button"
            onClick={() => {
              if (ticketCode.trim()) {
                onSpinTicket();
              } else if (currentUser && currentUser.freeSpinsRemaining > 0) {
                onSpinFree();
              } else {
                onSpinTrial();
              }
            }}
            disabled={!canSpin || !isEventActive || isSpinning}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 hover:from-amber-400 hover:via-orange-400 hover:to-fuchsia-500 active:scale-[0.99] text-white font-black text-base shadow-[0_10px_25px_rgba(234,88,12,0.45)] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-current text-yellow-200" />
            <span>
              {isSpinning
                ? 'ĐANG QUAY THƯỞNG...'
                : ticketCode.trim()
                ? 'QUAY VÉ TIỀN MẶT'
                : currentUser && currentUser.freeSpinsRemaining > 0
                ? `QUAY MIỄN PHÍ (${currentUser.freeSpinsRemaining} LƯỢT)`
                : '⚡ QUAY LẤY MAY'}
            </span>
          </button>

          {/* Secondary Button: Quay thử (Demo) */}
          <button
            type="button"
            onClick={onSpinTrial}
            disabled={isSpinning}
            className="ticket-demo-btn w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-rose-100 font-bold text-xs sm:text-sm border border-white/10 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <RotateCw className="w-4 h-4 text-rose-300" />
            <span>Quay thử (Demo)</span>
          </button>
        </div>
      </div>

      {/* Transparency Info Box matching reference image */}
      <div className="ticket-transparency-box bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 text-xs text-slate-300 leading-relaxed shadow-lg transition-colors">
        <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Quy trình trao thưởng minh bạch MoMo & Cloud Firestore</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Mỗi lượt quay dừng chuẩn xác tại vị trí kim chỉ. Người trúng giải MoMo nhận mã dự thưởng độc bản, nộp thông tin nhận thưởng và được bộ phận quản trị nhà trường đối soát, chuyển khoản MoMo minh bạch.
        </p>
      </div>
    </div>
  );
};
