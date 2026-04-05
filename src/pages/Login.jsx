import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate(); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('Đang xử lý...');

    if (isRegister) {
      // ĐĂNG KÝ (Mặc định ai tự đăng ký trên web cũng là Học sinh)
      const { data, error } = await supabase
        .from('users')
        .insert([{ phone_number: phone, full_name: fullName, role: 'student' }])
        .select();
      
      if (error) {
        setMessage('❌ Lỗi: Số điện thoại này đã được đăng ký!');
      } else if (data && data.length > 0) {
        const newUser = data[0];
        setMessage('✅ Đăng ký thành công! Đang vào hệ thống...');
        
        // Lưu thông tin vào LocalStorage để các trang khác dùng
        localStorage.setItem('user_id', newUser.id);    
        localStorage.setItem('user_name', newUser.full_name);    
        localStorage.setItem('user_role', newUser.role);    
        
        setTimeout(() => navigate('/dashboard'), 1000); 
      }
    } else {
      // ĐĂNG NHẬP
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phone)
        .single();
      
      if (data) {
        setMessage(`✅ Xin chào ${data.full_name}! Đang chuyển hướng...`);
        
        // Lưu thông tin vào LocalStorage
        localStorage.setItem('user_id', data.id);
        localStorage.setItem('user_name', data.full_name);    
        localStorage.setItem('user_role', data.role);

        // PHÂN LỒNG CHUYỂN TRANG THEO QUYỀN (ROLE)
        setTimeout(() => {
          if (data.role === 'super_admin') {
            navigate('/super-admin'); // Cửa VIP cho Sếp
          } else if (data.role === 'teacher' || data.role === 'admin') {
            navigate('/admin');       // Cửa cho Giáo viên
          } else {
            navigate('/dashboard');   // Cửa cho Học sinh
          }
        }, 1000);

      } else {
        setMessage('❌ Không tìm thấy số điện thoại này! Vui lòng đăng ký.');
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-blue-600">
          {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Hệ Thống'}
        </h2>

        <form onSubmit={handleAuth} className="flex flex-col space-y-4">
          {isRegister && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Họ và Tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none font-mono text-lg tracking-wider"
              placeholder="09..."
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {isRegister ? 'Đăng Ký Ngay' : 'Vào Thi'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 rounded-lg p-3 text-center text-sm font-medium ${message.includes('❌') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
            {message}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage('');
              setPhone('');
            }}
            className="font-semibold text-blue-600 hover:underline"
          >
            {isRegister ? 'Đăng nhập ngay' : 'Đăng ký mới'}
          </button>
        </div>
      </div>
    </div>
  );
}