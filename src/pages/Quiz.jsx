import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SafeLatex from './SafeLatex';
import { ChevronUp, ChevronDown, Clock, AlertTriangle, CheckCircle, Send, Layout, BookOpen } from 'lucide-react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// =========================================================================
// HÀM XÁO TRỘN MẢNG
// =========================================================================
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// =========================================================================
// COMPONENT PHỤ XỬ LÝ NHẬP LIỆU (FIXED FOR IPHONE)
// =========================================================================
const QuestionInput = ({ q, index, answers, handleSelect, isFullMode }) => {
  const type = q?.question_bank?.question_type;
  const data = q?.question_bank;

  if (type === 'fill_blank') {
    return (
      <input 
        type="text"
        value={answers[index + 1] || ''}
        onChange={(e) => handleSelect(index + 1, e.target.value)}
        placeholder="Nhập câu trả lời..."
        className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 font-bold text-purple-700 text-lg bg-purple-50 shadow-inner"
      />
    );
  }

  if (type === 'true_false') {
    return (
      <div className={`space-y-3 w-full ${isFullMode ? 'max-w-full' : ''}`}>
        {['A', 'B', 'C', 'D'].map((label, i) => (
          <div key={label} className={`flex ${isFullMode ? 'flex-col lg:flex-row lg:items-center' : 'items-center'} justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4`}>
            <div className="flex-1 text-base text-gray-800 flex items-start overflow-x-auto custom-scrollbar">
              <span className="font-bold text-blue-700 mr-3 text-lg shrink-0 mt-[-2px]">{label}.</span>
              {/* FIX TẠI ĐÂY: Thay span bằng SafeLatex */}
              {isFullMode && <div className="flex-1"><SafeLatex>{data?.[`opt_${label.toLowerCase()}`]}</SafeLatex></div>}
            </div>
            <div className="flex gap-2 shrink-0">
              {['T', 'F'].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    const currentArr = (answers[index + 1] || "?,?,?,?").split(',');
                    currentArr[i] = val;
                    handleSelect(index + 1, currentArr.join(','));
                  }}
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    answers[index + 1]?.split(',')[i] === val 
                    ? 'bg-indigo-600 text-white shadow-md scale-105' 
                    : 'bg-white border-2 border-gray-200 text-gray-500'
                  }`}
                >
                  {val === 'T' ? 'Đúng' : 'Sai'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${isFullMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-4 sm:flex sm:space-x-3'}`}>
      {['A', 'B', 'C', 'D'].map((opt) => (
        <button
          key={opt}
          onClick={() => handleSelect(index + 1, opt)}
          className={`flex transition-all border-2 ${
            isFullMode ? 'items-start p-4 rounded-2xl text-left' : 'items-center h-12 w-full sm:w-12 rounded-xl justify-center'
          } ${
            answers[index + 1] === opt 
            ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-105' 
            : 'border-gray-200 text-gray-600 bg-white hover:bg-blue-50'
          }`}
        >
          <span className={`${isFullMode ? 'shrink-0 mt-0.5 mr-4 bg-gray-100 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black' : 'font-bold'}`}>
            {opt}
          </span>
          
          {/* FIX TẠI ĐÂY: Thay span bằng SafeLatex cho nội dung đáp án */}
          {isFullMode && (
            <div className="flex-1 overflow-x-auto custom-scrollbar font-medium">
              <SafeLatex>{data?.[`opt_${opt.toLowerCase()}`]}</SafeLatex>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false); 
  const [violations, setViolations] = useState(0);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

 useEffect(() => {
    const loadData = async () => {
      try {
        // 🔥 1. CẬP NHẬT LẠI CÁCH LẤY ID NGƯỜI THI
        const realUserId = localStorage.getItem('user_id');
        const guestData = JSON.parse(sessionStorage.getItem('current_guest'));
        
        // Ưu tiên User thật, nếu không có thì lấy ID của Khách (guest_...)
        const studentId = realUserId || (guestData ? guestData.id : null);

        // Nếu không có cả 2 (nghĩa là ai đó cố tình gõ link lén vào phòng thi) thì mới đuổi ra
        if (!studentId) { navigate('/login'); return; }

        // 2. Kiểm tra xem người này đã thi chưa
        const { data: existingAttempt } = await supabase
          .from('student_attempts')
          .select('*')
          .eq('exam_id', id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (existingAttempt) {
          navigate('/result', { state: { score: existingAttempt.total_score, isReview: true } });
          return;
        }

        const { data: exData, error: exError } = await supabase.from('exams').select('*').eq('id', id).single();
        if (exError) throw exError;
        setExam(exData);
        setTimeLeft(exData.duration * 60);

        const { data: qData, error: qError } = await supabase
          .from('exam_questions')
          .select('question_id, question_bank(*)')
          .eq('exam_id', id)
          .order('question_order', { ascending: true });

        if (qError) throw qError;

        let finalQuestions = qData || [];

        // PDF Mode Fallback
        if (finalQuestions.length === 0 && exData.total_questions > 0) {
          finalQuestions = Array.from({ length: exData.total_questions }).map((_, i) => ({
            question_id: `pdf-q-${i}`,
            question_bank: { id: `pdf-q-${i}`, content: `Câu hỏi PDF`, correct_opt: 'A', question_type: 'multiple_choice' }
          }));
        }

        if (exData.is_shuffle_questions) finalQuestions = shuffleArray(finalQuestions);

        setQuestions(finalQuestions);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  useEffect(() => {
    if (!isStarted) return; 
    const handleCheating = () => {
      if (document.hidden) {
        setViolations(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) { handleSubmit(true); }
          return newCount;
        });
      }
    };
    document.addEventListener("visibilitychange", handleCheating);
    return () => document.removeEventListener("visibilitychange", handleCheating);
  }, [isStarted]);

  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isStarted]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelect = (qIndex, option) => {
    setAnswers({ ...answers, [qIndex]: option });
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && !window.confirm("Xác nhận nộp bài?")) return;
    setLoading(true);
    
    // 🔥 CẬP NHẬT TẠI ĐÂY: Lấy ID thật hoặc ID Khách ảo để lưu điểm
    const realUserId = localStorage.getItem('user_id'); 
    const guestData = JSON.parse(sessionStorage.getItem('current_guest'));
    const studentId = realUserId || (guestData ? guestData.id : null);

    let correctCount = 0;
    questions.forEach((q, index) => {
      if (answers[index + 1] === q.question_bank.correct_opt) correctCount++;
    });
    const finalScore = parseFloat(((correctCount / questions.length) * 10).toFixed(2));

    try {
      await supabase.from('student_attempts').insert([{
        exam_id: id, 
        student_id: studentId, // Đã dùng ID mới ở đây
        status: 'submitted', 
        total_score: finalScore,
        answers_json: { studentAnswers: answers }
      }]);
      // Khi chuyển sang trang kết quả, bạn có thể truyền thêm tên của người thi (guestData?.name) nếu cần
      navigate('/result', { state: { score: finalScore, correct: correctCount, total: questions.length, questions, studentAnswers: answers, examTitle: exam?.title } });
    } catch (error) { 
      console.error("Lỗi khi nộp bài:", error);
      setLoading(false); 
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Đang tải dữ liệu phòng thi...</div>;

  if (!isStarted) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="mb-6 text-2xl font-black">NỘI QUY PHÒNG THI</h1>
          <button onClick={() => setIsStarted(true)} className="w-full rounded-2xl bg-blue-600 py-5 text-xl font-bold text-white shadow-xl">TÔI ĐÃ RÕ - BẮT ĐẦU</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] w-full flex-col bg-gray-50 relative">
      <header className="flex items-center justify-between bg-white px-4 md:px-8 py-3 shadow-sm border-b z-30 shrink-0">
        <h2 className="text-base md:text-xl font-black truncate max-w-[150px] md:max-w-none">{exam?.title}</h2>
        <div className="flex items-center space-x-3 md:space-x-6">
          <div className="text-lg font-mono font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
            {formatTime(timeLeft)}
          </div>
          <button onClick={() => handleSubmit(false)} className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white shadow-lg">NỘP BÀI</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {exam?.pdf_url && !exam.pdf_url.toLowerCase().endsWith('.tex') ? (
          <>
            <div className="w-full md:w-[65%] h-full bg-gray-100 overflow-hidden relative border-r">
              <div className="h-full w-full custom-scrollbar">
                <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js">
                  <Viewer fileUrl={exam.pdf_url} plugins={[defaultLayoutPluginInstance]} />
                </Worker>
              </div>
            </div>
            <div className={`fixed bottom-0 left-0 w-full bg-white z-40 transition-all shadow-[0_-15px_50px_rgba(0,0,0,0.2)] md:static md:w-[35%] md:h-full ${isMobileSheetOpen ? 'h-[75vh]' : 'h-14 md:h-full'}`}>
              <div className="md:hidden flex flex-col items-center py-3" onClick={() => setIsMobileSheetOpen(!isMobileSheetOpen)}>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-2"></div>
                <div className="text-[10px] font-black text-blue-600 uppercase">{isMobileSheetOpen ? 'Thu gọn' : 'Chạm để chọn đáp án'}</div>
              </div>
              <div className="p-5 md:p-8 overflow-y-auto h-[calc(100%-56px)] md:h-full custom-scrollbar">
                {questions.map((q, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 mb-4 rounded-2xl border bg-gray-50/30">
                    <span className="font-black text-gray-400 text-sm shrink-0 uppercase">Câu {index + 1}</span>
                    <QuestionInput q={q} index={index} answers={answers} handleSelect={handleSelect} isFullMode={false} />
                  </div>
                ))}
              </div>
            </div>
            {isMobileSheetOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsMobileSheetOpen(false)}></div>}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar bg-white">
            <div className="max-w-4xl mx-auto space-y-12">
              {questions.map((q, index) => (
                <div key={index} className="bg-white rounded-3xl p-6 md:p-8 border hover:border-blue-100 transition-all">
                  <div className="text-xl mb-8 leading-relaxed text-gray-800 font-medium flex flex-col md:block">
                    {/* Luôn hiển thị chữ Câu X, dùng block trên mobile để nó nằm trên 1 dòng riêng cho rõ */}
                    <span className="font-black text-blue-600 mr-2 mb-2 md:mb-0 block md:inline-block">Câu {index + 1}:</span>
                    {/* FIX TẠI ĐÂY: Thay span bằng SafeLatex cho nội dung câu hỏi đề Text */}
                    <SafeLatex>{q?.question_bank?.content}</SafeLatex>
                  </div>
                  {q?.question_bank?.image_url && <div className="mb-8 flex justify-center"><img src={q.question_bank.image_url} className="max-h-[500px] object-contain rounded-xl shadow-2xl" /></div>}
                  <div className="pt-6 border-t border-gray-50">
                    <QuestionInput q={q} index={index} answers={answers} handleSelect={handleSelect} isFullMode={true} />
                  </div>
                </div>
              ))}
              <div className="py-16 text-center">
                <button onClick={() => handleSubmit(false)} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl">NỘP BÀI VÀ XEM KẾT QUẢ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}