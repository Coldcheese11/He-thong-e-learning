import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, FileText, Clock, Settings, Copy, Trash2, Filter, Globe, Lock, BookOpen, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [classes, setClasses] = useState([]);
  
  // STATE MỚI: Quản lý ID của đề thi đang mở menu thả xuống
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    fetchData();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const teacherId = localStorage.getItem('user_id');
    if (!teacherId) return;

    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    
    if (data) setClasses(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subData } = await supabase.from('subjects').select('*').order('name');
      if (subData) setSubjects(subData);

      const { data: examData, error } = await supabase
        .from('exams')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(examData || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // NÂNG CẤP: Giao bài và tự động đăng thông báo lên Timeline lớp học
  const handleAssignToClass = async (examId, classId, examTitle) => {
    try {
      // 1. Thêm vào bảng giao bài
      const { error } = await supabase
        .from('exam_assignments')
        .insert([{ exam_id: examId, class_id: classId }]);
      
      if (error) {
        if (error.code === '23505') alert("⚠️ Đề này đã được giao cho lớp này từ trước rồi!");
        else throw error;
      } else {
        // 2. Đăng thông báo lên Timeline của Lớp (bảng class_posts)
        const teacherId = localStorage.getItem('user_id');
        const currentTime = new Date().toLocaleString('vi-VN');
        
        await supabase.from('class_posts').insert([{
          class_id: classId,
          teacher_id: teacherId,
          title: `🔔 BÀI TẬP MỚI: ${examTitle}`,
          content: `Hệ thống tự động thông báo:\nGiáo viên vừa giao một đề thi/bài tập mới cho lớp vào lúc ${currentTime}.\n\nCác em hãy truy cập vào mục "Bài tập từ Lớp của tôi" ở Trang chủ để làm bài nhé!`
        }]);

        alert("✅ Đã giao bài và gửi thông báo thành công cho lớp!");
        setOpenDropdownId(null); // Đóng menu sau khi giao xong
      }
    } catch (error) {
      alert("Lỗi khi giao bài: " + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy mã đề: ' + text);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đề thi này không?")) return;
    try {
      await supabase.from('exams').delete().eq('id', id);
      setExams(exams.filter(ex => ex.id !== id));
      alert("Đã xóa thành công!");
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = filterSubject === 'all' || exam.subject_id === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Đề Thi</h2>
          <p className="text-gray-500">Danh sách các đề thi bạn đã tạo trên hệ thống</p>
        </div>
        <Link to="/admin/smart-upload" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-colors">
          + Tạo Đề Mới
        </Link>
      </div>

      {/* THANH CÔNG CỤ */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm tên đề thi..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div className="relative min-w-[250px]">
          <div className="absolute left-4 top-3.5 text-gray-400"><Filter size={20} /></div>
          <select 
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700"
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DANH SÁCH ĐỀ THI */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-bold">Đang tải dữ liệu...</div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <FileText className="mx-auto text-gray-300 mb-4" size={60} />
          <h3 className="text-xl font-bold text-gray-600 mb-2">Không tìm thấy đề thi</h3>
          <p className="text-gray-500">Hãy thử đổi bộ lọc hoặc tạo một đề thi mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col h-full relative">
              
              <div className={`absolute top-0 right-0 text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl shadow-sm flex items-center gap-1 ${exam.is_public ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {exam.is_public ? <Globe size={12} /> : <Lock size={12} />}
                {exam.is_public ? 'Công Khai' : 'Riêng Tư'}
              </div>

              <div className="flex items-center gap-2 mb-3 mt-2">
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <BookOpen size={14} /> {exam.subjects?.name || 'Chưa phân loại'}
                </span>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  {exam.grade || 'Khối 10'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-4 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {exam.title}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4 flex-1">
                <div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" /> {exam.duration} phút</div>
                <div className="flex items-center gap-2"><FileText size={16} className="text-gray-400" /> {exam.total_questions} câu</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 flex justify-between items-center border border-gray-100">
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Mã đề thi</p>
                  <p className="font-mono text-gray-800 truncate text-sm">{exam.id}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(exam.id)}
                  className="bg-white p-2 rounded-lg shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                  title="Copy mã đề"
                >
                  <Copy size={18} />
                </button>
              </div>

              {/* NÚT GIAO BÀI DẠNG CLICK (KHÔNG RÊ CHUỘT) */}
              <div className="relative mb-6 z-10">
                <button 
                  onClick={() => setOpenDropdownId(openDropdownId === exam.id ? null : exam.id)}
                  className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-bold text-sm hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-green-100 shadow-sm"
                >
                  <UserPlus size={16} /> Giao bài cho lớp...
                </button>
                
                {/* Chỉ hiện menu khi openDropdownId trùng với exam.id */}
                {openDropdownId === exam.id && (
                  <div className="absolute bottom-full left-0 w-full bg-white shadow-2xl rounded-xl border border-gray-200 p-2 mb-2 animate-fade-in origin-bottom">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-1 px-1">
                      <p className="text-[11px] font-bold text-gray-400 uppercase">Chọn lớp để giao:</p>
                      <button 
                        onClick={() => setOpenDropdownId(null)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded"
                      >
                        Đóng
                      </button>
                    </div>

                    {classes.length === 0 ? (
                      <p className="text-xs text-gray-500 p-3 text-center bg-gray-50 rounded-lg mt-1">Chưa có lớp. Hãy tạo lớp trước!</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto mt-1 space-y-1 pr-1">
                        {classes.map(cls => (
                          <button 
                            key={cls.id}
                            onClick={() => handleAssignToClass(exam.id, cls.id, exam.title)}
                            className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Users size={14} className="text-green-500"/> {cls.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Các nút thao tác */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-colors flex justify-center items-center gap-2">
                  <Settings size={16} /> Cài đặt
                </button>
                <button onClick={() => handleDelete(exam.id)} className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-colors" title="Xóa đề">
                  <Trash2 size={18} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}