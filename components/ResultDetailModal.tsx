
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

  const parseUserNumber = (raw: string | undefined) => {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const isCorrectAnswer = (userValue: number | null, correct: number) => {
    if (userValue == null) return false;
    // Tolerate small float differences (decimal questions may exist).
    return Math.abs(userValue - correct) < 1e-6;
  };

  const correctCount = questions.filter((q, i) => {
    const n = parseUserNumber(userAnswers[i]);
    return isCorrectAnswer(n, q.correctAnswer);
  }).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-ucmas-blue to-ucmas-blue/90 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 gap-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-heading-bold truncate">{title || 'Chi tiết kết quả'}</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
              Đúng: <span className="font-heading-bold text-white text-lg">{correctCount}</span>/{questions.length} câu
              <span className="ml-3 text-ucmas-yellow">
                {Math.round((correctCount / questions.length) * 100)}%
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all hover:scale-110 flex-shrink-0"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-gray-50 flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isAnswered = userAns !== undefined && userAns !== '';
              const userNum = parseUserNumber(userAns);
              const isCorrect = isAnswered && isCorrectAnswer(userNum, q.correctAnswer);
              const displayLines = q.displayLines ?? q.operands.map((op) => String(op));

              return (
                <div
                  key={q.id}
                  className={`relative p-5 rounded-xl border-l-4 shadow-md bg-white flex flex-col justify-between hover:shadow-lg transition-all ${isCorrect ? 'border-ucmas-green' : 'border-ucmas-red'
                    }`}
                >
                  {/* Question Detail */}
                  <div className="mb-3">
                    <span className="text-xs font-heading font-bold text-gray-400 uppercase mb-2 block">Câu {idx + 1}</span>
                    <div className="flex justify-center bg-gray-50 rounded-lg py-2">
                      <div className="text-gray-800 font-heading font-bold text-lg tracking-widest flex flex-col items-end">
                        {displayLines.map((line, i) => (
                          <div key={i} style={{ fontFamily: 'DnEalianManuscript' }}>{line}</div>
                        ))}
                        <div className="w-full h-px bg-gray-400 mt-1"></div>
                      </div>
                    </div>
                  </div>

                  {/* Answers Comparison */}
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 uppercase font-heading font-semibold mb-1">Bạn chọn</div>
                      <div className={`font-heading-bold text-xl ${isCorrect ? 'text-ucmas-green' : 'text-ucmas-red'}`} style={{ fontFamily: 'DnEalianManuscript' }}>
                        {isAnswered ? userAns : '--'}
                      </div>
                    </div>

                    <div className="text-3xl transform scale-125">
                      {isCorrect ? '✅' : '❌'}
                    </div>

                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 uppercase font-heading font-semibold mb-1">Đáp án</div>
                      <div className="font-heading-bold text-xl text-ucmas-blue" style={{ fontFamily: 'DnEalianManuscript' }}>
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
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-ucmas-blue text-white font-heading-bold rounded-xl hover:bg-ucmas-red shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResultDetailModal;
