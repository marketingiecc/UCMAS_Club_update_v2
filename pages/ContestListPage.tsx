
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Contest, ContestRegistration, UserProfile } from '../types';

interface ContestListPageProps {
  user: UserProfile;
}

const ContestListPage: React.FC<ContestListPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [registrations, setRegistrations] = useState<ContestRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tải các cuộc thi đã công bố và danh sách đăng ký của user
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
          // Refresh registrations to update UI
          const newRegs = await backend.getMyRegistrations(user.id);
          setRegistrations(newRegs);
      } else {
          alert(res.message);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-black text-gray-800 uppercase mb-2">🏆 CUỘC THI UCMAS</h1>
        <p className="text-gray-500 font-medium">Đăng ký tham gia tranh tài cùng các bạn học sinh toàn quốc</p>
      </div>

      {loading ? (
          <div className="text-center text-gray-400">Đang tải danh sách...</div>
      ) : contests.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400 font-bold uppercase tracking-widest">Hiện chưa có cuộc thi nào đang mở.</p>
          </div>
      ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {contests.map(c => {
                  const dbStatus = String(c.status || 'draft').toLowerCase().trim();
                  const uiStatus = dbStatus === 'published' ? 'open' : dbStatus === 'archived' ? 'closed' : 'draft';
                  
                  // Check user registration status
                  const myReg = registrations.find(r => r.contest_id === c.id);
                  const isRegistered = !!myReg;
                  const isApproved = myReg?.is_approved;

                  return (
                    <div key={c.id} onClick={() => { if(isApproved) navigate(`/contests/${c.id}`); }} className={`bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all relative group ${isApproved ? 'cursor-pointer' : 'cursor-default'}`}>
                        <div className={`absolute top-6 right-6 text-[10px] font-black uppercase px-3 py-1 rounded-full ${uiStatus === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {uiStatus === 'open' ? 'Đang mở' : 'Đã kết thúc'}
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight pr-12">{c.name}</h3>
                        <p className="text-sm text-gray-400 font-medium mb-6">📅 {new Date(c.start_at).toLocaleString('vi-VN')}</p>
                        
                        <div className="flex gap-2 mb-8">
                            {c.enable_nhin_tinh && <span className="bg-blue-50 text-ucmas-blue text-[10px] font-black px-2 py-1 rounded uppercase">Nhìn Tính</span>}
                            {c.enable_nghe_tinh && <span className="bg-red-50 text-ucmas-red text-[10px] font-black px-2 py-1 rounded uppercase">Nghe Tính</span>}
                            {c.enable_flash && <span className="bg-green-50 text-ucmas-green text-[10px] font-black px-2 py-1 rounded uppercase">Flash</span>}
                        </div>

                        {uiStatus === 'open' && (
                          <div className="flex gap-2 mt-auto">
                             {/* Left Button: Status/Registration Action */}
                             {!isRegistered ? (
                                 <button 
                                    onClick={(e) => handleRegister(c.id, e)} 
                                    className="flex-1 py-3 bg-ucmas-red text-white font-black text-xs rounded-xl uppercase hover:bg-red-700 transition shadow-md"
                                 >
                                    ĐĂNG KÝ NGAY
                                 </button>
                             ) : !isApproved ? (
                                 <button 
                                    disabled 
                                    className="flex-1 py-3 bg-ucmas-green text-white font-black text-xs rounded-xl uppercase cursor-default opacity-90 shadow-md"
                                 >
                                    CHỜ KÍCH HOẠT
                                 </button>
                             ) : (
                                 <button 
                                    disabled 
                                    className="flex-1 py-3 bg-ucmas-blue text-white font-black text-xs rounded-xl uppercase cursor-default opacity-90 shadow-md"
                                 >
                                    ĐÃ KÍCH HOẠT
                                 </button>
                             )}

                             {/* Right Button: Enter Contest (Available for all open contests) */}
                             {/* Allows users to enter code if not registered/approved, or enter lobby if approved */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/contests/${c.id}`); }}
                                className="px-5 py-3 bg-white border-2 border-ucmas-blue text-ucmas-blue font-black text-xs rounded-xl uppercase hover:bg-blue-50 transition shadow-md whitespace-nowrap"
                             >
                                VÀO THI ➜
                             </button>
                          </div>
                        )}
                        {uiStatus === 'closed' && (
                            <div className="w-full py-3 bg-gray-100 text-gray-400 text-center font-black text-xs rounded-xl uppercase">Cuộc thi đã kết thúc</div>
                        )}
                    </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default ContestListPage;
