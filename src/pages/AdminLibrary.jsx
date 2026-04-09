import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, Globe, Search, Filter, Copy, CheckCircle, Database, FileText, Folder, FolderPlus, Trash2, MoveRight } from 'lucide-react';

export default function AdminLibrary() {
  const [activeTab, setActiveTab] = useState('my_bank'); 
  const [questions, setQuestions] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // STATE CHO TÍNH NĂNG THƯ MỤC (AZOTA STYLE)
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [clonedId, setClonedId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    fetchSubjects();
    if (activeTab === 'my_bank') {
      fetchMyQuestions();
      fetchFolders(); // Lấy danh sách thư mục
    } else {
      fetchPublicExams();
    }
    setSearchTerm('');
    setFilterSubject('all');
  }, [activeTab]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  const fetchFolders = async () => {
    const teacherId = localStorage.getItem('user_id');
    const { data } = await supabase
      .from('question_folders')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: true });
    if (data) setFolders(data);
  };

  const fetchMyQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Lỗi lấy câu hỏi:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*, subjects(name)')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPublicExams(data || []);
    } catch (error) {
      console.error("Lỗi lấy đề thi:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= CÁC HÀM XỬ LÝ MỚI (THƯ MỤC & XÓA CÂU HỎI) =================

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const teacherId = localStorage.getItem('user_id');
    
    try {
      const { data, error } = await supabase
        .from('question_folders')
        .insert([{ name: newFolderName, teacher_id: teacherId }])
        .select();
      if (error) throw error;
      
      setFolders([...folders, data[0]]);
      setNewFolderName('');
      setShowFolderInput(false);
    } catch (error) {
      alert("Lỗi tạo thư mục: " + error.message);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi kho dữ liệu? Hành động này không thể hoàn tác!")) return;
    try {
      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      if (error) throw error;
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      alert("Lỗi xóa câu hỏi: " + error.message);
    }
  };

  const handleMoveQuestion = async (questionId, folderId) => {
    try {
      const newFolderId = folderId === 'unassigned' ? null : folderId;
      const { error } = await supabase
        .from('question_bank')
        .update({ folder_id: newFolderId })
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Cập nhật lại UI lập tức
      setQuestions(questions.map(q => q.id === questionId ? { ...q, folder_id: newFolderId } : q));
    } catch (error) {
      alert("Lỗi chuyển thư mục: " + error.message);
    }
  };

  // ==============================================================================

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
          subject_id: exam.subject_id
        }])
        .select();

      if (error) throw error;
      setClonedId(exam.id);
      setTimeout(() => setClonedId(null), 3000);
    } catch (error) {
      alert("Lỗi sao chép: " + error.message);
    }
  };

  // Lọc câu hỏi (Kết hợp cả Tab, Môn học và Thư mục)
  const filteredQuestions = questions.filter(q => {
    const matchSearch = (q.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSub = filterSubject === 'all' || q.subject_id === filterSubject;
    const matchFolder = 
      selectedFolder === 'all' ? true :
      selectedFolder === 'unassigned' ? !q.folder_id :
      q.folder_id === selectedFolder;
    
    return matchSearch && matchSub && matchFolder;
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

      {/* THANH TÌM KIẾM & LỌC MÔN HỌC */}
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

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Đang tải dữ liệu thư viện...</div>
      ) : (
        <>
          {/* TAB 1: KHO CÂU HỎI CỦA TÔI (CÓ CÂY THƯ MỤC) */}
          {activeTab === 'my_bank' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* CỘT TRÁI: CÂY THƯ MỤC (AZOTA STYLE) */}
              <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm h-fit">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Folder size={18}/> Danh Mục</h3>
                  <button onClick={() => setShowFolderInput(!showFolderInput)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                    <FolderPlus size={18} />
                  </button>
                </div>

                {showFolderInput && (
                  <form onSubmit={handleCreateFolder} className="mb-4 flex gap-2">
                    <input 
                      type="text" autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      placeholder="Tên mục mới..." className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold">Lưu</button>
                  </form>
                )}

                <div className="space-y-1">
                  <button onClick={() => setSelectedFolder('all')} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedFolder === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    📁 Tất cả câu hỏi
                  </button>
                  <button onClick={() => setSelectedFolder('unassigned')} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedFolder === 'unassigned' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    📁 Chưa phân loại
                  </button>
                  <div className="my-2 border-t border-gray-100"></div>
                  {folders.map(folder => (
                    <button 
                      key={folder.id} onClick={() => setSelectedFolder(folder.id)} 
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedFolder === folder.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Folder size={14} className={selectedFolder === folder.id ? 'text-blue-500' : 'text-gray-400'}/> {folder.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* CỘT PHẢI: DANH SÁCH CÂU HỎI */}
              <div className="md:col-span-3 space-y-4">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">Thư mục này hiện chưa có câu hỏi nào.</p>
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 transition-colors relative group">
                      
                      {/* HEADER CÂU HỎI & CÁC NÚT ACTION */}
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <BookOpen size={12} /> {q.subjects?.name || 'Chưa phân loại'}
                          </span>
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{q.level || 'Độ khó: Vừa'}</span>
                          {q.folder_id && (
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Folder size={12} /> {folders.find(f => f.id === q.folder_id)?.name || 'Mục đã xóa'}
                            </span>
                          )}
                        </div>
                        
                        {/* NÚT XÓA VÀ ĐỔI THƯ MỤC */}
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Dropdown Chuyển thư mục */}
                          <div className="relative">
                            <select 
                              onChange={(e) => handleMoveQuestion(q.id, e.target.value)}
                              value={q.folder_id || 'unassigned'}
                              className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1.5 rounded-lg outline-none cursor-pointer appearance-none pr-6"
                            >
                              <option value="unassigned" disabled>-- Chuyển mục --</option>
                              <option value="unassigned">Bỏ phân loại</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                            <MoveRight size={12} className="absolute right-2 top-2.5 text-indigo-500 pointer-events-none"/>
                          </div>

                          <button onClick={() => handleDeleteQuestion(q.id)} className="bg-red-50 text-red-600 p-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Xóa câu hỏi">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <p className="font-bold text-gray-800 mb-3">{q.content}</p>
                      
                      {q.question_type === 'fill_blank' ? (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-800 font-bold">
                          Đáp án đúng: {q.correct_opt}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {['a', 'b', 'c', 'd'].map(opt => (
                            q[`opt_${opt}`] && (
                              <div key={opt} className={`p-2.5 rounded-lg border ${q.correct_opt === opt.toUpperCase() ? 'bg-green-50 border-green-300 font-bold text-green-800 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                <span className="font-bold mr-1">{opt.toUpperCase()}.</span> {q[`opt_${opt}`]}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KHO ĐỀ CỘNG ĐỒNG (Giữ nguyên) */}
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