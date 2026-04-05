import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, LogOut, Upload, FileText, Database } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-md flex flex-col border-r border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-blue-600">Admin Panel</h2>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/admin" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin') && location.pathname === '/admin' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Home size={20} /> Dashboard
          </Link>

          <Link to="/admin/smart-upload" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/smart-upload') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Upload size={20} /> Tải đề thi mới
          </Link>

          <Link to="/admin/scores" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/scores') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <BookOpen size={20} /> Quản lý Điểm số
          </Link>

          <Link to="/admin/exams" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/exams') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileText size={20} /> Danh sách Đề thi
          </Link>

          <Link to="/admin/library" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/library') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Database size={20} /> Thư Viện Đề & Câu Hỏi
          </Link>
          
          <Link to="/admin/classes" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin/classes') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Users size={20} /> Lớp & Học Viên
          </Link>
        </nav>

        {/* NÚT ĐĂNG XUẤT ĐÃ ĐƯỢC GẮN LOGIC */}
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
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-xl shadow-sm p-8 min-h-full border border-gray-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;