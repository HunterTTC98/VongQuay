import React, { useState } from 'react';
import { StudentUser, AdminUser } from '../types/index.ts';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
} from '../firebase.ts';
import {
  User,
  Shield,
  KeyRound,
  School,
  Sparkles,
  X,
  AlertCircle,
  UserPlus,
  LogIn,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'STUDENT' | 'ADMIN';
  onStudentLoginSuccess: (user: StudentUser, token: string) => void;
  onAdminLoginSuccess: (admin: AdminUser, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'STUDENT',
  onStudentLoginSuccess,
  onAdminLoginSuccess,
}) => {
  const [tab, setTab] = useState<'STUDENT' | 'ADMIN'>(defaultTab);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Student auth mode: 'LOGIN', 'REGISTER', or 'FORGOT_PASSWORD'
  const [studentMode, setStudentMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  /**
   * Sync with backend session endpoint after Firebase authentication
   */
  const handleFirebaseSessionSync = async (fbUser: any, customClass?: string) => {
    const res = await fetch('/api/auth/firebase-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fullName.trim(),
        photoUrl: fbUser.photoURL,
        studentClass: customClass || studentClass.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Đồng bộ hồ sơ tài khoản thất bại');
    }

    // If recognized as admin, trigger admin success
    if (data.isAdmin && data.admin && data.adminToken) {
      onAdminLoginSuccess(data.admin, data.adminToken);
    }

    // Always trigger student success
    onStudentLoginSuccess(data.user, data.token);
    onClose();
  };

  /**
   * 1-Click Google Sign In (Firebase Auth)
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      await handleFirebaseSessionSync(fbUser);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else {
        setError(err.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Email/Password Auth (Firebase Auth)
   */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSentMsg(null);

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    // Password Reset Flow
    if (studentMode === 'FORGOT_PASSWORD') {
      setLoading(true);
      try {
        await sendPasswordReset(email);
        setResetSentMsg(
          `Đã gửi hướng dẫn đặt lại mật khẩu đến ${email}. Vui lòng kiểm tra hộp thư (cả mục Spam/Rác).`
        );
      } catch (err: any) {
        setError(err.message || 'Không thể gửi email đặt lại mật khẩu.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      let fbUser: any = null;
      if (studentMode === 'REGISTER') {
        if (!fullName.trim()) {
          setError('Vui lòng nhập họ và tên của bạn');
          setLoading(false);
          return;
        }
        fbUser = await registerWithEmail(email, password, fullName.trim());
      } else {
        fbUser = await loginWithEmail(email, password);
      }

      await handleFirebaseSessionSync(fbUser, studentClass.trim());
    } catch (err: any) {
      console.error('Firebase Email Auth Error:', err);
      let msg = err.message || 'Đăng nhập không thành công';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email hoặc mật khẩu không chính xác. Bạn có thể bấm "Quên mật khẩu?" để khôi phục.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Địa chỉ email này đã được đăng ký. Vui lòng chuyển sang "Đăng nhập".';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Mật khẩu quá ngắn hoặc đơn giản. Vui lòng chọn mật khẩu từ 6 ký tự.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Classical Admin Credentials Login
   */
  const handleAdminCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setError('Vui lòng nhập tài khoản và mật khẩu quản trị');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tài khoản hoặc mật khẩu quản trị không chính xác');
      }

      onAdminLoginSuccess(data.admin, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-gray-200">
        {/* Header Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 relative">
          <button
            type="button"
            onClick={() => {
              setTab('STUDENT');
              setError(null);
            }}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              tab === 'STUDENT'
                ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Tài Khoản Sự Kiện</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('ADMIN');
              setError(null);
            }}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              tab === 'ADMIN'
                ? 'bg-white text-amber-700 border-b-2 border-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Ban Quản Trị</span>
          </button>

          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 rounded-bl-xl transition absolute top-0 right-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Logo & School Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-md shadow-red-500/20 mb-2">
              <School className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-lg">Bách Khoa Events</h3>
            <p className="text-xs text-stone-500">Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSentMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{resetSentMsg}</span>
            </div>
          )}

          {/* TAB 1: STUDENT / USER AUTH */}
          {tab === 'STUDENT' && (
            <div className="space-y-4">
              {/* 1-Click Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 border border-stone-300 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition active:scale-[0.99]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng nhập 1-chạm với Google</span>
              </button>

              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-stone-200" />
                <span className="px-3 text-stone-400 text-xs font-semibold uppercase">Hoặc dùng Email</span>
                <div className="flex-1 border-t border-stone-200" />
              </div>

              {/* Sub-mode selector (Login / Register) */}
              <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-bold text-stone-600">
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode('LOGIN');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    studentMode === 'LOGIN' ? 'bg-white text-stone-900 shadow-sm' : 'hover:text-stone-900'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode('REGISTER');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    studentMode === 'REGISTER' ? 'bg-white text-stone-900 shadow-sm' : 'hover:text-stone-900'
                  }`}
                >
                  Đăng Ký Mới
                </button>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {studentMode === 'REGISTER' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Họ và tên của bạn
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Lớp / Đơn vị (Không bắt buộc)
                      </label>
                      <input
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="Ví dụ: K18 Điện, CNTT 1..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tenban@gmail.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {studentMode !== 'FORGOT_PASSWORD' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700">Mật khẩu</label>
                      {studentMode === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMode('FORGOT_PASSWORD');
                            setError(null);
                          }}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800"
                        >
                          Quên mật khẩu?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : studentMode === 'LOGIN' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng Nhập</span>
                    </>
                  ) : studentMode === 'REGISTER' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Tạo Tài Khoản & Nhận 3 Lượt Quay</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Gửi Link Đặt Lại Mật Khẩu</span>
                    </>
                  )}
                </button>

                {studentMode === 'FORGOT_PASSWORD' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('LOGIN');
                      setError(null);
                    }}
                    className="w-full text-center text-xs text-stone-600 hover:text-stone-900 font-semibold pt-1"
                  >
                    ← Quay lại đăng nhập
                  </button>
                )}
              </form>

              {/* Perks note */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 text-[11px] text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đăng nhập lần đầu được cấp sẵn 3 lượt quay may mắn và 1 vé dự thưởng tiền mặt!</span>
              </div>
            </div>
          )}

          {/* TAB 2: ADMIN AUTH */}
          {tab === 'ADMIN' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                  Xác thực phân quyền Quản trị viên
                </p>
                <p className="text-[11px] text-amber-800">
                  Thầy cô trong Ban Quản Trị có thể đăng nhập trực tiếp bằng Google/Email đã được cấp quyền, hoặc sử dụng tài khoản quản trị hệ thống.
                </p>
              </div>

              {/* 1-Click Google Sign In for Admin */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 border border-amber-300 rounded-2xl bg-white hover:bg-amber-50 text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition active:scale-[0.99]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng nhập Ban Quản Trị bằng Google</span>
              </button>

              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-stone-200" />
                <span className="px-3 text-stone-400 text-xs font-semibold uppercase">Hoặc tài khoản cấp riêng</span>
                <div className="flex-1 border-t border-stone-200" />
              </div>

              {/* Admin credentials form */}
              <form onSubmit={handleAdminCredentialsLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tên đăng nhập / Email quản trị
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin hoặc email quản trị"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mật khẩu quản trị viên
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 mt-4 border border-amber-400/30"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Xác thực Quản trị viên</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
