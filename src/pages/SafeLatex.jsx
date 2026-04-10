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

    // 1. DỌN DẸP MÔI TRƯỜNG CỦA FILE TEX TÀO LAO
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

    // KHÔNG THAY ĐỔI, KHÔNG ĐỤNG CHẠM GÌ VÀO DẤU $ NỮA!
    // Kệ ông thầy viết $ hay $$, giữ nguyên bản 100%.

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
            // BÍ KÍP Ở ĐÂY: Dạy KaTeX hiểu file của ông thầy
            // Ép cả $$ và $ thành toán nội tuyến (display: false) để nó KHÔNG BAO GIỜ rớt dòng hay lỗi khoảng cách
            { left: "$$", right: "$$", display: false }, 
            { left: "$", right: "$", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
          ]}
        >
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;