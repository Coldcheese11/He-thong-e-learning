import React, { useState, useRef, useEffect, Component } from 'react';
import { UploadCloud, FileText, Save, Globe, Lock, Image as ImageIcon, X, CheckCircle, Clock, BookOpen, Settings, AlertCircle, Upload, Zap, Sparkles, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as mammoth from 'mammoth';
import 'katex/dist/katex.min.css';
import katex from 'katex';
window.katex = katex;
import BlockEditor from '../components/BlockEditor';
// --- BỘ IMPORT MỚI ĐÃ SỬA LỖI VITE ---
import CodeEditor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-latex'; 
import 'prismjs/themes/prism.css'; 

// 🔥 BÍ KÍP TRỊ LỖI OBJECT CỦA VITE:
const Editor = CodeEditor.default || CodeEditor; 
// ====================================

// =========================================================================
// 🛡️ LỚP BẢO VỆ CÔNG THỨC TOÁN (ERROR BOUNDARY)
// =========================================================================
class SafeLatex extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // THÊM ĐOẠN NÀY ĐỂ CHỐNG LAG (NÓ SẼ CHẶN RENDER LẠI NẾU NỘI DUNG KHÔNG ĐỔI)
  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.hasError !== nextState.hasError) return true;
    return nextProps.children !== this.props.children;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

renderMath(text) {
    let processText = text;
    if (typeof processText === 'string') {
      // 1. DỊCH LỆNH LATEX ĐẶC THÙ VN
      processText = processText.replace(/\\begin\{eqnarray\*\}?/g, '\\begin{aligned}').replace(/\\end\{eqnarray\*\}?/g, '\\end{aligned}');
      processText = processText.replace(/\\begin\{eqnarray\}?/g, '\\begin{aligned}').replace(/\\end\{eqnarray\}?/g, '\\end{aligned}');
      processText = processText.replace(/\\begin\{itemchoice\}?/g, '<div class="pl-4 mt-2">').replace(/\\end\{itemchoice\}?/g, '</div>');
      processText = processText.replace(/\\begin\{itemize\}?/g, '<div class="pl-4 mt-2">').replace(/\\end\{itemize\}?/g, '</div>');
      processText = processText.replace(/\\itemch/g, '<br/><span class="text-blue-500 font-bold">•</span> ');
      processText = processText.replace(/\\item/g, '<br/><span class="text-blue-500 font-bold">•</span> ');

      // 🔥 BÍ KÍP MỚI: TỰ ĐỘNG VÁ LỖI PHÂN SỐ BỊ RỤNG NGOẶC CỦA GIÁO VIÊN
      const fixDfrac = (str) => {
          // Vá lỗi 1: \dfrac{Tử Mẫu} -> \dfrac{Tử}{Mẫu}
          let res = str.replace(/\\dfrac\s*\{((?:[^{}]|\{[^{}]*\})+?)\s+([^\s{}]+)\}/g, '\\dfrac{$1}{$2}');
          // Vá lỗi 2: \dfrac Tử Mẫu (Rụng hết cả 2 ngoặc ngoài) -> \dfrac{Tử}{Mẫu}
          res = res.replace(/\\dfrac\s+(\\[a-zA-Z]+\{[^{}]*\}|[a-zA-Z0-9\-\.\^]+)\s+([a-zA-Z0-9\-\.\^]+)/g, '\\dfrac{$1}{$2}');
          return res;
      };
      
      // Chạy qua 2 lần để vá luôn cả phân số lồng nhau
      processText = fixDfrac(processText);
      processText = fixDfrac(processText);

      // Ép các cú pháp \[ \] và \( \) về chuẩn $$ và $ của KaTeX
      processText = processText.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
      processText = processText.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    } else {
      return processText;
    }

    const parts = processText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    return parts.map((part, index) => {
      try {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          const html = katex.renderToString(math, { 
            displayMode: true, throwOnError: false, 
            macros: {"\\heva": "\\begin{cases} #1 \\end{cases}", "\\hoac": "\\left[\\begin{matrix} #1 \\end{matrix}\\right."} 
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          const html = katex.renderToString(math, { 
            displayMode: false, throwOnError: false, 
            macros: {"\\heva": "\\begin{cases} #1 \\end{cases}", "\\hoac": "\\left[\\begin{matrix} #1 \\end{matrix}\\right."} 
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } else {
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        }
      } catch (e) {
        return <span key={index} className="text-red-500 font-bold bg-red-50 px-1 rounded">{part}</span>;
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-sm shadow-sm">⚠️ Lỗi hiển thị Toán</span>;
    }
    return <span className="latex-container">{this.renderMath(this.props.children)}</span>;
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

  
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false); 

  // --- STATE CHO CHẾ ĐỘ SPLIT VIEW (TEX) ---
  const [rawTexCode, setRawTexCode] = useState(''); // Lưu code TeX thô để edit
  const [isScanningTikz, setIsScanningTikz] = useState(false); // Trạng thái chờ quét ảnh TikZ
  const [activeLine, setActiveLine] = useState(null); // BIẾN MỚI: LƯU DÒNG ĐANG ĐƯỢC CHỌN ĐỂ HIỆN MŨI TÊN
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const lineNumbersRef = useRef(null); // <-- THÊM DÒNG NÀY ĐỂ LÀM SỐ DÒNG AZOTA
  // --- STATE CHO CHIA ĐIỂM NHANH ---
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [scores, setScores] = useState({
    totalMcq: 10,  // Mặc định tổng 10 điểm cho trắc nghiệm
    totalTf: 0,
    totalFib: 0,
    tfConfig: { 1: 10, 2: 25, 3: 50, 4: 100 } // % điểm câu Đúng/Sai
  });

  // Đếm nhanh số lượng từng loại câu hỏi
  const mcqCount = parsedQuestions.filter(q => q.type === 'multiple_choice').length;
  const tfCount = parsedQuestions.filter(q => q.type === 'true_false').length;
  const fibCount = parsedQuestions.filter(q => q.type === 'fill_blank').length;

  // Hàm xử lý khi bấm nút "Chia"
  const handleApplyScores = () => {
    const updatedQuestions = parsedQuestions.map(q => {
      let qPoint = 0;
      if (q.type === 'multiple_choice' && mcqCount > 0) qPoint = scores.totalMcq / mcqCount;
      if (q.type === 'true_false' && tfCount > 0) qPoint = scores.totalTf / tfCount;
      if (q.type === 'fill_blank' && fibCount > 0) qPoint = scores.totalFib / fibCount;
      
      return { 
        ...q, 
        points: Number(qPoint.toFixed(2)), // Làm tròn 2 chữ số
        tf_scoring_config: q.type === 'true_false' ? scores.tfConfig : null // Lưu config vào câu Đ/S
      };
    });
    setParsedQuestions(updatedQuestions);
    setIsScoreModalOpen(false);
    alert('✅ Đã chia điểm thành công!');
  };

// =====================================================================
  // HÀM QUÉT ẢNH TIKZ (GHÉP CHÍNH XÁC VÀO CÂU HỎI MÀ KHÔNG CẦN TÌM CHỮ)
  // =====================================================================
  const handleScanTikzImages = async (autoCode = null, currentQs = null) => {
    setIsScanningTikz(true);
    let questionsToUpdate = currentQs ? [...currentQs] : [...parsedQuestions];

    // 1. Gom tất cả các câu hỏi có chứa code TikZ đã được bóc tách ở Bước 2
    let tasks = [];
    questionsToUpdate.forEach((q, idx) => {
        if (q.tikz_codes && q.tikz_codes.length > 0) {
            tasks.push({ qIndex: idx, code: q.tikz_codes[0] }); // Lấy khối code đầu tiên
        }
    });

    if (tasks.length === 0) {
        if (!autoCode) alert('⚠️ Không tìm thấy hình vẽ TikZ nào cần quét!');
        setIsScanningTikz(false);
        return;
    }

    setScanProgress({ current: 0, total: tasks.length });
    let successCount = 0;

    // 2. Gửi từng code lên Server Render và gắn thẳng vào đúng Index câu hỏi đó
    for (let i = 0; i < tasks.length; i++) {
        const { qIndex, code } = tasks[i];
        setScanProgress({ current: i + 1, total: tasks.length });

        try {
            const response = await fetch('https://tikz-engine-api.onrender.com/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tikz_codes: [code] })
            });

            if (response.ok) {
                const { images } = await response.json();
                if (images[0] && images[0] !== "ERROR") {
                    questionsToUpdate[qIndex].image_preview = images[0];
                    successCount++;
                    setParsedQuestions([...questionsToUpdate]); // Cập nhật ngay lên UI
                }
            }
        } catch (error) {
            console.error(`Lỗi render câu ${qIndex + 1}:`, error);
        }
    }

    if (!autoCode) alert(`✅ Đã quét và tự động gắn ${successCount}/${tasks.length} hình TikZ cực chuẩn!`);
    setIsScanningTikz(false);
    setScanProgress({ current: 0, total: 0 });
  };

  // Hàm tự động parse lại câu hỏi khi Giáo viên gõ vào khung Code
  const handleTexCodeChange = (newCode) => {
    setRawTexCode(newCode);
    // Tính năng xịn: Debounce hoặc Parse lại ngay lập tức
     const regexResult = parseExamTextWithRegex(newCode);
     setParsedQuestions(regexResult);
  };

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
    let cleanText = rawText.replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '')
                           .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
                           .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
                           .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
                           .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1');

    // Xử lý thông minh cho \immini để không bị dư ngoặc
    cleanText = cleanText.replace(/\\immini(?:\[.*?\])?\s*/g, '');

    // =======================================================
    // 2. BẮT ĐẦU BÓC TÁCH CÂU HỎI
    // =======================================================
    if (cleanText.includes('\\begin{ex}')) {
      const exBlocks = cleanText.match(/\\begin\{ex\}[\s\S]*?\\end\{ex\}/g) || [];
      exBlocks.forEach((block, index) => {
        let content = block.replace(/\\begin\{ex\}(\s*%\[.*?\])*/, '').replace(/\\end\{ex\}/, '');
        let options = ['', '', '', ''], correctOpt = '', questionType = 'fill_blank';
        
        // 🔥 BÓC TÁCH LỜI GIẢI THAY VÌ XÓA BỎ 🔥
        let explanation = '';

        // 🔥 BÍ KÍP MỚI: BÓC TÁCH CODE TIKZ TRỰC TIẾP & XÓA BỎ DẤU VẾT 🔥
        let tikzCodes = [];
        const extractTikz = (textStr) => {
            const regex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
            const matches = textStr.match(regex);
            if (matches) tikzCodes.push(...matches);
            return textStr.replace(regex, '').trim(); // Xóa sạch chữ, không để lại cảnh báo nào
        };
        
        // Trường hợp 1: Dùng \begin{loigiai}...\end{loigiai}
        const beginLgMatch = content.match(/\\begin\{loigiai\}([\s\S]*?)\\end\{loigiai\}/);
        if (beginLgMatch) {
            explanation = beginLgMatch[1].trim();
            content = content.replace(beginLgMatch[0], '');
        } else {
            // Trường hợp 2: Dùng \loigiai{...}
            const loigiaiMatch = content.match(/\\loigiai\s*\{/);
            if (loigiaiMatch) {
                const loigiaiStartIdx = loigiaiMatch.index + loigiaiMatch[0].length - 1; // Trỏ tới dấu '{'
                const extractedLg = extractBraces(content, loigiaiStartIdx, 1); // Dùng hàm đếm ngoặc siêu xịn
                if (extractedLg.results.length > 0) {
                    explanation = extractedLg.results[0];
                    content = content.substring(0, loigiaiMatch.index) + content.substring(extractedLg.endIndex);
                } else {
                    content = content.substring(0, loigiaiMatch.index);
                }
            }
        }
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

        

       // TÍNH TOÁN SỐ DÒNG CỦA CÂU HỎI TRONG ĐOẠN CODE GỐC (ĐÃ FIX LỖI NHẢY VỀ ĐẦU TRANG)
        let searchIdx = -1;
        // Đi tìm chữ \begin{ex} thứ n tương ứng với câu hỏi hiện tại trong file gốc
        for (let k = 0; k <= index; k++) {
             searchIdx = rawText.indexOf('\\begin{ex}', searchIdx + 1);
        }
        const blockStartIdx = cleanText.indexOf(block);
        const lineIdx = searchIdx !== -1 ? rawText.substring(0, searchIdx).split('\n').length - 1 : 0;

        questions.push({ 
          id: index + 1, type: questionType, content: content, 
          opt_a: options[0], opt_b: options[1], opt_c: options[2], opt_d: options[3], 
          correct_opt: correctOpt, image_file: null, image_preview: null,
          lineIndex: lineIdx, // <-- LƯU SỐ DÒNG VÀO ĐÂY
          explanation: explanation,
          tikz_codes: tikzCodes
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

      const rawLinesForSearch = rawText.split('\n'); // 🔥 BẢN ĐỒ MỚI
      let lastRawLineIdx = 0; // 🔥 Đánh dấu vị trí đã quét qua

      let currentState = 'IDLE'; 
      let currentQuestion = null; 
      let currentSectionType = 'multiple_choice'; 
      let qCount = 1;
      let lastSearchIdx = 0; // 🔥 BÍ KÍP: Nhớ vị trí đã tìm để không bị nhảy lung tung

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

          // 🔥 BÍ KÍP TRỊ BỆNH LỆCH DÒNG LŨY TIẾN 🔥
          let realLineIdx = i; // Mặc định nếu xui lắm không tìm ra
          // Tự động bóc tách đúng con số của câu hỏi (Ví dụ: "Câu 8:" -> Lấy số 8)
          const numMatch = line.match(/^(?:Câu|Bài|Question)\s*(\d+)/i);
          
          if (numMatch) {
              const qNum = numMatch[1]; // Tự tay nắm lấy số (8, 9, 10...)
              // Tìm đúng dòng chứa "Câu 8" trong file GỐC (Chấp nhận cả \textbf, \textit)
              const searchRegex = new RegExp(`(?:Câu|Bài|Question)\\s*${qNum}(?!\\d)`, 'i');
              
              for (let r = lastRawLineIdx; r < rawLinesForSearch.length; r++) {
                  if (searchRegex.test(rawLinesForSearch[r])) {
                      realLineIdx = r;
                      lastRawLineIdx = r; // Cắm cờ tại đây để câu sau tìm tiếp, không bị lùi lại
                      break;
                  }
              }
          }

          currentQuestion = {
            id: qCount++,
            type: currentSectionType,
            content: qMatch[2] ? qMatch[2].trim() : '', 
            opt_a: '', opt_b: '', opt_c: '', opt_d: '',
            correct_opt: currentSectionType === 'true_false' ? 'F,F,F,F' : (currentSectionType === 'fill_blank' ? '' : 'A'),
            image_file: null, image_preview: null,
            isEditing: false,
            lineIndex: realLineIdx // <-- TRẢ VỀ CON SỐ TUYỆT ĐỐI CHÍNH XÁC 100%
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


    // =======================================================
    // BƯỚC CUỐI CÙNG: LƯỚI QUÉT TIKZ TOÀN CẦU VÀ DỌN RÁC NGOẶC
    // =======================================================
    questions.forEach(q => {
        let extractedTikz = [];
        
        const extractT = (textStr) => {
            if (!textStr) return '';
            // 🔥 CẢI TIẾN: Chấp nhận cả trường hợp rụng mất dấu } ở chữ tikzpicture cuối
            const regex = /\\begin\s*\{tikzpicture\}[\s\S]*?(?:\\end\s*\{tikzpicture\}|\\end\s*\{tikzpicture)/g;
            const matches = textStr.match(regex);
            
            if (matches) {
                // Tự động vá lại dấu } nếu bị thiếu để Server Render không bị sập
                const fixedMatches = matches.map(m => m.trim().endsWith('}') ? m : m + '}');
                extractedTikz.push(...fixedMatches);
            }
            return textStr.replace(regex, '').trim(); 
        };
        
        // Hút TikZ từ mọi ngóc ngách của câu hỏi
        q.content = extractT(q.content);
        q.explanation = extractT(q.explanation);
        ['opt_a', 'opt_b', 'opt_c', 'opt_d'].forEach(opt => {
            q[opt] = extractT(q[opt]);
        });
        
        // Lưu code TikZ vào câu hỏi
        q.tikz_codes = [...(q.tikz_codes || []), ...extractedTikz];
        
        // DỌN SẠCH CÁC NGOẶC RÁC CỦA LỆNH \immini DƯ THỪA
        const cleanBraces = (str) => {
            if (!str) return str;
            return str.replace(/\}\s*\{/g, '\n') // Xóa }{ ở giữa
                      .replace(/^[\s\{]+/, '')   // Xóa ngoặc { ở đầu
                      .replace(/[\s\}]+$/, '')   // Xóa ngoặc } ở cuối
                      .replace(/\\immini/g, '')  // Gỡ nốt chữ immini nếu còn sót
                      .trim();
        };
        
        q.content = cleanBraces(q.content);
        q.explanation = cleanBraces(q.explanation);
    });

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
        let rawText = await selectedFile.text();
        setRawTexCode(rawText); 
        const regexResult = parseExamTextWithRegex(rawText);
        
        if (regexResult.length > 0) {
          setParsedQuestions(regexResult); 
          
          // 🔥 BÍ KÍP MỚI: Truyền trực tiếp mảng câu hỏi vừa cắt được vào hàm quét
          if (rawText.includes('\\begin{tikzpicture}')) {
             handleScanTikzImages(rawText, regexResult); 
          }
          
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
          
          // Ưu tiên 1: Nếu có file ảnh tải lên bằng tay
          if (q.image_file) {
            const imgExt = q.image_file.name.split('.').pop();
            const imgName = `q_img_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${imgExt}`;
            const { error: imgUploadErr } = await supabase.storage.from('class_documents').upload(`questions/${imgName}`, q.image_file);
            if (!imgUploadErr) {
              const { data: imgUrlData } = supabase.storage.from('class_documents').getPublicUrl(`questions/${imgName}`);
              imageUrl = imgUrlData.publicUrl;
            }
          } 
          // Ưu tiên 2: Nếu không có file nhưng có ảnh TikZ (chuỗi data:image/png;base64)
          else if (q.image_preview && q.image_preview.startsWith('data:image')) {
            try {
              // Chuyển Base64 của TikZ thành File để upload
              const base64Data = q.image_preview.split(',')[1];
              const blob = await fetch(q.image_preview).then(res => res.blob());
              const imgName = `tikz_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.png`;
              
              const { error: tikzUploadErr } = await supabase.storage.from('class_documents').upload(`questions/${imgName}`, blob, { contentType: 'image/png' });
              if (!tikzUploadErr) {
                const { data: imgUrlData } = supabase.storage.from('class_documents').getPublicUrl(`questions/${imgName}`);
                imageUrl = imgUrlData.publicUrl;
              }
            } catch (e) { console.error("Lỗi upload TikZ:", e); }
          }

          return {
            content: q.content, 
            opt_a: q.opt_a, opt_b: q.opt_b, opt_c: q.opt_c, opt_d: q.opt_d,
            correct_opt: q.correct_opt, 
            explanation: q.explanation || '', // Phòng trường hợp null
            level: 'Trung bình', 
            subject_id: selectedSubject,
            image_url: imageUrl, // BÂY GIỜ ĐÃ LƯU ĐƯỢC CẢ ẢNH TIKZ
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
      {/* ========================================================= */}
      {/* HEADER & NÚT LƯU */}
      {/* ========================================================= */}
      <div className="mb-4 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-blue-700">Đăng và chỉnh sửa đề thi.</h2>
          <p className="text-gray-600 mt-1 text-sm">Lưu ý: Ưu tiên sử dụng pdf. Khả dụng PDF/Tex/Word</p>
        </div>
        <button onClick={handleSaveToDatabase} disabled={isSaving || !file} className="bg-green-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-md transition-all">
          {isSaving ? 'Đang lưu...' : <><Save size={20} /> Xuất Bản Đề Thi</>}
        </button>
      </div>

      {/* ========================================================= */}
      {/* THANH THÔNG TIN CHUNG (NẰM NGANG, GỌN GÀNG Ở TRÊN CÙNG) */}
      {/* ========================================================= */}
      {file && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 shadow-sm flex flex-wrap items-center gap-4 shrink-0 transition-all">
          <div className="flex items-center gap-2 font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Settings size={16}/> Cài đặt
          </div>
          
          <input type="text" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="Tên bài thi *" className="flex-1 min-w-[200px] p-2 border border-gray-200 rounded-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 text-sm" />
          
          <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium text-gray-700 text-sm bg-white">
            <option value="">-- Môn học --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Thời gian (Phút)" className="w-32 p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 text-sm text-center font-medium" />

          <div className="flex items-center gap-4 border-l border-gray-200 pl-4 ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={isShuffleQuestions} onChange={(e) => setIsShuffleQuestions(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-medium">Đảo câu</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={isShuffleOptions} onChange={(e) => setIsShuffleOptions(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm font-medium">Đảo đáp án</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold">Kho chung</span>
            </label>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KHU VỰC CHIA ĐÔI MÀN HÌNH CHÍNH */}
      {/* ========================================================= */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 1: GIAO DIỆN SPLIT VIEW DÀNH RIÊNG CHO FILE TEX (GIỐNG AZOTA)        */}
        {/* ========================================================================= */}
        {fileType === 'tex' && parsedQuestions.length > 0 ? (
          <>
            {/* NỬA TRÁI: REVIEW CÂU HỎI */}
            <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
              <div className="bg-gray-50 px-5 py-3 border-b flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-3">
                  <h3 className="font-extrabold text-lg text-gray-800">Review Câu Hỏi</h3>
                  <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">{parsedQuestions.length} câu</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleScanTikzImages()} disabled={isScanningTikz} className="bg-white hover:bg-purple-50 text-purple-700 font-bold py-1.5 px-4 rounded-lg flex items-center gap-2 transition-all text-sm border border-purple-200 shadow-sm">
                    {isScanningTikz ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> 
                        Đang chuyển ảnh {scanProgress.current}/{scanProgress.total}
                      </>
                    ) : (
                      <><Sparkles size={16}/> Quét ảnh TikZ</>
                    )}
                  </button>
                  <button onClick={() => setIsScoreModalOpen(true)} className="bg-[#144f5d] hover:bg-[#0f3d48] text-white font-bold py-1.5 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm border border-transparent">
                    <Zap size={16}/> Chia điểm
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50">
                {parsedQuestions.map((q, index) => (
                  <div 
                      key={index} 
                     onClick={(e) => {
                        e.stopPropagation();
                        // TỰ ĐỘNG CUỘN BẢNG CODE BÊN PHẢI TỚI ĐÚNG DÒNG (CHUẨN 100%)
                        if (fileType === 'tex' && q.lineIndex !== undefined) {
                          setActiveLine(q.lineIndex); // Bật mũi tên xanh bên cột số
                          
                          const scrollContainer = document.querySelector('.custom-scrollbar.relative');
                          
                          // Kiểm tra xem cột số dòng (Gutter) có tồn tại không
                          if (scrollContainer && lineNumbersRef.current) {
                            // 1. Tóm đúng cái thẻ <div> chứa số dòng hiện tại ở cột bên trái
                            const lineElement = lineNumbersRef.current.children[q.lineIndex];
                            
                            if (lineElement) {
                              // 2. Trình duyệt tự trả về tọa độ pixel thực tế của thẻ div đó
                              const exactTop = lineElement.offsetTop;
                              
                              // Trừ hao 50px để dòng code không bị dính mép trên
                              const targetTop = Math.max(0, exactTop - 50); 
                              
                              // 3. Cuộn cả bảng code và cột số dòng đến đúng pixel đó
                              scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
                              lineNumbersRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
                            }
                          }
                        }
                      }}
                      className="border border-gray-200 p-4 bg-white rounded-xl relative shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-4"
                    >
                    
                    {/* ======================================================== */}
                    {/* TẦNG 1: ĐỀ BÀI, HÌNH ẢNH & NÚT CÔNG CỤ */}
                    {/* ======================================================== */}
                    <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-4 gap-4">
                      
                      {/* Nửa trái: Đề bài & Ảnh */}
                      <div className="flex-1 w-full">
                        <div className="font-bold text-gray-800 text-lg mb-2">Câu {q.id}:</div>
                        
                        {/* 1A. Chữ đề bài */}
                        {q.isEditing ? (
                          <div className="mb-3 bg-white rounded-lg border shadow-inner" onClick={e => e.stopPropagation()}>
                            <BlockEditor initialContent={q.content} onChange={(content) => updateParsedQuestion(index, 'content', content)} />
                          </div>
                        ) : (
                          <div className="content-preview text-gray-800 leading-relaxed font-medium mb-3"><SafeLatex>{q.content}</SafeLatex></div>
                        )}

                        {/* 1B. Khung Ảnh (TikZ hoặc tải tay) - Nằm ngay dưới chữ */}
                        <div className="mb-2 bg-gray-50 border border-dashed border-gray-300 p-3 rounded-lg" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">🖼️ Đính kèm ảnh minh họa</span>
                            {q.image_preview && <button onClick={() => handleRemoveQuestionImage(index)} className="text-red-500 hover:text-white text-xs font-bold bg-red-50 hover:bg-red-500 px-2 py-1 rounded transition-colors">Xóa ảnh</button>}
                          </div>
                          {!q.image_preview ? (
                            <label className="flex justify-center p-2 bg-blue-50/50 text-blue-500 border border-blue-100 rounded cursor-pointer hover:bg-blue-50 font-semibold text-sm transition-colors">
                              Tải ảnh lên (Hoặc đợi quét TikZ) 
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleQuestionImageUpload(index, e.target.files[0])}/>
                            </label>
                          ) : (
                            <img src={q.image_preview} className="max-h-48 mx-auto rounded border border-gray-200 shadow-sm" alt="Preview" />
                          )}
                        </div>
                      </div>

                      {/* Nửa phải: Nút Lưu/Sửa & Chọn loại câu hỏi */}
                      <div className="flex flex-col gap-2 shrink-0 w-full md:w-48 mt-4 md:mt-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleEditMode(index)} className={`w-full py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${q.isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}>
                          {q.isEditing ? '💾 Lưu chỉnh sửa' : '✏️ Sửa lỗi'}
                        </button>
                        <select value={q.type} onChange={(e) => {
                          const newQs = [...parsedQuestions]; newQs[index].type = e.target.value;
                          if (e.target.value === 'true_false') newQs[index].correct_opt = 'F,F,F,F';
                          else if (e.target.value === 'multiple_choice') newQs[index].correct_opt = 'A';
                          else newQs[index].correct_opt = '';
                          setParsedQuestions(newQs);
                        }} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl outline-none border border-gray-200 cursor-pointer hover:bg-gray-50 bg-white">
                          <option value="multiple_choice">Trắc nghiệm (ABCD)</option>
                          <option value="true_false">Đúng / Sai (2025)</option>
                          <option value="fill_blank">Tự luận / Điền số</option>
                        </select>
                      </div>
                    </div>

                    {/* ======================================================== */}
                    {/* TẦNG 2: CÁC ĐÁP ÁN A, B, C, D HOẶC ĐÚNG/SAI */}
                    {/* ======================================================== */}
                    <div className="w-full" onClick={e => e.stopPropagation()}>
                      {q.type === 'multiple_choice' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                            {['a', 'b', 'c', 'd'].map(opt => (
                              <div key={opt} className={`p-3 rounded-xl border ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white shadow-sm'}`}>
                                <div className="flex gap-3">
                                  <span className="font-bold text-indigo-700 mt-1">{opt.toUpperCase()}.</span>
                                  {q.isEditing ? (
                                    <div className="flex-1 w-full bg-white rounded-lg">
                                      <BlockEditor initialContent={q[`opt_${opt}`]} onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)} />
                                    </div>
                                  ) : (<div className="text-gray-800 flex-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <span className="text-xs font-bold text-gray-500">ĐÁP ÁN ĐÚNG:</span>
                            <div className="flex gap-2">
                              {['A', 'B', 'C', 'D'].map(opt => (
                                <button key={opt} onClick={() => changeParsedCorrectOpt(index, opt)} className={`w-9 h-9 rounded-lg font-bold text-sm transition-transform ${q.correct_opt === opt ? 'bg-green-500 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : q.type === 'true_false' ? (
                        <div className="grid grid-cols-1 gap-2 mb-3">
                          {['a', 'b', 'c', 'd'].map((opt, i) => (
                            <div key={opt} className={`p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                              <div className="flex-1 w-full flex gap-3 text-sm">
                                <span className="font-bold text-blue-700 mt-1">{opt.toUpperCase()}.</span> 
                                {q.isEditing ? (
                                  <div className="flex-1 w-full bg-white rounded-lg">
                                    <BlockEditor initialContent={q[`opt_${opt}`]} onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)} />
                                  </div>
                                ) : (<div className="pt-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>)}
                              </div>
                              <div className="flex gap-1 shrink-0 mt-2 sm:mt-0">
                                {['T', 'F'].map(val => (
                                  <button key={val} onClick={() => {
                                    const currentArr = (q.correct_opt || "?,?,?,?").split(','); currentArr[i] = val; changeParsedCorrectOpt(index, currentArr.join(','));
                                  }} className={`px-4 py-2 rounded font-bold text-xs transition-colors ${q.correct_opt?.split(',')[i] === val ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {val === 'T' ? 'Đúng' : 'Sai'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-2">
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nhập đáp án (Tự luận / Điền khuyết):</label>
                          <input type="text" value={q.correct_opt} onChange={(e) => changeParsedCorrectOpt(index, e.target.value)} className="w-full p-3 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 font-bold text-purple-700 bg-purple-50" placeholder="Nhập đáp án đúng vào đây..." />
                        </div>
                      )}
                    </div>

                    {/* ======================================================== */}
                    {/* TẦNG 3: LỜI GIẢI LUÔN NẰM DƯỚI CÙNG (DƯỚI CẢ ĐÁP ÁN) */}
                    {/* ======================================================== */}
                    {(q.explanation || q.isEditing) && (
                      <div className="w-full mt-2 p-4 bg-yellow-50/80 border-t-4 border-t-yellow-400 border border-yellow-200 rounded-b-xl shadow-sm" onClick={e => e.stopPropagation()}>
                        <h4 className="text-xs font-bold text-yellow-800 mb-3 uppercase flex items-center gap-1.5">
                          <BookOpen size={15} /> Hướng dẫn giải chi tiết (Chỉ Giáo Viên Thấy)
                        </h4>
                        {q.isEditing ? (
                          <div className="bg-white rounded-lg border shadow-inner">
                            <BlockEditor initialContent={q.explanation || ''} onChange={(content) => updateParsedQuestion(index, 'explanation', content)} />
                          </div>
                        ) : (
                          <div className="text-gray-700 text-sm leading-relaxed border-l-2 border-yellow-400 pl-3 italic">
                            <SafeLatex>{q.explanation}</SafeLatex>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>

            {/* NỬA PHẢI: KHUNG CODE EDITOR TRẮNG (CÓ ĐÁNH SỐ DÒNG CHUẨN AZOTA) */}
            <div className="w-[45%] flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
              <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex justify-between items-center shrink-0">
                <span className="text-blue-800 font-mono text-sm font-bold flex items-center gap-2">
                  <FileText size={16}/> {file.name}
                </span>
                <button 
                  onClick={() => {
                    const newResult = parseExamTextWithRegex(rawTexCode);
                    
                    // 🔥 BÍ KÍP BẢO TỒN ẢNH: Nhặt ảnh từ mảng cũ đắp sang mảng mới
                    const finalQuestions = newResult.map((newQ, idx) => {
                      const oldQ = parsedQuestions[idx]; 
                      if (oldQ) {
                        return { 
                          ...newQ, 
                          image_file: oldQ.image_file, 
                          image_preview: oldQ.image_preview 
                        };
                      }
                      return newQ;
                    });

                    setParsedQuestions(finalQuestions);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <UploadCloud size={14}/> Dịch lại Code
                </button>
              </div>
              
             {/* KHU VỰC TEXTAREA CÓ SỐ DÒNG BÊN TRÁI */}
              <div className="flex flex-1 overflow-hidden bg-white relative">
                
               {/* Gutter chứa số dòng (Đã thêm tính năng bôi đậm dòng đang chọn) */}
                <div 
                  ref={lineNumbersRef}
                  className="w-14 bg-gray-50 border-r border-gray-200 text-right pr-1 py-4 text-gray-400 font-mono text-[13px] leading-relaxed select-none overflow-hidden shrink-0"
                >
                  {rawTexCode.split('\n').map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-end gap-1 ${activeLine === i ? 'text-white bg-blue-500 font-bold px-1 rounded-sm shadow-sm z-10 relative scale-110 -ml-1' : 'pr-1'}`}
                    >
                      {activeLine === i && <span className="text-[10px]">▶</span>}
                      {i+1}
                    </div>
                  ))}
                </div>

                {/* KHUNG EDITOR MỚI CÓ ĐÁNH MÀU CHỮ */}
                <div 
                  id="editor-scroll-container"
                  className="flex-1 overflow-auto custom-scrollbar relative"
                  onScroll={(e) => { 
                    // Đồng bộ cuộn chuột giữa code và số dòng
                    if(lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.target.scrollTop; 
                  }}
                >
                <Editor
                    value={rawTexCode}
                    onValueChange={code => setRawTexCode(code)}
                    highlight={code => Prism.highlight(code, Prism.languages.latex, 'latex')}
                    padding={16}
                    style={{
                      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                      fontSize: 13,
                      minHeight: '100%',
                      lineHeight: '1.6',
                      backgroundColor: '#ffffff',
                      whiteSpace: 'pre',        // 🔥 BẮT BUỘC: Ép code nằm trên 1 đường thẳng ngang
                      overflowWrap: 'normal'    // 🔥 BẮT BUỘC: Không cho tự động rớt dòng
                    }}
                    textareaClassName="focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* CHẾ ĐỘ 2: GIAO DIỆN BÌNH THƯỜNG DÀNH CHO WORD / PDF                        */
          /* ========================================================================= */
          <>
            {/* CỘT TRÁI (HIỂN THỊ FILE) */}
            <div className={`bg-white border border-gray-200 rounded-2xl flex-col shadow-sm relative transition-all duration-300 ${showLeftPanel ? 'flex flex-1' : 'hidden'}`}>
              {!file ? (
                <div onClick={() => fileInputRef.current.click()} className="flex-1 flex flex-col items-center justify-center p-10 cursor-pointer border-2 border-dashed border-blue-300 m-6 rounded-2xl bg-blue-50/20 hover:bg-blue-50">
                  <UploadCloud size={60} className="text-blue-500 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700">Nhấn hoặc kéo thả file vào đây</h3>
                  <input type="file" accept=".pdf,.doc,.docx,.tex,.png,.jpg,.jpeg,.svg" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                </div>
              ) : (
                <>
                  <div className="border-b p-3 flex justify-between items-center z-10 bg-white rounded-t-2xl">
                    <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded truncate max-w-[300px]">{file.name}</span>
                    <button onClick={handleRemoveFile} className="text-red-500 font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"><X size={16}/> Gỡ</button>
                  </div>
                  <div className="flex-1 bg-gray-200 flex items-center justify-center relative rounded-b-2xl overflow-hidden">
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

            {/* CỘT PHẢI (REVIEW CHO WORD/PDF) */}
            <div className={`flex flex-col overflow-hidden transition-all duration-300 ${showLeftPanel ? 'w-[550px]' : 'flex-1'}`}>
              
              {fileType && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex-1 flex flex-col overflow-hidden shadow-sm">
                  {/* BẢNG ĐỤC LỖ CHO PDF */}
                  {fileType === 'pdf' && (
                    <>
                      <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
                        <h3 className="font-bold text-gray-800 text-lg">Bảng Đáp Án Nhanh (PDF)</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                            <span className="text-sm font-bold text-blue-800">Số câu:</span>
                            <input type="number" min="1" value={numPdfQuestions} onChange={e => setNumPdfQuestions(Number(e.target.value) || 1)} className="w-14 px-1 py-1 rounded text-center font-bold outline-none" />
                          </div>
                          {file && (
                            <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold flex items-center justify-center transition-all shadow-sm">
                              {showLeftPanel ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                        <div className={`grid gap-x-4 gap-y-4 ${showLeftPanel ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
                          {Array.from({ length: numPdfQuestions }, (_, i) => i + 1).map(qNum => {
                            const qType = pdfQuestionTypes[qNum] || 'multiple_choice';
                            return (
                              <div key={qNum} className="flex flex-col p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors shadow-sm gap-3">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                  <div className="flex items-center gap-2"><span className="font-black text-gray-400 italic text-sm">CÂU {qNum}</span></div>
                                  <select value={qType} onChange={(e) => {
                                    const newType = e.target.value; setPdfQuestionTypes(prev => ({ ...prev, [qNum]: newType }));
                                    if (newType === 'true_false') setPdfAnswers(prev => ({ ...prev, [qNum]: '?,?,?,?' }));
                                    else if (newType === 'multiple_choice') setPdfAnswers(prev => ({ ...prev, [qNum]: 'A' }));
                                    else setPdfAnswers(prev => ({ ...prev, [qNum]: '' }));
                                  }} className={`text-[11px] font-bold px-2 py-1 rounded border outline-none transition-colors ${qType === 'true_false' ? 'bg-amber-100 text-amber-700 border-amber-200' : qType === 'fill_blank' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                    <option value="multiple_choice">Trắc nghiệm ABCD</option>
                                    <option value="true_false">Đúng / Sai (2025)</option>
                                    <option value="fill_blank">Tự luận / Điền số</option>
                                  </select>
                                </div>
                                <div className="flex-1">
                                  {qType === 'fill_blank' ? (
                                    <input type="text" value={pdfAnswers[qNum] || ''} onChange={(e) => handlePdfAnswerSelect(qNum, e.target.value)} placeholder="Nhập đáp án đúng..." className="w-full px-4 py-2 border-2 border-purple-200 rounded-xl text-sm outline-none focus:border-purple-500 font-bold text-purple-700 bg-white shadow-inner"/>
                                  ) : qType === 'true_false' ? (
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {['a', 'b', 'c', 'd'].map((label, idx) => {
                                        const currentArr = (pdfAnswers[qNum] || '?,?,?,?').split(',');
                                        return (
                                          <div key={label} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Ý {label}.</span>
                                            <div className="flex gap-1">
                                              {['T', 'F'].map(val => (
                                                <button key={val} onClick={() => {
                                                  const newArr = [...currentArr]; newArr[idx] = val; handlePdfAnswerSelect(qNum, newArr.join(','));
                                                }} className={`w-12 py-1 rounded-md font-bold text-[10px] transition-all ${currentArr[idx] === val ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                                  {val === 'T' ? 'Đúng' : 'Sai'}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="flex justify-between bg-white p-2 rounded-2xl border border-gray-100">
                                      {['A', 'B', 'C', 'D'].map(opt => (
                                        <button key={opt} onClick={() => handlePdfAnswerSelect(qNum, opt)} className={`w-10 h-10 rounded-full font-bold text-sm shadow-sm transition-all ${pdfAnswers[qNum] === opt ? 'bg-blue-600 text-white scale-110 shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}>
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
                  
                  {/* REVIEW CHO FILE WORD */}
                  {isExtracting ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-4">
                      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-indigo-700 font-bold text-lg animate-pulse">Đang bóc tách dữ liệu...</p>
                      <p className="text-gray-500 text-sm mt-1">Hệ thống đang xử lý, vui lòng đợi trong giây lát.</p>
                    </div>
                  ) : parsedQuestions.length > 0 && fileType !== 'pdf' ? (
                    <>
                      <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg text-gray-800">Review câu hỏi</h3>
                          <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-xs">{parsedQuestions.length} câu</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsScoreModalOpen(true)} className="bg-[#144f5d] hover:bg-[#0f3d48] text-white font-bold py-1.5 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm">
                            ⚖️ Chia điểm
                          </button>
                          {file && (
                            <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold flex items-center justify-center transition-all shadow-sm">
                              {showLeftPanel ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar bg-gray-50/50">
                        {parsedQuestions.map((q, index) => (
                          <div key={index} className="border border-gray-200 p-4 bg-white rounded-xl relative shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-100 pb-4 gap-4">
                              <div className="flex-1 w-full">
                                <div className="font-bold text-gray-800 text-lg mb-2">Câu {q.id}:</div>
                                {q.isEditing ? (
                                  <div className="mb-2 bg-white rounded-lg border shadow-inner">
                                    <BlockEditor initialContent={q.content} onChange={(content) => updateParsedQuestion(index, 'content', content)} />
                                  </div>
                                ) : (<div className="content-preview text-gray-800 leading-relaxed font-medium"><SafeLatex>{q.content}</SafeLatex></div>)}
                              </div>
                              <div className="flex flex-col gap-2 shrink-0 w-full md:w-48 mt-4 md:mt-0">
                                <button onClick={() => toggleEditMode(index)} className={`w-full py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${q.isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}>
                                  {q.isEditing ? '💾 Lưu chỉnh sửa' : '✏️ Sửa lỗi'}
                                </button>
                                <select value={q.type} onChange={(e) => {
                                  const newQs = [...parsedQuestions]; newQs[index].type = e.target.value;
                                  if (e.target.value === 'true_false') newQs[index].correct_opt = 'F,F,F,F';
                                  else if (e.target.value === 'multiple_choice') newQs[index].correct_opt = 'A';
                                  else newQs[index].correct_opt = '';
                                  setParsedQuestions(newQs);
                                }} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl outline-none border border-gray-200 cursor-pointer hover:bg-gray-50 bg-white">
                                  <option value="multiple_choice">Trắc nghiệm (ABCD)</option>
                                  <option value="true_false">Đúng / Sai (2025)</option>
                                  <option value="fill_blank">Tự luận / Điền số</option>
                                </select>
                              </div>
                            </div>

                            <div className="mb-4 bg-white border border-dashed p-3 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-500">Đính kèm ảnh thêm</span>
                                {q.image_preview && <button onClick={() => handleRemoveQuestionImage(index)} className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">Xóa ảnh</button>}
                              </div>
                              {!q.image_preview ? (
                                <label className="flex justify-center p-2 bg-blue-50 text-blue-500 rounded cursor-pointer hover:bg-blue-100 font-semibold text-sm transition-colors">
                                  Tải ảnh lên <input type="file" className="hidden" accept="image/*" onChange={e => handleQuestionImageUpload(index, e.target.files[0])}/>
                                </label>
                              ) : (<img src={q.image_preview} className="max-h-32 mx-auto rounded border shadow-sm" alt="Preview" />)}
                            </div>
                            
                            {q.type === 'multiple_choice' ? (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                                  {['a', 'b', 'c', 'd'].map(opt => (
                                    <div key={opt} className={`p-3 rounded-xl border ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white shadow-sm'}`}>
                                      <div className="flex gap-3">
                                        <span className="font-bold text-indigo-700 mt-1">{opt.toUpperCase()}.</span>
                                        {q.isEditing ? (
                                          <div className="flex-1 w-full bg-white rounded-lg">
                                            <BlockEditor initialContent={q[`opt_${opt}`]} onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)} />
                                          </div>
                                        ) : (<div className="text-gray-800 flex-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                  <span className="text-xs font-bold text-gray-500">ĐÁP ÁN ĐÚNG:</span>
                                  <div className="flex gap-2">
                                    {['A', 'B', 'C', 'D'].map(opt => (
                                      <button key={opt} onClick={() => changeParsedCorrectOpt(index, opt)} className={`w-9 h-9 rounded-lg font-bold text-sm transition-transform ${q.correct_opt === opt ? 'bg-green-500 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt}</button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            ) : q.type === 'true_false' ? (
                              <div className="grid grid-cols-1 gap-2 mb-3">
                                {['a', 'b', 'c', 'd'].map((opt, i) => (
                                  <div key={opt} className={`p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${q.isEditing ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                                    <div className="flex-1 w-full flex gap-3 text-sm">
                                      <span className="font-bold text-blue-700 mt-1">{opt.toUpperCase()}.</span> 
                                      {q.isEditing ? (
                                        <div className="flex-1 w-full bg-white rounded-lg">
                                          <BlockEditor initialContent={q[`opt_${opt}`]} onChange={(content) => updateParsedQuestion(index, `opt_${opt}`, content)} />
                                        </div>
                                      ) : (<div className="pt-1"><SafeLatex>{q[`opt_${opt}`]}</SafeLatex></div>)}
                                    </div>
                                    <div className="flex gap-1 shrink-0 mt-2 sm:mt-0">
                                      {['T', 'F'].map(val => (
                                        <button key={val} onClick={() => {
                                          const currentArr = (q.correct_opt || "?,?,?,?").split(','); currentArr[i] = val; changeParsedCorrectOpt(index, currentArr.join(','));
                                        }} className={`px-4 py-2 rounded font-bold text-xs transition-colors ${q.correct_opt?.split(',')[i] === val ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                          {val === 'T' ? 'Đúng' : 'Sai'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="pt-3 border-t border-gray-100">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nhập đáp án (Tự luận / Điền khuyết):</label>
                                <input type="text" value={q.correct_opt} onChange={(e) => changeParsedCorrectOpt(index, e.target.value)} className="w-full p-3 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 font-bold text-purple-700 bg-purple-50" placeholder="Nhập đáp án đúng vào đây..." />
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
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* POPUP: CHIA ĐIỂM NHANH (GIỮ NGUYÊN) */}
      {/* ========================================================= */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Chia điểm nhanh</h3>
              <button onClick={() => setIsScoreModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-gray-700">Tổng điểm trắc nghiệm ({mcqCount} Câu)</span>
                  <input type="number" min="0" value={scores.totalMcq} onChange={(e) => setScores({...scores, totalMcq: e.target.value})} className="w-24 border rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-gray-700">Tổng điểm câu đúng sai ({tfCount} Câu)</span>
                  <input type="number" min="0" value={scores.totalTf} onChange={(e) => setScores({...scores, totalTf: e.target.value})} className="w-24 border rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-gray-700">Tổng điểm điền từ/tự luận ({fibCount} Câu)</span>
                  <input type="number" min="0" value={scores.totalFib} onChange={(e) => setScores({...scores, totalFib: e.target.value})} className="w-24 border rounded-lg p-2 text-center font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-bold text-gray-800 mb-1">Cấu hình thang điểm cho câu hỏi đúng sai</h4>
                <p className="text-xs text-gray-500 mb-4">Chức năng này cho phép cấu hình % số điểm mong muốn với từng câu trả lời đúng.</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} className="flex items-center justify-between bg-white px-3 py-2 rounded border shadow-sm">
                      <span className="text-sm font-medium text-gray-700">Trả lời đúng {num} ý</span>
                      <div className="flex items-center">
                        <input type="number" value={scores.tfConfig[num]} onChange={(e) => setScores({...scores, tfConfig: {...scores.tfConfig, [num]: e.target.value}})} className="w-16 text-right outline-none font-bold text-teal-600"/>
                        <span className="text-gray-400 bg-gray-100 px-2 py-1 ml-1 rounded text-xs font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setIsScoreModalOpen(false)} className="px-5 py-2.5 border rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors">Đóng</button>
              <button onClick={handleApplyScores} className="px-6 py-2.5 bg-[#144f5d] hover:bg-[#0f3d48] text-white rounded-lg font-bold shadow-md transition-colors">Chia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SmartUpload;