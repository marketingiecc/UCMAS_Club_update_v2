import React, { useState, useEffect } from 'react';
import { backend } from '../services/mockBackend';
import { Contest } from '../types';

const AdminExerciseRepository: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'contest' | 'practice'>('contest');
    const [contests, setContests] = useState<Contest[]>([]);

    // Mock practice exercises
    const [practiceExercises, setPracticeExercises] = useState([
        { id: 1, name: 'Đề luyện tập Nhìn tính Level 1', mode: 'Visual', created_at: '2025-02-01', filename: 'practice_visual_l1.json' },
        { id: 2, name: 'Đề luyện tập Nghe tính Level 2', mode: 'Listening', created_at: '2025-02-02', filename: 'practice_listening_l2.json' },
        { id: 3, name: 'Đề luyện tập Flash Level 1', mode: 'Flash', created_at: '2025-02-02', filename: 'practice_flash_l1.json' },
    ]);

    useEffect(() => {
        loadContests();
    }, []);

    const loadContests = async () => {
        const data = await backend.getAdminContests();
        setContests(data);
    };

    const handleUpload = (type: 'contest' | 'practice') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                // Mock upload
                if (type === 'contest') {
                    alert(`Đã tải lên Đề thi: ${file.name}`);
                    // In real app, would upload to backend and refresh list
                } else {
                    alert(`Đã tải lên Đề luyện tập: ${file.name}`);
                    setPracticeExercises(prev => [...prev, {
                        id: Date.now(),
                        name: file.name.replace('.json', ''),
                        mode: 'Custom',
                        created_at: new Date().toISOString().split('T')[0],
                        filename: file.name
                    }]);
                }
            }
        };
        input.click();
    };

    const handleCreateExam = () => {
        alert("Chuyển hướng đến trang 'Tạo đề thi sáng tạo'...");
        // In real app: navigate('/admin/create-exam');
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">KHO BÀI TẬP</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
                    <li className="mr-2">
                        <button
                            onClick={() => setActiveTab('contest')}
                            className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors ${activeTab === 'contest' ? 'text-ucmas-blue border-ucmas-blue bg-blue-50/50' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                        >
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                Kho Đề Thi (Cuộc Thi)
                            </span>
                        </button>
                    </li>
                    <li className="mr-2">
                        <button
                            onClick={() => setActiveTab('practice')}
                            className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors ${activeTab === 'practice' ? 'text-ucmas-blue border-ucmas-blue bg-blue-50/50' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                        >
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Kho Luyện Tập (Chế độ)
                            </span>
                        </button>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                {/* TOOLBAR */}
                <div className="flex justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        {activeTab === 'contest' ? (
                            <>Danh sách Đề thi Cuộc thi <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{contests.length}</span></>
                        ) : (
                            <>Danh sách Bài tập Luyện tập <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{practiceExercises.length}</span></>
                        )}
                    </h3>

                    <div className="flex gap-3">
                        {/* Create Creative Exam - Only relevant for Contests or maybe Advanced Practice? User said "Sửa trang QUẢN LÝ LUYỆN THI thành KHO BÀI TẬP... Có chức năng: Tạo đề thi sáng tạo" */}
                        <button
                            onClick={handleCreateExam}
                            className="bg-ucmas-blue text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Tạo Đề Sáng Tạo
                        </button>

                        <button
                            onClick={() => handleUpload(activeTab)}
                            className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold shadow transition flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            Upload JSON {activeTab === 'contest' ? 'Đề Thi' : 'Luyện Tập'}
                        </button>
                    </div>
                </div>

                {/* CONTENT TABLE */}
                {activeTab === 'contest' ? (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Tên cuộc thi / Đề thi</th>
                                <th className="px-6 py-3">Thời gian bắt đầu</th>
                                <th className="px-6 py-3">Trạng thái</th>
                                <th className="px-6 py-3">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contests.length > 0 ? contests.map(c => (
                                <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                        <span className="text-xl">🏆</span>
                                        {c.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(c.start_at).toLocaleString('vi-VN')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {c.status === 'published' ? 'Đang mở' : 'Nháp'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-600 hover:underline mr-3 font-medium">Sửa</button>
                                        <button className="text-red-600 hover:underline font-medium">Xóa</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">Chưa có đề thi nào trong kho.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Tên bài tập</th>
                                <th className="px-6 py-3">Chế độ áp dụng</th>
                                <th className="px-6 py-3">Tên File</th>
                                <th className="px-6 py-3">Ngày tạo</th>
                                <th className="px-6 py-3">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {practiceExercises.map(e => (
                                <tr key={e.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                        <span className="text-xl">📄</span>
                                        {e.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${e.mode === 'Visual' ? 'bg-blue-100 text-blue-700' :
                                                e.mode === 'Listening' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-orange-100 text-orange-700'}`}>
                                            {e.mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{e.filename}</td>
                                    <td className="px-6 py-4 text-gray-500">{e.created_at}</td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-600 hover:underline mr-3 font-medium">Tải về</button>
                                        <button className="text-red-600 hover:underline font-medium">Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminExerciseRepository;
