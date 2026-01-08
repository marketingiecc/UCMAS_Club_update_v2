import React, { useState } from 'react';
import { backend, supabase } from '../services/mockBackend';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        setError("Thông tin đăng nhập không chính xác.");
        setLoading(false);
    } else {
        // Check role
        const profile = await backend.fetchProfile(data.user.id);
        if (profile?.role !== 'admin') {
            setError("Tài khoản này không có quyền quản trị.");
            await supabase.auth.signOut();
        } else {
            window.location.href = '#/admin';
            window.location.reload(); // Force reload to pick up session in App.tsx
        }
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border-t-4 border-ucmas-red">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-gray-800">Quản Trị Viên</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">UCMAS Club Portal</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-100 text-center font-medium">
                    {error}
                </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">EMAIL</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="admin@ucmas.com"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-ucmas-red focus:ring-1 focus:ring-ucmas-red transition"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">MẬT KHẨU</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-ucmas-red focus:ring-1 focus:ring-ucmas-red transition"
                        required
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition shadow-md"
                >
                    {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
                </button>
            </form>
            <div className="mt-8 text-center pt-6 border-t border-gray-100">
                <a href="#/login" className="text-sm font-bold text-ucmas-blue hover:underline">← Quay lại trang học viên</a>
            </div>
        </div>
    </div>
  );
};

export default AdminLoginPage;