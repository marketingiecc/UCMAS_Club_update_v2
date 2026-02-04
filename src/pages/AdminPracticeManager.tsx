import React, { useState } from 'react';

// Mock data types
interface PracticeLevelConfig {
    id: string;
    level: string; // e.g., "Basic", "InterA"
    mode: 'visual' | 'listening' | 'flash';
    duration: number; // seconds
    questionCount: number;
    customFile?: string; // filename of uploaded JSON
}

const AdminPracticeManager: React.FC = () => {
    const [selectedLevel, setSelectedLevel] = useState<string>('Basic');
    const [showToast, setShowToast] = useState(false);

    // Mock state for configuration
    // Ensure we have configs for all modes for the selected level
    const [configs, setConfigs] = useState<PracticeLevelConfig[]>([
        { id: '1', level: 'Basic', mode: 'visual', duration: 300, questionCount: 20 },
        { id: '2', level: 'Basic', mode: 'listening', duration: 300, questionCount: 10 },
        { id: '3', level: 'Basic', mode: 'flash', duration: 100, questionCount: 10 },
        // Add placeholders for other levels if needed, or handle dynamically
    ]);

    // Mock Repository Modal State
    const [isRepositoryModalOpen, setIsRepositoryModalOpen] = useState(false);
    const [activeModeForSelection, setActiveModeForSelection] = useState<'visual' | 'listening' | 'flash' | null>(null);

    const handleSave = () => {
        // Simulate save
        console.log("Saving configs:", configs);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDownloadTemplate = (mode: 'visual' | 'listening' | 'flash') => {
        const template = {
            mode: mode,
            level: selectedLevel,
            description: `Template for ${mode} - ${selectedLevel}`,
            questions: [
                { id: 1, content: "Example Question", answer: "10" }
            ]
        };
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_${selectedLevel}_${mode}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleOpenRepository = (mode: 'visual' | 'listening' | 'flash') => {
        setActiveModeForSelection(mode);
        setIsRepositoryModalOpen(true);
    };

    const handleRepositorySelect = (filename: string) => {
        if (!activeModeForSelection) return;

        setConfigs(prev => {
            const exists = prev.find(c => c.level === selectedLevel && c.mode === activeModeForSelection);
            if (exists) {
                return prev.map(c =>
                    (c.level === selectedLevel && c.mode === activeModeForSelection)
                        ? { ...c, customFile: filename }
                        : c
                );
            } else {
                // If config doesn't exist yet, create it
                return [...prev, {
                    id: Date.now().toString(),
                    level: selectedLevel,
                    mode: activeModeForSelection,
                    duration: 300,
                    questionCount: 10,
                    customFile: filename
                }];
            }
        });

        setIsRepositoryModalOpen(false);
        setActiveModeForSelection(null);
    };

    const handleRemoveFile = (mode: 'visual' | 'listening' | 'flash') => {
        setConfigs(prev => prev.map(c =>
            (c.level === selectedLevel && c.mode === mode)
                ? { ...c, customFile: undefined }
                : c
        ));
    };

    const updateConfig = (mode: 'visual' | 'listening' | 'flash', field: keyof PracticeLevelConfig, value: any) => {
        setConfigs(prev => {
            const exists = prev.find(c => c.level === selectedLevel && c.mode === mode);
            if (exists) {
                return prev.map(c => (c.level === selectedLevel && c.mode === mode) ? { ...c, [field]: value } : c);
            } else {
                return [...prev, {
                    id: Date.now().toString(),
                    level: selectedLevel,
                    mode: mode,
                    duration: 300,
                    questionCount: 10,
                    [field]: value
                } as PracticeLevelConfig];
            }
        });
    };

    // Helper to get current config for rendering
    const getConfig = (mode: 'visual' | 'listening' | 'flash') => {
        return configs.find(c => c.level === selectedLevel && c.mode === mode) || {
            duration: 300,
            questionCount: 10,
            customFile: undefined
        };
    };

    return (
        <div className="p-6 relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Quản Trị Tính Năng Luyện Tập</h1>
                <button
                    onClick={handleSave}
                    className="bg-ucmas-blue text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition"
                >
                    Lưu Thiết Lập
                </button>
            </div>

            {/* Toast Notification - Fixed z-index and positioning */}
            {showToast && (
                <div className="fixed top-24 right-10 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded shadow-lg animate-fade-in-down z-[9999] flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                        <strong className="font-bold block">Thành công!</strong>
                        <span>Đã lưu thiết lập luyện tập.</span>
                    </div>
                </div>
            )}

            {/* Level Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Cấp độ cấu hình</label>
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-ucmas-blue focus:border-ucmas-blue block w-full p-2.5"
                    >
                        <option value="Basic">Cơ bản (Basic)</option>
                        <option value="InterA">Trung cấp A (Inter A)</option>
                        <option value="InterB">Trung cấp B (Inter B)</option>
                        <option value="HigherA">Cao cấp A (Higher A)</option>
                    </select>
                </div>
            </div>

            {/* Configuration Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 w-1/6">Chế độ</th>
                            <th className="px-6 py-4 w-1/3">Thiết lập chung</th>
                            <th className="px-6 py-4 w-1/3">File bài tập</th>
                            <th className="px-6 py-4 w-1/6">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(['visual', 'listening', 'flash'] as const).map((mode) => {
                            const conf = getConfig(mode);
                            return (
                                <tr key={mode} className="bg-white hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-900 capitalize text-base">
                                        {mode === 'visual' ? 'Nhìn tính' : mode === 'listening' ? 'Nghe tính' : 'Flash'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">Thời gian (s)</label>
                                                <input
                                                    type="number"
                                                    className="w-24 p-2 border border-gray-200 rounded focus:ring-ucmas-blue focus:border-ucmas-blue"
                                                    value={conf.duration}
                                                    onChange={(e) => updateConfig(mode, 'duration', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">Số câu hỏi</label>
                                                <input
                                                    type="number"
                                                    className="w-24 p-2 border border-gray-200 rounded focus:ring-ucmas-blue focus:border-ucmas-blue"
                                                    value={conf.questionCount}
                                                    onChange={(e) => updateConfig(mode, 'questionCount', parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {conf.customFile ? (
                                            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2 max-w-xs">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="text-xl">📄</span>
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-sm font-medium text-ucmas-blue truncate text-ellipsis">{conf.customFile}</span>
                                                        <span className="text-xs text-blue-400">Đã chọn</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFile(mode)}
                                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-white transition"
                                                    title="Gỡ bỏ"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic flex items-center gap-2">
                                                <span>Sử dụng đề ngẫu nhiên</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleOpenRepository(mode)}
                                                className="px-3 py-2 text-sm font-medium text-white bg-ucmas-orange rounded hover:bg-orange-600 transition flex items-center justify-center gap-2"
                                                style={{ backgroundColor: '#F08C00' }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                Tải bài (Chọn)
                                            </button>
                                            <button
                                                onClick={() => handleDownloadTemplate(mode)}
                                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Tải Mẫu JSON
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Repository Modal */}
            {isRepositoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Chọn đề từ Kho Bài Tập</h2>
                            <button onClick={() => setIsRepositoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {/* Mock Repository Content - In real app, reuse AdminExerciseRepository with a 'selectMode' prop */}
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-ucmas-blue transition group" onClick={() => handleRepositorySelect('Đề luyện tập cơ bản 1.json')}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded text-ucmas-blue">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 group-hover:text-ucmas-blue">Đề luyện tập cơ bản 1.json</h3>
                                                <p className="text-xs text-gray-500">Tải lên: 04/02/2026</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold group-hover:bg-ucmas-blue group-hover:text-white transition">Chọn</span>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-ucmas-blue transition group" onClick={() => handleRepositorySelect('Đề kiểm tra nhanh.json')}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded text-ucmas-blue">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 group-hover:text-ucmas-blue">Đề kiểm tra nhanh.json</h3>
                                                <p className="text-xs text-gray-500">Tải lên: 03/02/2026</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold group-hover:bg-ucmas-blue group-hover:text-white transition">Chọn</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-white rounded-b-xl flex justify-end">
                            <button onClick={() => setIsRepositoryModalOpen(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPracticeManager;
