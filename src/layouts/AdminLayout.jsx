import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, BookOpen, Users, LogOut, Upload, 
  FileText, Database, Menu, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // STATES
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // State thu gọn cho Desktop

  // HÀM KIỂM TRA ACTIVE
  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      localStorage.clear();
      navigate('/');
    }
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  // MẢNG QUẢN LÝ MENU (Giúp code gọn gàng, dễ thêm/sửa)
  const menuItems = [
    { path: '/admin', icon: Home, label: 'Dashboard', exact: true },
    { path: '/admin/smart-upload', icon: Upload, label: 'Tải đề thi mới' },
    { path: '/admin/scores', icon: BookOpen, label: 'Quản lý Điểm số' },
    { path: '/admin/exams', icon: FileText, label: 'Danh sách Đề thi' },
    { path: '/admin/library', icon: Database, label: 'Thư Viện Câu Hỏi' },
    { path: '/admin/classes', icon: Users, label: 'Lớp & Học Viên' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      
      {/* ========================================== */}
      {/* 1. THANH TOPBAR CHO MOBILE                 */}
      {/* ========================================== */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white shadow-sm z-40 px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h2 className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          HT Trắc Nghiệm
        </h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MÀN ĐEN MỜ (OVERLAY) BÊN NGOÀI MENU MOBILE */}
      {isMobileMenuOpen && (
        <div 
          onClick={closeMenu} 
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm transition-opacity"
        ></div>
      )}

      {/* ========================================== */}
      {/* 2. SIDEBAR (HỖ TRỢ COLLAPSE TRÊN DESKTOP)  */}
      {/* ========================================== */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 bg-white shadow-2xl md:shadow-none border-r border-gray-100 z-40 flex flex-col transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'} 
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Nút thu/phóng (Chỉ hiện trên Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-8 bg-blue-600 text-white rounded-full p-1.5 shadow-md hover:bg-blue-700 transition-transform hover:scale-110 z-50 border-2 border-white"
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        {/* LOGO */}
        <div className="h-20 flex items-center justify-center border-b border-gray-50 px-4 transition-all">
          {isCollapsed ? (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
              HT
            </div>
          ) : (
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              Hệ Thống GV
            </h2>
          )}
        </div>

        {/* DANH SÁCH MENU */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto mt-16 md:mt-0 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            return (
              <Link 
                key={item.path}
                to={item.path} 
                onClick={closeMenu}
                title={isCollapsed ? item.label : ""} // Hiện Tooltip khi thu gọn
                className={`flex items-center p-3 rounded-xl transition-all duration-200 group ${
                  active 
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                } ${isCollapsed ? 'justify-center' : 'gap-4'}`}
              >
                <Icon size={22} className={`shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                
                {/* Chỉ hiện chữ khi chưa thu gọn */}
                {!isCollapsed && (
                  <span className="whitespace-nowrap tracking-wide">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* NÚT ĐĂNG XUẤT */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            title={isCollapsed ? "Đăng xuất" : ""}
            className={`flex items-center p-3 w-full rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold group ${isCollapsed ? 'justify-center' : 'gap-4'}`}
          >
            <LogOut size={22} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span className="whitespace-nowrap">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* 3. KHU VỰC NỘI DUNG CHÍNH                  */}
      {/* ========================================== */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full transition-all duration-300 relative">
        {/* Nền trang trí siêu nhẹ */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent -z-10 pointer-events-none"></div>
        
        {/* Khung chứa Outlet */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;