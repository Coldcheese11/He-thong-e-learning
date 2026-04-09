import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SafeLatex from './SafeLatex'; // Đảm bảo bạn đã import SafeLatex nếu dùng ở component con

// HÀM XÁO TRỘN MẢNG (Thuật toán Fisher-Yates)
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// =========================================================================
// ✅ ĐÚNG: COMPONENT PHỤ ĐƯỢC KHAI BÁO BÊN NGOÀI COMPONENT CHÍNH
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
        placeholder="Nhập câu trả lời của em..."
        className={`w-full px-5 py-3 border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 font-bold text-purple-700 text-lg bg-purple-50 shadow-inner transition-all`}
      />
    );
  }

  // 2. DẠNG TRẮC NGHIỆM ĐÚNG/SAI
  if (type === 'true_false') {
    return (
      <div className={`space-y-3 w-full ${isFullMode ? 'max-w-full' : ''}`}>
        {['A', 'B', 'C', 'D'].map((label, i) => (
          <div key={label} className={`flex ${isFullMode ? 'flex-col lg:flex-row lg:items-center' : 'items-center'} justify-between bg-gray-50 p-3 px-4 rounded-xl border border-gray-200 gap-4`}>
            
            {/* KHU VỰC HIỂN THỊ CHỮ */}
            <div className="flex-1 text-base text-gray-800">
              <span className="font-bold text-blue-700 mr-2 text-lg">{label}.</span>
              {/* 🔥 QUAN TRỌNG: Lôi nội dung từ Database ra cho học sinh đọc 🔥 */}
              {isFullMode && <SafeLatex>{data?.[`opt_${label.toLowerCase()}`]}</SafeLatex>}
            </div>

            {/* KHU VỰC 2 NÚT BẤM (ĐÚNG / SAI) */}
            <div className="flex gap-2 shrink-0">
              {['T', 'F'].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    const currentArr = (answers[index + 1] || "?,?,?,?").split(',');
                    currentArr[i] = val;
                    handleSelect(index + 1, currentArr.join(','));
                  }}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
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
    <div className={`grid gap-3 ${isFullMode ? 'grid-cols-1 md:grid-cols-2' : 'flex space-x-4'}`}>
      {['A', 'B', 'C', 'D'].map((opt) => (
        <button
          key={opt}
          onClick={() => handleSelect(index + 1, opt)}
          className={`flex items-center font-bold transition-all border-2 ${
            isFullMode ? 'p-4 rounded-2xl text-left' : 'h-12 w-12 rounded-full justify-center'
          } ${
            answers[index + 1] === opt 
            ? 'border-blue-600 bg-blue-600 text-white shadow-lg transform scale-105' 
            : 'border-gray-200 text-gray-600 bg-white hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <span className={`${isFullMode ? 'mr-4 bg-gray-100 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center' : ''}`}>
            {opt}
          </span>
          {isFullMode && <SafeLatex>{data?.[`opt_${opt.toLowerCase()}`]}</SafeLatex>}
        </button>
      ))}
    </div>
  );
};

// =========================================================================
// HÀM QUIZ CHÍNH CỦA TRANG
// =========================================================================
export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  // Giám thị ảo
  const [isStarted, setIsStarted] = useState(false); 
  const [violations, setViolations] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
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

        // 1. SỬA LỖI ĐỀ PDF TRẮNG PHIẾU TRẢ LỜI
        if (finalQuestions.length === 0 && exData.total_questions > 0) {
          // Lấy danh sách loại câu hỏi giáo viên đã lưu (Trắc nghiệm/Điền khuyết)
          const pdfTypes = exData.answer_key?.types || {}; 
          
          finalQuestions = Array.from({ length: exData.total_questions }).map((_, i) => ({
            question_id: `pdf-q-${i}`,
            question_bank: { 
              id: `pdf-q-${i}`, 
              content: `Câu PDF`, 
              correct_opt: 'A',
              question_type: pdfTypes[i + 1] || 'multiple_choice' // <--- Đọc đúng loại câu hỏi
            }
          }));
        }

        // 2. XÁO TRỘN THỨ TỰ CÂU HỎI
        if (exData.is_shuffle_questions && finalQuestions.length > 0) {
          finalQuestions = shuffleArray(finalQuestions);
        }

        // 3. ĐỈNH CAO: XÁO TRỘN ĐÁP ÁN A, B, C, D
        if (exData.is_shuffle_options && finalQuestions.length > 0 && !exData.pdf_url) {
          finalQuestions = finalQuestions.map(q => {
            if (!q.question_bank || !q.question_bank.opt_a) return q;

            // Gom 4 đáp án hiện tại lại
            const options = [
              { key: 'A', text: q.question_bank.opt_a },
              { key: 'B', text: q.question_bank.opt_b },
              { key: 'C', text: q.question_bank.opt_c },
              { key: 'D', text: q.question_bank.opt_d }
            ];

            // Lưu lại nội dung của đáp án đúng ban đầu
            const originalCorrectKey = q.question_bank.correct_opt;
            const correctText = options.find(o => o.key === originalCorrectKey)?.text;

            // Tiến hành xáo trộn
            const shuffledOptions = shuffleArray(options);

            // Gắn lại key A,B,C,D mới và tìm xem đáp án đúng vừa bị ném đi đâu
            let newCorrectKey = originalCorrectKey;
            shuffledOptions.forEach((o, idx) => {
              const newKey = String.fromCharCode(65 + idx); // 65 là mã ASCII của 'A'
              if (o.text === correctText) newCorrectKey = newKey;
            });

            return {
              ...q,
              question_bank: {
                ...q.question_bank,
                opt_a: shuffledOptions[0].text,
                opt_b: shuffledOptions[1].text,
                opt_c: shuffledOptions[2].text,
                opt_d: shuffledOptions[3].text,
                correct_opt: newCorrectKey // Cập nhật lại đáp án đúng để hệ thống chấm không bị lệch
              }
            };
          });
        }

        setQuestions(finalQuestions);
        setLoading(false);

      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      }
    };
    loadData();
  }, [id]);

  // ---------- LOGIC GIÁM THỊ ẢO ----------
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
  }, [isStarted, answers, questions, id]); 

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
    if (!isAutoSubmit && !window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;
    setLoading(true);
    const studentId = localStorage.getItem('user_id'); 

    let correctCount = 0;
    const totalQ = questions.length;

    questions.forEach((q, index) => {
      const studentOpt = answers[index + 1];
      const correctOpt = q.question_bank.correct_opt;
      if (studentOpt === correctOpt) correctCount++;
    });

    const finalScore = parseFloat(((correctCount / totalQ) * 10).toFixed(2));

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
      // Bổ sung thêm việc gửi toàn bộ đề thi (questions) và bài làm (answers) sang trang Kết quả
      navigate('/result', { 
        state: { 
          score: finalScore, 
          correct: correctCount, 
          total: totalQ,
          questions: questions,
          studentAnswers: answers,
          examTitle: exam?.title
        } 
      });
    } catch (error) {
      alert("❌ Lỗi nộp bài: " + error.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold">Đang tải đề thi từ máy chủ...</div>;

  if (!isStarted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
          <h1 className="mb-6 text-center text-3xl font-bold text-red-600">⚠️ NỘI QUY PHÒNG THI</h1>
          <div className="mb-8 space-y-4 text-lg text-gray-700">
            <p>1. Hệ thống sẽ tự động bật <b>Toàn màn hình</b>.</p>
            <p>2. Trong quá trình làm bài, <b>KHÔNG</b> được chuyển sang Tab khác.</p>
            <p>3. Rời khỏi màn hình quá <b>3 lần</b> sẽ <b>TỰ ĐỘNG THU BÀI</b>.</p>
          </div>
          <button 
            onClick={() => {
              setIsStarted(true);
              const elem = document.documentElement;
              if (elem.requestFullscreen) elem.requestFullscreen();
            }}
            className="w-full rounded-lg bg-blue-600 py-4 text-xl font-bold text-white shadow-lg hover:bg-blue-700"
          >
            TÔI ĐÃ HIỂU - BẮT ĐẦU LÀM BÀI
          </button>
        </div>
      </div>
    );
  }

  return (
   <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-100">
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow-md z-10">
        <h2 className="text-xl font-bold text-blue-800">{exam?.title}</h2>
        <div className="flex items-center space-x-6">
          {violations > 0 && <div className="rounded bg-red-100 px-3 py-1 font-bold text-red-700">Vi phạm: {violations}/3</div>}
          <div className="text-xl font-mono font-bold text-red-600 bg-red-50 px-4 py-1 rounded-lg border border-red-200">
            ⏱ {formatTime(timeLeft)}
          </div>
          <button onClick={() => handleSubmit(false)} className="rounded-lg bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700 transition-colors">
            NỘP BÀI
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-gray-100">
        {/* KIỂM TRA: Nếu có PDF_URL và KHÔNG PHẢI file .tex thì mới hiện giao diện chia đôi */}
        {exam?.pdf_url && !exam.pdf_url.toLowerCase().endsWith('.tex') ? (
          <>
            {/* --- BÊN TRÁI: XEM FILE PDF --- */}
            <div className="w-1/2 border-r bg-gray-50 overflow-y-auto">
              <iframe 
                src={exam.pdf_url} 
                className="h-full w-full border-none" 
                title="PDF Exam" 
              />
            </div>

            {/* --- BÊN PHẢI: PHIẾU TRẢ LỜI ĐỤC LỖ --- */}
            <div className="w-1/2 overflow-y-auto bg-white p-6 shadow-inner">
              <h3 className="mb-6 border-b pb-2 text-lg font-bold text-gray-700 uppercase tracking-wider">Phiếu trả lời</h3>
              <div className="grid grid-cols-1 gap-6">
                {questions.map((q, index) => (
                  <div key={index} className="flex items-center space-x-4 rounded-xl border p-4 hover:bg-gray-50 transition-colors shadow-sm">
                    <span className="w-16 font-bold text-gray-500 text-lg">Câu {index + 1}:</span>
                    <div className="flex-1">
                      {/* Gọi Component xử lý nút bấm/input */}
                      <QuestionInput 
                        q={q} 
                        index={index} 
                        answers={answers} 
                        handleSelect={handleSelect} 
                        isFullMode={false} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* --- GIAO DIỆN TRÀN MÀN HÌNH (Dành cho Tex/Word) --- */
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              {questions.map((q, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all">
                  {/* Nội dung câu hỏi bóc tách */}
                  <div className="text-lg mb-4 leading-relaxed">
                    <span className="font-bold text-blue-600 mr-2 text-xl">Câu {index + 1}:</span>
                    <SafeLatex>{q?.question_bank?.content}</SafeLatex>
                  </div>

                  {/* HIỂN THỊ ẢNH ĐỀ BÀI (Nếu có) */}
                  {q?.question_bank?.image_url && (
                    <div className="mb-6 flex justify-center bg-gray-50 py-6 rounded-2xl border border-dashed border-gray-300">
                      <img 
                        src={q.question_bank.image_url} 
                        alt={`Hình ảnh câu ${index + 1}`} 
                        className="max-h-[450px] object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  )}

                  {/* Khu vực chọn đáp án/điền khuyết */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <QuestionInput 
                      q={q} 
                      index={index} 
                      answers={answers} 
                      handleSelect={handleSelect} 
                      isFullMode={true} 
                    />
                  </div>
                </div>
              ))}
              <div className="h-24"></div> {/* Khoảng trống để không bị che bởi footer */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

