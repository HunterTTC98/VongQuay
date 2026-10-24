import React, { useState } from 'react';
import { Claim, ClaimStatus } from '../types/index.ts';
import { Search, CheckCircle, Clock, XCircle, AlertCircle, Shield, ArrowRight, User, Phone, School, DollarSign, X } from 'lucide-react';

interface ClaimLookupProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const STATUS_MAP: Record<ClaimStatus, { label: string; color: string; desc: string }> = {
  UNSUBMITTED: {
    label: 'Chưa gửi thông tin',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    desc: 'Người trúng giải chưa điền thông tin học sinh và số điện thoại nhận thưởng.',
  },
  PENDING_VERIFICATION: {
    label: 'Chờ xác minh',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Thông tin đã được gửi. Ban Tổ Chức đang đối soát với danh sách học sinh.',
  },
  VERIFIED: {
    label: 'Đã xác minh',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Thông tin hợp lệ và đã được phê duyệt.',
  },
  PENDING_PAYOUT: {
    label: 'Chờ chuyển tiền',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    desc: 'Đang xếp lịch chi tiền mặt hoặc lập lệnh chuyển khoản.',
  },
  PAID: {
    label: 'Đã chuyển tiền',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Giải thưởng đã được trao thành công.',
  },
  REJECTED: {
    label: 'Bị từ chối',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    desc: 'Yêu cầu bị từ chối do thông tin không khớp hoặc vi phạm thể lệ.',
  },
};

export const ClaimLookup: React.FC<ClaimLookupProps> = ({ isOpen, onClose, initialCode = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setClaim(null);

    try {
      const clean = code.trim().toUpperCase();
      const res = await fetch(`/api/claims/${clean}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không tìm thấy thông tin giải thưởng với mã này');
      }

      setClaim(data.claim);
    } catch (err: any) {
      setError(err.message || 'Lỗi tra cứu');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = claim ? STATUS_MAP[claim.status] || STATUS_MAP.UNSUBMITTED : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              Tra Cứu Tiến Độ Nhận Thưởng
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Lookup Input Form */}
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã CLM-XXXXXX"
              className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Đang tìm...' : 'Tra cứu'}</span>
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Claim Details Card */}
          {claim && statusInfo && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-xs text-gray-500 block">Mã nhận thưởng</span>
                  <span className="text-lg font-black font-mono text-red-600 tracking-wider">
                    {claim.claimCode || claim.claim_code}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Số tiền trúng</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {claim.prizeAmount?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Trạng thái hiện tại:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{statusInfo.desc}</p>
              </div>

              {/* Information Table with Data Minimization */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block mb-0.5">Người nhận (bảo vệ quyền riêng tư):</span>
                  <span className="font-semibold text-gray-800">
                    {claim.maskedStudentName || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block mb-0.5">Lớp / Đơn vị:</span>
                  <span className="font-semibold text-gray-800">
                    {claim.maskedClass || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block mb-0.5">Số điện thoại (đã che):</span>
                  <span className="font-semibold font-mono text-gray-800">
                    {claim.maskedPhone || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block mb-0.5">Hình thức nhận:</span>
                  <span className="font-semibold text-gray-800">
                    {claim.payoutMethod === 'BANK_MOMO' ? 'Chuyển khoản / MoMo' : 'Tiền mặt trực tiếp'}
                  </span>
                </div>
              </div>

              {/* Transaction Ref (Masked) */}
              {claim.maskedTransactionRef && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">Thông tin đối soát từ Ban Tổ Chức:</span>
                  <p className="text-amber-900 font-mono">
                    Mã biên lai / giao dịch: <span className="font-bold">{claim.maskedTransactionRef}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
