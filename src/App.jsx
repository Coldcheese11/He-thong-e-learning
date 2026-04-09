import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'katex/dist/katex.min.css';
// Import trang Super Admin & Profile
import SuperAdmin from './pages/SuperAdmin';
import Profile from './pages/Profile';

// Import các trang của Học viên
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import Result from './pages/Result';

// Import các trang của Giáo viên
import Admin from './pages/Admin'; 
import AdminExams from './pages/AdminExams'; 
import SmartUpload from './pages/SmartUpload';
import AdminScoreBoard from './pages/AdminScoreBoard';
import AdminLibrary from './pages/AdminLibrary';
import AdminClasses from './pages/AdminClasses';
import Classroom from './pages/Classroom';

// Import Layout chung cho khu vực Giáo viên
import AdminLayout from './layouts/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- KHU VỰC DÙNG CHUNG CHO MỌI NGƯỜI --- */}
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quiz/:id" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/classroom/:id" element={<Classroom />} />
        {/* ĐÂY CHÍNH LÀ NƠI ĐẶT PROFILE CHUẨN XÁC: NẰM NGOÀI ADMIN */}
        <Route path="/profile" element={<Profile />} />
        
        {/* --- KHU VỰC QUYỀN LỰC NHẤT (SUPER ADMIN) --- */}
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* --- KHU VỰC CỦA GIÁO VIÊN (Được bọc bởi AdminLayout) --- */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Admin />} />
          <Route path="exams" element={<AdminExams />} /> 
          <Route path="smart-upload" element={<SmartUpload />} />
          <Route path="scores" element={<AdminScoreBoard />} />
          <Route path="library" element={<AdminLibrary />} />
          <Route path="classes" element={<AdminClasses />} />
          
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;