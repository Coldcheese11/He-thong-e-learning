import React, { Component } from 'react';
import 'katex/dist/katex.min.css';
// CHÌA KHÓA: Import trực tiếp lõi KaTeX, bỏ qua cái vỏ react-latex-next bị lỗi trên Safari
import katex from 'katex'; 

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

    // Đưa tất cả \( \) và \[ \] về chung chuẩn $ và $$ để thuật toán bên dưới tự xử
    cleanText = cleanText.split('\\(').join('$').split('\\)').join('$');
    cleanText = cleanText.split('\\[').join('$$').split('\\]').join('$$');

    return cleanText.trim();
  }

  render() {
    const rawData = this.props.children || "";
    const cleanText = this.formatLatexContent(rawData);

    // =========================================================================
    // THUẬT TOÁN ĐỌC TOÁN HỌC KHÔNG DÙNG REGEX (CHỐNG SẬP SAFARI 100%)
    // =========================================================================
    const parts = [];
    let currentString = "";
    let i = 0;

    while (i < cleanText.length) {
      // Bắt khối $$ ... $$
      if (cleanText.substring(i, i + 2) === '$$') {
        if (currentString) parts.push({ type: 'text', content: currentString });
        currentString = "";
        i += 2;
        let mathStr = "";
        while (i < cleanText.length && cleanText.substring(i, i + 2) !== '$$') {
          mathStr += cleanText[i];
          i++;
        }
        // Đặt display: false để ép tất cả lên 1 dòng, chống cách hàng
        parts.push({ type: 'math', display: false, content: mathStr });
        i += 2;
      } 
      // Bắt khối $ ... $
      else if (cleanText[i] === '$') {
        if (currentString) parts.push({ type: 'text', content: currentString });
        currentString = "";
        i++;
        let mathStr = "";
        while (i < cleanText.length && cleanText[i] !== '$') {
          mathStr += cleanText[i];
          i++;
        }
        parts.push({ type: 'math', display: false, content: mathStr });
        i++;
      } 
      // Chữ bình thường
      else {
        currentString += cleanText[i];
        i++;
      }
    }
    if (currentString) parts.push({ type: 'text', content: currentString });

    // Render kết quả an toàn
    return (
      <span className="latex-container-safari" style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            // Chữ thường thì cứ thế in ra
            return <span key={index}>{part.content}</span>;
          } else {
            // Toán học thì gọi lõi KaTeX dịch ra HTML (Siêu nhẹ và an toàn)
            try {
              const html = katex.renderToString(part.content, { 
                throwOnError: false, 
                displayMode: part.display // Ép thành Inline Math
              });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch(e) {
              return <span key={index} className="text-red-500">${part.content}$</span>;
            }
          }
        })}
      </span>
    );
  }
}

export default SafeLatex;