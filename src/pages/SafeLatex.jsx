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

    // 1. Cảnh báo hình vẽ / bảng biểu
    text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n');
    text = text.replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n');
    text = text.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1');

    // 2. Chuyển đổi các môi trường đặc thù
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
    // 3. THUẬT TOÁN ĐỔI DẤU $ SIÊU AN TOÀN CHO MỌI ĐỜI IPHONE (Không dùng Regex)
    // =========================================================================
    // Biến đổi \( \) và \[ \] thành $$
    text = text.split('\\(').join('$$').split('\\)').join('$$');
    text = text.split('\\[').join('$$').split('\\]').join('$$');

    // Giấu các dấu $$ cũ đi tạm thời
    text = text.split('$$').join('__TEMP_DOUBLE__');
    // Biến tất cả các dấu $ đơn lẻ còn lại thành $$
    text = text.split('$').join('$$');
    // Trả lại các dấu $$ cũ
    text = text.split('__TEMP_DOUBLE__').join('$$');

    // Hút sạch các khoảng trắng thừa dính vào dấu $$ (Nguyên nhân gây rớt dòng)
    text = text.replace(/\s*\$\$\s*/g, '$$$$');

    // 4. Xuống dòng
    text = text.replace(/\n/g, '<br/>');

    return text.trim();
  }

  render() {
    const rawData = this.props.children || "";
    const safeText = this.formatLatexContent(rawData);

    if (this.state.hasError) {
      return (
        <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 text-sm italic">
          {safeText.replace(/<br\/>/g, '\n')}
        </span>
      );
    }

    return (
      <span className="latex-container-fix">
        <Latex strict="ignore">
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;