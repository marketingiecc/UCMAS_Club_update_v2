
import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult, Mode, DBExamRule } from '../types';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'attempts' | 'rules'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  
  // Rules State
  const [selectedRuleMode, setSelectedRuleMode] = useState<Mode>(Mode.VISUAL);
  const [currentRuleJson, setCurrentRuleJson] = useState<string>('');
  const [ruleHistory, setRuleHistory] = useState<DBExamRule[]>([]);
  const [ruleSaveStatus, setRuleSaveStatus] = useState<string>('');

  // New Code State
  const [newCode, setNewCode] = useState('');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'rules') {
        loadRules(selectedRuleMode);
    }
  }, [selectedRuleMode, activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') {
      setUsers(await backend.getAllUsers());
    } else if (activeTab === 'attempts') {
      setAttempts(await backend.getAllAttempts()); 
    }
  };

  const loadRules = async (mode: Mode) => {
      setRuleSaveStatus('');
      const latest = await backend.getLatestExamRule(mode);
      const history = await backend.getExamRuleHistory(mode);
      setRuleHistory(history);
      
      if (latest) {
          setCurrentRuleJson(JSON.stringify(latest.rules_json, null, 2));
      } else {
          // Default placeholder structure if no rule exists
          const placeholder = {
              "1": { "numQuestions": 10 },
              "default": { "numQuestions": 20 }
          };
          setCurrentRuleJson(JSON.stringify(placeholder, null, 2));
      }
  };

  const handleSaveRule = async () => {
      try {
          const parsed = JSON.parse(currentRuleJson); // Validate JSON
          setRuleSaveStatus('Saving...');
          const result = await backend.saveExamRule(selectedRuleMode, parsed);
          if (result.success) {
              setRuleSaveStatus('Đã lưu thành công phiên bản mới!');
              loadRules(selectedRuleMode); // Refresh history
          } else {
              setRuleSaveStatus('Lỗi khi lưu: ' + result.error);
          }
      } catch (e) {
          setRuleSaveStatus('Lỗi: Định dạng JSON không hợp lệ.');
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
            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'rules' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              ⚙️ Cấu hình Đề
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

        {activeTab === 'rules' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-6 text-gray-800">Cấu hình Quy tắc Sinh đề (JSON)</h3>
                    
                    <div className="flex gap-2 mb-4">
                        {[Mode.VISUAL, Mode.LISTENING, Mode.FLASH].map(m => (
                            <button 
                                key={m}
                                onClick={() => setSelectedRuleMode(m)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition ${selectedRuleMode === m ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {m === Mode.VISUAL ? 'Nhìn Tính' : m === Mode.LISTENING ? 'Nghe Tính' : 'Flash'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4 shadow-inner">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-xs font-mono">config.json</span>
                            <span className={`text-xs font-bold ${ruleSaveStatus.includes('thành công') ? 'text-green-400' : 'text-red-400'}`}>{ruleSaveStatus}</span>
                        </div>
                        <textarea 
                            value={currentRuleJson}
                            onChange={(e) => setCurrentRuleJson(e.target.value)}
                            className="w-full h-96 bg-gray-900 text-green-400 font-mono text-sm focus:outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>
                    <div className="mt-4 flex justify-end">
                         <button 
                            onClick={handleSaveRule}
                            className="bg-ucmas-red text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 shadow-md transition flex items-center gap-2"
                         >
                            💾 Lưu phiên bản mới
                         </button>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-gray-700 mb-4">Lịch sử phiên bản</h4>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {ruleHistory.map((rule) => (
                            <div key={rule.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm hover:bg-gray-50 transition">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-sm text-gray-800">{rule.version_name}</div>
                                    <div className="text-[10px] text-gray-400">{new Date(rule.created_at).toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 truncate font-mono">
                                    {JSON.stringify(rule.rules_json).substring(0, 50)}...
                                </div>
                                <button 
                                    onClick={() => setCurrentRuleJson(JSON.stringify(rule.rules_json, null, 2))}
                                    className="text-xs text-ucmas-blue font-bold mt-2 hover:underline"
                                >
                                    Mở phiên bản này
                                </button>
                            </div>
                        ))}
                        {ruleHistory.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Chưa có lịch sử cập nhật.</p>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
