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

    // 1. DỌN DẸP MÔI TRƯỜNG (Giữ nguyên đoạn code an toàn của bạn)
    let cleanText = rawText
      .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
      .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
      .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
      .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1');

    cleanText = cleanText
      .replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2')
      .replace(/\\immini(?:\[.*?\])?\s*/g, '');

    cleanText = cleanText.replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '');
    cleanText = cleanText.replace(/\{(\[⚠️.*?\])\}/g, '$1');
    cleanText = cleanText.replace(/\\dfrac/g, '\\dfrac');
    cleanText = cleanText.replace(/\\vec/g, '\\vec');

    // =========================================================================
    // 2. ÉP TẤT CẢ VỀ CHUẨN $$ (Bí kíp dứt điểm lỗi \( \))
    // Dùng split().join() để không bị lỗi Regex trên Safari
    // =========================================================================
    
    // Biến đổi \( \) và \[ \] thành $$
    cleanText = cleanText.split('\\(').join('$$').split('\\)').join('$$');
    cleanText = cleanText.split('\\[').join('$$').split('\\]').join('$$');

    // Nếu lỡ đề thi cũ còn sót dấu $ đơn lẻ, cũng nâng cấp thành $$ luôn
    let newText = "";
    let tempText = cleanText.split('$$').join('__DOUBLE__'); // Cất $$ đi tạm
    for (let i = 0; i < tempText.length; i++) {
        if (tempText[i] === '$') {
            newText += '$$'; 
        } else {
            newText += tempText[i];
        }
    }
    cleanText = newText.split('__DOUBLE__').join('$$');

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
            // Chỉ cần để duy nhất $$ ở đây, vì mọi thứ đã được ép về $$ rồi
            { left: "$$", right: "$$", display: true }
          ]}
        >
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;