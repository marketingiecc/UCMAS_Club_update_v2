import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode } from '../types';
import { trainingService } from '../services/trainingService';
import CustomSlider from '../components/CustomSlider';

const SpeedTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(2);
  const [count, setCount] = useState(8);
  const [speed, setSpeed] = useState(0.8);
  const [status, setStatus] = useState<'setup' | 'running' | 'answer' | 'done'>('setup');
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ correct: boolean; sum: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const numbers = useMemo(() => {
    const min = Math.pow(10, Math.max(0, digits - 1));
    const max = Math.pow(10, digits) - 1;
    return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  }, [digits, count, status]);

  const sum = useMemo(() => numbers.reduce((a, b) => a + b, 0), [numbers]);

  const runSequence = async () => {
    setStatus('running');
    startedAtRef.current = Date.now();
    for (const n of numbers) {
      setFlashNumber(n);
      await new Promise(r => setTimeout(r, speed * 1000));
      setFlashNumber(null);
      await new Promise(r => setTimeout(r, 150));
    }
    setStatus('answer');
  };

  const submit = async () => {
    const isCorrect = parseInt(answer || '0', 10) === sum;
    const duration = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
    setResult({ correct: isCorrect, sum });
    setStatus('done');
    setSaving(true);
    await trainingService.saveSpeedTraining({
      mode: Mode.FLASH,
      speed_target: speed,
      score: isCorrect ? 1 : 0,
      duration_seconds: duration,
    });
    setSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading-extrabold text-ucmas-blue">Speed Training</h1>
          <p className="text-gray-600 text-sm sm:text-base">Luyện phản xạ tốc độ và khả năng tính nhanh.</p>
        </div>
        <button
          onClick={() => navigate('/training')}
          className="px-3 py-2 sm:px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm sm:text-base"
        >
          ← Quay lại
        </button>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 p-4 sm:p-6 lg:p-10">
        {status === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 items-center">
            <div>
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">⚡</div>
              <h2 className="text-xl sm:text-2xl font-heading-bold text-ucmas-red mb-2">Cấu hình tốc độ</h2>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Chọn số chữ số, số lượng số và tốc độ hiển thị.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-heading-bold text-gray-500 uppercase">Số chữ số</label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(d => (
                      <button
                        key={d}
                        onClick={() => setDigits(d)}
                        className={`w-10 h-10 rounded-xl font-heading-bold ${digits === d ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-heading-bold text-gray-500 uppercase">Số lượng</label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10))}
                    className="mt-2 w-full p-3 rounded-xl border border-gray-200"
                  />
                </div>
                <div className="col-span-2">
                  <CustomSlider
                    label="Tốc độ (giây/số)"
                    value={speed}
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    onChange={(val) => setSpeed(val)}
                    valueLabel={`${speed.toFixed(1)}s`}
                    color="red"
                    unit="s"
                    minLabel="0.3s"
                    maxLabel="2.0s"
                  />
                </div>
              </div>
              <button
                onClick={runSequence}
                className="mt-6 px-8 py-3 bg-ucmas-red text-white rounded-xl font-heading-bold shadow-lg hover:bg-ucmas-blue"
              >
                Bắt đầu →
              </button>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 text-center">
              <div className="text-[clamp(4rem,16vw,10rem)] font-black text-ucmas-blue leading-none">
                888
              </div>
              <p className="text-sm text-gray-500 mt-4">Ví dụ kích thước hiển thị</p>
            </div>
          </div>
        )}

        {status === 'running' && (
          <div className="min-h-[45vh] flex items-center justify-center">
            <div className="text-[clamp(6rem,22vw,16rem)] font-black text-ucmas-blue leading-none">
              {flashNumber ?? ''}
            </div>
          </div>
        )}

        {status === 'answer' && (
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-xl font-heading-bold mb-4">Nhập tổng</h3>
            <input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full h-20 text-center text-5xl font-black bg-gray-50 border-4 border-gray-100 focus:border-ucmas-blue rounded-3xl outline-none transition"
              placeholder="?"
              autoFocus
            />
            <button
              onClick={submit}
              className="mt-6 px-8 py-3 bg-ucmas-blue text-white rounded-xl font-heading-bold shadow-lg hover:bg-ucmas-red"
            >
              Nộp bài
            </button>
          </div>
        )}

        {status === 'done' && result && (
          <div className="text-center max-w-md mx-auto">
            <div className="text-7xl mb-4">{result.correct ? '🎉' : '❌'}</div>
            <h3 className="text-2xl font-heading-bold text-ucmas-blue mb-2">
              {result.correct ? 'Xuất sắc!' : 'Cố gắng thêm nhé!'}
            </h3>
            <p className="text-gray-600 mb-4">Đáp án đúng: {result.sum}</p>
            <button
              onClick={() => {
                setAnswer('');
                setResult(null);
                setStatus('setup');
              }}
              className="px-8 py-3 bg-ucmas-red text-white rounded-xl font-heading-bold shadow-lg hover:bg-ucmas-blue"
            >
              Làm lại
            </button>
            {saving && <p className="text-xs text-gray-400 mt-3">Đang lưu kết quả...</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeedTrainingPage;
