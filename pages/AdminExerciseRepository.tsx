import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { practiceService } from '../src/features/practice/services/practiceService';
import { Contest } from '../types';

const AdminExerciseRepository: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'contest' | 'practice'>('contest');
    const [contests, setContests] = useState<Contest[]>([]);
    const [practiceExams, setPracticeExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'contest') {
            const data = await backend.getAdminContests();
            setContests(data);
        } else {
            // Load all exams from practice service
            // Filter client-side or assume service returns all
            const data = await practiceService.getAdminAllExams();
            // Filter for 'practice' type exercises if needed, or show all
            // For now, practiceService returns everything including contest exams? 
            // We might need to filter based on 'config.contestId'
            setPracticeExams(data);
        }
        setLoading(false);
    };

    const handleCreateExam = () => {
        // Navigate to Practice Manager to create/upload
        navigate('/admin/practice');
    };

    const handleDelete = async (id: string, type: 'contest' | 'practice') => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;

        if (type === 'contest') {
            // Mock delete contest
            alert('Tính năng xóa cuộc thi chưa được implement trong mockBackend.');
        } else {
            const res = await practiceService.adminDeleteExercise(id);
            if (res.success) {
                alert('Đã xóa thành công!');
                loadData();
            } else {
                alert('Lỗi xóa: ' + res.error);
            }
        }
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gray-50 font-sans">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-heading font-black text-gray-800 uppercase tracking-tight">KHO BÀI TẬP</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
                    <li className="mr-2">
                        <button
                            onClick={() => setActiveTab('contest')}
                            className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors font-heading-bold uppercase text-xs tracking-wider ${activeTab === 'contest' ? 'text-ucmas-blue border-ucmas-blue bg-blue-50/50' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-lg">🏆</span>
                                Kho Đề Thi (Cuộc Thi)
                            </span>
                        </button>
                    </li>
                    <li className="mr-2">
                        <button
                            onClick={() => setActiveTab('practice')}
                            className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors font-heading-bold uppercase text-xs tracking-wider ${activeTab === 'practice' ? 'text-ucmas-blue border-ucmas-blue bg-blue-50/50' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-lg">📚</span>
                                Kho Luyện Tập (Chế độ)
                            </span>
                        </button>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
                {/* TOOLBAR */}
                <div className="flex justify-between mb-6">
                    <h3 className="text-lg font-heading font-black text-gray-700 flex items-center gap-2 uppercase tracking-tight">
                        {activeTab === 'contest' ? (
                            <>Danh sách Đề thi Cuộc thi <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{contests.length}</span></>
                        ) : (
                            <>Danh sách Bài tập Luyện tập <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{practiceExams.length}</span></>
                        )}
                    </h3>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCreateExam}
                            className="bg-ucmas-blue text-white px-5 py-2.5 rounded-xl font-heading-bold text-xs shadow-md hover:bg-blue-700 transition flex items-center gap-2 uppercase tracking-wide"
                        >
                            <span className="text-lg">+</span>
                            Tạo / Tải Đề Mới
                        </button>
                    </div>
                </div>

                {/* CONTENT TABLE */}
                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ucmas-blue"></div></div>
                ) : activeTab === 'contest' ? (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-heading font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Tên cuộc thi / Đề thi</th>
                                    <th className="px-6 py-4">Thời gian bắt đầu</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {contests.length > 0 ? contests.map(c => (
                                    <tr key={c.id} className="bg-white hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-500 flex items-center justify-center text-xl">🏆</div>
                                            {c.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{new Date(c.start_at).toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {c.status === 'published' ? 'Đang mở' : 'Nháp'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="text-blue-600 hover:text-blue-800 font-heading-bold text-xs uppercase px-3">Sửa</button>
                                            <button onClick={() => handleDelete(c.id, 'contest')} className="text-red-500 hover:text-red-700 font-heading-bold text-xs uppercase px-3">Xóa</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-medium">Chưa có đề thi nào trong kho.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-heading font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Tên bài tập</th>
                                    <th className="px-6 py-4">Chế độ / Code</th>
                                    <th className="px-6 py-4">Cấu hình</th>
                                    <th className="px-6 py-4">Ngày tạo</th>
                                    <th className="px-6 py-4 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {practiceExams.length > 0 ? practiceExams.map(e => {
                                    const isMixed = e.mode === 'hon_hop' || e.config?.isMixed;
                                    return (
                                        <tr key={e.id} className="bg-white hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${isMixed ? 'bg-purple-50 text-purple-600' : e.mode === 'nhin_tinh' ? 'bg-blue-50 text-ucmas-blue' : e.mode === 'nghe_tinh' ? 'bg-red-50 text-ucmas-red' : 'bg-green-50 text-ucmas-green'}`}>
                                                    {isMixed ? '🧬' : e.mode === 'nhin_tinh' ? '👁️' : e.mode === 'nghe_tinh' ? '🎧' : '⚡'}
                                                </div>
                                                <div>
                                                    <div>{e.name || 'Không tên'}</div>
                                                    {e.config?.contestId && <div className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded inline-block mt-1">Thuộc đề thi</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-700 uppercase mb-1">{isMixed ? 'Hỗn hợp' : e.mode}</div>
                                                <div className="text-[10px] font-mono text-gray-400">{e.exam_code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                <div>{e.config?.digits} Số • {e.config?.operands} Dòng</div>
                                                <div className="text-gray-400 mt-0.5">Tốc độ: {e.config?.speed || e.config?.display_speed}s</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                {new Date(e.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => navigate('/admin/practice')} className="text-blue-600 hover:text-blue-800 font-heading-bold text-xs uppercase px-3">Sửa</button>
                                                <button onClick={() => handleDelete(e.id, 'practice')} className="text-red-500 hover:text-red-700 font-heading-bold text-xs uppercase px-3">Xóa</button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic font-medium">Chưa có bài tập nào.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminExerciseRepository;
