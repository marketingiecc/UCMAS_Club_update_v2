
import React from 'react';
import { Question } from '../types';

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  userAnswers: Record<number, string>;
  title?: string;
}

const ResultDetailModal: React.FC<ResultDetailModalProps> = ({ isOpen, onClose, questions, userAnswers, title }) => {
  if (!isOpen) return null;

  const correctCount = questions.filter((q, i) => {
      const ans = userAnswers[i];
      return ans && parseInt(ans) === q.correctAnswer;
  }).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-ucmas-blue p-6 text-white flex justify-between items-center shrink-0">
           <div>
               <h3 className="text-xl font-bold">{title || 'Chi tiết kết quả'}</h3>
               <p className="text-blue-200 text-sm mt-1">
                   Đúng: <span className="font-bold text-white">{correctCount}</span>/{questions.length} câu
               </p>
           </div>
           <button 
             onClick={onClose}
             className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition"
           >
              ✕
           </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-grow">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {questions.map((q, idx) => {
                  const userAns = userAnswers[idx];
                  const isAnswered = userAns !== undefined && userAns !== '';
                  const isCorrect = isAnswered && parseInt(userAns) === q.correctAnswer;
                  
                  return (
                      <div 
                        key={q.id} 
                        className={`relative p-4 rounded-xl border-l-4 shadow-sm bg-white flex flex-col justify-between ${
                            isCorrect ? 'border-green-500' : 'border-red-500'
                        }`}
                      >
                          {/* Question Detail */}
                          <div className="mb-3">
                              <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Câu {idx + 1}</span>
                              <div className="flex justify-center bg-gray-50 rounded-lg py-2">
                                <div className="text-gray-800 font-bold font-mono text-lg tracking-widest flex flex-col items-end">
                                    {q.operands.map((op, i) => (
                                        <div key={i}>{op}</div>
                                    ))}
                                    <div className="w-full h-px bg-gray-400 mt-1"></div>
                                </div>
                              </div>
                          </div>

                          {/* Answers Comparison */}
                          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                              <div className="text-center">
                                  <div className="text-[10px] text-gray-400 uppercase">Bạn chọn</div>
                                  <div className={`font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                      {isAnswered ? userAns : '--'}
                                  </div>
                              </div>
                              
                              <div className="text-2xl">
                                  {isCorrect ? '✅' : '❌'}
                              </div>

                              <div className="text-center">
                                  <div className="text-[10px] text-gray-400 uppercase">Đáp án</div>
                                  <div className="font-bold text-lg text-ucmas-blue">
                                      {q.correctAnswer}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
                Đóng
            </button>
        </div>

      </div>
    </div>
  );
};

export default ResultDetailModal;
