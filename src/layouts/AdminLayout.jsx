import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, LogOut, Upload, FileText, Database, Menu, X } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // STATE: Quản lý việc đóng/mở menu trên Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hàm check active thông minh hơn (sáng đèn cả khi ở đường dẫn con)
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  // HÀM XỬ LÝ ĐĂNG XUẤT
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      localStorage.clear(); // Xóa toàn bộ token & data phiên đăng nhập
      navigate('/');        // Đẩy về trang đăng nhập
    }
  };

  // Tự động đóng menu khi bấm vào 1 link (trên mobile)
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      
      {/* THANH TOPBAR CHO MOBILE (Chỉ hiện trên điện thoại) */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white shadow-sm z-40 px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-xl font-bold text-blue-600">Admin Panel</h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MÀN ĐEN MỜ (OVERLAY) BÊN NGOÀI MENU (Chỉ hiện trên điện thoại khi mở menu) */}
      {isMobileMenuOpen && (
        <div 
          onClick={closeMenu} 
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
        ></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white shadow-xl md:shadow-md flex flex-col border-r border-gray-100 z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="p-6 border-b border-gray-100 hidden md:block">
          <h2 className="text-2xl font-bold text-blue-600">Admin Panel</h2>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-16 md:mt-0">
          <Link to="/admin" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin') && location.pathname === '/admin' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Home size={20} /> Dashboard
          </Link>

          <Link to="/admin/smart-upload" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/smart-upload') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Upload size={20} /> Tải đề thi mới
          </Link>

          <Link to="/admin/scores" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/scores') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <BookOpen size={20} /> Quản lý Điểm số
          </Link>

          <Link to="/admin/exams" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/exams') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileText size={20} /> Danh sách Đề thi
          </Link>

          <Link to="/admin/library" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/library') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Database size={20} /> Thư Viện Đề & Câu Hỏi
          </Link>
          
          <Link to="/admin/classes" onClick={closeMenu} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/classes') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Users size={20} /> Lớp & Học Viên
          </Link>
        </nav>

        {/* NÚT ĐĂNG XUẤT */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      {/* Sửa padding cho Mobile để không bị thanh Topbar che lấp */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-8 min-h-full border border-gray-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;