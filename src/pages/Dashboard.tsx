import React from 'react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../types';

interface DashboardProps {
    user: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const isAdmin = user.role === 'admin';

    return (
        <div className="space-y-8">
            {/* Find Sidebar Context: Ensure the user knows where they are */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-heading-bold text-gray-800 mb-2">
                        Xin chào, <span className="text-ucmas-blue">{user.full_name || user.email}</span>! 👋
                    </h1>
                    <p className="text-gray-500">Chào mừng bạn quay trở lại hệ thống UCMAS Club.</p>
                </div>
                {isAdmin && (
                    <div className="bg-blue-50 text-ucmas-blue px-4 py-2 rounded-lg font-bold border border-blue-100">
                        Admin Portal
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-ucmas-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Truy cập nhanh
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Admin Actions */}
                    {isAdmin && (
                        <>
                            <Link to="/admin/repository" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-ucmas-blue transition">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-ucmas-blue mb-4 group-hover:scale-110 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue">KHO BÀI TẬP</h3>
                                <p className="text-sm text-gray-500">Quản lý kho đề thi và bài tập luyện tập. Tải lên và tạo đề mới.</p>
                            </Link>

                            <Link to="/admin/practice" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-ucmas-blue transition">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue">Cấu hình Luyện tập</h3>
                                <p className="text-sm text-gray-500">Thiết lập thông số cho các chế độ Nhìn tính, Nghe tính, Flash.</p>
                            </Link>
                        </>
                    )}

                    {/* Common Actions */}
                    <Link to="/practice/visual" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-ucmas-blue transition">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition">
                            <span className="text-2xl">👀</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue">Luyện Nhìn Tính</h3>
                        <p className="text-sm text-gray-500">Rèn tư duy trực quan, tăng khả năng tập trung và ghi nhớ hình ảnh số học.</p>
                    </Link>

                    <Link to="/practice/listening" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-ucmas-blue transition">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition">
                            <span className="text-2xl">🎧</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue">Luyện Nghe Tính</h3>
                        <p className="text-sm text-gray-500">Phát triển trí nhớ thính giác, phản xạ tính toán qua âm thanh.</p>
                    </Link>

                    <Link to="/history" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-ucmas-blue transition">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-ucmas-blue">Lịch sử Luyện tập</h3>
                        <p className="text-sm text-gray-500">Xem lại kết quả các bài luyện tập và theo dõi tiến độ.</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
