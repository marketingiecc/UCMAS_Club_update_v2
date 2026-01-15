import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Mode, UserProfile } from '../types';

interface ContestListPageProps {
  user: UserProfile;
}

const ContestListPage: React.FC<ContestListPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'contests' | 'assigned'>('contests');
  const [assignedExams, setAssignedExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchExams = async () => {
      const exams = await (backend as any).getAssignedExams?.() || [];
      setAssignedExams(exams);
    };
    fetchExams();
  }, []);

  const handleStartAssigned = (e: React.MouseEvent, ex: any) => {
      // CRITICAL: Stop event bubbling and prevent default behavior
      e.preventDefault();
      e.stopPropagation();

      // Detection for Mixed Mode
      const isMixed = ex.mode === Mode.MIXED || ex.mode === 'hon_hop' || ex.config?.isMixed === true;
      
      if (isMixed) {
          navigate(`/practice-mixed/${ex.id}`);
      } else {
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
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-center mb-8 bg-gray-100 p-1.5 rounded-full inline-flex">
          <button onClick={() => setActiveTab('contests')} className={`px-8 py-3 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'contests' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-400'}`}>Cuộc thi 🏆</button>
          <button onClick={() => setActiveTab('assigned')} className={`px-8 py-3 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'assigned' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-400'}`}>Bài tập về nhà 🏠</button>
      </div>

      {activeTab === 'assigned' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
              {assignedExams.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Bạn chưa có đề luyện thi nào được giao</p>
                </div>
              ) : assignedExams.map(ex => {
                  const isMixed = ex.mode === Mode.MIXED || ex.mode === 'hon_hop' || ex.config?.isMixed === true;
                  return (
                    <div key={ex.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-ucmas-blue transition-all relative overflow-hidden flex flex-col min-h-[220px]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="bg-red-50 text-ucmas-red text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">{ex.exam_code || 'EXAM'}</span>
                            <span className="text-[10px] text-gray-400 italic font-medium">Hạn: {new Date(ex.expiry_date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xl font-black text-gray-800 mb-6 line-clamp-2">{ex.name}</h4>
                        <div className="flex gap-2 mb-8 mt-auto">
                           {isMixed ? (
                               <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase">🧬 Hỗn Hợp</span>
                           ) : (
                               <span className="text-[10px] font-bold bg-blue-50 text-ucmas-blue px-3 py-1 rounded-full uppercase">{ex.mode === 'nhin_tinh' ? '👁️ Nhìn' : ex.mode === 'nghe_tinh' ? '🎧 Nghe' : '⚡ Flash'}</span>
                           )}
                           <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">{ex.config?.digits || '?'}D{ex.config?.operands || '?'}R</span>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => handleStartAssigned(e, ex)} 
                          className="w-full bg-gray-50 group-hover:bg-ucmas-blue group-hover:text-white text-gray-400 py-4 rounded-2xl font-black text-xs uppercase transition shadow-sm"
                        >
                          Bắt đầu ôn luyện ➝
                        </button>
                    </div>
                  );
              })}
          </div>
      )}
      {activeTab === 'contests' && (
          <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest bg-gray-50 rounded-[3rem]">
              Chưa có cuộc thi nào diễn ra
          </div>
      )}
    </div>
  );
};

export default ContestListPage;