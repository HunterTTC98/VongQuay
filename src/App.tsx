import React, { useState, useEffect, useRef } from 'react';
import {
  EventConfig,
  StudentUser,
  AdminUser,
  WheelSlot,
} from './types/index.ts';
import { WHEEL_SLOTS } from './server/rules.ts';
import { Navbar } from './components/Navbar.tsx';
import { LuckyWheel } from './components/LuckyWheel.tsx';
import { TicketForm } from './components/TicketForm.tsx';
import { ClaimModal } from './components/ClaimModal.tsx';
import { ClaimLookup } from './components/ClaimLookup.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { EventWelcome } from './components/EventWelcome.tsx';
import { soundManager } from './utils/audio.ts';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Info,
  School,
} from 'lucide-react';

export default function App() {
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // User & Admin session
  const [currentUser, setCurrentUser] = useState<StudentUser | null>(() => {
    try {
      const saved = localStorage.getItem('school_wheel_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [studentToken, setStudentToken] = useState<string | null>(() => {
    return localStorage.getItem('school_wheel_student_token') || null;
  });

  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('school_wheel_admin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('school_wheel_admin_token') || null;
  });

  const [isAdminView, setIsAdminView] = useState(false);

  // Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const spinLockRef = useRef(false);
  const [spinSlots, setSpinSlots] = useState<WheelSlot[] | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [spinOutcome, setSpinOutcome] = useState<{
    slotName: string;
    amount: number;
    isWin: boolean;
    isTrial?: boolean;
    claimCode?: string;
  } | null>(null);

  // Ticket input state
  const [ticketCode, setTicketCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    status?: string;
    message: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaimingTicket, setIsClaimingTicket] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupInitialCode, setLookupInitialCode] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'STUDENT' | 'ADMIN'>('STUDENT');

  const showToast = (type: 'info' | 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch event config from backend with resilient response parsing
  const fetchEventConfig = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/event');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const text = await res.text();
        console.warn(`[EventConfig] Non-JSON response received (status ${res.status}):`, text.slice(0, 100));
        if (retryCount < 2) {
          setTimeout(() => fetchEventConfig(retryCount + 1), 1000);
          return;
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.event) {
        setEvent(data.event);
      }
    } catch (err) {
      console.error('Failed to load event config:', err);
      if (retryCount < 2) {
        setTimeout(() => fetchEventConfig(retryCount + 1), 1000);
      }
    } finally {
      setLoadingEvent(false);
    }
  };

  useEffect(() => {
    fetchEventConfig();

    // Check URL parameters for ticket code e.g. ?ticket=SCH-XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('ticket');
    if (codeParam) {
      setTicketCode(codeParam.toUpperCase());
    }
  }, []);

  // Verify ticket
  const handleVerifyTicket = async () => {
    if (!ticketCode.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ticketCode.trim() }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch {
      setVerificationResult({
        valid: false,
        message: 'Lỗi kiểm tra vé, vui lòng thử lại',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Claim 1 student ticket
  const handleClaimStudentTicket = async () => {
    if (!currentUser || !studentToken) return;
    setIsClaimingTicket(true);
    try {
      const res = await fetch('/api/auth/claim-event-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setTicketCode(data.ticketCode);
        showToast('success', `${data.message} Mã vé của bạn: ${data.ticketCode}`);
        setVerificationResult({
          valid: true,
          status: 'UNUSED',
          message: 'Mã vé hợp lệ vừa được cấp cho tài khoản của bạn!',
        });
      } else {
        if (data.ticketCode) {
          setTicketCode(data.ticketCode);
        }
        showToast('info', data.error);
      }
    } catch {
      showToast('error', 'Lỗi cấp vé từ máy chủ');
    } finally {
      setIsClaimingTicket(false);
    }
  };

  // Execute Ticket Spin
  const handleSpinTicket = async () => {
    if (spinLockRef.current || !ticketCode.trim()) return;

    if (event?.status !== 'ACTIVE') {
      showToast('error', 'Sự kiện hiện không ở trạng thái mở quay!');
      return;
    }

    setTargetSlotIndex(null);
    setSpinSlots(null);
    spinLockRef.current = true;
    soundManager.playSpinStart();
    setIsSpinning(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (studentToken) {
        headers['Authorization'] = `Bearer ${studentToken}`;
      }

      const res = await fetch('/api/spin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          spinType: 'TICKET',
          ticketCode: ticketCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi quay thưởng');
      }

      const outcome = data.result;
      setSpinSlots(outcome.wheelSlots || null);
      setSpinOutcome({
        slotName: outcome.slotName,
        amount: outcome.amount,
        isWin: outcome.isWin,
        isTrial: false,
        claimCode: outcome.claimCode,
      });

      // Start animated rotation towards target slot
      setTargetSlotIndex(outcome.wheelIndex ?? outcome.slotIndex);
      setIsSpinning(true);

      // Invalidate ticket input since it is now used
      setVerificationResult({
        valid: false,
        status: 'USED',
        message: 'Mã vé này đã được sử dụng cho lượt quay hiện tại.',
      });
    } catch (err: any) {
      spinLockRef.current = false;
      setSpinSlots(null);
      setIsSpinning(false);
      soundManager.playSpinError();
      showToast('error', err.message || 'Lỗi xử lý lượt quay');
    }
  };

  // Execute Free Spin
  const handleSpinFree = async () => {
    if (spinLockRef.current) return;
    if (!currentUser || !studentToken) {
      setAuthDefaultTab('STUDENT');
      setIsAuthModalOpen(true);
      return;
    }

    if (currentUser.freeSpinsRemaining <= 0) {
      showToast('error', 'Bạn đã sử dụng hết 3 lượt quay miễn phí!');
      return;
    }

    setTargetSlotIndex(null);
    setSpinSlots(null);
    spinLockRef.current = true;
    soundManager.playSpinStart();
    setIsSpinning(true);
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          spinType: 'FREE',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi quay miễn phí');
      }

      const outcome = data.result;
      setSpinSlots(outcome.wheelSlots || null);
      setSpinOutcome({
        slotName: outcome.slotName,
        amount: 0,
        isWin: false,
        isTrial: false,
      });

      // Update remaining spins locally
      const updatedUser = {
        ...currentUser,
        freeSpinsRemaining: outcome.freeSpinsRemaining,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('school_wheel_student', JSON.stringify(updatedUser));

      setTargetSlotIndex(outcome.wheelIndex ?? outcome.slotIndex);
      setIsSpinning(true);
    } catch (err: any) {
      spinLockRef.current = false;
      setSpinSlots(null);
      setIsSpinning(false);
      soundManager.playSpinError();
      showToast('error', err.message || 'Lỗi quay miễn phí');
    }
  };

  // Execute Trial Spin
  const handleSpinTrial = async () => {
    if (spinLockRef.current) return;

    setTargetSlotIndex(null);
    setSpinSlots(null);
    spinLockRef.current = true;
    soundManager.playSpinStart();
    setIsSpinning(true);
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinType: 'TRIAL' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi quay thử');
      }

      const outcome = data.result;
      setSpinSlots(outcome.wheelSlots || null);
      setSpinOutcome({
        slotName: outcome.slotName,
        amount: 0,
        isWin: false,
        isTrial: true,
      });

      setTargetSlotIndex(outcome.wheelIndex ?? outcome.slotIndex);
      setIsSpinning(true);
    } catch (err: any) {
      spinLockRef.current = false;
      setSpinSlots(null);
      setIsSpinning(false);
      soundManager.playSpinError();
      showToast('error', err.message || 'Lỗi quay thử');
    }
  };

  // Called when wheel animation physically finishes
  const handleSpinEnd = () => {
    spinLockRef.current = false;
    setSpinSlots(null);
    setIsSpinning(false);
    fetchEventConfig(); // Refresh remaining stats

    if (spinOutcome?.isTrial) {
      showToast(
        'info',
        `[QUAY THỬ] Kim chỉ vào ô: ${spinOutcome.slotName}. (Lượt quay thử nghiệm - không có giá trị nhận thưởng)`
      );
    } else if (spinOutcome?.isWin && spinOutcome.amount > 0 && spinOutcome.claimCode) {
      // Show Claim Modal for cash winners
      setIsClaimModalOpen(true);
    } else {
      // Wish / no cash
      showToast('success', `Kết quả: ${spinOutcome?.slotName || 'Chúc may mắn lần sau!'}`);
    }
  };

  const handleStudentLoginSuccess = (user: StudentUser, token: string) => {
    setCurrentUser(user);
    setStudentToken(token);
    localStorage.setItem('school_wheel_student', JSON.stringify(user));
    localStorage.setItem('school_wheel_student_token', token);
    showToast('success', `Chào mừng ${user.fullName || user.username}! Bạn có 3 lượt quay miễn phí.`);
  };

  const handleAdminLoginSuccess = (admin: AdminUser, token: string) => {
    setCurrentAdmin(admin);
    setAdminToken(token);
    localStorage.setItem('school_wheel_admin', JSON.stringify(admin));
    localStorage.setItem('school_wheel_admin_token', token);
    setIsAdminView(true);
    showToast('success', 'Đăng nhập Ban Quản Trị thành công!');
  };

  const handleLogoutUser = () => {
    setCurrentUser(null);
    setStudentToken(null);
    localStorage.removeItem('school_wheel_student');
    localStorage.removeItem('school_wheel_student_token');
    showToast('info', 'Đã đăng xuất tài khoản học sinh.');
  };

  const handleLogoutAdmin = () => {
    setCurrentAdmin(null);
    setAdminToken(null);
    setIsAdminView(false);
    localStorage.removeItem('school_wheel_admin');
    localStorage.removeItem('school_wheel_admin_token');
    showToast('info', 'Đã đăng xuất Quản trị viên.');
  };

  const slotsToDisplay = event?.slots && event.slots.length === 8 ? event.slots : WHEEL_SLOTS;
  const activeWheelSlots = slotsToDisplay.filter((slot) => slot.isEnabled !== false);

  return (
    <div className="min-h-screen bg-[#fffdf9] text-stone-800 flex flex-col font-sans selection:bg-rose-200 selection:text-rose-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm p-4 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 animate-slide-in backdrop-blur-md bg-white text-gray-900 border-amber-300">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        event={event}
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        onOpenAuth={(tab) => {
          setAuthDefaultTab(tab || 'STUDENT');
          setIsAuthModalOpen(true);
        }}
        onOpenLookup={() => {
          setLookupInitialCode('');
          setIsLookupModalOpen(true);
        }}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
        isAdminView={isAdminView}
        onLogoutUser={handleLogoutUser}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {isAdminView && adminToken && currentAdmin ? (
          <AdminDashboard
            adminToken={adminToken}
            adminUser={currentAdmin}
            onRefreshPublicEvent={fetchEventConfig}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
            <EventWelcome event={event} onOpenLookup={() => {
              setLookupInitialCode('');
              setIsLookupModalOpen(true);
            }} />

            {/* Lucky Wheel & Spin Controls Layout */}
            <div id="lucky-wheel" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
              {/* Wheel Centerpiece (Left Column) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                <LuckyWheel
                  slots={spinSlots || activeWheelSlots}
                  isSpinning={isSpinning}
                  onSpinEnd={handleSpinEnd}
                  targetSlotIndex={targetSlotIndex}
                  spinOutcome={spinOutcome}
                  disabled={event?.status !== 'ACTIVE'}
                  disabledReason={
                    event?.status === 'PAUSED'
                      ? 'Ban tổ chức đang tạm dừng vòng quay. Vui lòng quay lại sau ít phút!'
                      : event?.status === 'ENDED'
                      ? 'Sự kiện đã chính thức khép lại. Cảm ơn các bạn học sinh đã tham gia!'
                      : undefined
                  }
                />
              </div>

              {/* Ticket & Actions Form (Right Column) */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <TicketForm
                  ticketCode={ticketCode}
                  setTicketCode={setTicketCode}
                  onVerifyTicket={handleVerifyTicket}
                  verificationResult={verificationResult}
                  isVerifying={isVerifying}
                  onSpinTicket={handleSpinTicket}
                  onSpinFree={handleSpinFree}
                  onSpinTrial={handleSpinTrial}
                  isSpinning={isSpinning}
                  canSpin={!isSpinning && event?.status === 'ACTIVE'}
                  currentUser={currentUser}
                  onClaimStudentTicket={handleClaimStudentTicket}
                  isClaimingTicket={isClaimingTicket}
                  eventStatus={event?.status || 'ACTIVE'}
                />
              </div>
            </div>

            {/* Prize Matrix Showcase */}
            <div className="mt-12 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    Cơ Cấu 8 Ô Vòng Quay Sự Kiện
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  4 giải tiền mặt xen kẽ 4 ô lời chúc ý nghĩa
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeWheelSlots.map((slot) => {
                  const prizeData = event?.prizes?.find((p) => p.slot_index === slot.index);
                  return (
                    <div
                      key={slot.index}
                      className={`p-3.5 rounded-2xl border transition ${
                        slot.isCash
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-900/40 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 font-mono">Ô #{slot.index + 1}</span>
                        {slot.isCash ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300">
                            TIỀN MẶT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-400/20 text-blue-300">
                            LỜI CHÚC
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-sm text-white">{slot.name}</p>
                      {slot.isCash && prizeData && (
                        <p className="text-[11px] text-amber-200 mt-1 font-semibold">
                          Còn lại: <strong>{prizeData.remaining_quantity}</strong> /{' '}
                          {prizeData.total_quantity} suất
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-100 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-rose-600" />
            <span className="font-medium">
              Bách Khoa Events · Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-stone-500">
            <span>Xử lý giao dịch nguyên tử (ACID Transaction)</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Hệ thống an toàn</span>
          </div>
        </div>
      </footer>

      {/* Claim Submission Modal */}
      {spinOutcome && (
        <ClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          claimCode={spinOutcome.claimCode || ''}
          prizeAmount={spinOutcome.amount}
          prizeName={spinOutcome.slotName}
          onSubmittedSuccess={() => {
            fetchEventConfig();
          }}
        />
      )}

      {/* Claim Lookup Modal */}
      <ClaimLookup
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        initialCode={lookupInitialCode}
      />

      {/* Auth Modal (Student Login / Admin Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onStudentLoginSuccess={handleStudentLoginSuccess}
        onAdminLoginSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
