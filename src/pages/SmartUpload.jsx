import React, { useState, useRef, useEffect, Component } from 'react';
import { UploadCloud, FileText, Save, Globe, Lock, Image as ImageIcon, X, CheckCircle, Clock, BookOpen, Settings, AlertCircle, Upload, Zap, Sparkles, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as mammoth from 'mammoth';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import BlockEditor from '../components/BlockEditor';

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

const parseWordHTMLToQuestions = (htmlString) => {
    const questions = [];

    // 1. CẢNH BÁO WMF (Giữ nguyên thẻ HTML để render màu đỏ)
    let processedHtml = htmlString.replace(/<img[^>]+src="data:image\/[x\-]*wmf[^>]*>/gi, '<span class="text-red-500 font-bold bg-red-50 px-2 py-1 mx-1 rounded text-[10px] border border-red-200" title="Lỗi Equation 3.0">[⚠️ LỖI CÔNG THỨC WMF - DÙNG MATHTYPE ĐỂ SỬA]</span>');

    // BÍ KÍP: KHÔNG ĐƯỢC XÓA CHỮ [Mức độ] Ở ĐÂY, VÌ TA SẼ DÙNG NÓ LÀM "MỎ NEO" TÌM CÂU HỎI

    // 2. MÁY ÉP PHẲNG (GIỮ NGUYÊN HTML ĐỂ KHÔNG MẤT ẢNH)
    const flattenHTML = (htmlStr) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');
        const blocks = [];

        const walk = (node) => {
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'SECTION'].includes(node.nodeName)) {
                const parts = node.innerHTML.split(/<br\s*\/?>/i);
                parts.forEach(p => { if (p.trim()) blocks.push(p.trim()); });
            } else if (node.nodeName === 'TABLE') {
                blocks.push(node.outerHTML); 
            } else if (['UL', 'OL', 'TBODY'].includes(node.nodeName)) {
                Array.from(node.childNodes).forEach(walk);
            } else if (node.nodeType === 3 && node.textContent.trim()) {
                blocks.push(node.textContent.trim());
            } else if (node.nodeType === 1) {
                Array.from(node.childNodes).forEach(walk);
            }
        };
        Array.from(doc.body.childNodes).forEach(walk);
        return blocks;
    };

    const rawLines = flattenHTML(processedHtml);

    // 3. KHÂU NỐI DÒNG MỒ CÔI
    const lines = [];
    let pendingPrefix = "";
    for (let i = 0; i < rawLines.length; i++) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawLines[i];
        const cleanText = tempDiv.textContent.replace(/\s+/g, ' ').trim();

        if (/^(Câu|Bài|Question)\s*$/i.test(cleanText)) {
            pendingPrefix = rawLines[i] + ' '; 
            continue;
        }
        if (pendingPrefix) {
            lines.push(pendingPrefix + rawLines[i]);
            pendingPrefix = "";
        } else {
            lines.push(rawLines[i]);
        }
    }
    if (pendingPrefix) lines.push(pendingPrefix);

    // 4. CỖ MÁY TRẠNG THÁI
    let currentSectionType = 'multiple_choice'; 
    let currentQuestion = null; 
    let qCount = 1;

    const pushCurrentQuestion = () => {
        if (currentQuestion) {
            if (!currentQuestion.opt_a && !currentQuestion.opt_b && currentSectionType === 'multiple_choice') {
                currentQuestion.type = 'fill_blank';
                currentQuestion.correct_opt = '';
            }
            questions.push(currentQuestion);
            currentQuestion = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        let nodeHtml = lines[i];
        
        // Tạo biến text thô để chạy Regex, nhưng KẾT QUẢ GÁN VÀO WEB PHẢI LÀ nodeHtml (Để giữ ảnh)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = nodeHtml;
        const rawText = (tempDiv.textContent || '').replace(/\s+/g, ' ').trim();

        if (/^(HƯỚNG DẪN GIẢI|LỜI GIẢI CHI TIẾT|ĐÁP ÁN VÀ LỜI GIẢI|BẢNG ĐÁP ÁN|ĐÁP ÁN)$/i.test(rawText)) break;

        // BẮT CHUYỂN PHẦN
        const secMatch = rawText.match(/(?:^|\W*)PHẦN\s*([I1]{1,3}|[1-3])/i);
        if (secMatch && rawText.length < 250) { 
            pushCurrentQuestion();
            const secNum = secMatch[1].toUpperCase();
            
            if (/(đúng|sai)/i.test(rawText)) currentSectionType = 'true_false';
            else if (/(ngắn|điền|tự luận)/i.test(rawText)) currentSectionType = 'fill_blank';
            else if (secNum === 'I' || secNum === '1') currentSectionType = 'multiple_choice';
            else if (secNum === 'II' || secNum === '2') currentSectionType = 'true_false';
            else if (secNum === 'III' || secNum === '3') currentSectionType = 'fill_blank';
            continue;
        }

        // 🔥 ĐIỂM CHẾT LÀ ĐÂY: NHẬN DIỆN BẰNG "CÂU X" HOẶC "[MỨC ĐỘ Y]" 🔥
        const isNewQuestion = /^(?:\W*)(?:Câu\s*\d+|\[\s*Mức\s*độ\s*\d+\s*\])/i.test(rawText);

        if (isNewQuestion && rawText.length > 5) {
            pushCurrentQuestion();

            const optRegexStr = currentSectionType === 'true_false' 
                ? "(?:\\s*<[^>]+>\\s*)*(?:a|b|c|d)[\\.\\:\\)\\/]\\s*" 
                : "(?:\\s*<[^>]+>\\s*)*(?:A|B|C|D)[\\.\\:\\)\\/]\\s*";
            const optSplitRegex = new RegExp(`(?=${optRegexStr})`, 'i');
            
            // Cắt Đề và Đáp án
            const parts = nodeHtml.split(optSplitRegex);

            // Gọt bỏ chữ "Câu X" và "[Mức độ Y]" ra khỏi Đề bài để giao diện sạch sẽ
            let cleanHtml = parts[0]
                .replace(/^(?:\s*<[^>]+>\s*)*Câu\s*\d+[\.\:\-\s]*/i, '')
                .replace(/\[\s*Mức\s*độ\s*\d+\s*\]/gi, '')
                .trim();

            currentQuestion = {
                id: qCount++,
                type: currentSectionType,
                content: cleanHtml,
                opt_a: '', opt_b: '', opt_c: '', opt_d: '',
                correct_opt: currentSectionType === 'true_false' ? 'F,F,F,F' : (currentSectionType === 'fill_blank' ? '' : 'A'),
                image_file: null, image_preview: null,
                isEditing: false
            };

            // Nếu A B C D nằm chung dòng
            if (parts.length > 1) {
                for (let j = 1; j < parts.length; j++) {
                    const p = parts[j];
                    const tDiv = document.createElement('div');
                    tDiv.innerHTML = p;
                    const pText = tDiv.textContent.replace(/\s+/g, ' ').trim();

                    const match = currentSectionType === 'true_false' 
                        ? pText.match(/^(?:\W*)(a|b|c|d)[\.\:\)\/]/i) 
                        : pText.match(/^(?:\W*)(A|B|C|D)[\.\:\)\/]/i);
                        
                    if (match) {
                        const l = match[1].toLowerCase();
                        const cleanOptHtml = p.replace(/^(?:\s*<[^>]+>\s*)*(?:A|B|C|D|a|b|c|d)[\.\:\)\/]/i, '').trim();
                        currentQuestion[`opt_${l}`] += cleanOptHtml;
                    }
                }
            }
            continue; 
        }

        // BẮT ĐÁP ÁN ĐỘC LẬP & NỐI DÒNG
        if (currentQuestion) {
            const isOptionsLine = currentSectionType === 'true_false' 
                ? /^(?:\W*)(a|b|c|d)[\.\:\)\/]\s*/i.test(rawText) 
                : /^(?:\W*)(A|B|C|D)[\.\:\)\/]\s*/i.test(rawText);

            if (isOptionsLine && currentSectionType !== 'fill_blank') {
                const splitRegex = currentSectionType === 'true_false' 
                    ? /(?=(?:^|>|\s+)(?:a|b|c|d)[\.\:\)\/]\s*)/i 
                    : /(?=(?:^|>|\s+)(?:A|B|C|D)[\.\:\)\/]\s*)/i;
                
                const parts = nodeHtml.split(splitRegex);
                parts.forEach(p => {
                    const tDiv = document.createElement('div');
                    tDiv.innerHTML = p;
                    const pText = tDiv.textContent.replace(/\s+/g, ' ').trim();
                    
                    const match = currentSectionType === 'true_false' 
                        ? pText.match(/^(?:\W*)(a|b|c|d)[\.\:\)\/]\s*/i) 
                        : pText.match(/^(?:\W*)(A|B|C|D)[\.\:\)\/]\s*/i);
                        
                    if (match) {
                        const l = match[1].toLowerCase();
                        const cleanOptHtml = p.replace(/^(?:\s*<[^>]+>\s*)*(?:A|B|C|D|a|b|c|d)[\.\:\)\/]/i, '').trim();
                        currentQuestion[`opt_${l}`] += cleanOptHtml;
                    }
                });
            } else {
                if (nodeHtml.startsWith('<table')) {
                    if (/A[\.\:\)]/i.test(rawText) && /B[\.\:\)]/i.test(rawText)) {
                        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                        let tdMatch;
                        while ((tdMatch = tdRegex.exec(nodeHtml)) !== null) {
                            const tdHtml = tdMatch[1];
                            const tDiv = document.createElement('div');
                            tDiv.innerHTML = tdHtml;
                            const tdText = tDiv.textContent.replace(/\s+/g, ' ').trim();
                            
                            const match = currentSectionType === 'true_false' 
                                ? tdText.match(/^(?:\W*)(a|b|c|d)[\.\:\)\/]/i) 
                                : tdText.match(/^(?:\W*)(A|B|C|D)[\.\:\)\/]/i);
                            
                            if (match) {
                                const l = match[1].toLowerCase();
                                const cleanOptHtml = tdHtml.replace(/^(?:\s*<[^>]+>\s*)*(?:A|B|C|D|a|b|c|d)[\.\:\)\/]/i, '').trim();
                                currentQuestion[`opt_${l}`] = cleanOptHtml;
                            }
                        }
                    } else {
                        currentQuestion.content += `<div class="overflow-x-auto my-3 p-2 bg-white border rounded shadow-sm">${nodeHtml}</div>`;
                    }
                } else {
                    if (currentSectionType !== 'fill_blank' && (currentQuestion.opt_a || currentQuestion.opt_b)) {
                        if (currentQuestion.opt_d) currentQuestion.opt_d += `<br/>${nodeHtml}`;
                        else if (currentQuestion.opt_c) currentQuestion.opt_c += `<br/>${nodeHtml}`;
                        else if (currentQuestion.opt_b) currentQuestion.opt_b += `<br/>${nodeHtml}`;
                        else if (currentQuestion.opt_a) currentQuestion.opt_a += `<br/>${nodeHtml}`;
                    } else {
                        currentQuestion.content += (currentQuestion.content ? `<br/>` : '') + nodeHtml;
                    }
                }
            }
        }
    }
    
    pushCurrentQuestion();
    return questions;
};

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
      // 🚀 CỖ MÁY TRẠNG THÁI XỬ LÝ FILE WORD (STATE MACHINE)
      // =======================================================

      // 1. TRẢM LỜI GIẢI PHÍA SAU (Giữ nguyên - Rất tốt)
      const solutionRegex = /\n\s*(?:HƯỚNG DẪN GIẢI|HƯỚNG DẪN CHI TIẾT|LỜI GIẢI CHI TIẾT|ĐÁP ÁN VÀ LỜI GIẢI|BẢNG ĐÁP ÁN)/i;
      const solMatch = cleanText.match(solutionRegex);
      if (solMatch) {
        cleanText = cleanText.substring(0, solMatch.index);
      }

      // 2. DỌN DẸP RÁC
      cleanText = cleanText.replace(/Mỗi câu hỏi thí sinh chỉ chọn một phương án\.?/gi, '');
      cleanText = cleanText.replace(/\[Mức độ\s*\d+\]/gi, ''); // Xóa nhãn mức độ cho sạch

      // 3. THUẬT TOÁN ĐỌC TỪNG DÒNG (DÒNG NÀO RA DÒNG ĐÓ)
      const lines = cleanText.split('\n');
      
      let currentState = 'IDLE'; 
      let currentQuestion = null; 
      let currentSectionType = 'multiple_choice'; 
      let qCount = 1;

      // Mỏ neo Regex siêu mạnh
      const regexSection = /^(?:PHẦN\s*(?:I{1,3}|[1-3]))\s*[\:\.]?\s*(.*)/i;
      const regexQuestion = /^(?:Câu|Bài|Question)\s*(\d+)[\.\:\-]?\s*(.*)/i;
      const regexOption = /^(A|B|C|D)[\.\:\)]\s*(.*)/i;

      // Hàm đóng gói câu hỏi để lưu vào mảng
      const pushCurrentQuestion = () => {
        if (currentQuestion) {
          // Tự động nhận diện Tự luận nếu thiếu đáp án A, B
          if (!currentQuestion.opt_a && !currentQuestion.opt_b && currentSectionType === 'multiple_choice') {
            currentQuestion.type = 'fill_blank';
            currentQuestion.correct_opt = '';
          }
          questions.push(currentQuestion);
          currentQuestion = null;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // A. CHUYỂN PHẦN (SECTION)
        const secMatch = line.match(regexSection);
        if (secMatch) {
          pushCurrentQuestion(); 
          const secText = secMatch[1] || '';
          if (/(đúng|sai|đúng\/sai)/i.test(secText)) currentSectionType = 'true_false';
          else if (/(ngắn|điền|tự luận)/i.test(secText)) currentSectionType = 'fill_blank';
          else currentSectionType = 'multiple_choice';
          currentState = 'IDLE';
          continue;
        }

        // B. BẮT ĐẦU CÂU HỎI MỚI
        const qMatch = line.match(regexQuestion);
        if (qMatch) {
          pushCurrentQuestion(); 
          currentQuestion = {
            id: qCount++,
            type: currentSectionType,
            content: qMatch[2].trim(),
            opt_a: '', opt_b: '', opt_c: '', opt_d: '',
            correct_opt: currentSectionType === 'true_false' ? 'F,F,F,F' : (currentSectionType === 'fill_blank' ? '' : 'A'),
            image_file: null, image_preview: null,
            isEditing: false
          };
          currentState = 'READING_QUESTION';
          continue;
        }

        // C. XỬ LÝ ĐÁP ÁN & NỐI DÒNG DỮ LIỆU
        if (currentQuestion) {
          const optMatch = line.match(regexOption);
          
          if (optMatch && currentSectionType !== 'fill_blank') {
            // Trúng 1 đáp án ở đầu dòng
            const letter = optMatch[1].toLowerCase(); 
            currentQuestion[`opt_${letter}`] = optMatch[2].trim();
            currentState = `READING_OPTION_${letter.toUpperCase()}`; 
            
            // QUAN TRỌNG: Cắt đáp án hàng ngang (A. 1 B. 2 C. 3 D. 4)
            let remainingLine = optMatch[2].trim();
            const otherOptsMatch = remainingLine.match(/(?:\s+)(B|C|D)[\.\:\)]\s*(.*)/i);
            
            if (otherOptsMatch) {
              const allOpts = line.split(/(?=(?:^|\s+)(?:A|B|C|D)[\.\:\)]\s*)/i);
              allOpts.forEach(optBlock => {
                const blockMatch = optBlock.trim().match(regexOption);
                if (blockMatch) {
                  const blkLetter = blockMatch[1].toLowerCase();
                  currentQuestion[`opt_${blkLetter}`] = blockMatch[2].trim();
                }
              });
              // Nếu dòng này chứa nhiều đáp án, coi như đã đọc xong khối đáp án đó
              currentState = 'IDLE'; 
            }
          } 
          else {
            // KHÔNG TRÚNG REGEX NÀO -> NỐI VÀO PHẦN ĐANG ĐỌC (Nối đoạn văn dài)
            if (currentState === 'READING_QUESTION') {
              currentQuestion.content += '\n' + line; 
            } else if (currentState.startsWith('READING_OPTION_')) {
              const letter = currentState.split('_')[2].toLowerCase();
              currentQuestion[`opt_${letter}`] += '\n' + line;
            }
          }
        }
      }
      
      // Đừng quên lưu câu hỏi cuối cùng của bài thi!
      pushCurrentQuestion();
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

    try {
      if (ext === 'docx') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        
        // 1. Chuyển Word sang HTML, GIỮ LẠI HÌNH ẢNH (Biến thành Base64)
        const result = await mammoth.convertToHtml({ arrayBuffer }, {
            convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                    return { src: "data:" + image.contentType + ";base64," + imageBuffer };
                });
            })
        });
        
        const htmlContent = result.value;
        
        // 2. Gọi hàm Parser DOM HTML mới
        const domQuestions = parseWordHTMLToQuestions(htmlContent); 
        
        if (domQuestions.length > 0) {
          setParsedQuestions(domQuestions);
        } else {
          alert("Hệ thống không tìm thấy cấu trúc câu hỏi Word. Vui lòng kiểm tra lại file!");
        }

      } else if (ext === 'tex' || ext === 'txt') {
        // Xử lý file TEX bằng code regex cũ cực xịn của bạn
        let rawText = await selectedFile.text();
        const regexResult = parseExamTextWithRegex(rawText);
        
        if (regexResult.length > 0) {
          setParsedQuestions(regexResult);
        } else {
          alert("Hệ thống không tìm thấy cấu trúc câu hỏi TEX nào!");
        }
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
                    {/* HEADER BẢNG ĐÁP ÁN */}
                    <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
                      <h3 className="font-bold text-gray-800 text-lg">Bảng Đáp Án Nhanh (PDF)</h3>
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <span className="text-sm font-bold text-blue-800">Số câu:</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={numPdfQuestions} 
                          onChange={e => setNumPdfQuestions(Number(e.target.value) || 1)} 
                          className="w-14 px-1 py-1 rounded text-center font-bold outline-none" 
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                      {/* GRID CÂU HỎI: Tự co giãn theo màn hình */}
                      <div className={`grid gap-x-4 gap-y-4 ${showLeftPanel ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2'}`}>
                        {Array.from({ length: numPdfQuestions }, (_, i) => i + 1).map(qNum => {
                          const qType = pdfQuestionTypes[qNum] || 'multiple_choice';

                          return (
                            <div key={qNum} className="flex flex-col p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors shadow-sm gap-3">
                              
                              {/* 1. DÒNG TIÊU ĐỀ & CHỌN LOẠI CÂU HỎI */}
                              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-400 italic text-sm">CÂU {qNum}</span>
                                </div>
                                
                                <select 
                                  value={qType}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    setPdfQuestionTypes(prev => ({ ...prev, [qNum]: newType }));
                                    // Reset đáp án để tránh rác dữ liệu khi đổi loại
                                    if (newType === 'true_false') setPdfAnswers(prev => ({ ...prev, [qNum]: '?,?,?,?' }));
                                    else if (newType === 'multiple_choice') setPdfAnswers(prev => ({ ...prev, [qNum]: 'A' }));
                                    else setPdfAnswers(prev => ({ ...prev, [qNum]: '' }));
                                  }}
                                  className={`text-[11px] font-bold px-2 py-1 rounded border outline-none transition-colors ${
                                    qType === 'true_false' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    qType === 'fill_blank' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  <option value="multiple_choice">Trắc nghiệm ABCD</option>
                                  <option value="true_false">Đúng / Sai (2025)</option>
                                  <option value="fill_blank">Tự luận / Điền số</option>
                                </select>
                              </div>

                              {/* 2. KHU VỰC NHẬP ĐÁP ÁN THEO LOẠI */}
                              <div className="flex-1">
                                {qType === 'fill_blank' ? (
                                  /* Dạng Tự luận / Điền số */
                                  <input 
                                    type="text" 
                                    value={pdfAnswers[qNum] || ''} 
                                    onChange={(e) => handlePdfAnswerSelect(qNum, e.target.value)} 
                                    placeholder="Nhập đáp án đúng..." 
                                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl text-sm outline-none focus:border-purple-500 font-bold text-purple-700 bg-white shadow-inner"
                                  />
                                ) : qType === 'true_false' ? (
                                  /* Dạng Đúng / Sai (4 ý a, b, c, d) */
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {['a', 'b', 'c', 'd'].map((label, idx) => {
                                      const currentArr = (pdfAnswers[qNum] || '?,?,?,?').split(',');
                                      return (
                                        <div key={label} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-gray-100">
                                          <span className="text-[10px] font-black text-gray-400 uppercase">Ý {label}.</span>
                                          <div className="flex gap-1">
                                            {['T', 'F'].map(val => (
                                              <button
                                                key={val}
                                                onClick={() => {
                                                  const newArr = [...currentArr];
                                                  newArr[idx] = val;
                                                  handlePdfAnswerSelect(qNum, newArr.join(','));
                                                }}
                                                className={`w-12 py-1 rounded-md font-bold text-[10px] transition-all ${
                                                  currentArr[idx] === val 
                                                  ? 'bg-amber-500 text-white shadow-sm' 
                                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                              >
                                                {val === 'T' ? 'Đúng' : 'Sai'}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Dạng Trắc nghiệm ABCD thường */
                                  <div className="flex justify-between bg-white p-2 rounded-2xl border border-gray-100">
                                    {['A', 'B', 'C', 'D'].map(opt => (
                                      <button 
                                        key={opt} 
                                        onClick={() => handlePdfAnswerSelect(qNum, opt)} 
                                        className={`w-10 h-10 rounded-full font-bold text-sm shadow-sm transition-all ${
                                          pdfAnswers[qNum] === opt 
                                          ? 'bg-blue-600 text-white scale-110 shadow-blue-200' 
                                          : 'bg-white text-gray-400 hover:bg-blue-50'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                            <div className="mb-2 bg-white rounded-lg">
                              <BlockEditor
                                initialContent={q.content}
                                onChange={(content) => updateParsedQuestion(index, 'content', content)}
                              />
                            </div>
                          ) : (
                            <div className="content-preview text-gray-700 leading-relaxed font-medium">
                              <SafeLatex>{q.content}</SafeLatex>
                            </div>
                          )}
                        </div>
                        
                        {/* CÁC NÚT ĐIỀU KHIỂN BÊN PHẢI */}
                        <div className="flex flex-col gap-2 shrink-0 w-full md:w-56 mt-4 md:mt-0">
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
                      {/* NÚT ĐÍNH KÈM ẢNH CHO TỪNG CÂU HỎI (GIỮ NGUYÊN)            */}
                      {/* ========================================================= */}
                      <div className="mb-4 bg-white border border-dashed p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-500">Đính kèm ảnh thêm (Nếu không dùng kéo thả)</span>
                          {q.image_preview && <button onClick={() => handleRemoveQuestionImage(index)} className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">Xóa ảnh</button>}
                        </div>
                        {!q.image_preview ? (
                          <label className="flex justify-center p-2 bg-blue-50 text-blue-500 rounded cursor-pointer hover:bg-blue-100 font-semibold text-sm transition-colors">
                            Tải ảnh lên <input type="file" className="hidden" accept="image/*" onChange={e => handleQuestionImageUpload(index, e.target.files[0])}/>
                          </label>
                        ) : (
                          <img src={q.image_preview} className="max-h-32 mx-auto rounded border shadow-sm" alt="Preview" />
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
                                  {q.isEditing ? (
                                    <div className="flex-1 w-full bg-white rounded-lg">
                                      <BlockEditor
                                        initialContent={q[`opt_${opt}`]}
                                        onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)}
                                      />
                                    </div>
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
                                {q.isEditing ? (
                                  <div className="flex-1 w-full bg-white rounded-lg">
                                    <BlockEditor
                                      initialContent={q[`opt_${opt}`]}
                                      onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)}
                                    />
                                  </div>
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