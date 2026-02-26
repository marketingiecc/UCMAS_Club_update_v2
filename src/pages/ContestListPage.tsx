
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { practiceService } from '../src/features/practice/services/practiceService';
import { Contest, UserProfile, Mode } from '../types';

interface ContestListPageProps {
  user: UserProfile;
}

const ContestListPage: React.FC<ContestListPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Nhận tab mặc định từ navigation state nếu có
  const initialTab = (location.state as any)?.initialTab || 'contests';
  const [activeTab, setActiveTab] = useState<'contests' | 'assigned' | 'practice' | 'tips'>(initialTab);
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [assignedExams, setAssignedExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [practiceMode, setPracticeMode] = useState<Mode>(Mode.VISUAL);
  const [practiceConfig, setPracticeConfig] = useState({
      digits: 1,
      operands: 5,
      speed: 1.0,
      count: 10
  });

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
        try {
          const [cData, aData] = await Promise.all([
              backend.getPublishedContests(),
              practiceService.getAssignedExams()
          ]);
          setContests(cData);
          setAssignedExams(aData);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
    };
    fetchData();
  }, [user.id]);

  const startCustomPractice = () => {
      navigate(`/practice-exam/${practiceMode}`, { 
          state: { 
            customConfig: {
              ...practiceConfig,
              numQuestions: practiceConfig.count,
              isCreative: true,
              digitRange: [Math.pow(10, practiceConfig.digits - 1), Math.pow(10, practiceConfig.digits) - 1],
              numOperandsRange: [practiceConfig.operands, practiceConfig.operands],
              flashSpeed: practiceConfig.speed * 1000, 
              speed: practiceConfig.speed,
              name: 'Bài luyện tập sáng tạo'
            } 
          } 
      });
  };

  const handleStartAssigned = (ex: any) => {
      // Check both Mode enum and config flag for backward compatibility
      if (ex.mode === Mode.MIXED || ex.config?.isMixed) {
          navigate(`/practice-mixed/${ex.id}`);
          return;
      }

      navigate(`/practice-exam/${ex.mode}`, {
          state: {
              examId: ex.id,
              customConfig: {
                  ...ex.config,
                  numQuestions: ex.questions?.length || 10,
                  isCreative: false,
                  name: ex.name
              },
              predefinedQuestions: ex.questions
          }
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-ucmas-blue mb-8 uppercase tracking-tight flex items-center justify-center gap-4">
            <span className="text-5xl">🏆</span> HỆ THỐNG THI & LUYỆN TẬP
        </h1>
        <div className="flex flex-wrap justify-center p-1.5 bg-gray-100 rounded-[2rem] inline-flex shadow-inner mb-2 border border-gray-200">
            {[
                { id: 'contests', label: '🏁 Cuộc thi' },
                { id: 'assigned', label: '📚 Luyện thi' },
                { id: 'practice', label: '🔥 Sáng tạo đề' },
                { id: 'tips', label: '💡 Kinh nghiệm' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {activeTab === 'practice' && (
          <div className="max-w-5xl mx-auto animate-fade-in bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-ucmas-blue p-10 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-black uppercase tracking-tight">SÁNG TẠO ĐỀ THI RIÊNG</h2>
                    <p className="text-blue-200 text-sm mt-1 font-medium opacity-80">Thiết lập thông số để rèn luyện phản xạ theo ý muốn</p>
                  </div>
                  <span className="text-9xl absolute -right-4 -bottom-8 opacity-10 select-none">🧮</span>
              </div>
              <div className="p-10 lg:p-14 grid lg:grid-cols-2 gap-16">
                  <div className="space-y-12">
                      <div>
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 ml-1">Chế độ luyện tập</label>
                          <div className="grid grid-cols-3 gap-4">
                              {[
                                  { mode: Mode.VISUAL, icon: '👁️', label: 'Nhìn tính', desc: 'Rèn luyện tư duy trực quan, tăng khả năng tập trung và ghi nhớ hình ảnh số học trong đầu.' },
                                  { mode: Mode.LISTENING, icon: '🎧', label: 'Nghe tính', desc: 'Phát triển trí nhớ thính giác, phản xạ tính toán qua âm thanh – tăng tốc xử lý thông tin.' },
                                  { mode: Mode.FLASH, icon: '⚡', label: 'Flash', desc: 'Luyện não phải chụp ảnh tức thời, rèn phản xạ nhanh và khả năng nhận diện số trong chớp mắt.' },
                              ].map(({ mode: m, icon, label, desc }) => (
                                  <button key={m} onClick={() => setPracticeMode(m)} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all text-center ${practiceMode === m ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue shadow-lg scale-105' : 'border-gray-50 text-gray-300 hover:bg-gray-50'}`}>
                                      <span className="text-3xl">{icon}</span>
                                      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
                                      <span className="text-[9px] text-gray-500 font-medium leading-tight mt-1">{desc}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div className="space-y-8">
                          <div className="space-y-4">
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 block">CHỌN SỐ CHỮ SỐ (DIGITS)</label>
                              <div className="flex flex-wrap gap-3">
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                                      <button 
                                        key={d} 
                                        onClick={() => setPracticeConfig({...practiceConfig, digits: d})} 
                                        className={`w-12 h-12 rounded-2xl font-black text-lg transition-all shadow-sm ${practiceConfig.digits === d ? 'bg-ucmas-blue text-white shadow-ucmas-blue/30 shadow-lg scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                      >
                                        {d}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 block">CHỌN SỐ DÒNG (ROWS)</label>
                              <div className="grid grid-cols-6 gap-3">
                                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(r => (
                                      <button 
                                        key={r} 
                                        onClick={() => setPracticeConfig({...practiceConfig, operands: r})} 
                                        className={`h-12 rounded-2xl font-bold text-sm transition-all shadow-sm ${practiceConfig.operands === r ? 'bg-ucmas-blue text-white shadow-ucmas-blue/30 shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                      >
                                        {r}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-12">
                      <div className="space-y-8 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 shadow-inner">
                          <div className="space-y-6">
                              <div className="flex justify-between items-center px-1">
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">SỐ LƯỢNG CÂU HỎI</label>
                                  <span className="text-sm font-black text-ucmas-blue bg-white px-4 py-1.5 rounded-xl shadow-sm border border-gray-100">{practiceConfig.count} câu</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" max="20" step="1" 
                                value={practiceConfig.count} 
                                onChange={e => setPracticeConfig({...practiceConfig, count: parseInt(e.target.value)})} 
                                className="w-full accent-ucmas-blue cursor-pointer h-3 bg-gray-200 rounded-lg appearance-none" 
                              />
                              <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1">
                                <span>1</span>
                                <span>20</span>
                              </div>
                          </div>

                          {(practiceMode === Mode.LISTENING || practiceMode === Mode.FLASH) && (
                              <div className="space-y-6 pt-6 border-t border-gray-200">
                                  <div className="flex justify-between items-center px-1">
                                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">TỐC ĐỘ (GIÂY/SỐ)</label>
                                      <span className="text-sm font-black text-ucmas-red bg-white px-4 py-1.5 rounded-xl shadow-sm border border-gray-100">{practiceConfig.speed}s</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0.2" max="3.0" step="0.1" 
                                    value={practiceConfig.speed} 
                                    onChange={e => setPracticeConfig({...practiceConfig, speed: parseFloat(e.target.value)})} 
                                    className="w-full accent-ucmas-red cursor-pointer h-3 bg-gray-200 rounded-lg appearance-none" 
                                  />
                                   <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1">
                                    <span>0.2s (Siêu nhanh)</span>
                                    <span>3.0s (Chậm)</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      <button onClick={startCustomPractice} className="group w-full relative h-24 bg-gradient-to-br from-ucmas-red to-red-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:shadow-2xl transition-all overflow-hidden active:scale-95">
                          <span className="relative z-10 flex items-center justify-center gap-3 uppercase tracking-widest">BẮT ĐẦU NGAY 🚀</span>
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'contests' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {contests.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Chưa có cuộc thi nào đang diễn ra</p>
                </div>
            ) : contests.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col group">
                    <h3 className="text-2xl font-black text-gray-800 mb-2 group-hover:text-ucmas-blue transition-colors">{c.name}</h3>
                    <p className="text-xs text-gray-400 mb-8 italic flex items-center gap-2">📅 Bắt đầu: {new Date(c.start_at).toLocaleString('vi-VN')}</p>
                    <button onClick={() => navigate(`/contests/${c.id}`)} className="mt-auto py-4 bg-ucmas-blue text-white font-black rounded-2xl uppercase hover:bg-blue-700 transition shadow-lg active:scale-95">Tham gia ngay ➜</button>
                </div>
            ))}
        </div>
      )}

      {activeTab === 'assigned' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
              {assignedExams.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Bạn chưa có đề luyện thi nào được giao</p>
                </div>
              ) : assignedExams.map(ex => (
                  <div key={ex.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-ucmas-blue transition-all relative overflow-hidden flex flex-col min-h-[220px]">
                      <div className="flex justify-between items-center mb-6">
                          <span className="bg-red-50 text-ucmas-red text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">{ex.exam_code || 'EXAM'}</span>
                          <span className="text-[10px] text-gray-400 italic font-medium">Hạn: {new Date(ex.expiry_date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xl font-black text-gray-800 mb-6 line-clamp-2">{ex.name}</h4>
                      <div className="flex gap-2 mb-8 mt-auto">
                         {ex.mode === Mode.MIXED || ex.config?.isMixed ? (
                             <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase">🧬 Hỗn Hợp</span>
                         ) : (
                             <span className="text-[10px] font-bold bg-blue-50 text-ucmas-blue px-3 py-1 rounded-full uppercase">{ex.mode === 'nhin_tinh' ? '👁️ Nhìn' : ex.mode === 'nghe_tinh' ? '🎧 Nghe' : '⚡ Flash'}</span>
                         )}
                         <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">{ex.config?.digits || '?'}D{ex.config?.operands || '?'}R</span>
                      </div>
                      <button onClick={() => handleStartAssigned(ex)} className="w-full bg-gray-50 group-hover:bg-ucmas-blue group-hover:text-white text-gray-400 py-4 rounded-2xl font-black text-xs uppercase transition shadow-sm">Bắt đầu ôn luyện ➝</button>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'tips' && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in max-w-5xl mx-auto">
              {[
                  { title: "Bí quyết Nhìn Tính 👁️", desc: "Tập trung tối đa vào bàn tính ảo trong tâm trí, tránh bị xao nhãng bởi tiếng động xung quanh.", color: "bg-blue-50", text: "text-blue-700" },
                  { title: "Kỹ thuật Flash ⚡", desc: "Đừng cố đọc số thành tiếng, hãy cố gắng chụp ảnh con số bằng não phải để phản xạ nhanh hơn.", color: "bg-green-50", text: "text-green-700" },
                  { title: "Kinh nghiệm Nghe Tính 🎧", desc: "Nghe đến đâu đẩy hạt đến đó, không đợi đọc hết dãy số mới tính toán kết quả.", color: "bg-red-50", text: "text-red-700" },
                  { title: "Quản lý thời gian ⏱️", desc: "Nếu gặp câu quá khó, hãy bỏ qua nhanh chóng để dành thời gian cho các câu tiếp theo.", color: "bg-yellow-50", text: "text-yellow-700" }
              ].map((tip, i) => (
                  <div key={i} className={`${tip.color} p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all`}>
                      <h4 className={`text-xl font-black mb-4 ${tip.text}`}>{tip.title}</h4>
                      <p className="text-gray-500 font-medium leading-relaxed">{tip.desc}</p>
                      <button className={`mt-6 text-[10px] font-black uppercase tracking-widest hover:underline ${tip.text}`}>Xem thêm ➝</button>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ContestListPage;
