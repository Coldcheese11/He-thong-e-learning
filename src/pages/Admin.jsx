import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, UploadCloud, Globe, TrendingUp, Users, Database } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Admin() {
  const [userName, setUserName] = useState('Giáo viên');
  const [stats, setStats] = useState({ exams: 0, questions: 0 });

  useEffect(() => {
    const name = localStorage.getItem('user_name');
    if (name) setUserName(name);

    // Lấy thống kê nhanh
    const fetchStats = async () => {
      const { count: examCount } = await supabase.from('exams').select('*', { count: 'exact', head: true });
      const { count: qCount } = await supabase.from('question_bank').select('*', { count: 'exact', head: true });
      setStats({ exams: examCount || 0, questions: qCount || 0 });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-10">
      {/* Lời chào */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black mb-2">Xin chào, {userName}! 👋</h1>
          <p className="text-blue-100 text-lg">Chào mừng quay lại hệ thống quản lý. Hôm nay bạn muốn làm gì?</p>
        </div>
        <Link to="/admin/smart-upload" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-md flex items-center gap-2 whitespace-nowrap">
          <UploadCloud size={24} /> Tạo Đề Thi Mới
        </Link>
      </div>

      {/* 3 Nút Điều Hướng Chính */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/exams" className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 transform scale-150 group-hover:scale-110 transition-transform"><FileText size={100} /></div>
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform"><FileText size={32} /></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Quản lý Đề Thi</h3>
          <p className="text-gray-500">Xem, sửa và quản lý {stats.exams} đề thi bạn đã tạo.</p>
        </Link>

        <Link to="/admin/library" className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-300 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 transform scale-150 group-hover:scale-110 transition-transform"><Database size={100} /></div>
          <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform"><Database size={32} /></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Kho Câu Hỏi</h3>
          <p className="text-gray-500">Quản lý {stats.questions} câu hỏi trắc nghiệm đã bóc tách.</p>
        </Link>

        <Link to="/admin/library" className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 transform scale-150 group-hover:scale-110 transition-transform"><Globe size={100} /></div>
          <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform"><Globe size={32} /></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Kho Cộng Đồng</h3>
          <p className="text-gray-500">Khám phá và sao chép đề thi từ giáo viên khác.</p>
        </Link>
      </div>
    </div>
  );
}