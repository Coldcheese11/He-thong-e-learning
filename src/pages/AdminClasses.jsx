import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Copy, Plus, GraduationCap, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  // Lấy danh sách Lớp học của Giáo viên này
  const fetchClasses = async () => {
    const teacherId = localStorage.getItem('user_id');
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setClasses(data);
      if (data.length > 0) handleSelectClass(data[0]); // Tự động chọn lớp đầu tiên
    }
  };

  // Tạo lớp học mới
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setLoading(true);
    
    const teacherId = localStorage.getItem('user_id');
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Tạo mã ngẫu nhiên 6 chữ số

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{ name: newClassName, teacher_id: teacherId, invite_code: inviteCode }])
        .select();

      if (error) throw error;
      setClasses([data[0], ...classes]);
      setNewClassName('');
    } catch (error) {
      alert('Lỗi tạo lớp: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách học sinh khi bấm vào một lớp
  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    const { data } = await supabase
      .from('class_members')
      .select('id, joined_at, users(full_name, phone_number)')
      .eq('class_id', cls.id)
      .order('joined_at', { ascending: false });
    
    if (data) setStudents(data);
  };

  // ================= TÍNH NĂNG MỚI: XÓA LỚP =================
  const handleDeleteClass = async (classId) => {
    if (!window.confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa lớp học này không? Mọi dữ liệu của lớp sẽ bị xóa vĩnh viễn!")) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      // Cập nhật lại UI sau khi xóa thành công
      const updatedClasses = classes.filter(c => c.id !== classId);
      setClasses(updatedClasses);

      // Nếu lớp đang chọn bị xóa, reset lại giao diện hoặc chọn lớp khác
      if (selectedClass?.id === classId) {
        setSelectedClass(null);
        setStudents([]);
        if (updatedClasses.length > 0) {
          handleSelectClass(updatedClasses[0]);
        }
      }
      
      alert("✅ Đã xóa lớp thành công!");
    } catch (error) {
      alert("❌ Lỗi khi xóa lớp: " + error.message);
    }
  };

  // Xóa học sinh khỏi lớp
  const handleKickStudent = async (memberId) => {
    if (!window.confirm("Bạn có chắc muốn xóa học sinh này khỏi lớp?")) return;
    await supabase.from('class_members').delete().eq('id', memberId);
    setStudents(students.filter(s => s.id !== memberId));
  };

  // Copy mã mời
  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Đã copy mã mời: ${code}`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b pb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Lớp & Học viên</h2>
        <p className="text-gray-500">Tạo không gian lớp học và theo dõi tiến độ của học sinh.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* CỘT TRÁI: DANH SÁCH LỚP */}
        <div className="md:col-span-1 space-y-6">
          {/* Form tạo lớp */}
          <form onSubmit={handleCreateClass} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18}/> Tạo Lớp Học Mới</h3>
            <input 
              type="text" 
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              placeholder="VD: Toán 10A1..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">
              {loading ? 'Đang tạo...' : 'Tạo Lớp'}
            </button>
          </form>

          {/* List Lớp */}
          <div className="space-y-3">
            {classes.map(cls => (
              <div 
                key={cls.id} 
                onClick={() => handleSelectClass(cls)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedClass?.id === cls.id ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}
              >
                <div>
                  <h4 className={`font-bold ${selectedClass?.id === cls.id ? 'text-blue-700' : 'text-gray-800'}`}>{cls.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Mã mời: <span className="font-mono font-bold text-gray-700">{cls.invite_code}</span></p>
                </div>
                <Users size={20} className={selectedClass?.id === cls.id ? 'text-blue-600' : 'text-gray-400'} />
              </div>
            ))}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT HỌC VIÊN TRONG LỚP ĐƯỢC CHỌN */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px]">
          {selectedClass ? (
            <>
              {/* ĐÃ CHỈNH SỬA: Gom các nút vào một thẻ div để hiển thị ngang hàng đẹp mắt */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <GraduationCap className="text-blue-600" /> Danh sách: {selectedClass.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Sĩ số: {students.length} học sinh</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* NÚT XÓA LỚP */}
                  <button 
                    onClick={() => handleDeleteClass(selectedClass.id)}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-100 transition-colors"
                    title="Xóa toàn bộ lớp học"
                  >
                    <Trash2 size={18} /> Xóa Lớp
                  </button>

                  <button 
                    onClick={() => copyInviteCode(selectedClass.invite_code)}
                    className="bg-green-50 text-green-700 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-100 transition-colors"
                  >
                    <Copy size={18} /> Copy Mã
                  </button>

                  <Link 
                    to={`/classroom/${selectedClass.id}`}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-12 transition-transform">
                      <Send size={16} />
                    </div>
                    <span>Bảng Tin</span>
                  </Link>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <UserPlus size={48} className="mb-4 opacity-50" />
                  <p>Lớp học chưa có thành viên nào.</p>
                  <p className="text-sm mt-1">Gửi mã <b className="text-blue-600 bg-blue-50 px-2 py-1 rounded">{selectedClass.invite_code}</b> cho học sinh để tham gia.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student, idx) => (
                    <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{student.users?.full_name || 'Học sinh ẩn danh'}</p>
                          <p className="text-xs text-gray-500">SĐT: {student.users?.phone_number} • Tham gia: {new Date(student.joined_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <button onClick={() => handleKickStudent(student.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa khỏi lớp">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Hãy chọn hoặc tạo một lớp học bên trái để xem danh sách.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}