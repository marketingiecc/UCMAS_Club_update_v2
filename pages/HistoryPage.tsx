
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

        <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="text-5xl">📊</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-heading-extrabold text-ucmas-blue uppercase tracking-tight mb-4">Lịch Sử Kết Quả</h2>
            <p className="text-gray-600 mb-8 font-medium">Theo dõi tiến bộ và thành tích của bạn</p>
            <div className="flex justify-center p-1.5 bg-gray-100 rounded-full inline-flex shadow-inner border-2 border-gray-200">
                <button onClick={() => setActiveTab('contest')} className={`px-8 py-3 rounded-full text-xs font-heading-bold uppercase transition-all ${activeTab === 'contest' ? 'bg-white text-ucmas-red shadow-lg border-2 border-ucmas-red' : 'text-gray-500 hover:text-gray-700'}`}>🏁 Kết quả Cuộc thi</button>
                <button onClick={() => setActiveTab('practice')} className={`px-8 py-3 rounded-full text-xs font-heading-bold uppercase transition-all ${activeTab === 'practice' ? 'bg-white text-ucmas-red shadow-lg border-2 border-ucmas-red' : 'text-gray-500 hover:text-gray-700'}`}>📚 Lịch sử Luyện thi</button>
            </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in">
            <table className="w-full text-left">
                <thead className="bg-gradient-to-r from-ucmas-blue/10 to-ucmas-blue/5 text-gray-600 uppercase text-[10px] font-heading-bold tracking-widest">
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
                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-heading font-bold uppercase text-xs">Chưa có dữ liệu</td></tr>
                    ) : (activeTab === 'contest' ? history : pHistory).map(h => (
                        <tr key={h.id} className="hover:bg-gray-50 transition group">
                            <td className="px-10 py-6 text-sm font-mono text-gray-600">{new Date(h.created_at).toLocaleString('vi-VN')}</td>
                            <td className="px-10 py-6 font-heading font-bold uppercase text-xs text-gray-800">{h.mode}</td>
                            <td className="px-10 py-6 font-heading-extrabold text-xl text-ucmas-blue">
                                {h.score_correct || 0}<span className="text-sm text-gray-400 font-medium">/{h.score_total || 0}</span>
                            </td>
                            <td className="px-10 py-6">
                                <span className={`text-[10px] font-heading-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${activeTab === 'contest' ? 'bg-ucmas-blue/10 text-ucmas-blue border border-ucmas-blue/20' : h.is_custom_creative ? 'bg-ucmas-red/10 text-ucmas-red border border-ucmas-red/20' : 'bg-ucmas-green/10 text-ucmas-green border border-ucmas-green/20'}`}>
                                    {activeTab === 'contest' ? 'Thi đấu' : h.is_custom_creative ? 'Sáng tạo' : h.practice_exams?.name || 'Giao đề'}
                                </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <button onClick={() => handleViewDetails(h)} className="text-gray-300 group-hover:text-ucmas-red transition-all text-xl transform group-hover:scale-125 group-hover:rotate-12">➝</button>
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
