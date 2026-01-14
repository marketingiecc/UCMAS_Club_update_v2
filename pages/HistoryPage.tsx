
import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { practiceService } from '../src/features/practice/services/practiceService';
import { AttemptResult } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';

const HistoryPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'contest' | 'practice'>('contest');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [pHistory, setPHistory] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'contest') {
        backend.getUserHistory(userId).then(data => {
            setHistory(data);
            setLoading(false);
        });
    } else {
        practiceService.getPracticeHistory(userId).then(data => {
            setPHistory(data);
            setLoading(false);
        });
    }
  }, [userId, activeTab]);

  const handleViewDetails = async (h: any) => {
      if (activeTab === 'contest') {
          const answers = await backend.getAttemptAnswers(h.id);
          setSelectedAnswers(answers);
          setSelectedAttempt(h);
      } else {
          // Luyện tập có thể không lưu answers chi tiết trong bảng cũ, 
          // nhưng ta vẫn hiển thị thông tin snapshot nếu có
          setSelectedAttempt(h);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        {selectedAttempt && (
            <ResultDetailModal 
                isOpen={!!selectedAttempt}
                onClose={() => setSelectedAttempt(null)}
                questions={selectedAttempt.exam_data?.questions || []}
                userAnswers={selectedAnswers}
                title={`Kết quả: ${selectedAttempt.mode} - ${activeTab === 'contest' ? 'Cuộc thi' : 'Luyện tập'}`}
            />
        )}

        <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight mb-8">Lịch sử kết quả</h2>
            <div className="flex justify-center p-1.5 bg-gray-100 rounded-full inline-flex shadow-inner">
                <button onClick={() => setActiveTab('contest')} className={`px-8 py-3 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'contest' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-400'}`}>🏁 Kết quả Cuộc thi</button>
                <button onClick={() => setActiveTab('practice')} className={`px-8 py-3 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'practice' ? 'bg-white text-ucmas-blue shadow-md' : 'text-gray-400'}`}>📚 Lịch sử Luyện thi</button>
            </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                        <th className="px-10 py-5">Ngày thực hiện</th>
                        <th className="px-10 py-5">Phần thi</th>
                        <th className="px-10 py-5">Điểm số</th>
                        <th className="px-10 py-5">Loại hình</th>
                        <th className="px-10 py-5 text-right">Chi tiết</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        <tr><td colSpan={5} className="p-20 text-center text-gray-400 italic">Đang tải lịch sử...</td></tr>
                    ) : (activeTab === 'contest' ? history : pHistory).length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold uppercase text-xs">Chưa có dữ liệu</td></tr>
                    ) : (activeTab === 'contest' ? history : pHistory).map(h => (
                        <tr key={h.id} className="hover:bg-gray-50 transition group">
                            <td className="px-10 py-6 text-sm font-mono text-gray-600">{new Date(h.created_at).toLocaleString('vi-VN')}</td>
                            <td className="px-10 py-6 font-bold uppercase text-xs text-gray-800">{h.mode}</td>
                            <td className="px-10 py-6 font-black text-lg text-ucmas-blue">
                                {h.score_correct || 0}<span className="text-xs text-gray-400 font-medium">/{h.score_total || 0}</span>
                            </td>
                            <td className="px-10 py-6">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${activeTab === 'contest' ? 'bg-blue-50 text-ucmas-blue' : h.is_custom_creative ? 'bg-red-50 text-ucmas-red' : 'bg-green-50 text-green-700'}`}>
                                    {activeTab === 'contest' ? 'Thi đấu' : h.is_custom_creative ? 'Sáng tạo' : h.practice_exams?.name || 'Giao đề'}
                                </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <button onClick={() => handleViewDetails(h)} className="text-gray-300 group-hover:text-ucmas-blue transition-colors text-xl">➝</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default HistoryPage;
