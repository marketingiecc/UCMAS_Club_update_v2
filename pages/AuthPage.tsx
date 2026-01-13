
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { UserProfile } from '../types';

interface AuthPageProps {
  setUser: (u: UserProfile) => void;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type AuthMode = 'login' | 'register' | 'forgot';

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync state with URL changes and handle Confirm Email params
  useEffect(() => {
    if (location.pathname === '/register') setMode('register');
    else if (location.pathname === '/login') setMode('login');
    // keep 'forgot' if currently set manually
    
    setNotification(null);

    // Handle Email Confirmation Result
    const searchParams = new URLSearchParams(location.search);
    const confirmStatus = searchParams.get('confirm');
    
    if (confirmStatus) {
      if (confirmStatus === 'ok') {
        setNotification({ 
          type: 'success', 
          message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay.' 
        });
      } else if (confirmStatus === 'fail') {
        const msg = searchParams.get('message') || 'Link xác thực không hợp lệ hoặc đã hết hạn.';
        setNotification({ 
          type: 'error', 
          message: `Xác thực thất bại: ${msg}` 
        });
      } else if (confirmStatus === 'missing') {
        setNotification({ 
          type: 'error', 
          message: 'Link xác thực thiếu thông tin token.' 
        });
      }
    }
  }, [location.pathname, location.search]);

  const switchMode = (newMode: AuthMode) => {
      setMode(newMode);
      setNotification(null);
      if (newMode === 'login') navigate('/login');
      else if (newMode === 'register') navigate('/register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
          const res: any = await backend.sendPasswordResetEmail(email);
          setNotification({ 
              type: res.success ? 'success' : 'error', 
              message: res.message 
          });
          
          if (res.success && res.isDemo) {
             setTimeout(() => navigate('/auth/resetpass'), 2000);
          }
          
          setLoading(false);
          return;
      }

      let res;
      if (mode === 'register') {
          if (!fullName.trim()) {
              setNotification({ type: 'error', message: "Vui lòng nhập họ và tên." });
              setLoading(false);
              return;
          }
          res = await backend.register(email, password, fullName);
      } else {
          // Login
          res = await backend.login(email, password);
      }

      if (res.error) {
        setNotification({ type: 'error', message: res.error });
      } else if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || "Đã xảy ra lỗi không mong muốn." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
            <img 
                 src="https://rwtpwdyoxirfpposmdcg.supabase.co/storage/v1/object/sign/UCMAS/logo%20UCMAS.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MzcyMmZjMi1kNTFiLTQzYWItYmQ5OC1kYjY5MTc1ZjAxYWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJVQ01BUy9sb2dvIFVDTUFTLnBuZyIsImlhdCI6MTc2Nzg2MDYzMiwiZXhwIjoxODU0MjYwNjMyfQ.-gXR6eggFwBAK-zmgXRHhB3rs8SNogaV2am-1V4GJro" 
                 alt="UCMAS" 
                 className="h-20 mx-auto mb-6 object-contain"
            />
            <h2 className="text-3xl font-black text-ucmas-blue mb-2">
                {mode === 'register' ? 'Tạo Tài Khoản' : mode === 'forgot' ? 'Khôi Phục Mật Khẩu' : 'Đăng Nhập'}
            </h2>
            <p className="text-gray-500 text-sm">
                {mode === 'register' ? 'Đăng ký để bắt đầu luyện tập' : mode === 'forgot' ? 'Nhập email để đặt lại mật khẩu' : 'Chào mừng trở lại UCMAS Club'}
            </p>
        </div>
        
        {notification && (
          <div className={`p-4 rounded-lg mb-6 text-sm border flex items-start gap-2 ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-100' 
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
                <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Họ và tên</label>
                    <input 
                    type="text" 
                    required={mode === 'register'}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    />
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Email</label>
                <input 
                type="email" 
                required 
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vidu@email.com"
                />
            </div>

            {mode !== 'forgot' && (
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Mật khẩu</label>
                    <input 
                    type="password" 
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    />
                    {mode === 'login' && (
                        <div className="flex justify-end mt-2">
                             <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-ucmas-blue hover:underline">
                                 Quên mật khẩu?
                             </button>
                        </div>
                    )}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-ucmas-blue to-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-70 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
            >
                {loading ? 'Đang xử lý...' : (mode === 'register' ? 'Đăng Ký Ngay' : mode === 'forgot' ? 'Gửi Link Khôi Phục' : 'Đăng Nhập')}
            </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-100">
            {mode === 'login' ? (
                <button 
                    onClick={() => switchMode('register')}
                    className="text-sm font-medium text-ucmas-blue hover:underline"
                >
                    Chưa có tài khoản? Đăng ký ngay
                </button>
            ) : (
                <button 
                    onClick={() => switchMode('login')}
                    className="text-sm font-medium text-ucmas-blue hover:underline"
                >
                    {mode === 'forgot' ? '← Quay lại Đăng Nhập' : 'Đã có tài khoản? Đăng nhập'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
