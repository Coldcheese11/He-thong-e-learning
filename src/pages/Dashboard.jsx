import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, BookOpen, User, LogOut, FileText, Globe, ChevronDown, Home, Users, FolderHeart, GraduationCap, BellRing } from 'lucide-react';
import { supabase } from '../supabaseClient';

// ==========================================
// COMPONENT POPUP: LẤY THÔNG TIN KHÁCH (GUEST)
// ==========================================
function GuestInfoModal({ roomCode, onClose, navigate }) {
  const [guestInfo, setGuestInfo] = useState({ name: '', classStr: '', email: '' });

  const handleStartExam = () => {
    if (!guestInfo.name || !guestInfo.classStr) {
      alert("⚠️ Vui lòng điền Họ Tên và Lớp để giáo viên ghi nhận điểm nhé!");
      return;
    }

    // 🔥 BÍ KÍP TRỊ TRẮNG TRANG: Tạo một Profile Khách Ảo lưu vào Session
    const guestProfile = {
      id: `guest_${Date.now()}`, // Tạo ID ảo độc nhất
      name: guestInfo.name,
      class: guestInfo.classStr,
      email: guestInfo.email || 'Không cung cấp',
      isGuest: true
    };
    
    // Lưu vào bộ nhớ tạm của trình duyệt
    sessionStorage.setItem('current_guest', JSON.stringify(guestProfile));

    // Điều hướng vào phòng thi
    navigate(`/quiz/${roomCode}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-full transition-all">✖</button>
        
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-black text-center text-gray-800 mb-2">Thông tin thí sinh</h2>
        <p className="text-sm text-center text-gray-500 mb-6 border-b pb-6">Vui lòng điền thông tin để giáo viên ghi nhận kết quả cho mã đề <strong className="text-blue-600 uppercase">{roomCode}</strong></p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên *</label>
            <input type="text" required
              onChange={e => setGuestInfo({...guestInfo, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
              placeholder="VD: Nguyễn Văn A" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Lớp học *</label>
            <input type="text" required
              onChange={e => setGuestInfo({...guestInfo, classStr: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all uppercase" 
              placeholder="VD: 12A1" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email (Tùy chọn)</label>
            <input type="email" 
              onChange={e => setGuestInfo({...guestInfo, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
              placeholder="Dùng để nhận kết quả thi" />
          </div>
          
          <button onClick={handleStartExam} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all mt-4">
            BẮT ĐẦU THI NGAY
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// COMPONENT CHÍNH: DASHBOARD
// ==========================================
export default function Dashboard() {
  const navigate = useNavigate();
  const [isGuest, setIsGuest] = useState(true); // 🔥 STATE MỚI: Kiểm tra xem có phải khách không
  const [showGuestModal, setShowGuestModal] = useState(false); // 🔥 STATE MỚI: Ẩn/hiện popup

  const [examCode, setExamCode] = useState('');
  const [history, setHistory] = useState([]);
  const [userName, setUserName] = useState('Học sinh');
  
  const [subjects, setSubjects] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [activeSubject, setActiveSubject] = useState('all');
  const [classCode, setClassCode] = useState('');

  const [assignedExams, setAssignedExams] = useState([]);
  const [myJoinedClasses, setMyJoinedClasses] = useState([]);

  useEffect(() => {
    const studentId = localStorage.getItem('user_id');
    
    // NẾU LÀ KHÁCH (CHƯA ĐĂNG NHẬP) -> DỪNG LẠI KHÔNG FETCH DATA GÌ CẢ
    if (!studentId) {
      setIsGuest(true);
      return;
    }

    // NẾU ĐÃ ĐĂNG NHẬP -> TẢI DATA BÌNH THƯỜNG
    setIsGuest(false);
    const storedName = localStorage.getItem('user_name');
    if (storedName) setUserName(storedName);

    fetchHistory();
    fetchPublicData();
    fetchAssignedExams();
  }, []);

  const fetchHistory = async () => { /* Giữ nguyên code cũ */
    const studentId = localStorage.getItem('user_id');
    if (!studentId) return;
    const { data } = await supabase.from('student_attempts').select('id, total_score, end_time, exams ( title )').eq('student_id', studentId).order('end_time', { ascending: false });
    if (data) setHistory(data);
  };

  const fetchPublicData = async () => { /* Giữ nguyên code cũ */
    const { data: subData } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
    if (subData) setSubjects(subData);
    const { data: examData } = await supabase.from('exams').select('*, subjects(name)').eq('is_public', true).limit(10);
    if (examData) setPublicExams(examData);
  };

  const fetchAssignedExams = async () => { /* Giữ nguyên code cũ */
    const studentId = localStorage.getItem('user_id');
    if (!studentId) return;
    try {
      const { data: myClasses } = await supabase.from('class_members').select('class_id, classes(id, name, invite_code)').eq('student_id', studentId);
      if (!myClasses || myClasses.length === 0) return;
      setMyJoinedClasses(myClasses.map(c => c.classes));
      const classIds = myClasses.map(c => c.class_id);

      const { data: attemptedExams } = await supabase.from('student_attempts').select('exam_id').eq('student_id', studentId);
      const attemptedIds = attemptedExams?.map(a => a.exam_id) || [];

      const { data: assignments } = await supabase.from('exam_assignments').select('*, exams(*, subjects(name)), classes(name)').in('class_id', classIds).order('assigned_at', { ascending: false });
      if (assignments) {
        const todoExams = assignments.filter(assign => !attemptedIds.includes(assign.exam_id));
        setAssignedExams(todoExams);
      }
    } catch (error) { console.error(error); }
  };

  const handleJoinExam = (e) => {
    e.preventDefault();
    if (!examCode.trim()) return alert("Vui lòng nhập mã đề thi!");
    
    if (isGuest) {
      // NẾU LÀ KHÁCH -> MỞ BẢNG HỎI TÊN, LỚP
      setShowGuestModal(true);
    } else {
      // NẾU ĐÃ ĐĂNG NHẬP -> VÀO THẲNG PHÒNG THI
      navigate(`/quiz/${examCode.trim()}`);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setIsGuest(true); // Đăng xuất xong biến thành Khách luôn
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJoinClass = async (e) => { /* Giữ nguyên code cũ */
    e.preventDefault();
    const studentId = localStorage.getItem('user_id');
    if (!classCode.trim()) return;
    try {
      const { data: classData, error: classError } = await supabase.from('classes').select('id, name').eq('invite_code', classCode.trim().toUpperCase()).single();
      if (classError || !classData) throw new Error("Mã lớp không tồn tại!");
      const { error: joinError } = await supabase.from('class_members').insert([{ class_id: classData.id, student_id: studentId }]);
      if (joinError) {
        if (joinError.code === '23505') throw new Error("Bạn đã ở trong lớp này rồi!");
        throw joinError;
      }
      alert(`🎉 Chúc mừng! Bạn đã tham gia lớp: ${classData.name}`);
      setClassCode('');
      fetchAssignedExams();
    } catch (error) { alert("❌ " + error.message); }
  };


  // ==========================================
  // VIEW 1: DÀNH CHO KHÁCH (CHƯA ĐĂNG NHẬP)
  // ==========================================
  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative">
        {/* Navbar Siêu Nhỏ Cho Khách */}
        <nav className="absolute top-0 w-full px-6 py-4 flex justify-between items-center z-10">
          <div className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-xl tracking-tight shadow-md">
            HệThốngThi
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-blue-600 px-5 py-2 rounded-xl font-bold shadow-sm hover:shadow-md border border-gray-100 transition-all"
          >
            Đăng Nhập / Đăng Ký
          </button>
        </nav>

        {/* Khung nhập mã thi ở giữa màn hình */}
        <div className="w-full max-w-3xl px-4">
          <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] shadow-2xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Kiểm tra năng lực của bạn</h1>
              <p className="text-blue-100 mb-10 max-w-xl mx-auto text-lg">Nhập mã đề thi do giáo viên cung cấp vào ô bên dưới để bắt đầu làm bài kiểm tra ngay lập tức.</p>
              
              <form onSubmit={handleJoinExam} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-2xl shadow-2xl">
                <input 
                  type="text" 
                  placeholder="Nhập mã đề thi (VD: 123456...)"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                  className="flex-1 px-6 py-4 rounded-xl text-gray-800 focus:outline-none font-mono text-lg placeholder-gray-400 uppercase tracking-widest text-center sm:text-left bg-transparent"
                />
                <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md transition-all">
                  <Play fill="currentColor" size={20} /> VÀO THI
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* Modal nhập thông tin Khách */}
        {showGuestModal && (
          <GuestInfoModal 
            roomCode={examCode.trim()} 
            onClose={() => setShowGuestModal(false)} 
            navigate={navigate}
          />
        )}
      </div>
    );
  }


  // ==========================================
  // VIEW 2: DÀNH CHO HỌC SINH ĐÃ ĐĂNG NHẬP (CODE CŨ)
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-2xl tracking-tight shadow-md">
              HệThốngThi
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
            <button onClick={() => window.scrollTo(0, 0)} className="hover:text-blue-600 flex items-center gap-2 transition-colors">
              <Home size={18} /> Trang Chủ
            </button>
            <button onClick={() => scrollToSection('my-classes-section')} className="hover:text-blue-600 flex items-center gap-2 transition-colors">
              <GraduationCap size={18} /> Lớp của tôi
            </button>
            <div className="relative group">
              <button className="hover:text-blue-600 flex items-center gap-1 transition-colors py-8">
                <BookOpen size={18} /> Đề Thi <ChevronDown size={16} className="group-hover:rotate-180 transition-transform duration-300" />
              </button>
              <div className="absolute top-[80px] left-0 w-64 bg-white shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100 overflow-hidden transform origin-top group-hover:scale-100 scale-95 z-50">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
                  Danh mục môn học
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  <button 
                    onClick={() => { setActiveSubject('all'); scrollToSection('community-section'); }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    Tất cả các môn
                  </button>
                  {subjects.map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { setActiveSubject(sub.id); scrollToSection('community-section'); }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => scrollToSection('community-section')} className="hover:text-blue-600 flex items-center gap-2 transition-colors">
              <Users size={18} /> Cộng Đồng
            </button>
            <button onClick={() => scrollToSection('history-section')} className="hover:text-blue-600 flex items-center gap-2 transition-colors">
              <FolderHeart size={18} /> Lịch Sử
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-bold hidden sm:block bg-gray-100 px-4 py-2 rounded-full">
              {userName}
            </span>
            <div 
              onClick={() => navigate('/profile')}
              className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm cursor-pointer hover:bg-blue-200 hover:scale-105 transition-all"
              title="Cài đặt cá nhân"
            >
              <User size={20} />
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Đăng xuất">
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-10 mt-4">
        
        {/* VÙNG 1: TÌM KIẾM MÃ THI RIÊNG */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] shadow-xl p-10 md:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Kiểm tra năng lực của bạn</h1>
            <p className="text-blue-100 mb-10 max-w-2xl mx-auto text-lg">Nhập mã đề thi do giáo viên cung cấp vào ô bên dưới để bắt đầu làm bài kiểm tra bảo mật.</p>
            
            <form onSubmit={handleJoinExam} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-2xl shadow-2xl">
              <input 
                type="text" 
                placeholder="Nhập mã đề thi (VD: 123e4567...)"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                className="flex-1 px-6 py-4 rounded-xl text-gray-800 focus:outline-none font-mono text-lg placeholder-gray-400 bg-transparent uppercase"
              />
              <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md transition-all">
                <Play fill="currentColor" size={20} /> VÀO THI
              </button>
            </form>
          </div>
        </section>

        {/* KHU VỰC: DANH SÁCH LỚP HỌC ĐÃ THAM GIA */}
        <section id="my-classes-section" className="scroll-mt-24 pt-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
            <Users className="text-blue-600" /> Không gian Lớp học của tôi
          </h2>
          
          {myJoinedClasses.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
              Bạn chưa tham gia lớp học nào. Hãy nhập mã mời ở bên dưới nhé!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {myJoinedClasses.map(cls => (
                <div 
                  key={cls.id} 
                  onClick={() => navigate(`/classroom/${cls.id}`)}
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] shadow-lg text-white cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-150 transition-transform">
                    <GraduationCap size={120} />
                  </div>
                  <h3 className="text-2xl font-black mb-2 relative z-10">{cls.name}</h3>
                  <p className="text-blue-100 font-medium relative z-10">Mã lớp: {cls.invite_code}</p>
                  <div className="mt-6 inline-flex bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm relative z-10 font-bold">
                    Vào không gian lớp ➔
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI (RỘNG HƠN): BÀI TẬP ĐƯỢC GIAO TỪ LỚP */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BellRing className="text-orange-500" /> Bài tập từ Lớp của tôi
            </h2>
            
            {assignedExams.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm text-center text-gray-500">
                <GraduationCap className="mx-auto text-gray-300 mb-4" size={48} />
                <p>Tuyệt vời! Bạn đã hoàn thành hết bài tập hoặc chưa có bài mới.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* ĐÂY LÀ NƠI LOGIC 3 HOẠT ĐỘNG */}
                {assignedExams.map(assign => {
                  // 1. Kiểm tra xem bài có bị quá hạn chưa (nếu có deadline)
                  const isExpired = assign.deadline && new Date(assign.deadline) < new Date();
                  if (isExpired) return null; // Quá hạn -> Ẩn luôn không cho làm nữa

                  // 2. Kiểm tra xem bài này có phải mới giao trong 24h qua không
                  const isNew = new Date() - new Date(assign.assigned_at) < 86400000;

                  return (
                    <div key={assign.id} className="relative bg-white p-5 rounded-2xl border-l-4 border-l-orange-500 border-y border-r border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      {/* BONG BÓNG "MỚI" CHỚP ĐỎ */}
                      {isNew && (
                        <span className="absolute -top-3 -left-3 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-xl animate-bounce shadow-md border-2 border-white z-10">
                          MỚI
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Lớp: {assign.classes?.name}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12}/> Giao ngày: {new Date(assign.assigned_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{assign.exams?.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{assign.exams?.duration} phút • {assign.exams?.total_questions} câu • Môn: {assign.exams?.subjects?.name || 'Chung'}</p>
                      </div>
                      
                      <button 
                        onClick={() => navigate(`/quiz/${assign.exam_id}`)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors w-full sm:w-auto text-center"
                      >
                        Làm bài
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* CỘT PHẢI: WIDGET VÀO LỚP */}
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm sticky top-24">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="font-bold text-gray-800 text-xl mb-2">Tham gia lớp học mới</h3>
              <p className="text-sm text-gray-500 mb-6">Nhập mã mời từ giáo viên (6 ký tự) để tự động nhận bài tập được giao.</p>
              
              <form onSubmit={handleJoinClass} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Nhập mã lớp..."
                  value={classCode}
                  onChange={e => setClassCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase text-center tracking-widest text-lg"
                  maxLength={6}
                />
                <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-all">
                  Vào Lớp Ngay
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* VÙNG 2: KHO ĐỀ CÔNG ĐỒNG */}
        <section id="community-section" className="scroll-mt-24 pt-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                <Globe className="text-green-500" size={32} /> Khám phá Kho Đề Tự Do
              </h2>
              <p className="text-gray-500 mt-2 text-lg">Luyện tập hoàn toàn miễn phí với các đề thi được chia sẻ từ cộng đồng</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicExams.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-gray-100 text-gray-500">
                Đang tải dữ liệu hoặc chưa có đề thi nào được chia sẻ...
              </div>
            ) : (
              publicExams
                .filter(exam => activeSubject === 'all' || exam.subject_id === activeSubject)
                .map(exam => (
                <div key={exam.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col h-full cursor-pointer" onClick={() => navigate(`/quiz/${exam.id}`)}>
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-green-400 to-green-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-bl-2xl shadow-sm z-10">Miễn phí</div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{exam.subjects?.name || 'Chưa phân loại'}</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">{exam.title}</h3>
                  <div className="text-sm text-gray-500 space-y-2 mb-8 flex-1">
                    <p className="flex justify-between border-b border-gray-50 pb-2">Khối lớp: <span className="font-bold text-gray-700">{exam.grade || 'Chung'}</span></p>
                    <p className="flex justify-between border-b border-gray-50 pb-2">Thời gian: <span className="font-bold text-gray-700">{exam.duration} phút</span></p>
                    <p className="flex justify-between">Số lượng: <span className="font-bold text-gray-700">{exam.total_questions} câu</span></p>
                  </div>
                  <button className="w-full py-4 bg-gray-50 text-gray-700 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                    Bắt đầu làm bài <Play size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* VÙNG 3: LỊCH SỬ LÀM BÀI */}
        <section id="history-section" className="border-t-2 border-dashed border-gray-200 pt-16 scroll-mt-24">
          <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
            <Clock className="text-blue-600" size={32} /> Lịch sử học tập
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
              <FileText className="mx-auto text-gray-300 mb-4" size={56} />
              <p className="text-gray-500 font-medium text-lg">Bạn chưa thực hiện bài thi nào. Hãy thử sức ngay!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl"><FileText size={28} /></div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{item.exams?.title || 'Đề thi đã bị xóa'}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{formatDate(item.end_time)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                    <span className="block text-3xl font-black text-green-600">{item.total_score}</span>
                    <span className="text-xs text-gray-500 font-bold tracking-widest uppercase">Điểm</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}