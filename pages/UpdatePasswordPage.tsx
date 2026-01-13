
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';

const UpdatePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Mật khẩu nhập lại không khớp.' });
        return;
    }
    if (password.length < 6) {
        setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        return;
    }

    setLoading(true);
    const res = await backend.updateUserPassword(password);
    
    if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setTimeout(() => {
            navigate('/dashboard');
        }, 2000);
    } else {
        setMessage({ type: 'error', text: res.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
         <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-ucmas-blue mb-2">Đặt Lại Mật Khẩu</h2>
            <p className="text-gray-500 text-sm">Vui lòng nhập mật khẩu mới của bạn</p>
         </div>

         {message && (
             <div className={`p-4 rounded-lg mb-6 text-sm text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                 {message.text}
             </div>
         )}

         <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Nhập lại mật khẩu</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ucmas-blue focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
             </div>
             
             <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-ucmas-blue text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-800 transition disabled:opacity-70 uppercase tracking-wide"
             >
                {loading ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}
             </button>
         </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
