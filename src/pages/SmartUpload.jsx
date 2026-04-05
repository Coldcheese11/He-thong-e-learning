import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, Save, Globe, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SmartUpload = () => {
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [fileType, setFileType] = useState(''); 
  const [status, setStatus] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // STATE XÁO ĐỀ
  const [isShuffleQuestions, setIsShuffleQuestions] = useState(false);
  const [isShuffleOptions, setIsShuffleOptions] = useState(false);

  // STATE MỚI: DANH MỤC & CỘNG ĐỒNG
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const fileInputRef = useRef(null);

  // Lấy danh sách Môn học từ Database
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    setStatus(`Đã tải lên: ${file.name}`);

    if (fileName.endsWith('.pdf')) {
      setFileType('pdf');
      setParsedQuestions([]); 
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.tex')) {
      setFileType(fileName.endsWith('.docx') ? 'docx' : 'tex');
      setParsedQuestions([
        { id: 1, content: 'Đâu là thủ đô của Việt Nam?', opt_a: 'Hồ Chí Minh', opt_b: 'Hà Nội', opt_c: 'Đà Nẵng', opt_d: 'Huế', correct_opt: 'B' },
        { id: 2, content: '1 + 1 bằng mấy?', opt_a: '1', opt_b: '2', opt_c: '3', opt_d: '4', correct_opt: 'B' }
      ]);
    } else {
      alert("Định dạng file không hỗ trợ!");
    }
  };

  const changeCorrectOpt = (index, opt) => {
    const newQuestions = [...parsedQuestions];
    newQuestions[index].correct_opt = opt;
    setParsedQuestions(newQuestions);
  };

  const handleSaveToDatabase = async () => {
    if (!examTitle.trim()) {
      alert("Vui lòng nhập tên bài thi trước khi lưu!");
      return;
    }
    if (!selectedSubject) {
      alert("Vui lòng chọn Môn học cho đề thi này!");
      return;
    }

    setIsSaving(true);

    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert([{
          title: examTitle,
          duration: parseInt(duration),
          status: 'published',
          total_questions: fileType === 'pdf' ? 50 : parsedQuestions.length,
          grade: 'Khối 10',
          pdf_url: fileType === 'pdf' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : null,
          is_shuffle_questions: isShuffleQuestions,
          is_shuffle_options: isShuffleOptions,
          
          // Bơm thêm dữ liệu Môn học và Trạng thái chia sẻ
          subject_id: selectedSubject,
          is_public: isPublic
        }])
        .select(); 

      if (examError) throw examError;
      const newExamId = examData[0].id;

      if ((fileType === 'docx' || fileType === 'tex') && parsedQuestions.length > 0) {
        const questionsToInsert = parsedQuestions.map(q => ({
          content: q.content,
          opt_a: q.opt_a,
          opt_b: q.opt_b,
          opt_c: q.opt_c,
          opt_d: q.opt_d,
          correct_opt: q.correct_opt,
          level: 'Trung bình',
          subject_id: selectedSubject // Gắn môn học cho câu hỏi để đưa vào Ngân hàng
        }));

        const { data: qData, error: qError } = await supabase
          .from('question_bank')
          .insert(questionsToInsert)
          .select();

        if (qError) throw qError;

        const examQuestions = qData.map((dbQuestion, index) => ({
          exam_id: newExamId,
          question_id: dbQuestion.id,
          question_order: index + 1
        }));

        const { error: eqError } = await supabase.from('exam_questions').insert(examQuestions);
        if (eqError) throw eqError;
      }

      alert(`Đã lưu đề thi và CÂU HỎI thành công! Mã đề: ${newExamId}`);
      navigate('/admin/exams');

    } catch (error) {
      console.error("Lỗi khi lưu đề thi:", error);
      alert("❌ Có lỗi xảy ra: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tải lên đề thi thông minh</h2>
        <p className="text-gray-600 mt-1">Hệ thống sẽ tự động nhận diện và bóc tách câu hỏi từ file của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CỘT TRÁI: KHU VỰC UPLOAD */}
        <div 
          onClick={() => fileInputRef.current.click()}
          className="md:col-span-2 bg-white border-2 border-dashed border-blue-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors cursor-pointer min-h-[300px] h-full"
        >
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nhấn hoặc kéo thả file vào đây</h3>
          <p className="text-sm text-gray-500 mb-4">
            {status ? <span className="text-blue-600 font-medium">{status}</span> : "hoặc"}
          </p>
          
          <input 
            type="file" 
            accept=".pdf, .docx, .tex" 
            onChange={handleFileUpload} 
            ref={fileInputRef}
            className="hidden" 
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Chọn file từ máy tính
          </button>
          
          <p className="text-xs text-gray-400 mt-4">Hỗ trợ 3 định dạng: <b>PDF</b> (Nhập đáp án tay) | <b>Word & LaTeX</b> (Tự động nhận diện)</p>
        </div>

        {/* CỘT PHẢI: FORM CÀI ĐẶT */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Cài đặt bài thi</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên bài thi *</label>
              <input 
                type="text" 
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Kiểm tra 15p Toán 10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Môn học *</label>
                <select 
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn --</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="45"
                />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isShuffleQuestions} 
                  onChange={e => setIsShuffleQuestions(e.target.checked)} 
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                />
                <span className="text-sm font-medium text-gray-700">Xáo trộn câu hỏi</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isShuffleOptions} 
                  onChange={e => setIsShuffleOptions(e.target.checked)} 
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                />
                <span className="text-sm font-medium text-gray-700">Xáo trộn đáp án (A,B,C,D)</span>
              </label>
            </div>

            {/* NÚT GẠT CÔNG KHAI / RIÊNG TƯ */}
            <div className={`mt-2 p-3 rounded-lg border transition-all ${isPublic ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={e => setIsPublic(e.target.checked)} 
                  className="w-5 h-5 mt-0.5 text-green-600 rounded focus:ring-green-500" 
                />
                <div>
                  <span className={`text-sm font-bold flex items-center gap-1.5 ${isPublic ? 'text-green-700' : 'text-gray-700'}`}>
                    {isPublic ? <Globe size={14}/> : <Lock size={14}/>} 
                    {isPublic ? 'Chia sẻ lên Cộng đồng' : 'Đề thi Riêng tư'}
                  </span>
                  <span className="text-xs text-gray-500 block mt-1">
                    {isPublic ? 'Hiển thị trên Trang chủ học sinh.' : 'Chỉ truy cập bằng Mã đề.'}
                  </span>
                </div>
              </label>
            </div>

          </div>
        </div>
      </div>

      {fileType === 'pdf' && (
        <div className="mb-8 rounded-xl border border-blue-200 bg-white p-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Nhập chuỗi đáp án cho file PDF</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">Ví dụ: 1A 2B 3C 4D 5A...</p>
          <textarea 
            rows="4" 
            className="w-full rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
            placeholder="Nhập đáp án vào đây..." 
            value={answerKey} 
            onChange={e => setAnswerKey(e.target.value)}
          />
        </div>
      )}

      {(fileType === 'docx' || fileType === 'tex') && parsedQuestions.length > 0 && (
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 animate-fade-in border border-gray-100">
          <h2 className="mb-4 text-xl font-bold text-gray-800 border-b pb-3">Bản Xem Trước Câu Hỏi (Review)</h2>
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
            {parsedQuestions.map((q, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-5 bg-gray-50 hover:border-blue-300 transition-colors">
                <p className="font-bold text-gray-800 mb-3 text-lg">Câu {q.id}: {q.content}</p>
                <div className="grid grid-cols-2 gap-3 text-md text-gray-700 mb-4">
                  <div className="bg-white p-2 rounded border">A. {q.opt_a}</div> 
                  <div className="bg-white p-2 rounded border">B. {q.opt_b}</div>
                  <div className="bg-white p-2 rounded border">C. {q.opt_c}</div> 
                  <div className="bg-white p-2 rounded border">D. {q.opt_d}</div>
                </div>
                <div className="flex items-center space-x-4 pt-3 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">Chọn đáp án đúng:</span>
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <button 
                        key={opt} 
                        onClick={() => changeCorrectOpt(index, opt)} 
                        className={`w-10 h-10 rounded-lg font-bold transition-all shadow-sm ${
                          q.correct_opt === opt 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1' 
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fileType && (
        <div className="flex justify-end">
          <button 
            onClick={handleSaveToDatabase} 
            disabled={isSaving} 
            className="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-70"
          >
            {isSaving ? (
              'Đang đẩy lên Supabase...'
            ) : (
              <>
                <Save size={24} /> Lưu Đề Thi Này Lên Hệ Thống
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};

export default SmartUpload;