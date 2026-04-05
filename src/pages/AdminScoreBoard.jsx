import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Download, UserCheck, UserX, Loader2, Calendar } from 'lucide-react';

export default function AdminScoreBoard() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    setLoading(true);
    try {
      // Gọi lên Supabase, lấy bảng student_attempts và "kéo" theo Tên Đề Thi + Tên Học Sinh
      const { data, error } = await supabase
        .from('student_attempts')
        .select(`
          id, total_score, end_time, status,
          exams ( title ),
          users ( full_name )
        `)
        .order('end_time', { ascending: false }); // Xếp mới nhất lên đầu

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error("Lỗi lấy bảng điểm:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm chuyển đổi thời gian cho đẹp
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa nộp';
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bảng Điểm Học Sinh</h2>
          <p className="text-gray-500 text-sm mt-1">Dữ liệu được cập nhật trực tiếp từ hệ thống.</p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm font-medium">
          <Download size={18} /> Xuất Excel
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-blue-600">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Học sinh</th>
                <th className="p-4 font-semibold text-gray-700">Bài thi</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Điểm số</th>
                <th className="p-4 font-semibold text-gray-700">Thời gian nộp</th>
                <th className="p-4 font-semibold text-gray-700 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-8 text-gray-500">Chưa có lượt làm bài nào.</td>
                </tr>
              ) : (
                attempts.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">
                      {item.users?.full_name || 'Học sinh Ẩn danh'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {item.exams?.title || 'Đề thi đã bị xóa'}
                    </td>
                    <td className="p-4 text-center font-black text-xl text-blue-600">
                      {item.total_score}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} /> {formatDate(item.end_time)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${item.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {item.status === 'submitted' ? <UserCheck size={14} /> : <UserX size={14} />} 
                        {item.status === 'submitted' ? 'Đã nộp' : 'Đang thi'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}