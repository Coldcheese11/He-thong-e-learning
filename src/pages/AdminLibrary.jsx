import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, Globe, Search, Filter, Copy, CheckCircle, Database, FileText } from 'lucide-react';

export default function AdminLibrary() {
  const [activeTab, setActiveTab] = useState('my_bank'); 
  const [questions, setQuestions] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [subjects, setSubjects] = useState([]); // State chứa danh sách môn học
  
  const [loading, setLoading] = useState(false);
  const [clonedId, setClonedId] = useState(null);

  // STATE CHO TÌM KIẾM VÀ LỌC
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  // Lấy dữ liệu khi vào trang hoặc chuyển tab
  useEffect(() => {
    fetchSubjects(); // Lấy danh sách môn học 1 lần để làm bộ lọc
    if (activeTab === 'my_bank') {
      fetchMyQuestions();
    } else {
      fetchPublicExams();
    }
    // Reset bộ lọc khi chuyển tab
    setSearchTerm('');
    setFilterSubject('all');
  }, [activeTab]);

  // Lấy danh mục môn học
  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  // Lấy Kho câu hỏi (Kèm theo tên môn học)
  const fetchMyQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*, subjects(name)') // Nối bảng để lấy tên môn
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Lỗi lấy câu hỏi:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Lấy Kho đề công cộng (Chỉ lấy đề is_public = true, kèm tên môn)
  const fetchPublicExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*, subjects(name)')
        .eq('is_public', true) // Chỉ lấy đề được chia sẻ
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPublicExams(data || []);
    } catch (error) {
      console.error("Lỗi lấy đề thi cộng đồng:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneExam = async (exam) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([{
          title: exam.title + ' (Bản sao)',
          duration: exam.duration,
          status: 'draft', 
          total_questions: exam.total_questions,
          grade: exam.grade,
          subject_id: exam.subject_id // Copy luôn cả môn học
        }])
        .select();

      if (error) throw error;
      setClonedId(exam.id);
      setTimeout(() => setClonedId(null), 3000);
    } catch (error) {
      alert("Lỗi sao chép: " + error.message);
    }
  };

  // THUẬT TOÁN LỌC DỮ LIỆU ĐỘNG (Dựa trên Tab hiện tại)
  const filteredQuestions = questions.filter(q => {
    const matchSearch = (q.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSub = filterSubject === 'all' || q.subject_id === filterSubject;
    return matchSearch && matchSub;
  });

  const filteredExams = publicExams.filter(exam => {
    const matchSearch = (exam.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSub = filterSubject === 'all' || exam.subject_id === filterSubject;
    return matchSearch && matchSub;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER & TABS */}
      <div className="border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Thư Viện Dữ Liệu</h2>
        <div className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('my_bank')}
            className={`pb-4 flex items-center gap-2 font-bold text-lg border-b-4 transition-colors ${
              activeTab === 'my_bank' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database size={22} /> Ngân Hàng Của Tôi
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`pb-4 flex items-center gap-2 font-bold text-lg border-b-4 transition-colors ${
              activeTab === 'community' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe size={22} /> Kho Đề Cộng Đồng
          </button>
        </div>
      </div>

      {/* THANH TÌM KIẾM & LỌC (ĐÃ HOẠT ĐỘNG 100%) */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'my_bank' ? "Tìm theo nội dung câu hỏi..." : "Tìm tên đề thi công cộng..."}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        {/* Nút Lọc biến thành Dropdown Chọn Môn */}
        <div className="relative min-w-[200px]">
          <div className="absolute left-4 top-3.5 text-gray-400"><Filter size={20} /></div>
          <select 
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700"
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Đang tải dữ liệu thư viện...</div>
      ) : (
        <>
          {/* TAB 1: KHO CÂU HỎI CỦA TÔI */}
          {activeTab === 'my_bank' && (
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                  <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">Không tìm thấy câu hỏi nào phù hợp.</p>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        {/* HIỂN THỊ TAG MÔN HỌC */}
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <BookOpen size={12} /> {q.subjects?.name || 'Chưa phân loại'}
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{q.level || 'Độ khó: Vừa'}</span>
                      </div>
                    </div>
                    <p className="font-bold text-gray-800 mb-3">{q.content}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className={`p-2 rounded border ${q.correct_opt === 'A' ? 'bg-green-50 border-green-200 font-bold text-green-700 shadow-sm' : 'bg-gray-50'}`}>A. {q.opt_a}</div>
                      <div className={`p-2 rounded border ${q.correct_opt === 'B' ? 'bg-green-50 border-green-200 font-bold text-green-700 shadow-sm' : 'bg-gray-50'}`}>B. {q.opt_b}</div>
                      <div className={`p-2 rounded border ${q.correct_opt === 'C' ? 'bg-green-50 border-green-200 font-bold text-green-700 shadow-sm' : 'bg-gray-50'}`}>C. {q.opt_c}</div>
                      <div className={`p-2 rounded border ${q.correct_opt === 'D' ? 'bg-green-50 border-green-200 font-bold text-green-700 shadow-sm' : 'bg-gray-50'}`}>D. {q.opt_d}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: KHO ĐỀ CỘNG ĐỒNG */}
          {activeTab === 'community' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.length === 0 ? (
                 <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                   <Globe className="mx-auto text-gray-300 mb-3" size={48} />
                   <p className="text-gray-500">Chưa có đề thi nào trong mục này được chia sẻ.</p>
                 </div>
              ) : (
                filteredExams.map((exam) => (
                  <div key={exam.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Miễn phí
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className="bg-green-50 p-3 rounded-xl text-green-600">
                        <FileText size={24} />
                      </div>
                      <div>
                        {/* TAG MÔN HỌC CỦA ĐỀ THI */}
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md block w-fit mb-1">
                          {exam.subjects?.name || 'Chưa phân loại'}
                        </span>
                        <h3 className="font-bold text-gray-800 line-clamp-1">{exam.title}</h3>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-2 mb-6 flex-1 bg-gray-50 p-4 rounded-xl">
                      <p className="flex justify-between">Khối lớp: <span className="font-bold text-gray-800">{exam.grade || 'Chung'}</span></p>
                      <p className="flex justify-between">Số lượng: <span className="font-bold text-gray-800">{exam.total_questions} câu</span></p>
                      <p className="flex justify-between">Thời gian: <span className="font-bold text-gray-800">{exam.duration} phút</span></p>
                    </div>

                    <button 
                      onClick={() => handleCloneExam(exam)}
                      className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        clonedId === exam.id 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      }`}
                    >
                      {clonedId === exam.id ? (
                        <><CheckCircle size={20} /> Đã lưu vào kho cá nhân</>
                      ) : (
                        <><Copy size={20} /> Sao chép về Thư viện</>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}