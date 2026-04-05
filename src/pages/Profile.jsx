import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Key, Save, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) {
        setUser(data);
        setFullName(data.full_name || '');
      }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const updateData = { full_name: fullName };
      if (password.trim() !== '') {
        updateData.password_hash = password; // Cập nhật mật khẩu nếu có nhập
      }

      const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
      
      if (error) throw error;
      
      localStorage.setItem('user_name', fullName); // Cập nhật lại tên trên LocalStorage
      setMessage('✅ Cập nhật thông tin thành công!');
      setPassword(''); // Xóa ô mật khẩu sau khi lưu
    } catch (error) {
      setMessage('❌ Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center">Đang tải thông tin...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      
      {/* Banner Cá Nhân */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 opacity-10 transform scale-150 translate-x-10 -translate-y-10">
          <ShieldCheck size={250} />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="h-24 w-24 bg-white text-blue-600 rounded-full flex items-center justify-center font-black text-4xl shadow-lg border-4 border-blue-300">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black">{fullName}</h1>
            <p className="text-blue-100 mt-1 flex items-center gap-2">
              <span className="uppercase tracking-wider font-bold text-xs bg-blue-800 px-3 py-1 rounded-full">
                Vai trò: {user.role === 'super_admin' ? 'Quản Trị Viên' : user.role === 'teacher' ? 'Giáo Viên' : 'Học Sinh'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Cập Nhật */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2 border-b pb-4">
          <User className="text-blue-600" /> Cài đặt tài khoản
        </h2>

        <form onSubmit={handleUpdate} className="space-y-6 max-w-2xl">
          
          {/* Số điện thoại (Không cho sửa để tránh lỗi Đăng nhập) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại đăng nhập (Không thể đổi)</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input type="text" disabled value={user.phone_number} className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono cursor-not-allowed" />
            </div>
          </div>

          {/* Tên hiển thị */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tên hiển thị công khai</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-blue-500" size={20} />
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập họ và tên..." />
            </div>
          </div>

          {/* Đổi mật khẩu */}
          <div className="pt-6 border-t border-gray-100 mt-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Đổi mật khẩu mới (Bỏ trống nếu không đổi)</label>
            <div className="relative">
              <Key className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập mật khẩu mới..." />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl font-medium ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md">
              <Save size={20} /> {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}