import React, { useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile } from '../types';

interface ActivatePageProps {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
}

const ActivatePage: React.FC<ActivatePageProps> = ({ user, setUser }) => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const daysLeft = (() => {
    if (!user.license_expiry) return 0;
    const diff = new Date(user.license_expiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await backend.activateLicense(user.id, code);
    
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      // Refresh user to update layout/state
      const updatedUser = await backend.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setCode('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 mt-4 sm:mt-6 md:mt-10 mx-3 sm:mx-4">
      <div className="text-center mb-6 sm:mb-8">
         <h2 className="text-xl sm:text-2xl font-heading font-black text-gray-800 mb-2">Kích Hoạt Bản Quyền</h2>
         <p className="text-gray-500 text-xs sm:text-sm">Nhập mã kích hoạt do giáo viên cung cấp để mở khóa các bài tập.</p>
      </div>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleActivate} className="space-y-4">
        <input 
          type="text" 
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="NHẬP MÃ TẠI ĐÂY (VÍ DỤ: UCMAS2024)"
          className="w-full p-4 border-2 border-gray-200 rounded-xl font-mono uppercase text-center tracking-widest text-lg focus:border-ucmas-blue focus:outline-none transition"
          required
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-ucmas-blue to-blue-700 text-white rounded-xl font-heading font-bold hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? 'Đang kiểm tra...' : 'KÍCH HOẠT NGAY'}
        </button>
      </form>
      
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-wide mb-3 text-center">TRẠNG THÁI HIỆN TẠI</h3>
        <div className="bg-gray-50 p-4 rounded-xl text-center">
           {user.license_expiry ? (
             <div className={daysLeft > 0 ? "text-green-600" : "text-red-600"}>
               <div className="font-heading font-bold text-lg mb-1">{daysLeft > 0 ? 'Đã kích hoạt' : 'Đã hết hạn'}</div>
               <div className="text-sm">Hạn sử dụng: <span className="font-heading font-mono font-bold text-gray-800">{new Date(user.license_expiry).toLocaleDateString('vi-VN')}</span></div>
               {daysLeft > 0 && (
                 <div className="text-xs mt-2 text-gray-600 bg-white inline-block px-2 py-1 rounded border border-gray-200">
                   Còn <span className="font-heading font-black text-ucmas-blue">{daysLeft}</span> ngày
                 </div>
               )}
               <div className="text-xs mt-2 text-gray-500 bg-white inline-block px-2 py-1 rounded border border-gray-200">
                   Chế độ: {user.allowed_modes.join(', ')}
               </div>
             </div>
           ) : (
             <div className="text-red-500 font-heading font-bold text-sm">Chưa có bản quyền</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ActivatePage;