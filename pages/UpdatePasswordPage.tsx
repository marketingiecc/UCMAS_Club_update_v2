import React, { useState } from 'react';
import { supabase } from '../services/mockBackend';

const UpdatePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // STRICT: Direct Supabase call
    const { error } = await supabase.auth.updateUser({ password });

    if (!error) {
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
        setTimeout(() => {
            // STRICT: Use hash redirect
            window.location.hash = '#/login';
        }, 2000);
    } else {
        setMessage({ type: 'error', text: error.message });
        setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-6">
        <div className="w-full max-w-md bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-4 sm:mb-6 text-center">Đặt Lại Mật Khẩu</h2>
            
            {message && (
                <div className={`p-4 rounded-lg mb-4 text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Mật khẩu mới</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue outline-none transition"
                        placeholder="Nhập mật khẩu mới..."
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-ucmas-blue text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                </button>
            </form>
        </div>
    </div>
  );
};

export default UpdatePasswordPage;