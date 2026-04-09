import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, Award, HelpCircle } from 'lucide-react';
import SafeLatex from './SafeLatex';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

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
        <h2 className="text-xl font-bold text-gray-800 truncate px-4">{examTitle || 'Kết quả bài thi'}</h2>
        <div className="hidden md:block w-24"></div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 px-4">
        {/* TỔNG KẾT ĐIỂM SỐ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-green-400"></div>
          <Award className="mx-auto text-yellow-500 mb-4" size={64} />
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">Chúc mừng bạn đã hoàn thành bài thi!</h1>
          <p className="text-gray-500 mb-6">Dưới đây là chi tiết kết quả làm bài của bạn</p>
          
          <div className="flex justify-center gap-4 md:gap-8">
            <div className="bg-blue-50 px-6 md:px-10 py-4 rounded-2xl border border-blue-100 shadow-sm">
              <span className="block text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Điểm số</span>
              <span className="text-4xl md:text-5xl font-black text-blue-700">{score}</span>
            </div>
            <div className="bg-green-50 px-6 md:px-10 py-4 rounded-2xl border border-green-100 shadow-sm">
              <span className="block text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Số câu đúng</span>
              <span className="text-4xl md:text-5xl font-black text-green-700">{correct}<span className="text-xl text-green-500">/{total}</span></span>
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
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                {/* Tiêu đề câu hỏi - Bọc SafeLatex */}
                <div className={`px-6 py-5 border-b flex items-start gap-4 ${isAnsweredCorrectly ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                  <div className="mt-1 shrink-0">
                    {isAnsweredCorrectly ? (
                      <CheckCircle className="text-green-600" size={26} />
                    ) : (
                      <XCircle className="text-red-500" size={26} />
                    )}
                  </div>
                  <div className="text-gray-800 text-lg leading-relaxed">
                    <span className="font-black text-blue-600 mr-2">Câu {index + 1}:</span>
                    {/* SỬA TẠI ĐÂY: Bọc nội dung câu hỏi */}
                    <SafeLatex>
                      {q.question_bank?.content || "Nội dung câu hỏi trong file PDF (Vui lòng xem lại đề)"}
                    </SafeLatex>
                  </div>
                </div>

                {/* Các đáp án A, B, C, D - Bọc SafeLatex cho từng ý */}
                <div className="p-6 grid grid-cols-1 gap-3">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isCorrect = opt === correctOpt;
                    const isStudentChoice = opt === studentOpt;
                    
                    let boxStyle = "bg-white border-gray-100 text-gray-600"; 
                    if (isCorrect) {
                      boxStyle = "bg-green-50 border-green-200 text-green-800 font-semibold shadow-sm"; 
                    } else if (isStudentChoice && !isCorrect) {
                      boxStyle = "bg-red-50 border-red-200 text-red-800 font-semibold"; 
                    }

                    return (
                      <div key={opt} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${boxStyle}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm
                          ${isCorrect ? 'bg-green-600 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}
                        `}>
                          {opt}
                        </div>
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                          {/* SỬA TẠI ĐÂY: Bọc nội dung đáp án */}
                          <SafeLatex>
                            {q.question_bank?.[`opt_${opt.toLowerCase()}`] || "..."}
                          </SafeLatex>
                        </div>
                        
                        {isStudentChoice && (
                          <div className={`ml-auto text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md border
                            ${isAnsweredCorrectly ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}
                          `}>
                            Lựa chọn của bạn
                          </div>
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