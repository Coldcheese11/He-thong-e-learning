import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, Award, HelpCircle } from 'lucide-react';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  // Nếu truy cập thẳng vào link /result mà không có dữ liệu thi, đẩy về trang chủ
  if (!data) return <Navigate to="/dashboard" />;

  const { score, correct, total, questions, studentAnswers, examTitle } = data;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* THANH ĐIỀU HƯỚNG */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Về trang chủ
        </button>
        <h2 className="text-xl font-bold text-gray-800">{examTitle || 'Kết quả bài thi'}</h2>
        <div className="w-24"></div> {/* Spacer để cân bằng layout */}
      </div>

      <div className="max-w-4xl mx-auto mt-8 px-4">
        {/* TỔNG KẾT ĐIỂM SỐ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-green-400"></div>
          <Award className="mx-auto text-yellow-500 mb-4" size={64} />
          <h1 className="text-3xl font-black text-gray-800 mb-2">Chúc mừng bạn đã hoàn thành bài thi!</h1>
          <p className="text-gray-500 mb-6">Dưới đây là chi tiết kết quả làm bài của bạn</p>
          
          <div className="flex justify-center gap-8">
            <div className="bg-blue-50 px-8 py-4 rounded-xl border border-blue-100">
              <span className="block text-sm text-blue-600 font-bold uppercase tracking-wider mb-1">Điểm số</span>
              <span className="text-5xl font-black text-blue-700">{score}</span>
            </div>
            <div className="bg-green-50 px-8 py-4 rounded-xl border border-green-100">
              <span className="block text-sm text-green-600 font-bold uppercase tracking-wider mb-1">Số câu đúng</span>
              <span className="text-5xl font-black text-green-700">{correct}<span className="text-2xl text-green-500">/{total}</span></span>
            </div>
          </div>
        </div>

        {/* CHI TIẾT TỪNG CÂU HỎI (CHỮA BÀI) */}
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <HelpCircle className="text-blue-600" /> Chi tiết bài làm
        </h3>
        
        <div className="space-y-6">
          {questions.map((q, index) => {
            const studentOpt = studentAnswers[index + 1];
            const correctOpt = q.question_bank?.correct_opt;
            const isAnsweredCorrectly = studentOpt === correctOpt;

            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tiêu đề câu hỏi */}
                <div className={`px-6 py-4 border-b flex items-start gap-3 ${isAnsweredCorrectly ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="mt-1">
                    {isAnsweredCorrectly ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <XCircle className="text-red-500" size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">
                      Câu {index + 1}: {q.question_bank?.content || "Không có nội dung câu hỏi (File PDF)"}
                    </h4>
                  </div>
                </div>

                {/* Các đáp án A, B, C, D */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isCorrect = opt === correctOpt;
                    const isStudentChoice = opt === studentOpt;
                    
                    // Logic tô màu
                    let boxStyle = "bg-gray-50 border-gray-200 text-gray-700"; // Mặc định
                    if (isCorrect) {
                      boxStyle = "bg-green-100 border-green-500 text-green-800 font-bold shadow-sm"; // Đáp án đúng -> Tô xanh
                    } else if (isStudentChoice && !isCorrect) {
                      boxStyle = "bg-red-100 border-red-400 text-red-800 font-bold"; // Trả lời sai -> Tô đỏ
                    }

                    return (
                      <div key={opt} className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${boxStyle}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                          ${isCorrect ? 'bg-green-500 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'}
                        `}>
                          {opt}
                        </div>
                        <span className="text-base leading-relaxed">
                          {q.question_bank?.[`opt_${opt.toLowerCase()}`] || "..."}
                        </span>
                        
                        {/* Nhãn dán nhỏ chỉ ra lựa chọn của học sinh */}
                        {isStudentChoice && (
                          <span className="ml-auto text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white opacity-80">
                            Bạn chọn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}