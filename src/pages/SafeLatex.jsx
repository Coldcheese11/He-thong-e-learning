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

    // 1. Dọn dẹp môi trường (đoạn code an toàn của bạn)
    let cleanText = rawText
      .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
      .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
      .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
      .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1');

    // Xử lý thông minh cho \immini để không bị dư ngoặc
    cleanText = cleanText
      .replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2')
      .replace(/\\immini(?:\[.*?\])?\s*/g, '');

    // Thêm dọn dẹp cơ bản
    cleanText = cleanText.replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '');
    cleanText = cleanText.replace(/\{(\[⚠️.*?\])\}/g, '$1');
    cleanText = cleanText.replace(/\\dfrac/g, '\\dfrac');
    cleanText = cleanText.replace(/\\vec/g, '\\vec');

    // =========================================================================
    // 2. THUẬT TOÁN ĐỔI $...$ THÀNH \(...\) DỰA TRÊN TRẠNG THÁI (Giữ nguyên)
    // =========================================================================
    cleanText = cleanText.split('$$').join('__TEMP_BLOCK__');

    let newText = "";
    let isMathMode = false;

    for (let i = 0; i < cleanText.length; i++) {
      if (cleanText[i] === '$') {
        if (!isMathMode) {
          newText += '\\(';
          isMathMode = true;
        } else {
          newText += '\\)';
          isMathMode = false;
        }
      } else {
        newText += cleanText[i];
      }
    }

    cleanText = newText;
    cleanText = cleanText.split('__TEMP_BLOCK__').join('$$');

    return cleanText.trim();
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
            // THAY ĐỔI QUAN TRỌNG: display phải là true để Katex render \(...\)
            { left: "\\(", right: "\\)", display: true } 
          ]}
        >
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;