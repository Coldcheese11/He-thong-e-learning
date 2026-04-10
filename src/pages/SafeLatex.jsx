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

    let cleanText = rawText
      // 1. Cảnh báo hình ảnh/bảng biểu
      .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      
      // 2. Dọn dẹp môi trường
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
      
      // 3. QUAN TRỌNG: Chuẩn hóa mọi định dạng Toán về $$ ... $$
      // Bắt các cặp \[ \] và \( \)
      .replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$') 
      .replace(/\\\(/g, '$$$$').replace(/\\\)/g, '$$$$')
      
      // Bắt các cặp $...$ đơn lẻ và biến thành $$...$$ (Bỏ qua nếu đã là $$)
      .replace(/(?<!\$)\$([^$]+)\$(?!\$)/g, '$$$$$1$$$$')

      // 4. Các lệnh đặc thù Latex
      .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
      .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
      .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1')
      .replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2')
      .replace(/\\immini(?:\[.*?\])?\s*/g, '')
      .replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '')
      .replace(/\{(\[⚠️.*?\])\}/g, '$1')
      .replace(/\\dfrac/g, '\\dfrac')
      .replace(/\\vec/g, '\\vec')
      
      // 5. XÓA KHOẢNG TRẮNG THỪA (Nguyên nhân gây xấu giao diện iPhone)
      // Dọn dẹp các khoảng trắng bị kẹt giữa chữ và ký hiệu $$
      .replace(/\s*\$\$\s*/g, '$$$$') 
      
      // 6. Xử lý xuống dòng
      .replace(/\n/g, '<br/>');

    return cleanText.trim();
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
      // FIX KHOẢNG TRẮNG: Thêm class 'inline' và bỏ 'inline-block' để chữ và toán học ôm sát nhau
      <span className="latex-renderer inline max-w-full overflow-x-auto scrollbar-hide vertical-middle">
        <Latex strict="ignore">
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;