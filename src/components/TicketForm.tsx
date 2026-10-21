import React, { useState } from 'react';
import { Ticket, StudentUser } from '../types/index.ts';
import { Ticket as TicketIcon, CheckCircle2, XCircle, AlertTriangle, Play, Sparkles, HelpCircle } from 'lucide-react';

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
}) => {
  const isEventActive = eventStatus === 'ACTIVE';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketCode(e.target.value.toUpperCase());
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-amber-200/80 p-5 sm:p-6 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-red-600" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Khu Vực Quay Thưởng
          </h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
          Tiền mặt: 10k - 100k
        </span>
      </div>

      {/* Ticket Input Section */}
      <div className="space-y-3">
        <label className="block text-xs sm:text-sm font-semibold text-gray-700">
          Nhập mã vé dự thưởng <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-gray-500 ml-1">
            (Bắt buộc để tham gia giải tiền mặt)
          </span>
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={ticketCode}
              onChange={handleInputChange}
              placeholder="VD: SCH-8K9M-2026"
              disabled={isSpinning}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={onVerifyTicket}
            disabled={!ticketCode.trim() || isVerifying || isSpinning}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 active:scale-95 shrink-0"
          >
            {isVerifying ? 'Đang kiểm...' : 'Kiểm tra vé'}
          </button>
        </div>

        {/* Verification Result Notice */}
        {verificationResult && (
          <div
            className={`p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 transition ${
              verificationResult.valid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {verificationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{verificationResult.message}</p>
              {verificationResult.valid && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Mã vé sẵn sàng! Nhấn nút &quot;Quay vé tiền mặt&quot; bên dưới để bắt đầu.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Shortcut to claim 1 ticket for logged in student */}
        {currentUser && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-amber-900">
              <span className="font-semibold block">Bạn là học sinh?</span>
              Mỗi tài khoản được cấp 1 vé dự thưởng chính thức.
            </div>
            <button
              onClick={onClaimStudentTicket}
              disabled={isClaimingTicket || isSpinning}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm transition active:scale-95 shrink-0"
            >
              {isClaimingTicket ? 'Đang cấp vé...' : 'Nhận vé của tôi'}
            </button>
          </div>
        )}
      </div>

      {/* Main Spin Action Buttons */}
      <div className="mt-5 space-y-2.5">
        {/* Ticket Spin Button */}
        <button
          onClick={onSpinTicket}
          disabled={!canSpin || !ticketCode.trim() || !isEventActive || isSpinning}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.99] text-white font-extrabold text-base shadow-lg shadow-red-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{isSpinning ? 'Đang quay may mắn...' : 'Quay Bằng Vé (Cơ hội trúng tiền)'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Free Spin Button */}
          <button
            onClick={onSpinFree}
            disabled={
              !currentUser ||
              currentUser.freeSpinsRemaining <= 0 ||
              !isEventActive ||
              isSpinning
            }
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-40 active:scale-95 flex flex-col items-center justify-center text-center"
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Quay Miễn Phí</span>
            </span>
            <span className="text-[11px] font-normal text-blue-100">
              {currentUser
                ? `Còn ${currentUser.freeSpinsRemaining} lượt (Chỉ lời chúc)`
                : 'Đăng nhập để nhận'}
            </span>
          </button>

          {/* Trial Spin Button */}
          <button
            onClick={onSpinTrial}
            disabled={isSpinning}
            className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm border border-gray-300 transition active:scale-95 flex flex-col items-center justify-center text-center"
          >
            <span>Quay Thử Nghiệm</span>
            <span className="text-[10px] font-normal text-gray-500">
              Không đổi dữ liệu / giải
            </span>
          </button>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
        <p className="flex items-center gap-1 font-medium text-gray-700">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          Quy định quay số:
        </p>
        <p>• Vé chỉ được sử dụng đúng 1 lần duy nhất, kết quả do backend xác nhận.</p>
        <p>• Lượt quay thử không có giá trị nhận thưởng.</p>
        <p>• Khi trúng thưởng, hệ thống sẽ cấp mã nhận thưởng để đối soát và trao tiền.</p>
      </div>
    </div>
  );
};
