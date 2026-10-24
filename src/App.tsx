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
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { GreetingCardStudio } from './components/GreetingCardStudio.tsx';
import { StatusPopupModal, type StatusPopupData } from './components/StatusPopupModal.tsx';
import { FallingPetals } from './components/FallingPetals.tsx';
import { logoutFirebase } from './firebase.ts';
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
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [statusPopup, setStatusPopup] = useState<StatusPopupData>({
    isOpen: false,
    type: 'info',
    title: '',
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('school_wheel_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [petalsEnabled, setPetalsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('school_wheel_petals');
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('school_wheel_theme', next);
  };

  const togglePetals = () => {
    const next = !petalsEnabled;
    setPetalsEnabled(next);
    localStorage.setItem('school_wheel_petals', String(next));
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  const [activeSection, setActiveSection] = useState<'WHEEL' | 'CARDS' | 'PRIZES' | 'LOOKUP'>('WHEEL');

  const handleSelectSection = (section: 'WHEEL' | 'CARDS' | 'PRIZES' | 'LOOKUP') => {
    setActiveSection(section);
    if (section === 'WHEEL') {
      document.getElementById('lucky-wheel')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'CARDS') {
      document.getElementById('greeting-card-studio')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'PRIZES') {
      document.getElementById('prize-matrix-showcase')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'LOOKUP') {
      setLookupInitialCode('');
      setIsLookupModalOpen(true);
    }
  };

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

  // Central Spin Button Action
  const handleCenterSpinClick = () => {
    if (spinLockRef.current || isSpinning) return;

    if (event?.status !== 'ACTIVE') {
      setStatusPopup({
        isOpen: true,
        type: 'warning',
        title: 'Vòng quay tạm đóng',
        message:
          event?.status === 'PAUSED'
            ? 'Ban tổ chức đang tạm dừng vòng quay. Vui lòng quay lại sau ít phút!'
            : 'Sự kiện đã chính thức khép lại. Cảm ơn các bạn học sinh đã tham gia!',
      });
      return;
    }

    // Priority 1: User has typed a ticket code -> spin with ticket!
    if (ticketCode.trim()) {
      handleSpinTicket();
      return;
    }

    // Priority 2: Student logged in with free spins -> spin free!
    if (currentUser && currentUser.freeSpinsRemaining > 0) {
      handleSpinFree();
      return;
    }

    // Priority 3: Student logged in but has 0 free spins -> show concise popup
    if (currentUser && currentUser.freeSpinsRemaining <= 0) {
      setStatusPopup({
        isOpen: true,
        type: 'spins_exhausted',
        title: 'Đã hết 3 lượt quay miễn phí',
        message: 'Mỗi tài khoản được cấp 3 lượt quay chúc mừng. Nhận vé sự kiện để tham gia giải tiền mặt, hoặc quay thử nghiệm.',
        actionLabel: 'Nhận vé của tôi',
        onAction: () => {
          handleClaimStudentTicket();
        },
        secondaryLabel: 'Quay thử nghiệm',
        onSecondary: () => {
          handleSpinTrial();
        },
      });
      return;
    }

    // Priority 4: Guest (not logged in) -> spin trial and invite login
    handleSpinTrial();
  };

  // Execute Ticket Spin
  const handleSpinTicket = async () => {
    if (spinLockRef.current || !ticketCode.trim()) return;

    if (event?.status !== 'ACTIVE') {
      setStatusPopup({
        isOpen: true,
        type: 'warning',
        title: 'Vòng quay tạm đóng',
        message: 'Sự kiện hiện không ở trạng thái mở quay!',
      });
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
      setStatusPopup({
        isOpen: true,
        type: 'error',
        title: 'Thông báo quay thưởng',
        message: err.message || 'Chưa thể thực hiện lượt quay. Vui lòng thử lại.',
      });
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
      setStatusPopup({
        isOpen: true,
        type: 'spins_exhausted',
        title: 'Đã hết 3 lượt quay miễn phí',
        message: 'Mỗi tài khoản được cấp 3 lượt quay chúc mừng. Nhận vé sự kiện để tham gia giải tiền mặt, hoặc quay thử nghiệm.',
        actionLabel: 'Nhận vé của tôi',
        onAction: () => {
          handleClaimStudentTicket();
        },
        secondaryLabel: 'Quay thử nghiệm',
        onSecondary: () => {
          handleSpinTrial();
        },
      });
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
      setStatusPopup({
        isOpen: true,
        type: 'error',
        title: 'Lượt quay chưa sẵn sàng',
        message: err.message || 'Chưa thể thực hiện lượt quay. Vui lòng thử lại.',
      });
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
      setStatusPopup({
        isOpen: true,
        type: 'error',
        title: 'Thông báo quay thử',
        message: err.message || 'Vui lòng thử lại sau giây lát.',
      });
    }
  };

  // Called when wheel animation physically finishes
  const handleSpinEnd = () => {
    spinLockRef.current = false;
    setSpinSlots(null);
    setIsSpinning(false);
    fetchEventConfig(); // Refresh remaining stats

    if (spinOutcome?.isTrial) {
      setStatusPopup({
        isOpen: true,
        type: 'spin_result',
        title: 'Kết quả quay thử nghiệm',
        slotName: spinOutcome.slotName,
        message: 'Chúc bạn một ngày học tập và làm việc nhiều niềm vui!',
        actionLabel: 'Quay tiếp thử nghiệm',
        onAction: () => {
          handleSpinTrial();
        },
      });
    } else if (spinOutcome?.isWin && spinOutcome.amount > 0 && spinOutcome.claimCode) {
      // Show Claim Modal for cash winners
      setIsClaimModalOpen(true);
    } else if (spinOutcome) {
      // Wish / no cash
      setStatusPopup({
        isOpen: true,
        type: 'spin_result',
        title: 'Chúc mừng bạn!',
        slotName: spinOutcome.slotName,
        message: 'Lời chúc ý nghĩa nhân dịp sự kiện Bách Khoa Events.',
        actionLabel: 'Tạo thiệp gửi bạn bè',
        onAction: () => {
          document.getElementById('greeting-card-studio')?.scrollIntoView({ behavior: 'smooth' });
        },
      });
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

  const handleLogoutUser = async () => {
    try {
      await logoutFirebase();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setStudentToken(null);
    setIsUserProfileOpen(false);
    localStorage.removeItem('school_wheel_student');
    localStorage.removeItem('school_wheel_student_token');
    showToast('info', 'Đã đăng xuất tài khoản.');
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
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative ${
        theme === 'light'
          ? 'bg-[#fffbf8] text-stone-900 selection:bg-rose-200 selection:text-rose-950'
          : 'bg-[#180518] text-rose-100 selection:bg-rose-500 selection:text-white'
      }`}
    >
      {/* Floating Falling Petals Canvas */}
      <FallingPetals enabled={petalsEnabled} />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 max-w-sm p-4 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 animate-slide-in backdrop-blur-md ${
            theme === 'light'
              ? 'bg-white/95 text-stone-900 border-rose-300 shadow-rose-950/10'
              : 'bg-[#2d0f28]/95 text-white border-amber-400/50 shadow-black/60'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-sky-500 shrink-0" />
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
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
        isAdminView={isAdminView}
        onLogoutUser={handleLogoutUser}
        onLogoutAdmin={handleLogoutAdmin}
        theme={theme}
        onToggleTheme={toggleTheme}
        petalsEnabled={petalsEnabled}
        onTogglePetals={togglePetals}
        onNavigateSection={handleSelectSection}
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
            <EventWelcome
              event={event}
              currentUser={currentUser}
              onOpenAuth={() => {
                setAuthDefaultTab('STUDENT');
                setIsAuthModalOpen(true);
              }}
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
            />

            {/* Lucky Wheel & Spin Controls Layout */}
            <div id="lucky-wheel" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
              {/* Wheel Centerpiece (Left Column) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center">
                <LuckyWheel
                  slots={spinSlots || activeWheelSlots}
                  isSpinning={isSpinning}
                  onSpinEnd={handleSpinEnd}
                  onSpinCenter={handleCenterSpinClick}
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
                  onOpenAuth={() => {
                    setAuthDefaultTab('STUDENT');
                    setIsAuthModalOpen(true);
                  }}
                />
              </div>
            </div>

            {/* Prize Matrix Showcase */}
            <div
              id="prize-matrix-showcase"
              className={`scroll-mt-24 mt-12 rounded-3xl p-5 sm:p-7 max-w-5xl mx-auto shadow-2xl transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-rose-200/80 shadow-rose-950/5'
                  : 'bg-[#2a1128]/85 border border-white/10 backdrop-blur-xl shadow-black/60'
              }`}
            >
              <div
                className={`flex items-center justify-between mb-4 pb-3 border-b ${
                  theme === 'light' ? 'border-rose-100' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3
                    className={`font-black text-base sm:text-lg ${
                      theme === 'light' ? 'text-stone-900' : 'text-white'
                    }`}
                  >
                    Cơ Cấu Giải Thưởng
                  </h3>
                </div>
                <span
                  className={`text-xs ${
                    theme === 'light' ? 'text-stone-500' : 'text-rose-200/70'
                  }`}
                >
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
                          ? theme === 'light'
                            ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                            : 'bg-amber-950/40 border-amber-500/40'
                          : theme === 'light'
                          ? 'bg-rose-50/50 border-rose-200 shadow-sm'
                          : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className={`font-mono font-bold ${
                            theme === 'light' ? 'text-stone-600' : 'text-rose-200'
                          }`}
                        >
                          Ô #{slot.index + 1}
                        </span>
                        {slot.isCash ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              theme === 'light'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            }`}
                          >
                            TIỀN MẶT
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              theme === 'light'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-rose-400/20 text-rose-200 border-rose-400/40'
                            }`}
                          >
                            LỜI CHÚC
                          </span>
                        )}
                      </div>
                      <p
                        className={`font-extrabold text-sm ${
                          theme === 'light' ? 'text-stone-900' : 'text-white'
                        }`}
                      >
                        {slot.name}
                      </p>
                      {slot.isCash && prizeData && (
                        <p
                          className={`text-[11px] mt-1 font-semibold ${
                            theme === 'light' ? 'text-amber-900' : 'text-amber-200'
                          }`}
                        >
                          Còn lại: <strong className={theme === 'light' ? 'text-amber-950' : 'text-yellow-100'}>{prizeData.remaining_quantity}</strong> /{' '}
                          {prizeData.total_quantity} suất
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Studio Tạo Thiệp Điện Tử & Lời Chúc Tiếng Việt (Giai Đoạn 2) */}
            <GreetingCardStudio currentOccasionId={event?.occasion || '20_11'} />

          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-center text-xs transition-colors duration-300 ${
          theme === 'light'
            ? 'border-rose-100 bg-white text-stone-600'
            : 'border-white/10 bg-[#120312] text-rose-200/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-rose-500" />
            <span
              className={`font-medium ${
                theme === 'light' ? 'text-stone-800' : 'text-rose-100'
              }`}
            >
              Bách Khoa Events · Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn
            </span>
          </div>
          <div
            className={`flex items-center gap-4 text-[11px] ${
              theme === 'light' ? 'text-stone-500' : 'text-rose-300/70'
            }`}
          >
            <span>Xử lý giao dịch nguyên tử (ACID Transaction)</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">Hệ thống an toàn</span>
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

      {/* User Profile Modal (Tickets, Spins, Claims & Account) */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        token={studentToken}
        currentUser={currentUser}
        isAdmin={!!currentAdmin}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          localStorage.setItem('school_wheel_student', JSON.stringify(updated));
        }}
        onSelectTicketToSpin={(code) => {
          setTicketCode(code);
          document.getElementById('ticket-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenClaimModal={(claimCode, amt) => {
          setSpinOutcome({
            slotName: `${amt.toLocaleString('vi-VN')}đ`,
            amount: amt,
            isWin: true,
            claimCode,
          });
          setIsClaimModalOpen(true);
        }}
        onSwitchToAdmin={() => setIsAdminView(true)}
      />

      {/* Concise Feedback & Result Popup Modal (Dismissible on Backdrop Click) */}
      <StatusPopupModal
        popup={statusPopup}
        onClose={() => setStatusPopup((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
