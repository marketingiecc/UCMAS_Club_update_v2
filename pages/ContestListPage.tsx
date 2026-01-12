
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Contest } from '../types';

const ContestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.getPublishedContests().then(data => {
        setContests(data);
        setLoading(false);
    });
  }, []);

  const handleRegister = async (contestId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const res = await backend.registerForContest(contestId);
      alert(res.message);
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
              {contests.map(c => (
                  <div key={c.id} onClick={() => navigate(`/contests/${c.id}`)} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer relative group">
                      <div className={`absolute top-6 right-6 text-[10px] font-black uppercase px-3 py-1 rounded-full ${c.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.status === 'open' ? 'Đang mở' : 'Đã kết thúc'}
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight pr-12">{c.name}</h3>
                      <p className="text-sm text-gray-400 font-medium mb-6">📅 {new Date(c.start_at).toLocaleString('vi-VN')}</p>
                      
                      <div className="flex gap-2 mb-8">
                          {c.enable_nhin_tinh && <span className="bg-blue-50 text-ucmas-blue text-[10px] font-black px-2 py-1 rounded uppercase">Nhìn Tính</span>}
                          {c.enable_nghe_tinh && <span className="bg-red-50 text-ucmas-red text-[10px] font-black px-2 py-1 rounded uppercase">Nghe Tính</span>}
                          {c.enable_flash && <span className="bg-green-50 text-ucmas-green text-[10px] font-black px-2 py-1 rounded uppercase">Flash</span>}
                      </div>

                      {c.status === 'open' && (
                        <div className="flex gap-2">
                           <button onClick={(e) => handleRegister(c.id, e)} className="flex-1 py-3 bg-gray-800 text-white font-black text-xs rounded-xl uppercase hover:bg-black transition">Đăng ký ngay</button>
                           <button className="px-6 py-3 bg-ucmas-blue text-white font-black text-xs rounded-xl uppercase hover:bg-blue-700 transition shadow-lg">Vào thi ➜</button>
                        </div>
                      )}
                      {c.status === 'closed' && (
                          <div className="w-full py-3 bg-gray-100 text-gray-400 text-center font-black text-xs rounded-xl uppercase">Cuộc thi đã kết thúc</div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ContestListPage;
