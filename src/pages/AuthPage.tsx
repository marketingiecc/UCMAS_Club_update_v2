import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { UserProfile } from '../types';

interface AuthPageProps {
  setUser: (u: UserProfile) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
        if (mode === 'forgot') {
            const res: any = await backend.sendPasswordResetEmail(email);
            setNotification({ 
                type: res.success ? 'success' : 'error', 
                message: res.message 
            });
            setLoading(false);
            return;
        }

        if (mode === 'register') {
            if (!fullName.trim()) {
                setNotification({ type: 'error', message: 'Vui lòng nhập họ và tên' });
                setLoading(false);
                return;
            }
            const res = await backend.register(email, password, fullName);
            if (res.error) {
                setNotification({ type: 'error', message: res.error });
            } else if (res.user) {
                 // Check if profile exists or wait for trigger? 
                 // Usually register returns user. We might auto-login.
                 const profile = await backend.fetchProfile(res.user.id);
                 if (profile) {
                     setUser(profile);
                     navigate('/dashboard');
                 } else {
                     // Fallback if profile trigger is slow
                     setNotification({ type: 'success', message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
                     setMode('login');
                 }
            }
        } else {
            // Login
            const res = await backend.login(email, password);
            if (res.error) {
                 setNotification({ type: 'error', message: res.error });
            } else if (res.user) {
                 setUser(res.user);
                 navigate('/dashboard');
            }
        }
    } catch (error: any) {
        setNotification({ type: 'error', message: error.message || 'Lỗi hệ thống' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-ucmas-blue mb-2">UCMAS Club</h1>
                <p className="text-gray-500 font-medium">
                    {mode === 'login' ? 'Đăng nhập để tiếp tục' : mode === 'register' ? 'Tạo tài khoản học viên' : 'Khôi phục mật khẩu'}
                </p>
            </div>

            {notification && (
                <div className={`p-4 rounded-lg mb-6 text-sm font-medium text-center ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {notification.message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Họ và Tên</label>
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue outline-none transition"
                            placeholder="Nguyễn Văn A"
                            required={mode === 'register'}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Email</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue outline-none transition"
                        placeholder="email@example.com"
                        required
                    />
                </div>

                {mode !== 'forgot' && (
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Mật khẩu</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-ucmas-blue text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50 uppercase tracking-wide"
                >
                    {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng Nhập' : mode === 'register' ? 'Đăng Ký' : 'Gửi Link Khôi Phục'}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
                {mode === 'login' ? (
                    <>
                        <button onClick={() => { setMode('forgot'); setNotification(null); }} className="text-sm text-gray-500 hover:text-ucmas-blue font-medium">Quên mật khẩu?</button>
                        <button onClick={() => { setMode('register'); setNotification(null); }} className="text-sm text-ucmas-blue font-bold hover:underline">Chưa có tài khoản? Đăng ký ngay</button>
                    </>
                ) : (
                    <button onClick={() => { setMode('login'); setNotification(null); }} className="text-sm text-ucmas-blue font-bold hover:underline">← Quay lại Đăng nhập</button>
                )}
            </div>
        </div>
    </div>
  );
};

export default AuthPage;