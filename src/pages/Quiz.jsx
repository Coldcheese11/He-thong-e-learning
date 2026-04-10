import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SafeLatex from './SafeLatex';
import { ChevronUp, ChevronDown, Clock, AlertTriangle, CheckCircle, Send, Layout, BookOpen } from 'lucide-react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { Span } from 'katex/src/domTree.js';
import VConsole from 'vconsole';
// Khởi tạo vConsole để nó hiện nút bấm trên màn hình điện thoại
if (typeof window !== 'undefined') {
  new VConsole();
}
// =========================================================================
// HÀM XÁO TRỘN MẢNG (Thuật toán Fisher-Yates)
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
// COMPONENT PHỤ XỬ LÝ NHẬP LIỆU (ĐA DẠNG LOẠI CÂU HỎI)
// =========================================================================
const QuestionInput = ({ q, index, answers, handleSelect, isFullMode }) => {
  const type = q?.question_bank?.question_type;
  const data = q?.question_bank;

  // 1. DẠNG ĐIỀN KHUYẾT / TỰ LUẬN
  if (type === 'fill_blank') {
    return (
      <input 
        type="text"
        value={answers[index + 1] || ''}
        onChange={(e) => handleSelect(index + 1, e.target.value)}
        placeholder="Nhập câu trả lời..."
        className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 font-bold text-purple-700 text-lg bg-purple-50 shadow-inner transition-all"
      />
    );
  }

  // 2. DẠNG TRẮC NGHIỆM ĐÚNG/SAI
  if (type === 'true_false') {
    return (
      <div className={`space-y-3 w-full ${isFullMode ? 'max-w-full' : ''}`}>
        {['A', 'B', 'C', 'D'].map((label, i) => (
          <div key={label} className={`flex ${isFullMode ? 'flex-col lg:flex-row lg:items-center' : 'items-center'} justify-between bg-gray-50 p-3 px-4 rounded-xl border border-gray-200 gap-4`}>
            <div className="flex-1 text-base text-gray-800">
              <span className="font-bold text-blue-700 mr-2 text-lg">{label}.</span>
              {isFullMode && <span>{data?.[`opt_${label.toLowerCase()}`]}</span>}
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
                  className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                    answers[index + 1]?.split(',')[i] === val 
                    ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                    : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-indigo-300'
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

  // 3. DẠNG TRẮC NGHIỆM ABCD THƯỜNG
  return (
    <div className={`grid gap-3 ${isFullMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-4 sm:flex sm:space-x-3'}`}>
      {['A', 'B', 'C', 'D'].map((opt) => (
        <button
          key={opt}
          onClick={() => handleSelect(index + 1, opt)}
          className={`flex items-center font-bold transition-all border-2 ${
            isFullMode ? 'p-4 rounded-2xl text-left' : 'h-12 w-full sm:w-12 rounded-xl justify-center'
          } ${
            answers[index + 1] === opt 
            ? 'border-blue-600 bg-blue-600 text-white shadow-lg transform scale-105' 
            : 'border-gray-200 text-gray-600 bg-white hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <span className={`${isFullMode ? 'mr-4 bg-gray-100 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center' : ''}`}>
            {opt}
          </span>
          {isFullMode && <span>{data?.[`opt_${opt.toLowerCase()}`]}</span>}
        </button>
      ))}
    </div>
  );
};

// =========================================================================
// COMPONENT CHÍNH: QUIZ
// =========================================================================
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

// 1. TẢI DỮ LIỆU & KIỂM TRA CHỐNG THI LẠI
  useEffect(() => {
    const loadData = async () => {
      try {
        const studentId = localStorage.getItem('user_id');

        // BƯỚC 0: Kiểm tra nếu chưa đăng nhập (Trường hợp hay bị trên mobile)
        if (!studentId) {
          alert("Vui lòng đăng nhập lại!");
          navigate('/login');
          return;
        }

        // BƯỚC 1: Kiểm tra xem học sinh đã làm bài chưa
        const { data: existingAttempt } = await supabase
          .from('student_attempts')
          .select('*')
          .eq('exam_id', id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (existingAttempt) {
          alert("Hệ thống ghi nhận bạn đã hoàn thành bài thi này!");
          navigate('/result', { state: { score: existingAttempt.total_score, isReview: true } });
          return;
        }

        // BƯỚC 2: Lấy thông tin đề thi (exData) - ĐOẠN NÀY BẠN BỊ THIẾU
        const { data: exData, error: exError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', id)
          .single();

        if (exError) throw exError;
        setExam(exData); // Lưu vào state
        setTimeLeft(exData.duration * 60);

        // BƯỚC 3: Lấy danh sách câu hỏi (qData)
        const { data: qData, error: qError } = await supabase
          .from('exam_questions')
          .select('question_id, question_bank(*)')
          .eq('exam_id', id)
          .order('question_order', { ascending: true });

        if (qError) throw qError;

        let finalQuestions = qData || [];

        // PDF Mode Fallback
        if (finalQuestions.length === 0 && exData.total_questions > 0) {
          const pdfTypes = exData.answer_key?.types || {}; 
          finalQuestions = Array.from({ length: exData.total_questions }).map((_, i) => ({
            question_id: `pdf-q-${i}`,
            question_bank: { 
              id: `pdf-q-${i}`, 
              content: `Câu hỏi PDF`, 
              correct_opt: 'A',
              question_type: pdfTypes[i + 1] || 'multiple_choice'
            }
          }));
        }

        // Xử lý Xáo trộn câu hỏi
        if (exData.is_shuffle_questions && finalQuestions.length > 0) {
          finalQuestions = shuffleArray(finalQuestions);
        }

        // Xử lý Xáo trộn đáp án (Chỉ cho đề bóc tách Text)
        if (exData.is_shuffle_options && finalQuestions.length > 0 && !exData.pdf_url) {
          finalQuestions = finalQuestions.map(q => {
            if (!q.question_bank || !q.question_bank.opt_a) return q;
            const options = [
              { key: 'A', text: q.question_bank.opt_a },
              { key: 'B', text: q.question_bank.opt_b },
              { key: 'C', text: q.question_bank.opt_c },
              { key: 'D', text: q.question_bank.opt_d }
            ];
            const originalCorrectKey = q.question_bank.correct_opt;
            const correctText = options.find(o => o.key === originalCorrectKey)?.text;
            const shuffledOptions = shuffleArray(options);
            let newCorrectKey = originalCorrectKey;
            shuffledOptions.forEach((o, idx) => {
              const newKey = String.fromCharCode(65 + idx);
              if (o.text === correctText) newCorrectKey = newKey;
            });
            return {
              ...q,
              question_bank: {
                ...q.question_bank,
                opt_a: shuffledOptions[0].text, opt_b: shuffledOptions[1].text,
                opt_c: shuffledOptions[2].text, opt_d: shuffledOptions[3].text,
                correct_opt: newCorrectKey
              }
            };
          });
        }

        setQuestions(finalQuestions);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi:", error);
        // THÊM DÒNG NÀY ĐỂ HIỆN LỖI TRÊN MÀN HÌNH ĐIỆN THOẠI
        alert("LỖI RỒI: " + error.message); 
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // 2. GIÁM THỊ ẢO & CHEATING
  useEffect(() => {
    if (!isStarted) return; 
    const handleCheating = () => {
      if (document.hidden) {
        setViolations((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            alert("⚠️ VI PHẠM QUÁ 3 LẦN! Hệ thống tự động nộp bài.");
            handleSubmit(true); 
          } else {
            alert(`🚫 CẢNH BÁO: Rời khỏi màn hình! (Vi phạm: ${newCount}/3)`);
          }
          return newCount;
        });
      }
    };
    document.addEventListener("visibilitychange", handleCheating);
    return () => document.removeEventListener("visibilitychange", handleCheating);
  }, [isStarted]); 

  // 3. ĐẾM NGƯỢC THỜI GIAN
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

  // 4. NỘP BÀI
  const handleSubmit = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && !window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;
    setLoading(true);
    const studentId = localStorage.getItem('user_id'); 

    let correctCount = 0;
    questions.forEach((q, index) => {
      if (answers[index + 1] === q.question_bank.correct_opt) correctCount++;
    });

    const finalScore = parseFloat(((correctCount / questions.length) * 10).toFixed(2));

    try {
      await supabase.from('student_attempts').insert([{
        exam_id: id,
        student_id: studentId,
        status: 'submitted',
        total_score: finalScore,
        end_time: new Date().toISOString(),
        answers_json: { studentAnswers: answers, questionOrder: questions.map(q => q.question_bank.id) }
      }]);

      if (document.fullscreenElement) document.exitFullscreen();
      navigate('/result', { 
        state: { 
          score: finalScore, correct: correctCount, total: questions.length,
          questions, studentAnswers: answers, examTitle: exam?.title
        } 
      });
    } catch (error) {
      alert("Lỗi nộp bài: " + error.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold animate-pulse">Đang tải dữ liệu phòng thi...</div>;

  // MÀN HÌNH NỘI QUY
  if (!isStarted) {
    return (
      // Đã sửa h-screen thành min-h-[100dvh]
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl border border-red-100 text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="mb-6 text-2xl font-black text-gray-800">⚠️ NỘI QUY PHÒNG THI</h1>
          <div className="mb-8 space-y-4 text-left bg-gray-50 p-6 rounded-2xl text-gray-700 font-medium">
            <p>1. Hệ thống sẽ tự động bật <b>Toàn màn hình</b>.</p>
            <p>2. Tuyệt đối <b>KHÔNG</b> được chuyển sang Tab khác.</p>
            <p>3. Rời khỏi màn hình quá <b>3 lần</b> sẽ <b>BỊ ĐUỔI</b>.</p>
          </div>
          <button 
            onClick={() => {
              setIsStarted(true);
              // CHÚ Ý: Đã xóa lệnh requestFullscreen ở đây đi! 
              // Tuyệt đối không dùng lệnh này trực tiếp trên iOS nếu không có bẫy lỗi.
            }}
            className="w-full rounded-2xl bg-blue-600 py-5 text-xl font-bold text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            TÔI ĐÃ RÕ - BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  return (
    // SỬA TẠI ĐÂY 1: Xóa h-screen và overflow-hidden, thay bằng min-h-[100dvh] h-[100dvh] và relative
    <div className="flex min-h-[100dvh] h-[100dvh] w-full flex-col bg-gray-50 relative">
      
      {/* SỬA TẠI ĐÂY 2: Thêm shrink-0 vào cuối class của header để nó không bị ép bẹp lại */}
      <header className="flex items-center justify-between bg-white px-4 md:px-8 py-3 shadow-sm border-b z-30 shrink-0">
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${violations > 0 ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
            <h2 className="text-base md:text-xl font-black text-gray-800 truncate max-w-[150px] md:max-w-none">{exam?.title}</h2>
        </div>
        <div className="flex items-center space-x-3 md:space-x-6">
          {violations > 0 && <div className="hidden sm:block rounded-full bg-red-100 px-3 py-1 font-bold text-red-700 text-xs">Vi phạm: {violations}/3</div>}
          <div className="text-lg md:text-xl font-mono font-bold text-red-600 bg-red-50 px-3 md:px-5 py-1.5 rounded-xl border border-red-200 flex items-center gap-2">
            <Clock size={18} /> {formatTime(timeLeft)}
          </div>
          <button onClick={() => handleSubmit(false)} className="rounded-xl bg-green-600 px-4 md:px-8 py-2 md:py-3 font-bold text-white hover:bg-green-700 shadow-lg shadow-green-100 transition-all text-sm md:text-base">
            NỘP BÀI
          </button>
        </div>
      </header>

      {/* CÁC PHẦN BÊN DƯỚI GIỮ NGUYÊN HOÀN TOÀN */}
      <div className="flex flex-1 overflow-hidden relative">
        {exam?.pdf_url && !exam.pdf_url.toLowerCase().endsWith('.tex') ? (
          <>
            {/* --- BÊN TRÁI: HIỂN THỊ PDF CHUẨN AZOTA --- */}
              <div className="w-full md:w-[65%] h-full bg-gray-100 overflow-hidden relative border-r">
                <div className="h-full w-full overflow-y-auto custom-scrollbar">
                  {/* Tạm thời đang comment PDF để test */}
                  {/*
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <Viewer 
                      fileUrl={exam.pdf_url}
                      plugins={[defaultLayoutPlugin()]} 
                    />
                  </Worker>*/}
                  
                  {/* Chữ báo tạm để biết giao diện đã lên */}
                  <div className="flex items-center justify-center h-full">
                     <p className="text-gray-500 font-bold">GIAO DIỆN ĐÃ HIỂN THỊ THÀNH CÔNG (Tạm ẩn PDF)</p>
                  </div>
                </div>
              </div>
                  
            {/* PHIẾU TRẢ LỜI (BOTTOM SHEET ON MOBILE) */}
            <div className={`
              fixed bottom-0 left-0 w-full bg-white z-40 transition-all duration-500 ease-in-out shadow-[0_-15px_50px_rgba(0,0,0,0.2)]
              md:static md:w-[35%] md:h-full md:shadow-none md:translate-y-0 md:border-l
              ${isMobileSheetOpen ? 'h-[75vh] translate-y-0' : 'h-14 translate-y-0 md:h-full'}
            `}>
              {/* Thanh trượt cho Mobile */}
              <div 
                className="md:hidden flex flex-col items-center py-3 cursor-pointer bg-white rounded-t-3xl border-t border-gray-100"
                onClick={() => setIsMobileSheetOpen(!isMobileSheetOpen)}
              >
                <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-2"></div>
                <div className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
                  {isMobileSheetOpen ? <><ChevronDown size={14}/> Thu gọn phiếu</> : <><ChevronUp size={14}/> Chạm để chọn đáp án</>}
                </div>
              </div>

              <div className="p-5 md:p-8 overflow-y-auto h-[calc(100%-56px)] md:h-full custom-scrollbar">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="font-black text-gray-800 uppercase text-sm tracking-[0.2em] flex items-center gap-2">
                        <Layout size={18} className="text-blue-600" /> Phiếu trả lời
                    </h3>
                    <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        {Object.keys(answers).length} / {questions.length} câu
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-5">
                  {questions.map((q, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all group">
                      <span className="font-black text-gray-400 text-sm shrink-0 group-hover:text-blue-600 transition-colors">CÂU {index + 1}</span>
                      <div className="flex-1">
                        {/* Lưu ý: Nếu đã chuyển SafeLatex thành span thì giữ nguyên, không thì để QuestionInput */}
                        <QuestionInput q={q} index={index} answers={answers} handleSelect={handleSelect} isFullMode={false} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-10"></div>
              </div>
            </div>

            {/* Lớp phủ khi mở sheet mobile */}
            {isMobileSheetOpen && (
              <div className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileSheetOpen(false)}></div>
            )}
          </>
        ) : (
          /* LUỒNG 2: ĐỀ TEXT/WORD (DÀN TRANG HIỆN ĐẠI) */
          <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar bg-white">
            <div className="max-w-4xl mx-auto space-y-12">
              {questions.map((q, index) => (
                <div key={index} className="group relative">
                  <div className="absolute -left-12 top-0 hidden lg:flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-400 rounded-xl font-black italic group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {index + 1}
                  </div>

                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-transparent hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50 transition-all">
                    <div className="text-xl mb-8 leading-relaxed text-gray-800 font-medium">
                      <span className="lg:hidden font-black text-blue-600 mr-2 italic">Câu {index + 1}:</span>
                      <span>{q?.question_bank?.content}</span>
                    </div>

                    {q?.question_bank?.image_url && (
                      <div className="mb-8 flex justify-center bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
                        <img src={q.question_bank.image_url} alt="Question Graphic" className="max-h-[500px] object-contain rounded-xl shadow-2xl" />
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-50">
                      <QuestionInput q={q} index={index} answers={answers} handleSelect={handleSelect} isFullMode={true} />
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="py-16 text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle size={32} />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm mb-6">Bạn đã hoàn thành tất cả câu hỏi</p>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Send size={20} /> NỘP BÀI VÀ XEM KẾT QUẢ
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}