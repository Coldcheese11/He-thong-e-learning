import React, { Component } from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

class SafeLatex extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  formatLatexContent(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText;

    let text = rawText;

    // 1. Dọn dẹp các môi trường cơ bản
    text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n');
    text = text.replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n');
    text = text.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1');
    text = text.replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}');
    text = text.replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.');
    text = text.replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1');
    text = text.replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2');
    text = text.replace(/\\immini(?:\[.*?\])?\s*/g, '');
    text = text.replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '');
    text = text.replace(/\{(\[⚠️.*?\])\}/g, '$1');
    text = text.replace(/\\dfrac/g, '\\dfrac');
    text = text.replace(/\\vec/g, '\\vec');

    // =========================================================================
    // 3. THUẬT TOÁN ĐỔI $...$ THÀNH \(...\) DỰA TRÊN TRẠNG THÁI (STATE-BASED)
    // Chắc chắn 100% không bao giờ trượt nhịp đóng/mở trên Safari
    // =========================================================================
    
    // Đảm bảo không bị lẫn lộn $$ thành $ đơn
    text = text.split('$$').join('__TEMP_BLOCK__');

    let newText = "";
    let isMathMode = false; // Biến trạng thái: Đang ở trong công thức Toán hay chữ thường?

    // Duyệt qua từng ký tự một
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '$') {
        if (!isMathMode) {
          // Gặp $ đầu tiên -> Mở toán inline
          newText += '\\(';
          isMathMode = true;
        } else {
          // Gặp $ thứ hai -> Đóng toán inline
          newText += '\\)';
          isMathMode = false;
        }
      } else {
        newText += text[i];
      }
    }

    text = newText;

    // Trả lại các khối $$ cũ (Nếu có)
    text = text.split('__TEMP_BLOCK__').join('$$');

    return text.trim();
  }

  render() {
    const rawData = this.props.children || "";
    const safeText = this.formatLatexContent(rawData);

    if (this.state.hasError) {
      return (
        <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 text-sm italic">
          {safeText}
        </span>
      );
    }

    return (
      <span className="latex-container-safari" style={{ whiteSpace: 'pre-wrap' }}>
        <Latex 
          strict="ignore"
          delimiters={[
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false } // Katex sẽ xử lý an toàn
          ]}
        >
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;