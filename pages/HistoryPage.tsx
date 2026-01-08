import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { AttemptResult } from '../types';

const HistoryPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [history, setHistory] = useState<AttemptResult[]>([]);

  useEffect(() => {
    backend.getUserHistory(userId).then(setHistory);
  }, [userId]);

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 mt-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-4 text-gray-200">📜</div>
        <h3 className="text-xl font-bold text-gray-700">Chưa có lịch sử</h3>
        <p className="text-gray-500 mt-2">Hãy hoàn thành một bài luyện tập để xem kết quả tại đây.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
            <h2 className="text-2xl font-black text-gray-800">Lịch Sử Luyện Tập</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider">
                <tr>
                <th className="px-8 py-4">Thời gian</th>
                <th className="px-8 py-4">Bài tập</th>
                <th className="px-8 py-4">Cấp độ</th>
                <th className="px-8 py-4">Điểm số</th>
                <th className="px-8 py-4">Thời lượng</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {history.map((h) => (
                <tr key={h.id} className="hover:bg-blue-50 transition group cursor-default">
                    <td className="px-8 py-5 text-sm text-gray-600 font-mono">
                    {new Date(h.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${
                        h.mode === 'flash' ? 'bg-green-100 text-green-700' : 
                        h.mode === 'nghe_tinh' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {h.mode === 'nhin_tinh' ? 'Nhìn Tính' : h.mode === 'nghe_tinh' ? 'Nghe Tính' : 'Flash'}
                    </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-700">Cấp {h.level}</td>
                    <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-ucmas-blue">{h.score_correct}</span> 
                        <span className="text-xs text-gray-400 font-medium">/{h.score_total}</span>
                    </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-mono">
                    {Math.floor(h.duration_seconds / 60)}:{(h.duration_seconds % 60).toString().padStart(2, '0')}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
    </div>
  );
};

export default HistoryPage;