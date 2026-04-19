import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [entryMode, setEntryMode] = useState(null); 
  
  // Đã chuyển sang dùng Email làm chuẩn
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Chỉ dùng lúc đăng ký (Tùy chọn)
  const [fullName, setFullName] = useState('');
  
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate(); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('Đang xử lý...');

    if (isRegister) {
      // ĐĂNG KÝ BẰNG EMAIL
      const { data, error } = await supabase
        .from('users')
        .insert([{ 
            email: email, 
            phone_number: phone || null, 
            full_name: fullName, 
            role: entryMode 
        }])
        .select();
      
      if (error) {
        setMessage('❌ Lỗi: Email này đã được đăng ký!');
      } else if (data && data.length > 0) {
        const newUser = data[0];
        setMessage('✅ Đăng ký thành công! Đang vào hệ thống...');
        
        localStorage.setItem('user_id', newUser.id);    
        localStorage.setItem('user_name', newUser.full_name);    
        localStorage.setItem('user_role', newUser.role);    
        
        setTimeout(() => {
          if (newUser.role === 'teacher') navigate('/admin');
          else navigate('/dashboard');
        }, 1000); 
      }
    } else {
      // ĐĂNG NHẬP BẰNG EMAIL
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email) // Đã đổi điều kiện tìm kiếm thành email
        .single();
      
      if (data) {
        setMessage(`✅ Xin chào ${data.full_name}! Đang chuyển hướng...`);
        
        localStorage.setItem('user_id', data.id);
        localStorage.setItem('user_name', data.full_name);    
        localStorage.setItem('user_role', data.role);

        setTimeout(() => {
          if (data.role === 'super_admin') navigate('/super-admin');
          else if (data.role === 'teacher' || data.role === 'admin') navigate('/admin'); 
          else navigate('/dashboard'); 
        }, 1000);

      } else {
        setMessage('❌ Không tìm thấy Email này! Vui lòng kiểm tra lại hoặc đăng ký.');
      }
    }
  };

  // ==========================================
  // GIAO DIỆN 1: MÀN HÌNH CHỌN VAI TRÒ
  // ==========================================
  if (entryMode === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-600 mb-2">Hệ Thống Thi Trắc Nghiệm</h1>
          <p className="text-gray-500 mb-8 text-sm md:text-base">Vui lòng chọn vai trò của bạn để bắt đầu</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            <button 
              onClick={() => setEntryMode('student')}
              className="group bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-2 border-gray-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 flex flex-col items-center"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <span className="text-3xl md:text-4xl">👨‍🎓</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">Tôi là Học Sinh</h2>
              <p className="text-gray-500 text-xs md:text-sm px-2 leading-relaxed">Xem điểm, làm bài tập hoặc thi chính thức.</p>
            </button>

            <button 
              onClick={() => setEntryMode('teacher')}
              className="group bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-2 border-gray-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 flex flex-col items-center"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                <span className="text-3xl md:text-4xl">👨‍🏫</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">Tôi là Giáo Viên</h2>
              <p className="text-gray-500 text-xs md:text-sm px-2 leading-relaxed">Tạo đề thi, quản lý lớp học và chấm điểm.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 2: MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ
  // ==========================================
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="p-3 md:p-4 bg-gray-50 border-b flex items-center">
          <button 
            onClick={() => { setEntryMode(null); setIsRegister(false); setMessage(''); }}
            className="text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1 text-xs md:text-sm bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-colors"
          >
            ⬅ Quay lại
          </button>
          <span className="mx-auto font-bold text-gray-700 pr-10 text-sm md:text-base">
            {entryMode === 'student' ? '👨‍🎓 Cổng Học Sinh' : '👨‍🏫 Cổng Giáo Viên'}
          </span>
        </div>

        <div className="p-6 md:p-8">
          <h2 className="mb-5 md:mb-6 text-center text-xl md:text-2xl font-bold text-blue-600">
            {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Hệ Thống'}
          </h2>

          <form onSubmit={handleAuth} className="flex flex-col space-y-3.5 md:space-y-4">
            
            {/* EMAIL (BẮT BUỘC CHO CẢ ĐĂNG NHẬP VÀ ĐĂNG KÝ) */}
            <div>
              <label className="mb-1 block text-xs md:text-sm font-medium text-gray-700">Email của bạn *</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 md:p-3.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm md:text-base"
                placeholder="VD: nguyenvan_a@gmail.com"
              />
            </div>

            {isRegister && (
              <>
                {/* HỌ TÊN (BẮT BUỘC) */}
                <div>
                  <label className="mb-1 block text-xs md:text-sm font-medium text-gray-700">Họ và Tên *</label>
                  <input
                    type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 md:p-3.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm md:text-base"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                
                {/* SỐ ĐIỆN THOẠI (TÙY CHỌN) */}
                <div>
                  <label className="mb-1 block text-xs md:text-sm font-medium text-gray-700">Số điện thoại (Tùy chọn)</label>
                  <input
                    type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 md:p-3.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none tracking-wider transition-all text-sm md:text-base"
                    placeholder="09..."
                  />
                </div>
              </>
            )}

            <button type="submit" className={`mt-2 rounded-xl p-3 md:p-3.5 text-white font-bold text-base md:text-lg transition-colors shadow-md ${entryMode === 'teacher' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
              {isRegister ? 'Đăng Ký Ngay' : 'Đăng Nhập'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 rounded-lg p-3 text-center text-xs md:text-sm font-medium ${message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
              {message}
            </div>
          )}

          <div className="mt-5 md:mt-6 text-center text-xs md:text-sm text-gray-600 border-b border-gray-100 pb-5 md:pb-6">
            {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <button
              onClick={() => { setIsRegister(!isRegister); setMessage(''); }}
              className="font-bold text-blue-600 hover:underline"
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký mới'}
            </button>
          </div>

          {/* GIAO DIỆN MỚI: NÚT THI THỬ DÀNH CHO KHÁCH VÀ HỌC SINH */}
          {!isRegister && entryMode === 'student' && (
            <div className="mt-6 pt-2 text-center">
              <h3 className="text-base font-semibold text-gray-700 mb-1">Bạn muốn thi thử?</h3>
              <p className="text-xs text-gray-500 mb-4">Trải nghiệm hệ thống không cần tạo tài khoản</p>
             <button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full bg-indigo-50 text-indigo-600 font-bold py-3 md:py-3.5 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                🏠 Vào Trang Chủ (Khách)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}