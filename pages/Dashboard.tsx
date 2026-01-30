import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, LevelSymbol } from '../types';
import { backend } from '../services/mockBackend';
import { AttemptResult } from '../types';
import ResultDetailModal from '../components/ResultDetailModal';
import { practiceService } from '../src/features/practice/services/practiceService';
import { getLevelLabel, LEVEL_SYMBOLS_ORDER } from '../config/levelsAndDifficulty';

interface DashboardProps {
  user: UserProfile;
  setUser?: (u: UserProfile | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  // Tab 1: Thông tin học sinh
  const [fullName, setFullName] = useState(user.full_name || '');
  const [studentCode, setStudentCode] = useState(user.student_code || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [levelSymbol, setLevelSymbol] = useState<LevelSymbol | ''>((user.level_symbol as LevelSymbol) || '');
  const [className, setClassName] = useState(user.class_name || '');
  const [centerName, setCenterName] = useState(user.center_name || '');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<'success' | 'error' | null>(null);

  // Tab 2: Lịch sử luyện tập
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [pHistory, setPHistory] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'contest' | 'practice'>('practice');
  const [loading, setLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    setFullName(user.full_name || '');
    setStudentCode(user.student_code || '');
    setPhone(user.phone || '');
    setLevelSymbol((user.level_symbol as LevelSymbol) || '');
    setClassName(user.class_name || '');
    setCenterName(user.center_name || '');
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    setLoading(true);
    if (historyTab === 'contest') {
      backend.getUserHistory(user.id).then((data) => {
        setHistory(data);
        setLoading(false);
      });
    } else {
      practiceService.getPracticeHistory(user.id).then((data) => {
        setPHistory(data);
        setLoading(false);
      });
    }
  }, [activeTab, historyTab, user.id]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    const res = await backend.updateProfile(user.id, {
      full_name: fullName,
      student_code: studentCode || undefined,
      phone: phone || undefined,
      level_symbol: levelSymbol || undefined,
      class_name: className || undefined,
      center_name: centerName || undefined,
    });
    setSaving(false);
    setSaveMessage(res.success ? 'success' : 'error');
    if (res.success && setUser) {
      const updated = await backend.fetchProfile(user.id);
      if (updated) setUser(updated);
    }
  };

  const handleViewDetails = async (h: any) => {
    if (historyTab === 'contest') {
      const answers = await backend.getAttemptAnswers(h.id);
      setSelectedAnswers(answers);
    }
    setSelectedAttempt(h);
  };

  const list = historyTab === 'contest' ? history : pHistory;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-heading-bold text-ucmas-blue">Hồ sơ học sinh</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Thông tin cá nhân và lịch sử luyện tập</p>
      </div>

      <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-gray-200 -mx-1 sm:mx-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-heading font-semibold rounded-t-xl transition-colors ${
            activeTab === 'info' ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Thông tin học sinh
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-heading font-semibold rounded-t-xl transition-colors ${
            activeTab === 'history' ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Lịch sử luyện tập
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Họ và tên"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã học sinh</label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Mã học sinh"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Số điện thoại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cấp độ</label>
              <select
                value={levelSymbol}
                onChange={(e) => setLevelSymbol((e.target.value || '') as LevelSymbol)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">— Chọn cấp độ —</option>
                {LEVEL_SYMBOLS_ORDER.map((s) => (
                  <option key={s} value={s}>{getLevelLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Lớp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trung tâm</label>
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Trung tâm (chọn hoặc nhập)"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-ucmas-blue text-white font-heading-bold rounded-lg hover:bg-ucmas-red transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
            {saveMessage === 'success' && (
              <span className="text-green-600 text-sm font-medium">Đã lưu.</span>
            )}
            {saveMessage === 'error' && (
              <span className="text-red-600 text-sm font-medium">Lưu thất bại.</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          {selectedAttempt && (
            <ResultDetailModal
              isOpen={!!selectedAttempt}
              onClose={() => setSelectedAttempt(null)}
              questions={selectedAttempt.exam_data?.questions || []}
              userAnswers={selectedAnswers}
              title={`Kết quả: ${selectedAttempt.mode} - ${historyTab === 'contest' ? 'Cuộc thi' : 'Luyện tập'}`}
            />
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setHistoryTab('practice')}
              className={`px-3 py-2 sm:px-4 rounded-lg font-heading font-semibold text-xs sm:text-sm ${
                historyTab === 'practice' ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Luyện tập
            </button>
            <button
              onClick={() => setHistoryTab('contest')}
              className={`px-3 py-2 sm:px-4 rounded-lg font-heading font-semibold text-xs sm:text-sm ${
                historyTab === 'contest' ? 'bg-ucmas-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Cuộc thi
            </button>
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-heading-bold">
                <tr>
                  <th className="px-6 py-4">Ngày</th>
                  <th className="px-6 py-4">Phần thi</th>
                  <th className="px-6 py-4">Điểm</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Chưa có lịch sử.
                    </td>
                  </tr>
                ) : (
                  list.map((h: any) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium">{h.mode || '—'}</td>
                      <td className="px-6 py-3 text-sm">
                        {h.score_correct != null && h.score_total != null
                          ? `${h.score_correct}/${h.score_total}`
                          : h.score ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {historyTab === 'contest' ? 'Cuộc thi' : 'Luyện tập'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleViewDetails(h)}
                          className="text-ucmas-blue font-heading font-semibold text-sm hover:underline"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile/Tablet: cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">Đang tải...</div>
            ) : list.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500 text-sm">Chưa có lịch sử.</div>
            ) : (
              list.map((h: any) => (
                <div key={h.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 font-medium">{h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '—'}</div>
                    <div className="font-heading font-semibold text-gray-800 mt-0.5">{h.mode || '—'}</div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {h.score_correct != null && h.score_total != null ? `${h.score_correct}/${h.score_total}` : h.score ?? '—'}
                      <span className="ml-2 text-gray-400">• {historyTab === 'contest' ? 'Cuộc thi' : 'Luyện tập'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(h)}
                    className="px-4 py-2 rounded-xl bg-ucmas-blue text-white font-heading font-semibold text-sm hover:bg-ucmas-red transition"
                  >
                    Xem
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
