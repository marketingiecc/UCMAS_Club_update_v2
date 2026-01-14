
import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult } from '../types';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'attempts' | 'rules' | 'exams'>('reports');
  const [resultSubTab, setResultSubTab] = useState<'free' | 'assigned'>('free'); // 'free' = Luyện tập, 'assigned' = Luyện thi
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [activatingIds, setActivatingIds] = useState<string[]>([]);
  const [reportRange, setReportRange] = useState<'day' | 'week' | 'month'>('week');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') loadReport();
  }, [reportRange, activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') setUsers(await backend.getAllUsers());
    else if (activeTab === 'attempts') setAttempts(await backend.getAllAttempts()); 
  };

  const loadReport = async () => {
      setLoadingReport(true);
      const data = await backend.getReportData(reportRange);
      setReportData(data);
      setLoadingReport(false);
  };

  const handleActivateUser = async (user: UserProfile) => {
      if (window.confirm(`Kích hoạt tài khoản cho ${user.full_name}?`)) {
          setActivatingIds(prev => [...prev, user.id]);
          const result = await backend.adminActivateUser(user.id, 6);
          setActivatingIds(prev => prev.filter(id => id !== user.id));
          if (result.success) {
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, license_expiry: result.expiresAt } : u));
              alert("Kích hoạt thành công!");
          }
      }
  };

  // Filter logic for Attempts
  const filteredAttempts = attempts.filter(a => {
      // Check if attempt is linked to an exam_id (assigned) or not (free practice)
      // Note: Backend 'getAllAttempts' maps raw DB fields. 
      // If `exam_id` or `settings.examId` exists, it's assigned.
      const isAssigned = (a as any).exam_id || (a.settings && a.settings.examId);
      
      if (resultSubTab === 'assigned') return isAssigned;
      return !isAssigned;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 min-h-screen">
      <div className="w-full md:w-72 bg-white rounded-3xl shadow-sm p-6 h-fit border border-gray-100">
        <h2 className="font-black text-ucmas-red mb-10 px-2 tracking-tight uppercase text-lg">Hệ thống Admin</h2>
        <nav className="space-y-3">
            <button onClick={() => navigate('/admin/contests')} className="w-full text-left px-5 py-4 rounded-2xl font-black text-xs uppercase transition border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 shadow-sm flex items-center justify-between">
                <span>Quản lý Cuộc Thi</span>
                <span>🏆</span>
            </button>
            <button onClick={() => navigate('/admin/practice')} className="w-full text-left px-5 py-4 rounded-2xl font-black text-xs uppercase transition border border-blue-200 bg-blue-50 text-ucmas-blue hover:bg-blue-100 shadow-sm flex items-center justify-between">
                <span>Quản lý Luyện Thi</span>
                <span>📚</span>
            </button>
            <div className="h-px bg-gray-100 my-6"></div>
            <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-5 py-4 rounded-2xl font-black text-xs uppercase transition ${activeTab === 'reports' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>📈 Báo Cáo</button>
            <button onClick={() => setActiveTab('users')} className={`w-full text-left px-5 py-4 rounded-2xl font-black text-xs uppercase transition ${activeTab === 'users' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>👥 Học Viên</button>
            <button onClick={() => setActiveTab('attempts')} className={`w-full text-left px-5 py-4 rounded-2xl font-black text-xs uppercase transition ${activeTab === 'attempts' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>📊 Kết quả</button>
        </nav>
      </div>

      <div className="flex-grow bg-white rounded-3xl shadow-sm p-8 border border-gray-100 min-h-[600px] animate-fade-in">
        {activeTab === 'reports' && (
            <div>
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Báo cáo Tổng quan</h3>
                    <div className="bg-gray-100 p-1.5 rounded-2xl flex text-[10px] font-black uppercase">
                        {['day', 'week', 'month'].map(r => (
                            <button key={r} onClick={() => setReportRange(r as any)} className={`px-6 py-2 rounded-xl transition ${reportRange === r ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400'}`}>{r === 'day' ? 'Ngày' : r === 'week' ? 'Tuần' : 'Tháng'}</button>
                        ))}
                    </div>
                </div>
                {reportData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[{ label: 'Học sinh mới', val: reportData.new_users, bg: 'bg-blue-50', text: 'text-ucmas-blue' }, { label: 'Đã kích hoạt', val: reportData.new_licenses, bg: 'bg-green-50', text: 'text-green-600' }, { label: 'Đang luyện tập', val: reportData.active_students, bg: 'bg-orange-50', text: 'text-orange-600' }, { label: 'Tổng lượt thi', val: reportData.total_attempts, bg: 'bg-purple-50', text: 'text-purple-600' }].map((card, i) => (
                            <div key={i} className={`${card.bg} p-8 rounded-[2.5rem] border border-gray-100 shadow-sm`}>
                                <div className={`${card.text} text-[10px] font-black uppercase mb-2 tracking-widest`}>{card.label}</div>
                                <div className="text-4xl font-black text-gray-800">{card.val}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-8 px-2">Danh sách Học viên</h3>
            <table className="w-full text-left">
               <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                 <tr>
                   <th className="p-6">Học viên</th>
                   <th className="p-6">Trạng thái</th>
                   <th className="p-6 text-center">Hành động</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition group">
                        <td className="p-6">
                            <div className="font-black text-gray-800">{u.full_name}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-1">{u.email}</div>
                        </td>
                        <td className="p-6">
                            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${u.license_expiry && new Date(u.license_expiry) > new Date() ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                {u.license_expiry ? new Date(u.license_expiry).toLocaleDateString() : 'Chưa kích hoạt'}
                            </span>
                        </td>
                        <td className="p-6 text-center">
                            {u.role !== 'admin' && (
                                <button 
                                    onClick={() => handleActivateUser(u)} 
                                    disabled={activatingIds.includes(u.id)}
                                    className="bg-ucmas-blue text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-blue-800 transition disabled:opacity-50"
                                >
                                    {activatingIds.includes(u.id) ? 'Đang kích hoạt...' : 'Kích hoạt'}
                                </button>
                            )}
                        </td>
                    </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}

        {activeTab === 'attempts' && (
            <div>
                <div className="flex justify-between items-center mb-8 px-2">
                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Kết quả học viên</h3>
                    <div className="bg-gray-100 p-1.5 rounded-xl flex text-[10px] font-black uppercase">
                        <button 
                            onClick={() => setResultSubTab('free')} 
                            className={`px-6 py-2.5 rounded-lg transition-all ${resultSubTab === 'free' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Kết quả luyện tập
                        </button>
                        <button 
                            onClick={() => setResultSubTab('assigned')} 
                            className={`px-6 py-2.5 rounded-lg transition-all ${resultSubTab === 'assigned' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Kết quả luyện thi
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="p-6">Thời gian</th>
                                <th className="p-6">Học viên</th>
                                <th className="p-6">Bài thi</th>
                                <th className="p-6 text-center">Điểm số</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredAttempts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-gray-400 font-medium italic">
                                        Chưa có kết quả nào cho mục này.
                                    </td>
                                </tr>
                            ) : (
                                filteredAttempts.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50 transition">
                                        <td className="p-6 text-xs text-gray-500 font-mono">
                                            {new Date(a.created_at).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-gray-800">{users.find(u => u.id === a.user_id)?.full_name || 'Unknown User'}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{a.user_id.slice(0, 8)}...</div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`bg-blue-50 text-ucmas-blue px-3 py-1 rounded-full font-bold text-[10px] uppercase border border-blue-100`}>
                                                {a.mode}
                                            </span>
                                            {resultSubTab === 'assigned' && (
                                                <div className="mt-1 text-[10px] text-gray-500 italic">
                                                    {(a as any).exam_id ? 'Đề Giao' : 'Sáng tạo'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="font-black text-xl text-gray-800">{a.score_correct}</span>
                                            <span className="text-gray-400 text-xs font-bold">/{a.score_total}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
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
