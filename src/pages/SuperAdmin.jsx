import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Settings, Plus, Trash2, Edit, Save, BookOpen, Layers, ShieldAlert } from 'lucide-react';

export default function SuperAdmin() {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
    if (!error) setSubjects(data || []);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ name: newSubject.trim(), icon: 'BookOpen' }]) // Tạm mặc định icon
        .select();

      if (error) throw error;
      setSubjects([...subjects, data[0]]);
      setNewSubject('');
    } catch (error) {
      alert("Lỗi thêm môn học: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (!error) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* HEADER TỐI CAO */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShieldAlert size={36} className="text-red-400" /> BẢNG ĐIỀU KHIỂN SUPER ADMIN
          </h1>
          <p className="mt-2 text-gray-300">Quản lý cấu hình lõi và danh mục hệ thống toàn cầu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI: FORM THÊM MÔN HỌC */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
            <Plus className="text-blue-600" /> Thêm Danh Mục Mới
          </h2>
          
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên Môn Học / Danh Mục</label>
              <input 
                type="text" 
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="VD: Tin học ứng dụng..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2"
            >
              {loading ? 'Đang lưu...' : <><Save size={20}/> Lưu Danh Mục</>}
            </button>
          </form>
        </div>

        {/* CỘT PHẢI: DANH SÁCH MÔN HỌC ĐANG HIỂN THỊ */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
            <Layers className="text-blue-600" /> Danh mục đang hiển thị trên Trang chủ
          </h2>
          
          {subjects.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Chưa có danh mục nào. Hãy tạo mới bên trái.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(subject => (
                <div key={subject.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                      <BookOpen size={20} />
                    </div>
                    <span className="font-bold text-gray-800">{subject.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(subject.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}