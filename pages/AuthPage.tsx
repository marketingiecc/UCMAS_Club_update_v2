import React, { useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile } from '../types';

interface AuthPageProps {
  setUser: (u: UserProfile) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isRegister) {
          if (!fullName.trim()) {
              setError("Vui lòng nhập họ và tên.");
              setLoading(false);
              return;
          }
          res = await backend.register(email, password, fullName);
      } else {
          res = await backend.login(email, password);
      }

      if (res.error) {
        setError(res.error);
      } else if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không mong muốn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-ucmas-blue mb-2">
                {isRegister ? 'Tạo Tài Khoản' : 'Đăng Nhập'}
            </h2>
            <p className="text-gray-500 text-sm">
                {isRegister ? 'Đăng ký để bắt đầu luyện tập' : 'Chào mừng trở lại UCMAS Club'}
            </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm border border-red-100 flex items-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
                <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Họ và tên</label>
                    <input 
                    type="text" 
                    required={isRegister}
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
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-ucmas-blue to-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng Ký Ngay' : 'Đăng Nhập')}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={() => { setIsRegister(!isRegister); setError(null); }}
                className="text-sm font-medium text-ucmas-blue hover:underline"
            >
                {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
            </button>
        </div>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <a href="#/admin/login" className="text-xs text-gray-400 hover:text-ucmas-red transition">
               Dành cho Quản trị viên
            </a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;