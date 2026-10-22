import React, { useState } from 'react';
import { StudentUser, AdminUser } from '../types/index.ts';
import { User, Shield, KeyRound, School, Sparkles, X, AlertCircle, UserPlus, LogIn } from 'lucide-react';

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

  // Student auth mode: 'LOGIN' or 'REGISTER'
  const [studentMode, setStudentMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Admin form state - NEVER prefilled with secrets!
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStudentAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!studentUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập / mã học sinh');
      return;
    }
    if (!studentPassword || studentPassword.length < 4) {
      setError('Mật khẩu học sinh phải có tối thiểu 4 ký tự');
      return;
    }

    setLoading(true);
    try {
      const endpoint = studentMode === 'REGISTER' ? '/api/auth/student-register' : '/api/auth/student-login';
      const body =
        studentMode === 'REGISTER'
          ? {
              username: studentUsername.trim(),
              password: studentPassword,
              fullName: fullName.trim(),
              studentClass: studentClass.trim(),
            }
          : {
              username: studentUsername.trim(),
              password: studentPassword,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xác thực tài khoản không thành công');
      }

      onStudentLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Tài khoản hoặc mật khẩu không chính xác');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
            <span>Học Sinh / Người Quay</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('ADMIN');
              setError(null);
            }}
            className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              tab === 'ADMIN'
                ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Ban Quản Trị</span>
          </button>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'STUDENT' ? (
            <form onSubmit={handleStudentAuth} className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Đăng nhập tài khoản học sinh bảo mật mật khẩu để nhận ngay{' '}
                  <strong className="text-amber-700">3 lượt quay miễn phí</strong> và{' '}
                  <strong className="text-amber-700">1 vé dự thưởng</strong> chính thức.
                </span>
              </div>

              {/* Toggle Login / Register */}
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode('LOGIN');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    studentMode === 'LOGIN' ? 'bg-white shadow text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'
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
                    studentMode === 'REGISTER' ? 'bg-white shadow text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Đăng Ký Mới
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên tài khoản / Mã học sinh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    placeholder="VD: hs_nam12a"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu bảo vệ tài khoản <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Tối thiểu 4 ký tự"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {studentMode === 'REGISTER' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Họ và tên học sinh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="VD: Nguyễn Văn Nam"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Lớp / Chi đoàn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="VD: 12A1"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
              >
                {studentMode === 'REGISTER' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>
                  {loading
                    ? 'Đang xử lý...'
                    : studentMode === 'REGISTER'
                    ? 'Tạo Tài Khoản & Nhận Lượt Quay'
                    : 'Đăng Nhập'}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700">
                <span className="font-semibold block mb-0.5">Xác thực Quản Trị Viên:</span>
                Vui lòng nhập tài khoản và mật khẩu được cấp khi khởi tạo hệ thống (hoặc đặt qua biến môi trường <code className="font-mono text-red-600">ADMIN_INITIAL_PASSWORD</code>).
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tài khoản Quản trị <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Tên tài khoản quản trị"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Mật khẩu quản trị"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
