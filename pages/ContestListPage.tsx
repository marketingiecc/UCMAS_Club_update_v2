
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Contest, ContestRegistration, UserProfile, Mode } from '../types';

interface ContestListPageProps {
  user: UserProfile;
}

const ContestListPage: React.FC<ContestListPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'contests' | 'practice' | 'tips'>('contests');
  const [contests, setContests] = useState<Contest[]>([]);
  const [registrations, setRegistrations] = useState<ContestRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // Practice Options State
  const [practiceMode, setPracticeMode] = useState<Mode>(Mode.VISUAL);
  const [practiceConfig, setPracticeConfig] = useState({
      digits: 1,
      operands: 5,
      speed: 1.0,
      allowNegative: true,
      count: 10
  });

  useEffect(() => {
    Promise.all([
        backend.getPublishedContests(),
        backend.getMyRegistrations(user.id)
    ]).then(([contestData, regData]) => {
        setContests(contestData);
        setRegistrations(regData);
        setLoading(false);
    });
  }, [user.id]);

  const handleRegister = async (contestId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const res = await backend.registerForContest(contestId);
      if (res.ok) {
          const newRegs = await backend.getMyRegistrations(user.id);
          setRegistrations(newRegs);
      } else {
          alert(res.message);
      }
  };

  const startCustomPractice = () => {
      // Chuyển hướng đến trang luyện tập với các tham số tùy chỉnh qua state hoặc query
      navigate(`/practice/${practiceMode}`, { 
          state: { customConfig: practiceConfig } 
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Tabs */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-ucmas-blue mb-6 flex items-center justify-center gap-3 uppercase tracking-tight">
          <span className="text-5xl">🏆</span> CUỘC THI UCMAS
        </h1>
        
        <div className="flex justify-center p-1.5 bg-gray-100 rounded-2xl inline-flex shadow-inner">
            <button 
                onClick={() => setActiveTab('contests')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'contests' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
                🏁 Các cuộc thi
            </button>
            <button 
                onClick={() => setActiveTab('practice')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'practice' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
                🔥 Luyện thi chuyên sâu
            </button>
            <button 
                onClick={() => setActiveTab('tips')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tips' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
                💡 Kinh nghiệm thi
            </button>
        </div>
      </div>

      {/* Tab: Contests */}
      {activeTab === 'contests' && (
        <div className="animate-fade-in">
          {loading ? (
              <div className="text-center text-gray-400 py-20">Đang tải danh sách...</div>
          ) : contests.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest">Hiện chưa có cuộc thi nào đang mở.</p>
              </div>
          ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {contests.map(c => {
                      const dbStatus = String(c.status || 'draft').toLowerCase().trim();
                      const myReg = registrations.find(r => r.contest_id === c.id);
                      const isApproved = myReg?.is_approved;

                      return (
                        <div key={c.id} onClick={() => { if(isApproved) navigate(`/contests/${c.id}`); }} className={`bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all relative group flex flex-col ${isApproved ? 'cursor-pointer' : 'cursor-default'}`}>
                            <div className="absolute top-6 right-6 bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Đang mở</div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight pr-12">{c.name}</h3>
                            <p className="text-sm text-gray-400 font-medium mb-6 flex items-center gap-2">
                                📅 {new Date(c.start_at).toLocaleString('vi-VN')}
                            </p>
                            
                            <div className="flex gap-2 mb-8">
                                {c.enable_nhin_tinh && <span className="bg-blue-50 text-ucmas-blue text-[10px] font-black px-2 py-1 rounded uppercase">Nhìn Tính</span>}
                                {c.enable_nghe_tinh && <span className="bg-red-50 text-ucmas-red text-[10px] font-black px-2 py-1 rounded uppercase">Nghe Tính</span>}
                                {c.enable_flash && <span className="bg-green-50 text-ucmas-green text-[10px] font-black px-2 py-1 rounded uppercase">Flash</span>}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                {!myReg ? (
                                    <button onClick={(e) => handleRegister(c.id, e)} className="flex-1 py-3 bg-ucmas-red text-white font-black text-xs rounded-xl uppercase hover:bg-red-700 transition shadow-md">ĐĂNG KÝ NGAY</button>
                                ) : !isApproved ? (
                                    <button disabled className="flex-1 py-3 bg-yellow-500 text-white font-black text-xs rounded-xl uppercase opacity-90 shadow-md">CHỜ DUYỆT</button>
                                ) : (
                                    <button disabled className="flex-1 py-3 bg-ucmas-blue text-white font-black text-xs rounded-xl uppercase opacity-90 shadow-md">ĐÃ KÍCH HOẠT</button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/contests/${c.id}`); }}
                                    className="px-5 py-3 bg-white border-2 border-ucmas-blue text-ucmas-blue font-black text-xs rounded-xl uppercase hover:bg-blue-50 transition shadow-md"
                                >
                                    VÀO THI ➜
                                </button>
                            </div>
                        </div>
                      );
                  })}
              </div>
          )}
        </div>
      )}

      {/* Tab: Luyện thi (Custom Design) */}
      {activeTab === 'practice' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-ucmas-blue p-8 text-white">
                      <h2 className="text-2xl font-black uppercase tracking-tight">Sáng tạo đề thi riêng</h2>
                      <p className="text-blue-200 text-sm mt-1">Tự do thiết lập các thông số để vượt qua giới hạn của bản thân.</p>
                  </div>
                  
                  <div className="p-10 grid md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Phần thi luyện tập</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {[
                                      { id: Mode.VISUAL, label: 'Nhìn', icon: '👁️' },
                                      { id: Mode.LISTENING, label: 'Nghe', icon: '🎧' },
                                      { id: Mode.FLASH, label: 'Flash', icon: '⚡' }
                                  ].map(m => (
                                      <button 
                                          key={m.id}
                                          onClick={() => setPracticeMode(m.id)}
                                          className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition ${practiceMode === m.id ? 'border-ucmas-blue bg-blue-50 text-ucmas-blue' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}
                                      >
                                          <span className="text-xl">{m.icon}</span>
                                          <span className="text-xs font-bold">{m.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Số chữ số (Digits)</label>
                                  <select 
                                      value={practiceConfig.digits}
                                      onChange={e => setPracticeConfig({...practiceConfig, digits: parseInt(e.target.value)})}
                                      className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-ucmas-blue transition"
                                  >
                                      {[1, 2, 3, 4].map(d => <option key={d} value={d}>{d} chữ số</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Số phép tính (Steps)</label>
                                  <select 
                                      value={practiceConfig.operands}
                                      onChange={e => setPracticeConfig({...practiceConfig, operands: parseInt(e.target.value)})}
                                      className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-ucmas-blue transition"
                                  >
                                      {[3, 5, 7, 10, 15, 20].map(s => <option key={s} value={s}>{s} dòng</option>)}
                                  </select>
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Số lượng câu hỏi</label>
                              <div className="flex gap-2">
                                  {[10, 20, 50, 100].map(c => (
                                      <button 
                                          key={c}
                                          onClick={() => setPracticeConfig({...practiceConfig, count: c})}
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${practiceConfig.count === c ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                      >
                                          {c} câu
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tốc độ (Giây/Số)</label>
                                  <span className="text-xs font-black text-ucmas-blue bg-blue-50 px-2 py-1 rounded">{practiceConfig.speed}s</span>
                              </div>
                              <input 
                                  type="range" min="0.2" max="3.0" step="0.1" 
                                  value={practiceConfig.speed}
                                  onChange={e => setPracticeConfig({...practiceConfig, speed: parseFloat(e.target.value)})}
                                  className="w-full accent-ucmas-blue"
                              />
                          </div>

                          <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                              <label className="flex items-center justify-between cursor-pointer group">
                                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition">Bao gồm số âm (Trừ)</span>
                                  <input 
                                      type="checkbox" 
                                      checked={practiceConfig.allowNegative}
                                      onChange={e => setPracticeConfig({...practiceConfig, allowNegative: e.target.checked})}
                                      className="w-5 h-5 accent-ucmas-red"
                                  />
                              </label>
                              <label className="flex items-center justify-between cursor-pointer group">
                                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition">Ẩn kết quả tạm thời</span>
                                  <input type="checkbox" className="w-5 h-5 accent-ucmas-red" />
                              </label>
                              <label className="flex items-center justify-between cursor-pointer group">
                                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition">Âm thanh hiệu ứng</span>
                                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-ucmas-red" />
                              </label>
                          </div>

                          <button 
                              onClick={startCustomPractice}
                              className="w-full bg-ucmas-red text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest active:scale-95"
                          >
                              Bắt đầu luyện thi 🚀
                          </button>
                      </div>
                  </div>
              </div>

              <div className="mt-8 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-6">
                  <div className="text-4xl">💡</div>
                  <div>
                      <h4 className="font-black text-ucmas-blue uppercase text-xs tracking-widest">Lời khuyên chuyên gia</h4>
                      <p className="text-gray-600 text-sm mt-1 font-medium">Luyện tập ở tốc độ <span className="text-ucmas-red font-bold">0.5s - 0.7s</span> là "ngưỡng vàng" để kích thích não bộ phát triển phản xạ tính toán nhanh nhất.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Tab: Tips (Kinh nghiệm) */}
      {activeTab === 'tips' && (
          <div className="max-w-4xl mx-auto animate-fade-in grid md:grid-cols-2 gap-6">
              {[
                  { title: "Bí quyết Nhìn Tính 👁️", text: "Luôn giữ mắt tập trung vào bàn tính ảo trong tâm trí, tránh nhìn xung quanh khi đang trong chuỗi phép tính.", color: "border-ucmas-blue" },
                  { title: "Kỹ thuật Flash Anzan ⚡", text: "Đừng cố gắng đọc số bằng lời, hãy 'chụp ảnh' thẻ số bằng não phải để chuyển đổi thành hình ảnh hạt bàn tính ngay lập tức.", color: "border-ucmas-green" },
                  { title: "Tâm lý khi vào phòng thi 🧘", text: "Hít thở sâu 3 nhịp trước mỗi phần thi. Sự bình tĩnh giúp bạn tránh được lỗi 'nhảy hạt' khi tính toán tốc độ cao.", color: "border-ucmas-red" },
                  { title: "Quản lý thời gian ⏱️", text: "Dành 5 giây cuối để kiểm tra lại các câu hỏi chưa chắc chắn. Đừng quá sa đà vào 1 câu khó làm mất thời gian cả bài.", color: "border-ucmas-yellow" }
              ].map((tip, i) => (
                  <div key={i} className={`bg-white p-8 rounded-3xl border-l-8 ${tip.color} shadow-sm hover:shadow-md transition`}>
                      <h3 className="font-black text-gray-800 text-xl mb-3">{tip.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed font-medium">{tip.text}</p>
                      <button className="mt-4 text-xs font-bold text-ucmas-blue hover:underline uppercase">Đọc chi tiết ➝</button>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ContestListPage;
