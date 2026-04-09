import React, { useState, useRef, useEffect, Component } from 'react';
import { UploadCloud, FileText, Save, Globe, Lock, Image as ImageIcon, X, CheckCircle, Clock, BookOpen, Settings, AlertCircle, Upload, Zap, Sparkles, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as mammoth from 'mammoth';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { GoogleGenAI } from '@google/genai';

// =========================================================================
// 🛡️ LỚP BẢO VỆ CÔNG THỨC TOÁN (ERROR BOUNDARY)
// =========================================================================
class SafeLatex extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    let safeText = this.props.children || "";
    if (typeof safeText === 'string') {
      safeText = safeText.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$'); 
      safeText = safeText.replace(/\\\(/g, '$$').replace(/\\\)/g, '$$');     
    }
    if (this.state.hasError) {
      return <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-sm">{safeText}</span>;
    }
    return (
      <Latex strict="ignore" macros={{"\\heva": "\\begin{cases} #1 \\end{cases}", "\\hoac": "\\left[\\begin{matrix} #1 \\end{matrix}\\right."}}>
        {safeText}
      </Latex>
    );
  }
}

const SmartUpload = () => {
  const navigate = useNavigate();

  // STATES
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(''); 
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [numPdfQuestions, setNumPdfQuestions] = useState(40);
  const [pdfAnswers, setPdfAnswers] = useState({});

  const [isShuffleQuestions, setIsShuffleQuestions] = useState(false);
  const [isShuffleOptions, setIsShuffleOptions] = useState(false);

  // STATE MỚI: Lưu loại câu hỏi của bảng PDF
  const [pdfQuestionTypes, setPdfQuestionTypes] = useState({}); 

  // Hàm click để chuyển đổi Trắc nghiệm <-> Tự luận
  const togglePdfQuestionType = (qNum) => {
    setPdfQuestionTypes(prev => ({
      ...prev,
      [qNum]: prev[qNum] === 'fill_blank' ? 'multiple_choice' : 'fill_blank'
    }));
    // Xóa đáp án cũ khi chuyển loại để không bị lỗi
    setPdfAnswers(prev => {
      const newAns = { ...prev };
      delete newAns[qNum];
      return newAns;
    });
  };

  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false); 

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  // ================= LUỒNG 1: REGEX (SIÊU TỐC - Dành cho file chuẩn) =================
  const parseExamTextWithRegex = (rawText) => {
    const questions = [];

    // =======================================================
    // HÀM PHỤ: ĐẾM NGOẶC SIÊU CHUẨN ĐỂ CHỐNG ĐỨT CÔNG THỨC TOÁN
    // =======================================================
    const extractBraces = (text, startIdx, count) => {
      let results = [];
      let current = '';
      let depth = 0;
      let inBlock = false;
      let i = startIdx;

      while (i < text.length && results.length < count) {
        if (text[i] === '{') {
          if (depth > 0) current += '{';
          depth++;
          inBlock = true;
        } else if (text[i] === '}') {
          depth--;
          if (depth === 0 && inBlock) {
            results.push(current);
            current = '';
            inBlock = false;
          } else if (depth > 0) {
            current += '}';
          }
        } else if (inBlock) {
          current += text[i];
        }
        i++;
      }
      return { results, endIndex: i };
    };

    // =======================================================
    // 1. DỌN DẸP RÁC VÀ BẢO TỒN CẤU TRÚC
    // =======================================================
    let cleanText = rawText.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
                           .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
                           .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
                           .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
                           .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
                           .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1');

    // Xử lý thông minh cho \immini để không bị dư ngoặc
    cleanText = cleanText.replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2')
                         .replace(/\\immini(?:\[.*?\])?\s*/g, '');

    // =======================================================
    // 2. BẮT ĐẦU BÓC TÁCH CÂU HỎI
    // =======================================================
    if (cleanText.includes('\\begin{ex}')) {
      const exBlocks = cleanText.match(/\\begin\{ex\}[\s\S]*?\\end\{ex\}/g) || [];
      exBlocks.forEach((block, index) => {
        let content = block.replace(/\\begin\{ex\}(\s*%\[.*?\])*/, '').replace(/\\end\{ex\}/, '');
        let options = ['', '', '', ''], correctOpt = '', questionType = 'fill_blank';
        
        // CHẶT BỎ LỜI GIẢI NGAY LẬP TỨC
        const loigiaiIdx = content.search(/\\loigiai/);
        if (loigiaiIdx !== -1) content = content.substring(0, loigiaiIdx);

        // TÌM LỆNH \choice 
        const choiceMatchIdx = content.search(/\\(?:choice|choiceTF|motcot|haicot|boncot)/);
        
        if (choiceMatchIdx !== -1) {
          const isTF = content.includes('\\choiceTF');
          questionType = isTF ? 'true_false' : 'multiple_choice';
          
          // 🔥 SỬ DỤNG HÀM ÉP KIỂU ĐỂ LẤY CHÍNH XÁC 4 ĐÁP ÁN BẤT CHẤP NGOẶC LỒNG 🔥
          const extracted = extractBraces(content, choiceMatchIdx, 4);
          const rawOptions = extracted.results;
          
          if (rawOptions.length === 4) {
            if (isTF) {
              let tfAnswers = [];
              rawOptions.forEach((opt, idx) => {
                tfAnswers.push(/(?:\\True|\\true)/.test(opt) ? 'T' : 'F');
                options[idx] = opt.replace(/\\True|\\true/g, '').trim();
              });
              correctOpt = tfAnswers.join(',');
            } else {
              correctOpt = 'A';
              rawOptions.forEach((opt, idx) => {
                if (/(?:\\True|\\true)/.test(opt)) {
                  correctOpt = ['A', 'B', 'C', 'D'][idx];
                }
                options[idx] = opt.replace(/\\True|\\true/g, '').trim();
              });
            }
            // Xóa phần đáp án ra khỏi đề bài một cách an toàn
            content = content.substring(0, choiceMatchIdx) + content.substring(extracted.endIndex);
          }
        } else {
          // XỬ LÝ CÂU ĐIỀN KHUYẾT
          const shortMatch = content.match(/\\shortans(?:\[.*?\])?\s*\{([\s\S]*?)\}/);
          if (shortMatch) {
            questionType = 'fill_blank';
            correctOpt = shortMatch[1].trim();
            content = content.replace(shortMatch[0], '');
          }
        }

        // DỌN SẠCH CÁC DẤU NGOẶC RÁC DO LỆNH CŨ BỎ LẠI
        content = content.replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '').trim(); // Bỏ ngoặc ở đầu/cuối
        content = content.replace(/\{(\[⚠️.*?\])\}/g, '$1'); // Gỡ ngoặc bao quanh cảnh báo hình vẽ

        questions.push({ 
          id: index + 1, type: questionType, content: content, 
          opt_a: options[0], opt_b: options[1], opt_c: options[2], opt_d: options[3], 
          correct_opt: correctOpt, image_file: null, image_preview: null 
        });
      });
   } else {
      // =======================================================
      // XỬ LÝ FILE WORD CẮT LÁT TUYỆT ĐỐI VÀ CHỐNG TRƯỢT CÂU
      // =======================================================

      // 1. TRẢM LỜI GIẢI PHÍA SAU
      const solutionRegex = /\n\s*(?:HƯỚNG DẪN GIẢI|HƯỚNG DẪN CHI TIẾT|LỜI GIẢI CHI TIẾT|ĐÁP ÁN VÀ LỜI GIẢI|BẢNG ĐÁP ÁN)/i;
      const solMatch = cleanText.match(solutionRegex);
      if (solMatch) {
        cleanText = cleanText.substring(0, solMatch.index);
      }

      // 2. DỌN DẸP RÁC
      cleanText = cleanText.replace(/Mỗi câu hỏi thí sinh chỉ chọn một phương án\.?/gi, '');

      // 🔥 FIX LỖI OFFSET: Hợp nhất [Mức độ] và Câu X nếu chúng đứng cạnh nhau 🔥
      // Nếu [Mức độ X] đứng ngay trước Câu X, xóa cái Mức độ đi để không bị cắt làm đôi
      let pText = cleanText.replace(/\[Mức độ\s*\d+\]\s*(?=(Câu|Bài|Question)\s*\d+[\.\:])/gi, '');
      // Hoặc nếu Câu X đứng trước [Mức độ X], cũng hợp nhất lại
      pText = pText.replace(/(Câu|Bài|Question)\s*\d+[\.\:]\s*(?=\[Mức độ\s*\d+\])/gi, '$1 ');

      // 3. TẠO DẢI PHÂN CÁCH BỀN VỮNG
      pText = pText.replace(/(PHẦN\s*(?:I{1,3}|[1-3]))/gi, '|||SEC$1');
      pText = pText.replace(/(Câu\s*\d+[\.\:]|Bài\s*\d+[\.\:]|Question\s*\d+[\.\:]|\[Mức độ\s*\d+\])/gi, '|||Q$1');

      const blocks = pText.split('|||');
      let currentSection = 'multiple_choice';
      let qCount = 1;

      blocks.forEach(block => {
        const txt = block.trim();
        if (!txt) return;

        // KIỂM TRA CHUYỂN PHẦN
        if (txt.startsWith('SEC')) {
          const secText = txt.replace(/^SEC/i, '').trim();
          if (/(đúng|sai|đúng\/sai)/i.test(secText)) currentSection = 'true_false';
          else if (/(ngắn|điền|tự luận)/i.test(secText)) currentSection = 'fill_blank';
          else currentSection = 'multiple_choice';
          return;
        }

        // KIỂM TRA VÀ XỬ LÝ CÂU HỎI
        if (txt.startsWith('Q')) {
          let content = txt.replace(/^Q/i, '').trim();
          
          // Gỡ bỏ các nhãn thừa ở đầu đề bài
          content = content.replace(/^(Câu|Bài|Question)\s*\d+[\.\:]/i, '').trim();
          content = content.replace(/^\[Mức độ\s*\d+\]/i, '').trim();

          // TÌM TỌA ĐỘ A. B. C. D.
          const aMatch = content.match(/(?:\s|^)A\s*[\.\)\/]/);
          const bMatch = content.match(/(?:\s|^)B\s*[\.\)\/]/);
          const cMatch = content.match(/(?:\s|^)C\s*[\.\)\/]/);
          const dMatch = content.match(/(?:\s|^)D\s*[\.\)\/]/);

          // CẮT LÁT NẾU ĐỦ 4 ĐÁP ÁN
          if (aMatch && bMatch && cMatch && dMatch && 
              aMatch.index < bMatch.index && 
              bMatch.index < cMatch.index && 
              cMatch.index < dMatch.index) {
              
              const mainContent = content.substring(0, aMatch.index).trim();
              const optA = content.substring(aMatch.index + aMatch[0].length, bMatch.index).trim();
              const optB = content.substring(bMatch.index + bMatch[0].length, cMatch.index).trim();
              const optC = content.substring(cMatch.index + cMatch[0].length, dMatch.index).trim();
              const optD = content.substring(dMatch.index + dMatch[0].length).trim();

              questions.push({
                  id: qCount++,
                  type: currentSection === 'true_false' ? 'true_false' : 'multiple_choice',
                  content: mainContent,
                  opt_a: optA, opt_b: optB, opt_c: optC, opt_d: optD,
                  correct_opt: currentSection === 'true_false' ? 'F,F,F,F' : 'A',
                  image_file: null, image_preview: null,
                  isEditing: false // Thuộc tính để bật tắt Trình soạn thảo mình vừa làm
              });
          } else {
              // NẾU MẤT ĐÁP ÁN -> Điền khuyết
              questions.push({
                  id: qCount++,
                  type: 'fill_blank', 
                  content: content,
                  opt_a: '', opt_b: '', opt_c: '', opt_d: '',
                  correct_opt: '', image_file: null, image_preview: null,
                  isEditing: false
              });
          }
        }
      });
    }
    return questions;
  };


  

  /// ================= BỘ XỬ LÝ FILE MỚI (CHỈ DÙNG REGEX) =================
  const processFile = async (selectedFile, ext) => {
    setIsExtracting(true);
    setParsedQuestions([]);
    
    // NẾU LÀ PDF: CHỈ DÙNG BẢNG ĐỤC LỖ BÊN TRÁI
    if (ext === 'pdf') {
      setIsExtracting(false);
      return;
    }

    // NẾU LÀ WORD HOẶC TEX -> Chạy Regex
    try {
      let rawText = '';
      if (ext === 'tex' || ext === 'txt') {
        rawText = await selectedFile.text();
      } else if (ext === 'docx') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        rawText = result.value;
      }

      // Đẩy text vào hàm cắt lát tuyệt đối (parseExamTextWithRegex)
      const regexResult = parseExamTextWithRegex(rawText);

      // Trả kết quả ra màn hình cho giáo viên review/chỉnh sửa
      if (regexResult.length > 0) {
        setParsedQuestions(regexResult);
      } else {
        alert("Hệ thống không tìm thấy cấu trúc câu hỏi nào. Vui lòng tự thêm tay hoặc kiểm tra lại file!");
      }
    } catch (err) {
      alert("Lỗi đọc file: " + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    setPdfAnswers({}); setPdfQuestionTypes({});

    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) { setFileType('image'); } 
    // 👉 ĐÃ SỬA THÀNH processFile 👈
    else if (ext === 'pdf') { setFileType('pdf'); processFile(selectedFile, 'pdf'); }
    else if (['doc', 'docx'].includes(ext)) { setFileType('word'); processFile(selectedFile, 'docx'); } 
    else if (ext === 'tex') { setFileType('tex'); processFile(selectedFile, 'tex'); } 
    else { alert("Định dạng file không hỗ trợ!"); handleRemoveFile(); }
  };

  const handleRemoveFile = () => {
    setFile(null); setFileType(''); setPreviewUrl('');
    setParsedQuestions([]); 
    setPdfAnswers({}); 
    setPdfQuestionTypes({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const changeParsedCorrectOpt = (index, opt) => {
    const newQs = [...parsedQuestions];
    newQs[index].correct_opt = opt;
    setParsedQuestions(newQs);
  };

  // ================= CÁC HÀM HỖ TRỢ CHỈNH SỬA THỦ CÔNG KHI MÁY QUÉT LỖI =================
  const updateParsedQuestion = (index, field, value) => {
    const newQs = [...parsedQuestions];
    newQs[index][field] = value;
    setParsedQuestions(newQs);
  };

  const toggleEditMode = (index) => {
    const newQs = [...parsedQuestions];
    newQs[index].isEditing = !newQs[index].isEditing; 
    setParsedQuestions(newQs);
  };

  const handlePdfAnswerSelect = (qNum, opt) => {
    setPdfAnswers(prev => ({ ...prev, [qNum]: opt }));
  };

  const handleQuestionImageUpload = (index, imageFile) => {
    if (!imageFile) return;
    const newQs = [...parsedQuestions];
    if (newQs[index].image_preview) URL.revokeObjectURL(newQs[index].image_preview);
    newQs[index].image_file = imageFile;
    newQs[index].image_preview = URL.createObjectURL(imageFile);
    setParsedQuestions(newQs);
  };

  const handleRemoveQuestionImage = (index) => {
    const newQs = [...parsedQuestions];
    if (newQs[index].image_preview) URL.revokeObjectURL(newQs[index].image_preview);
    newQs[index].image_file = null;
    newQs[index].image_preview = null;
    setParsedQuestions(newQs);
  };

  // ================= LƯU SUPABASE =================
  const handleSaveToDatabase = async () => {
    if (!file) return alert("Vui lòng tải lên file đề thi!");
    if (!examTitle.trim()) return alert("Vui lòng nhập tên bài thi trước khi lưu!");
    if (!selectedSubject) return alert("Vui lòng chọn Môn học cho đề thi này!");

    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `exam_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('class_documents').upload(`exams/${fileName}`, file);
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: publicUrlData } = supabase.storage.from('class_documents').getPublicUrl(`exams/${fileName}`);
      const finalFileUrl = publicUrlData.publicUrl;

      const isPdfOrImage = fileType === 'pdf' || fileType === 'image';
      
      const { data: examData, error: examError } = await supabase.from('exams').insert([{
        title: examTitle, 
        duration: parseInt(duration), 
        status: 'published',
        total_questions: isPdfOrImage ? numPdfQuestions : parsedQuestions.length,
        grade: 'Khối 10', 
        pdf_url: finalFileUrl, 
        
        // SỬA TẠI ĐÂY: Lấy giá trị từ các checkbox bạn vừa tích
        is_shuffle_questions: isShuffleQuestions, 
        is_shuffle_options: isShuffleOptions,
        is_public: isPublic,
        
        subject_id: selectedSubject, 
        answer_key: fileType === 'pdf' ? { answers: pdfAnswers, types: pdfQuestionTypes } : null
      }]).select();
      
      if (examError) throw examError;
      
      const newExamId = examData[0].id;

      if ((fileType === 'word' || fileType === 'tex') && parsedQuestions.length > 0) {
        const questionsToInsert = await Promise.all(parsedQuestions.map(async (q) => {
          let imageUrl = null;
          if (q.image_file) {
            const imgExt = q.image_file.name.split('.').pop();
            const imgName = `q_img_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${imgExt}`;
            const { error: imgUploadErr } = await supabase.storage.from('class_documents').upload(`questions/${imgName}`, q.image_file);
            if (!imgUploadErr) {
              const { data: imgUrlData } = supabase.storage.from('class_documents').getPublicUrl(`questions/${imgName}`);
              imageUrl = imgUrlData.publicUrl;
            }
          }
          return {
            content: q.content, 
            opt_a: q.opt_a, 
            opt_b: q.opt_b, 
            opt_c: q.opt_c, 
            opt_d: q.opt_d,
            correct_opt: q.correct_opt, 
            level: 'Trung bình', 
            subject_id: selectedSubject,
            image_url: imageUrl,
            question_type: q.type 
          };
        }));

        const { data: qData, error: qError } = await supabase.from('question_bank').insert(questionsToInsert).select();
        if (qError) throw qError;

        const examQuestions = qData.map((dbQ, idx) => ({ exam_id: newExamId, question_id: dbQ.id, question_order: idx + 1 }));
        const { error: eqError } = await supabase.from('exam_questions').insert(examQuestions);
        if (eqError) throw eqError;
      }

      alert(`✅ Đã lưu đề thi và ảnh thành công!`); navigate('/admin/exams');
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-4 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-blue-700">Đăng và chỉnh sửa đề thi.</h2>
          <p className="text-gray-600 mt-1 text-sm">Lưu ý: Ưu tiên sử dụng pdf.Khả dụng PDF/Tex/Word</p>
        </div>
        <button onClick={handleSaveToDatabase} disabled={isSaving || !file} className="bg-green-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2">
          {isSaving ? 'Đang lưu...' : <><Save size={20} /> Xuất Bản Đề Thi</>}
        </button>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        
        {/* ================= CỘT TRÁI (HIỂN THỊ FILE) ================= */}
        {/* ĐÃ FIX: Tự động ẩn đi nếu showLeftPanel = false */}
        <div className={`bg-white border border-gray-200 rounded-2xl flex-col shadow-sm relative transition-all duration-300 ${showLeftPanel ? 'flex flex-1' : 'hidden'}`}>
          {!file ? (
            <div onClick={() => fileInputRef.current.click()} className="flex-1 flex flex-col items-center justify-center p-10 cursor-pointer border-2 border-dashed border-blue-300 m-6 rounded-2xl bg-blue-50/20 hover:bg-blue-50">
              <UploadCloud size={60} className="text-blue-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Nhấn hoặc kéo thả file vào đây</h3>
              <input type="file" accept=".pdf,.doc,.docx,.tex,.png,.jpg,.jpeg,.svg" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            </div>
          ) : (
            <>
              <div className="border-b p-3 flex justify-between items-center z-10 bg-white">
                <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded truncate max-w-[300px]">{file.name}</span>
                <button onClick={handleRemoveFile} className="text-red-500 font-bold flex items-center gap-1"><X size={16}/> Gỡ</button>
              </div>
              <div className="flex-1 bg-gray-200 flex items-center justify-center relative">
                {fileType === 'pdf' ? <iframe src={previewUrl} className="w-full h-full border-none" /> :
                 fileType === 'image' ? <img src={previewUrl} className="max-w-full max-h-full object-contain p-4" /> : 
                 (
                  <div className="text-center p-8 bg-white rounded-xl shadow-md">
                    <FileText size={60} className="mx-auto text-blue-500 mb-4" />
                    {isExtracting ? (
                      <div>
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-blue-600 font-bold animate-pulse">Hệ thống đang phân tích...</p>
                      </div>
                    ) : (
                      <p className="text-green-600 font-bold">Xử lý thành công!</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ================= CỘT PHẢI (CÀI ĐẶT & REVIEW) ================= */}
        {/* ĐÃ FIX: Tự động nở to ra (flex-1) nếu cột trái bị ẩn đi */}
        <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${showLeftPanel ? 'w-[550px]' : 'flex-1'}`}>
          
          <div className="bg-white border rounded-2xl p-5 shadow-sm shrink-0 flex justify-between items-start gap-4">
            <div className="flex-1 space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-gray-800"><Settings size={18}/> Thông tin chung</h3>
              
              <div className="space-y-3">
                <input type="text" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="Tên bài thi *" className="w-full p-2 border border-gray-200 rounded-lg font-bold outline-none focus:border-blue-500 transition-colors" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium text-gray-700 bg-white">
                    <option value="">-- Môn học --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Thời gian (Phút)" className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* KHU VỰC CÀI ĐẶT ĐẢO ĐỀ VÀ CÔNG KHAI */}
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={isShuffleQuestions} onChange={(e) => setIsShuffleQuestions(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Đảo vị trí câu hỏi</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={isShuffleOptions} onChange={(e) => setIsShuffleOptions(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Đảo đáp án A, B, C, D</span>
                  </label>
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-blue-50 border border-blue-100 transition-colors">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1" />
                  <div>
                    <span className="text-sm font-bold text-blue-800 block">Chia sẻ lên Kho Đề Cộng Đồng</span>
                    <span className="text-xs text-blue-600 leading-tight block mt-0.5">Giáo viên khác có thể sao chép và sử dụng đề thi này.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* NÚT THU GỌN / MỞ RỘNG */}
            {file && (
              <button 
                onClick={() => setShowLeftPanel(!showLeftPanel)} 
                className="p-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold flex flex-col items-center justify-center transition-all border border-indigo-100 shadow-sm shrink-0"
              >
                {showLeftPanel ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
                <span className="text-[11px] mt-1 whitespace-nowrap">{showLeftPanel ? 'Phóng to bảng' : 'Xem đề bài'}</span>
              </button>
            )}
          </div>

          {fileType && (
            <div className="bg-white border rounded-2xl p-5 flex-1 flex flex-col overflow-hidden shadow-sm">
              
              {/* === 1. BẢNG ĐỤC LỖ DÀNH RIÊNG CHO PDF === */}
              {fileType === 'pdf' && (
                <>
                  <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
                    <h3 className="font-bold text-gray-800 text-lg">Bảng Đáp Án Nhanh (PDF)</h3>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      <span className="text-sm font-bold text-blue-800">Số câu:</span>
                      <input type="number" min="1" value={numPdfQuestions} onChange={e => setNumPdfQuestions(Number(e.target.value) || 1)} className="w-14 px-1 py-1 rounded text-center font-bold outline-none" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                    
                    {/* ĐÃ FIX: Auto chuyển 1 cột nếu màn chật, 2-3 cột nếu màn rộng */}
                    <div className={`grid gap-x-6 gap-y-3 ${showLeftPanel ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3'}`}>
                      {Array.from({ length: numPdfQuestions }, (_, i) => i + 1).map(qNum => (
                        <div key={qNum} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors shadow-sm">
                          
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-gray-800 w-12">Câu {qNum}</span>
                            <button 
                              onClick={() => togglePdfQuestionType(qNum)} 
                              className={`text-xs font-bold px-2 py-1.5 rounded transition-colors ${pdfQuestionTypes[qNum] === 'fill_blank' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              {pdfQuestionTypes[qNum] === 'fill_blank' ? 'Điền khuyết' : 'Trắc nghiệm'}
                            </button>
                          </div>

                          <div className="flex gap-2 flex-1 justify-end ml-4">
                            {pdfQuestionTypes[qNum] === 'fill_blank' ? (
                              <input 
                                type="text" 
                                value={pdfAnswers[qNum] || ''} 
                                onChange={(e) => handlePdfAnswerSelect(qNum, e.target.value)} 
                                placeholder="Nhập đáp án..." 
                                className="w-full max-w-[160px] px-3 py-1.5 border border-purple-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-700 bg-white"
                              />
                            ) : (
                              ['A', 'B', 'C', 'D'].map(opt => (
                                <button 
                                  key={opt} 
                                  onClick={() => handlePdfAnswerSelect(qNum, opt)} 
                                  className={`w-9 h-9 rounded-full font-bold text-sm shadow-sm transition-transform ${pdfAnswers[qNum] === opt ? 'bg-blue-600 text-white scale-110' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                                >
                                  {opt}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </>
              )}
              {/* ======================================= */}
              
              {isExtracting ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-4">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-indigo-700 font-bold text-lg animate-pulse">Đang bóc tách dữ liệu...</p>
                  <p className="text-gray-500 text-sm mt-1">Hệ thống đang xử lý, vui lòng đợi trong giây lát.</p>
                </div>
              ) : parsedQuestions.length > 0 ? (
                <>
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <h3 className="font-bold text-lg">Review câu hỏi</h3>
                    <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-xs">{parsedQuestions.length} câu</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {parsedQuestions.map((q, index) => (
                    <div key={index} className="border p-4 bg-gray-50 rounded-xl relative shadow-sm">
                      
                      {/* ========================================================= */}
                      {/* TIÊU ĐỀ, NÚT SỬA LỖI VÀ CHỌN LOẠI CÂU HỎI                 */}
                      {/* ========================================================= */}
                      <div className="flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-200 pb-4 gap-4">
                        
                        {/* KHU VỰC HIỂN THỊ / CHỈNH SỬA ĐỀ BÀI */}
                        <div className="flex-1 w-full">
                          <div className="font-bold text-gray-800 text-lg mb-2">Câu {q.id}:</div>
                          {q.isEditing ? (
                            <textarea
                              value={q.content}
                              onChange={(e) => updateParsedQuestion(index, 'content', e.target.value)}
                              className="w-full p-3 border-2 border-indigo-300 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 bg-indigo-50/30 min-h-[120px] transition-all"
                              placeholder="Nhập nội dung câu hỏi (hỗ trợ code Toán $...$)..."
                            />
                          ) : (
                            <div className="content-preview text-gray-700 leading-relaxed font-medium">
                              <SafeLatex>{q.content}</SafeLatex>
                            </div>
                          )}
                        </div>
                        
                        {/* CÁC NÚT ĐIỀU KHIỂN BÊN PHẢI */}
                        <div className="flex flex-col gap-2 shrink-0 w-full md:w-56">
                          {/* Nút bật tắt chế độ Edit */}
                          <button
                            onClick={() => toggleEditMode(index)}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                              q.isEditing 
                              ? 'bg-green-500 text-white shadow-lg shadow-green-200' 
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                            }`}
                          >
                            {q.isEditing ? '💾 Lưu chỉnh sửa' : '✏️ Sửa lỗi nhận diện'}
                          </button>

                          {/* Dropdown chọn loại câu hỏi */}
                          <select 
                            value={q.type}
                            onChange={(e) => {
                              const newQs = [...parsedQuestions];
                              newQs[index].type = e.target.value;
                              if (e.target.value === 'true_false') newQs[index].correct_opt = 'F,F,F,F';
                              else if (e.target.value === 'multiple_choice') newQs[index].correct_opt = 'A';
                              else newQs[index].correct_opt = '';
                              setParsedQuestions(newQs);
                            }}
                            className="w-full text-xs font-bold px-3 py-2.5 rounded-xl outline-none border border-gray-200 cursor-pointer hover:bg-gray-50 bg-white"
                          >
                            <option value="multiple_choice">Dạng 1: Trắc nghiệm (4 đáp án)</option>
                            <option value="true_false">Dạng 2: Trắc nghiệm Đúng/Sai</option>
                            <option value="fill_blank">Dạng 3: Điền khuyết / Tự luận</option>
                          </select>
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* NÚT ĐÍNH KÈM ẢNH CHO TỪNG CÂU HỎI (GIỮ NGUYÊN CODE CỦA BẠN) */}
                      {/* ========================================================= */}
                      <div className="mb-4 bg-white border border-dashed p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-500"><ImageIcon size={14} className="inline mr-1"/> Đính kèm ảnh thêm</span>
                          {q.image_preview && <button onClick={() => handleRemoveQuestionImage(index)} className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">Xóa ảnh</button>}
                        </div>
                        {!q.image_preview ? (
                          <label className="flex justify-center p-2 bg-blue-50 text-blue-500 rounded cursor-pointer hover:bg-blue-100 font-semibold text-sm transition-colors">
                            Tải ảnh lên <input type="file" className="hidden" accept="image/*" onChange={e => handleQuestionImageUpload(index, e.target.files[0])}/>
                          </label>
                        ) : (
                          <img src={q.image_preview} className="max-h-32 mx-auto rounded border shadow-sm" />
                        )}
                      </div>
                      
                      {/* ========================================================= */}
                      {/* HIỂN THỊ VÀ CHỈNH SỬA ĐÁP ÁN DỰA TRÊN LOẠI CÂU HỎI        */}
                      {/* ========================================================= */}
                      {q.type === 'multiple_choice' ? (
                        <>
                          {/* 1. TRẮC NGHIỆM THƯỜNG (A, B, C, D) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                            {['a', 'b', 'c', 'd'].map(opt => (
                              <div key={opt} className={`p-3 rounded-xl border ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white shadow-sm'}`}>
                                <div className="flex gap-3">
                                  <span className="font-bold text-indigo-700 mt-1">{opt.toUpperCase()}.</span>
                                  {/* Bật ô nhập liệu nếu đang Edit */}
                                  {q.isEditing ? (
                                    <textarea
                                      value={q[`opt_${opt}`]}
                                      onChange={(e) => updateParsedQuestion(index, `opt_${opt}`, e.target.value)}
                                      className="w-full bg-white p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 min-h-[60px]"
                                      placeholder={`Nhập đáp án ${opt.toUpperCase()}...`}
                                    />
                                  ) : (
                                    <div className="text-gray-700 flex-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* CHỌN ĐÁP ÁN ĐÚNG */}
                          <div className="flex justify-between items-center pt-3 border-t">
                            <span className="text-xs font-bold text-gray-500">ĐÁP ÁN ĐÚNG:</span>
                            <div className="flex gap-2">
                              {['A', 'B', 'C', 'D'].map(opt => (
                                <button key={opt} onClick={() => changeParsedCorrectOpt(index, opt)} className={`w-9 h-9 rounded-lg font-bold text-sm transition-transform ${q.correct_opt === opt ? 'bg-green-500 text-white scale-110' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : q.type === 'true_false' ? (
                        /* 2. TRẮC NGHIỆM ĐÚNG/SAI (Format 2025) */
                        <div className="grid grid-cols-1 gap-3 mb-3">
                          {['a', 'b', 'c', 'd'].map((opt, i) => (
                            <div key={opt} className={`p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                              <div className="flex-1 w-full flex gap-3 text-sm">
                                <span className="font-bold text-blue-700 mt-1">{opt.toUpperCase()}.</span> 
                                {/* Bật ô nhập liệu nếu đang Edit */}
                                {q.isEditing ? (
                                  <textarea
                                    value={q[`opt_${opt}`]}
                                    onChange={(e) => updateParsedQuestion(index, `opt_${opt}`, e.target.value)}
                                    className="w-full bg-white p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 min-h-[60px]"
                                    placeholder={`Nhập ý ${opt.toUpperCase()}...`}
                                  />
                                ) : (
                                  <div className="pt-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>
                                )}
                              </div>
                              
                              {/* NÚT CHỌN ĐÚNG/SAI */}
                              <div className="flex gap-1 shrink-0 mt-2 sm:mt-0">
                                {['T', 'F'].map(val => (
                                  <button 
                                    key={val} 
                                    onClick={() => {
                                      const currentArr = (q.correct_opt || "?,?,?,?").split(',');
                                      currentArr[i] = val;
                                      changeParsedCorrectOpt(index, currentArr.join(','));
                                    }} 
                                    className={`px-4 py-2 rounded font-bold text-xs transition-colors ${q.correct_opt?.split(',')[i] === val ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                  >
                                    {val === 'T' ? 'Đúng' : 'Sai'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 3. TỰ LUẬN / ĐIỀN KHUYẾT */
                        <div className="pt-3 border-t border-gray-200">
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nhập đáp án (Tự luận / Điền khuyết):</label>
                          <input 
                            type="text" 
                            value={q.correct_opt} 
                            onChange={(e) => changeParsedCorrectOpt(index, e.target.value)} 
                            className="w-full p-3 border border-purple-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-700 bg-purple-50"
                            placeholder="Nhập đáp án đúng vào đây..."
                          />
                        </div>
                      )}

                    </div>
                  ))}
                </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SmartUpload;