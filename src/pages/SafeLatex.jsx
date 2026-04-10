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

    // 1. DỌN DẸP MÔI TRƯỜNG TỪ FILE GỐC
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
    // 2. THUẬT TOÁN QUA MẶT SAFARI: Đổi $ đơn thành \( và \)
    // =========================================================================
    
    // Cất tạm các khối $$ (nếu ông thầy có dùng) thành một chuỗi đặc biệt để không bị cắt nhầm
    cleanText = cleanText.split('$$').join('__SAFARI_DOUBLE__');

    // Cắt chuỗi theo dấu $ đơn và bọc \( ... \)
    let parts = cleanText.split('$');
    let newText = "";
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        newText += parts[i];
      } else if (i % 2 === 0) {
        newText += parts[i] + '\\(';
      } else {
        newText += parts[i] + '\\)';
      }
    }
    cleanText = newText;

    // Trả lại các khối $$ gốc
    cleanText = cleanText.split('__SAFARI_DOUBLE__').join('$$');

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
        {/* KHÔNG DÙNG DELIMITERS NỮA! 
            Để thư viện dùng bộ parser gốc cực kỳ mạnh mẽ của nó.
            Nó sẽ tự động hiểu \( \) là toán nội tuyến và render đẹp mượt mà! 
        */}
        <Latex strict="ignore">
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;