import React, { useState } from 'react';
import { Claim, ClaimStatus } from '../types/index.ts';
import { Trophy, CheckCircle, Copy, AlertCircle, X, ArrowRight, ShieldCheck, Phone, User, School, CreditCard } from 'lucide-react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCode: string;
  prizeAmount: number;
  prizeName: string;
  onSubmittedSuccess?: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  isOpen,
  onClose,
  claimCode,
  prizeAmount,
  prizeName,
  onSubmittedSuccess,
}) => {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'CASH_DIRECT' | 'BANK_MOMO'>('CASH_DIRECT');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(claimCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentName.trim() || studentName.trim().length < 2) {
      setError('Vui lòng nhập họ và tên đầy đủ');
      return;
    }
    if (!studentClass.trim()) {
      setError('Vui lòng nhập lớp hoặc đơn vị công tác');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('0') || cleanPhone.length < 10) {
      setError('Số điện thoại nhận tiền không hợp lệ (cần bắt đầu bằng 0 và tối thiểu 10 chữ số)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentClass: studentClass.trim(),
          phone: cleanPhone,
          payoutMethod,
          payoutAccount: payoutAccount.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Có lỗi khi gửi thông tin nhận thưởng');
      }

      setIsSuccess(true);
      if (onSubmittedSuccess) onSubmittedSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-amber-300 relative">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-amber-600 p-5 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 mx-auto bg-amber-400 text-red-700 rounded-full flex items-center justify-center shadow-lg mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold uppercase tracking-wide">
            Chúc Mừng Bạn Đã Trúng Thưởng!
          </h3>
          <p className="text-amber-100 text-sm mt-0.5">
            Giải thưởng: <span className="font-extrabold text-white text-base">{prizeName}</span> (
            {prizeAmount.toLocaleString('vi-VN')}đ)
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {/* Claim Code Box */}
          <div className="bg-amber-50 border-2 border-dashed border-amber-400 rounded-2xl p-4 text-center mb-5">
            <span className="text-xs font-semibold text-amber-800 uppercase block tracking-wider">
              Mã Nhận Thưởng Duy Nhất Của Bạn
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-black font-mono tracking-widest text-red-600">
                {claimCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition flex items-center gap-1 text-xs font-bold"
                title="Sao chép mã"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã chép' : 'Chép'}</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              ⚠️ Vui lòng chụp ảnh màn hình hoặc ghi nhớ mã này để đối chiếu khi nhận tiền.
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-lg text-gray-900">
                Đã Gửi Thông Tin Thành Công!
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                Hồ sơ nhận thưởng của bạn đã được chuyển đến Ban Tổ Chức ở trạng thái{' '}
                <span className="font-semibold text-amber-600">Chờ xác minh</span>. Bạn có thể sử dụng chức năng{' '}
                <span className="font-semibold text-gray-800">Tra cứu</span> bất cứ lúc nào với mã{' '}
                <span className="font-mono font-bold text-red-600">{claimCode}</span>.
              </p>
              <button
                onClick={onClose}
                className="w-full mt-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition"
              >
                Đóng và Tiếp tục
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <span>Điền thông tin để Ban Tổ Chức trao thưởng</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên học sinh / Người trúng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Nam"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Class / Organization */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lớp / Chi đoàn / Đơn vị <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="VD: 12A1 hoặc Đoàn Thanh Niên"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại nhận tiền / liên hệ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Số điện thoại sẽ được che bớt (VD: 091****678) khi tra cứu công khai.
                </p>
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hình thức nhận thưởng
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('CASH_DIRECT')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      payoutMethod === 'CASH_DIRECT'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Tiền mặt trực tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_MOMO')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      payoutMethod === 'BANK_MOMO'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Chuyển khoản / MoMo
                  </button>
                </div>
              </div>

              {payoutMethod === 'BANK_MOMO' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số tài khoản ngân hàng / SĐT MoMo
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={payoutAccount}
                      onChange={(e) => setPayoutAccount(e.target.value)}
                      placeholder="VD: MB Bank 0912345678 (Tên chủ TK)"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
              >
                <span>{isSubmitting ? 'Đang gửi thông tin...' : 'Gửi Thông Tin Nhận Thưởng'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
