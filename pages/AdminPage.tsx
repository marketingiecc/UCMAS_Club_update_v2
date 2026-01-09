
import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserProfile, AttemptResult, Mode, DBExamRule, CustomExam } from '../types';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'attempts' | 'rules' | 'exams'>('reports');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  
  // Activation State
  const [activatingIds, setActivatingIds] = useState<string[]>([]);

  // Reports State
  const [reportRange, setReportRange] = useState<'day' | 'week' | 'month'>('week');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Rules State
  const [selectedRuleMode, setSelectedRuleMode] = useState<Mode>(Mode.VISUAL);
  const [currentRuleJson, setCurrentRuleJson] = useState<string>('');
  const [ruleHistory, setRuleHistory] = useState<DBExamRule[]>([]);
  const [ruleSaveStatus, setRuleSaveStatus] = useState<string>('');

  // Exam Upload State
  const [selectedExamMode, setSelectedExamMode] = useState<Mode>(Mode.VISUAL);
  const [uploadedExams, setUploadedExams] = useState<CustomExam[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
        loadReport();
    }
  }, [reportRange, activeTab]);

  useEffect(() => {
    if (activeTab === 'rules') {
        loadRules(selectedRuleMode);
    }
  }, [selectedRuleMode, activeTab]);

  useEffect(() => {
      if (activeTab === 'exams') {
          loadCustomExams(selectedExamMode);
          setUploadStatus('');
      }
  }, [selectedExamMode, activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') {
      setUsers(await backend.getAllUsers());
    } else if (activeTab === 'attempts') {
      setAttempts(await backend.getAllAttempts()); 
    }
  };

  const loadReport = async () => {
      setLoadingReport(true);
      const data = await backend.getReportData(reportRange);
      setReportData(data);
      setLoadingReport(false);
  };

  const loadRules = async (mode: Mode) => {
      setRuleSaveStatus('');
      const latest = await backend.getLatestExamRule(mode);
      const history = await backend.getExamRuleHistory(mode);
      setRuleHistory(history);
      
      if (latest) {
          setCurrentRuleJson(JSON.stringify(latest.rules_json, null, 2));
      } else {
          const placeholder = {
              "1": { "numQuestions": 10 },
              "default": { "numQuestions": 20 }
          };
          setCurrentRuleJson(JSON.stringify(placeholder, null, 2));
      }
  };

  const loadCustomExams = async (mode: Mode) => {
      setUploadedExams([]); 
      const exams = await backend.getCustomExams(mode, undefined, 'all');
      setUploadedExams(exams);
  };

  const handleSaveRule = async () => {
      try {
          const parsed = JSON.parse(currentRuleJson);
          setRuleSaveStatus('Saving...');
          const result = await backend.saveExamRule(selectedRuleMode, parsed);
          if (result.success) {
              setRuleSaveStatus('Đã lưu thành công phiên bản mới!');
              loadRules(selectedRuleMode);
          } else {
              setRuleSaveStatus('Lỗi khi lưu: ' + result.error);
          }
      } catch (e) {
          setRuleSaveStatus('Lỗi: Định dạng JSON không hợp lệ.');
      }
  };

  const handleActivateUser = async (user: UserProfile) => {
      if (window.confirm(`Bạn muốn kích hoạt tài khoản cho ${user.full_name} (Email: ${user.email}) trong 6 tháng?`)) {
          // Add to loading list
          setActivatingIds(prev => [...prev, user.id]);
          
          const result = await backend.adminActivateUser(user.id, 6);
          
          // Remove from loading list
          setActivatingIds(prev => prev.filter(id => id !== user.id));

          if (result.success && result.expiresAt) {
              // Optimistically update the user list with new expiry
              setUsers(prevUsers => prevUsers.map(u => 
                  u.id === user.id 
                  ? { ...u, license_expiry: result.expiresAt } 
                  : u
              ));
              alert("Kích hoạt thành công!");
          } else {
              alert("Lỗi: " + result.error);
          }
      }
  };

  // --- Exam Upload Logic ---
  const downloadSampleJson = () => {
      const sampleTitle = selectedExamMode === Mode.VISUAL ? 'Nhìn Tính' 
                        : selectedExamMode === Mode.LISTENING ? 'Nghe Tính' 
                        : 'Flash';
      
      const sample = {
          "name": `Đề mẫu ${sampleTitle} Cấp 1`,
          "level": 1,
          "timeLimit": 300,
          "questions": [
            { "operands": [8, -8] },
            { "operands": [12, 9, 6, -9] },
            { "operands": [5, -1, 3] },
            { "operands": [14, 9, -7, 4] },
            { "operands": [10, 2, 5] }
          ]
      };
      
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mau_de_${selectedExamMode}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              setIsUploading(true);
              setUploadStatus('Đang xử lý...');
              const json = JSON.parse(event.target?.result as string);

              if (!json.name || !json.questions || !Array.isArray(json.questions)) {
                  throw new Error("File JSON thiếu thông tin bắt buộc (name, questions).");
              }

              const timeLimit = json.timeLimit || json.time_limit || 300;
              const level = json.level || 1;

              const result = await backend.uploadCustomExam({
                  name: json.name,
                  mode: selectedExamMode,
                  level: parseInt(level),
                  time_limit: parseInt(timeLimit),
                  questions: json.questions,
                  is_public: false 
              });

              if (result.success) {
                  setUploadStatus('✅ Tải lên Database thành công!');
                  loadCustomExams(selectedExamMode);
              } else {
                  setUploadStatus('❌ Lỗi: ' + result.error);
              }

          } catch (err: any) {
              setUploadStatus('❌ Lỗi file: ' + err.message);
          } finally {
              setIsUploading(false);
              e.target.value = '';
          }
      };
      reader.readAsText(file);
  };

  const handleDeleteExam = async (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa đề này khỏi hệ thống?')) {
          await backend.deleteCustomExam(id);
          loadCustomExams(selectedExamMode);
      }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm p-6 h-fit border border-gray-100">
        <h2 className="font-black text-ucmas-red mb-8 px-2 tracking-tight">QUẢN TRỊ VIÊN</h2>
        <nav className="space-y-2">
           <button
              onClick={() => setActiveTab('reports')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'reports' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📈 Báo Cáo
            </button>
          <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              👥 Học Viên
            </button>
            <button
              onClick={() => setActiveTab('attempts')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'attempts' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📊 Kết Quả Thi
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'exams' ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📚 Kho đề thi
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
        
        {activeTab === 'reports' && (
            <div>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-800">Báo cáo Tổng quan</h3>
                    <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                        <button onClick={() => setReportRange('day')} className={`px-4 py-1.5 rounded-md transition ${reportRange === 'day' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-500'}`}>Hôm nay</button>
                        <button onClick={() => setReportRange('week')} className={`px-4 py-1.5 rounded-md transition ${reportRange === 'week' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-500'}`}>Tuần này</button>
                        <button onClick={() => setReportRange('month')} className={`px-4 py-1.5 rounded-md transition ${reportRange === 'month' ? 'bg-white shadow text-ucmas-blue' : 'text-gray-500'}`}>Tháng này</button>
                    </div>
                </div>

                {loadingReport ? (
                    <div className="text-center py-20 text-gray-400">Đang tải dữ liệu báo cáo...</div>
                ) : reportData ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                <div className="text-ucmas-blue text-xs font-bold uppercase mb-2">Học sinh mới</div>
                                <div className="text-4xl font-black text-gray-800">{reportData.new_users}</div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <div className="text-green-600 text-xs font-bold uppercase mb-2">Đã kích hoạt</div>
                                <div className="text-4xl font-black text-gray-800">{reportData.new_licenses}</div>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                <div className="text-orange-600 text-xs font-bold uppercase mb-2">Đang luyện tập</div>
                                <div className="text-4xl font-black text-gray-800">{reportData.active_students}</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                <div className="text-purple-600 text-xs font-bold uppercase mb-2">Tổng lượt làm bài</div>
                                <div className="text-4xl font-black text-gray-800">{reportData.total_attempts}</div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                🏆 Top Học Sinh Chăm Chỉ 
                                <span className="text-xs font-normal text-gray-400 ml-2">(Theo số bài tập hoàn thành)</span>
                            </h4>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="p-3 text-left">#</th>
                                        <th className="p-3 text-left">Học sinh</th>
                                        <th className="p-3 text-left">Email</th>
                                        <th className="p-3 text-right">Số bài</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reportData.top_students.map((s: any, idx: number) => (
                                        <tr key={s.id}>
                                            <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                            <td className="p-3 font-bold text-ucmas-blue">{s.full_name}</td>
                                            <td className="p-3 text-gray-500">{s.email}</td>
                                            <td className="p-3 text-right font-black text-gray-800">{s.attempts_count}</td>
                                        </tr>
                                    ))}
                                    {reportData.top_students.length === 0 && (
                                        <tr><td colSpan={4} className="p-6 text-center text-gray-400 italic">Chưa có dữ liệu.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : null}
            </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Danh sách Học viên</h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
               <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                 <tr>
                   <th className="p-4 rounded-tl-lg">Họ tên</th>
                   <th className="p-4">Email</th>
                   <th className="p-4">Vai trò</th>
                   <th className="p-4">Ngày hết hạn</th>
                   <th className="p-4 rounded-tr-lg text-center">Hành động</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {users.map(u => {
                    const expiry = u.license_expiry ? new Date(u.license_expiry) : null;
                    const isActive = expiry && expiry > new Date();
                    const isProcessing = activatingIds.includes(u.id);

                    return (
                        <tr key={u.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 font-bold text-gray-800">{u.full_name}</td>
                            <td className="p-4 text-gray-600">{u.email}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                            <td className="p-4 font-mono text-sm">
                                {expiry ? (
                                    <span className={isActive ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                        {expiry.toLocaleDateString('vi-VN')}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 italic">Chưa kích hoạt</span>
                                )}
                            </td>
                            <td className="p-4 text-center">
                                {u.role !== 'admin' && (
                                    <button 
                                        onClick={() => handleActivateUser(u)}
                                        disabled={isProcessing}
                                        className={`${isProcessing ? 'bg-gray-300' : 'bg-ucmas-blue hover:bg-blue-700'} text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition flex items-center justify-center gap-2 min-w-[100px]`}
                                    >
                                        {isProcessing ? '⏳ Đang xử lý' : '⚡ Kích hoạt'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                 })}
               </tbody>
            </table>
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

        {activeTab === 'exams' && (
            <div>
                 <h3 className="text-2xl font-bold mb-2 text-gray-800">Quản lý Kho Đề Thi</h3>
                 <p className="text-gray-500 mb-8 text-sm">Chọn phân hệ bên dưới để tải đề thi tương ứng</p>
                 
                 <div className="flex gap-2 mb-8 border-b border-gray-100 pb-4">
                    {[Mode.VISUAL, Mode.LISTENING, Mode.FLASH].map(m => (
                        <button 
                            key={m}
                            onClick={() => setSelectedExamMode(m)}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition ${selectedExamMode === m ? 'bg-ucmas-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {m === Mode.VISUAL ? 'Nhìn Tính' : m === Mode.LISTENING ? 'Nghe Tính' : 'Flash'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-xl p-6 h-fit border border-gray-200 shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <h4 className="font-bold text-gray-800 text-lg">
                                     📤 Tải lên đề mới
                                 </h4>
                                 <p className="text-xs text-gray-500 mt-1">
                                     File .json định dạng chuẩn
                                 </p>
                             </div>
                             <button 
                                onClick={downloadSampleJson}
                                className="text-xs font-bold text-ucmas-blue hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition border border-blue-100 flex items-center gap-1"
                             >
                                <span>⬇️</span> Tải file mẫu
                             </button>
                         </div>

                         <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition relative group ${isUploading ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-ucmas-blue'}`}>
                             <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                 {isUploading ? (
                                     <div className="animate-spin text-2xl mb-2">⏳</div>
                                 ) : (
                                     <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📂</div>
                                 )}
                                 <p className="mb-1 text-sm text-gray-600 font-medium">
                                     {isUploading ? 'Đang xử lý...' : 'Nhấn để chọn file đề thi'}
                                 </p>
                                 <p className="text-xs text-gray-400">JSON (Max 2MB)</p>
                             </div>
                             <input 
                                type="file" 
                                accept=".json"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="hidden" 
                             />
                         </label>

                         {uploadStatus && (
                             <div className={`mt-4 text-sm font-bold animate-fade-in p-3 rounded-lg text-center ${uploadStatus.includes('thành công') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {uploadStatus}
                             </div>
                         )}
                    </div>

                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700">Danh sách đề đã tải lên ({uploadedExams.length})</h4>
                            {uploadedExams.length > 0 && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Lưu trữ trên Supabase</span>}
                        </div>
                        
                        <div className="space-y-3">
                            {uploadedExams.map(exam => (
                                <div key={exam.id} className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between hover:shadow-md transition">
                                    <div>
                                        <div className="font-bold text-gray-800 text-lg">{exam.name}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-3">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">Cấp {exam.level}</span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{exam.questions.length} câu</span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{Math.floor(exam.time_limit/60)} phút</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteExam(exam.id)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                                        title="Xóa đề"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {uploadedExams.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-4xl mb-2">📭</div>
                                    Chưa có đề thi nào được tải lên cho phần {selectedExamMode === Mode.VISUAL ? 'Nhìn Tính' : selectedExamMode === Mode.LISTENING ? 'Nghe Tính' : 'Flash'}.
                                </div>
                            )}
                        </div>
                    </div>
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
