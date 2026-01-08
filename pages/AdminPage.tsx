import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult, Mode, ActivationCode } from '../types';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'attempts'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  
  // New Code State
  const [newCode, setNewCode] = useState('');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') {
      setUsers(await backend.getAllUsers());
    } else if (activeTab === 'attempts') {
      setAttempts(await backend.getAllAttempts()); // Note: MockBackend doesn't have this, ensure backend.ts handles logic or returns []
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
      e.preventDefault();
      // Logic for creating code (Needs DB support)
      // For now, alert as placeholder since we can't easily alter DB schema from client code securely without RPC
      alert('Chức năng tạo mã cần được cấu hình phía Backend (Supabase Edge Function hoặc RPC).');
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm p-6 h-fit border border-gray-100">
        <h2 className="font-black text-ucmas-red mb-8 px-2 tracking-tight">QUẢN TRỊ VIÊN</h2>
        <nav className="space-y-2">
          <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              👥 Học Viên
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'codes' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              🔑 Mã Kích Hoạt
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'attempts' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📊 Kết Quả Thi
            </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-grow bg-white rounded-2xl shadow-sm p-8 border border-gray-100 min-h-[500px]">
        
        {activeTab === 'users' && (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Danh sách Học viên</h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                 <tr>
                   <th className="p-4 rounded-tl-lg">Họ tên</th>
                   <th className="p-4">Email</th>
                   <th className="p-4">Vai trò</th>
                   <th className="p-4 rounded-tr-lg">Hết hạn License</th>
                 </tr>
               </thead>
               <tbody>
                 {users.map(u => (
                   <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                     <td className="p-4 font-bold text-gray-700">{u.full_name}</td>
                     <td className="p-4 text-gray-500">{u.email}</td>
                     <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span></td>
                     <td className="p-4 font-mono">{u.license_expiry ? new Date(u.license_expiry).toLocaleDateString('vi-VN') : '-'}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
            <div>
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Quản lý Mã Kích Hoạt</h3>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                    <h4 className="font-bold text-ucmas-blue text-sm mb-4 uppercase">Tạo mã mới</h4>
                    <form onSubmit={handleCreateCode} className="flex gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-xs font-bold text-gray-500 mb-1">MÃ CODE</label>
                            <input type="text" required value={newCode} onChange={e => setNewCode(e.target.value)} className="w-full border border-blue-200 p-3 rounded-xl focus:outline-none focus:border-ucmas-blue" placeholder="VD: SUMMER2025" />
                        </div>
                        <div className="w-32">
                            <label className="block text-xs font-bold text-gray-500 mb-1">NGÀY</label>
                            <input type="number" required value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full border border-blue-200 p-3 rounded-xl focus:outline-none focus:border-ucmas-blue" />
                        </div>
                        <button type="submit" className="bg-ucmas-green text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 shadow-md">Tạo</button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'attempts' && (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Lịch sử Luyện tập Toàn hệ thống</h3>
            <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10">
                    <tr>
                    <th className="p-4">User ID</th>
                    <th className="p-4">Bài tập</th>
                    <th className="p-4">Điểm</th>
                    <th className="p-4">Ngày giờ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {attempts.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                        <td className="p-4 font-mono text-xs text-gray-400">{a.user_id.substring(0,8)}...</td>
                        <td className="p-4 font-medium">{a.mode === 'nhin_tinh' ? 'Nhìn Tính' : a.mode === 'nghe_tinh' ? 'Nghe Tính' : 'Flash'}</td>
                        <td className="p-4 font-bold text-ucmas-blue">{a.score_correct}/{a.score_total}</td>
                        <td className="p-4 text-gray-500">{new Date(a.created_at).toLocaleString('vi-VN')}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;