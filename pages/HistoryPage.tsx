
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
          const snapshot = h?.config?.attempt_snapshot;
          const questions = Array.isArray(snapshot?.questions) ? snapshot.questions : [];
          const answers = snapshot?.answers && typeof snapshot.answers === 'object' ? snapshot.answers : {};
          if (questions.length === 0) {
            alert('Bản ghi này chỉ có kết quả tổng, chưa có dữ liệu chi tiết bài làm.');
            return;
          }
          setSelectedAnswers(answers);
          setSelectedAttempt({ ...h, exam_data: { ...(h.exam_data || {}), questions } });
      }
  };

  const getAttemptedCount = (h: any) => {
      const fromSnapshot = Number(h?.config?.attempt_snapshot?.answered_count || 0);
      if (Number.isFinite(fromSnapshot) && fromSnapshot > 0) return fromSnapshot;
      const fromScore = Number(h?.score_total || 0);
      if (Number.isFinite(fromScore) && fromScore > 0) return fromScore;
      return 0;
  };

  const getScoreLabel = (h: any) => {
      const correct = Number(h?.score_correct || 0);
      const attempted = getAttemptedCount(h);
      return `${correct}/${attempted}`;
  };

  const getPracticeTypeLabel = (h: any) => {
      if (activeTab === 'contest') return 'Thi đấu';
      if (h.is_custom_creative) return 'Sáng tạo';
      return h.assigned_practice_exams?.name || h.practice_exams?.name || 'Giao đề';
  };

  const getPracticeTypeClass = (h: any) => {
      if (activeTab === 'contest') return 'bg-ucmas-blue/10 text-ucmas-blue border border-ucmas-blue/20';
      if (h.is_custom_creative) return 'bg-ucmas-red/10 text-ucmas-red border border-ucmas-red/20';
      return 'bg-ucmas-green/10 text-ucmas-green border border-ucmas-green/20';
  };

  const getPracticeTypeClassMobile = (h: any) => {
      if (activeTab === 'contest') return 'bg-ucmas-blue/10 text-ucmas-blue';
      if (h.is_custom_creative) return 'bg-ucmas-red/10 text-ucmas-red';
      return 'bg-ucmas-green/10 text-ucmas-green';
  };

  const list = activeTab === 'contest' ? history : pHistory;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {selectedAttempt && (
            <ResultDetailModal 
                isOpen={!!selectedAttempt}
                onClose={() => setSelectedAttempt(null)}
                questions={selectedAttempt.exam_data?.questions || []}
                userAnswers={selectedAnswers}
                title={`Kết quả: ${selectedAttempt.mode} - ${activeTab === 'contest' ? 'Cuộc thi' : 'Luyện tập'}`}
            />
        )}

        <div className="text-center mb-6 sm:mb-12">
            <div className="inline-block mb-2 sm:mb-4">
              <span className="text-4xl sm:text-5xl">📊</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading-extrabold text-ucmas-blue uppercase tracking-tight mb-2 sm:mb-4 px-2">Lịch Sử Kết Quả</h2>
            <p className="text-gray-600 mb-4 sm:mb-8 font-medium text-sm sm:text-base">Theo dõi tiến bộ và thành tích của bạn</p>
            <div className="flex flex-wrap justify-center gap-1 p-1.5 bg-gray-100 rounded-full shadow-inner border-2 border-gray-200">
                <button onClick={() => setActiveTab('contest')} className={`px-4 py-2.5 sm:px-8 sm:py-3 rounded-full text-[10px] sm:text-xs font-heading-bold uppercase transition-all ${activeTab === 'contest' ? 'bg-white text-ucmas-red shadow-lg border-2 border-ucmas-red' : 'text-gray-500 hover:text-gray-700'}`}>🏁 Cuộc thi</button>
                <button onClick={() => setActiveTab('practice')} className={`px-4 py-2.5 sm:px-8 sm:py-3 rounded-full text-[10px] sm:text-xs font-heading-bold uppercase transition-all ${activeTab === 'practice' ? 'bg-white text-ucmas-red shadow-lg border-2 border-ucmas-red' : 'text-gray-500 hover:text-gray-700'}`}>📚 Luyện thi</button>
            </div>
        </div>

        {/* Desktop (>= lg): table */}
        <div className="hidden lg:block bg-white rounded-2xl sm:rounded-[2.5rem] shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in">
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
                    ) : list.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-heading font-bold uppercase text-xs">Chưa có dữ liệu</td></tr>
                    ) : list.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50 transition group">
                            <td className="px-10 py-6 text-sm font-mono text-gray-600">{new Date(h.created_at).toLocaleString('vi-VN')}</td>
                            <td className="px-10 py-6 font-heading font-bold uppercase text-xs text-gray-800">{h.mode}</td>
                            <td className="px-10 py-6 font-heading-extrabold text-xl text-ucmas-blue">
                                {h.score_correct || 0}<span className="text-sm text-gray-400 font-medium">/{getAttemptedCount(h)}</span>
                            </td>
                            <td className="px-10 py-6">
                                <span className={`text-[10px] font-heading-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${getPracticeTypeClass(h)}`}>
                                    {getPracticeTypeLabel(h)}
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

        {/* Mobile/Tablet (< lg): cards */}
        <div className="lg:hidden space-y-3 animate-fade-in">
            {loading ? (
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-400 text-sm">Đang tải lịch sử...</div>
            ) : list.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-8 text-center text-gray-300 font-heading font-bold uppercase text-xs">Chưa có dữ liệu</div>
            ) : list.map(h => (
                <div key={h.id} className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 font-mono">{new Date(h.created_at).toLocaleString('vi-VN')}</div>
                        <div className="font-heading font-bold text-gray-800 mt-0.5 uppercase text-xs">{h.mode}</div>
                        <div className="text-sm mt-0.5">
                            <span className="font-heading-extrabold text-ucmas-blue">{getScoreLabel(h)}</span>
                            <span className={`ml-2 text-[10px] font-heading-bold uppercase px-2 py-0.5 rounded-full ${getPracticeTypeClassMobile(h)}`}>
                                {getPracticeTypeLabel(h)}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => handleViewDetails(h)} className="px-4 py-2 rounded-xl bg-ucmas-blue text-white font-heading font-semibold text-sm hover:bg-ucmas-red transition">Xem</button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HistoryPage;
