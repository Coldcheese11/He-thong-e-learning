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

  // HÀM TIỀN XỬ LÝ DỮ LIỆU TỪ SMARTUPLOAD FILE TEX
  formatLatexContent(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText;

    let cleanText = rawText
      // 1. Xử lý các khối TikZ và Bảng biểu phức tạp thành cảnh báo
      .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n[⚠️ HÌNH VẼ TIKZ - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '\n[⚠️ BẢNG BIỂU - VUI LÒNG CHỤP ẢNH ĐÍNH KÈM]\n')
      
      // 2. Dọn dẹp các lệnh môi trường không cần thiết để hiển thị text thuần
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '$1')
      
      // 3. CHUYỂN ĐỔI NGOẶC TOÁN HỌC (Ép tất cả về $$ để iPhone render mượt nhất)
      .replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$') 
      .replace(/\\\(/g, '$$$$').replace(/\\\)/g, '$$$$')

      // 4. CHUYỂN ĐỔI LỆNH \heva VÀ \hoac (Chuẩn Latex cho Katex)
      .replace(/\\heva\s*\{([\s\S]*?)\}/g, '\\begin{cases} $1 \\end{cases}')
      .replace(/\\hoac\s*\{([\s\S]*?)\}/g, '\\left[\\begin{matrix} $1 \\end{matrix}\\right.')
      
      // 5. Loại bỏ các lệnh định dạng text thừa trong đề Toán
      .replace(/\\(?:textit|textbf|underline)\s*\{([\s\S]*?)\}/g, '$1')

      // 6. Xử lý thông minh cho lệnh chèn ảnh \immini
      .replace(/\\immini(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{\s*(\[⚠️.*?\])\s*\}/g, '$1\n$2')
      .replace(/\\immini(?:\[.*?\])?\s*/g, '')

      // 7. Dọn rác ngoặc nhọn do bóc tách để lại
      .replace(/^[\s\{]+/, '').replace(/[\s\}]+$/, '')
      .replace(/\{(\[⚠️.*?\])\}/g, '$1')
      
      // 8. Đảm bảo các lệnh toán học như \dfrac, \vec không bị lỗi hiển thị
      .replace(/\\dfrac/g, '\\dfrac')
      .replace(/\\vec/g, '\\vec')
      
      // 9. Giữ nguyên xuống hàng của văn bản
      .replace(/\n/g, '<br/>');

    // ====================================================================
    // 10. THUẬT TOÁN BẮT DẤU $ CHO IPHONE (Vòng lặp an toàn 100%)
    // Thay vì dùng Regex phức tạp dễ làm sập Safari, ta dùng vòng lặp để 
    // gom tất cả các dấu $ đơn thành $$ kép.
    // ====================================================================
    let finalString = "";
    let i = 0;
    while (i < cleanText.length) {
      if (cleanText[i] === '$') {
        if (cleanText[i + 1] === '$') {
          // Nếu đã là $$ kép -> Giữ nguyên và nhảy qua
          finalString += '$$';
          i += 2; 
        } else {
          // Nếu là $ đơn -> Nâng cấp thành $$ kép để iPhone hiểu
          finalString += '$$'; 
          i += 1;
        }
      } else {
        finalString += cleanText[i];
        i += 1;
      }
    }
    
    return finalString.trim();
  }

  render() {
    const rawData = this.props.children || "";
    const safeText = this.formatLatexContent(rawData);
    
    // Nếu công thức bị lỗi cú pháp quá nặng, hiển thị text thô để học sinh vẫn đọc được đề
    if (this.state.hasError) {
      return (
        <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 text-sm italic">
          {safeText.replace(/<br\/>/g, '\n')}
        </span>
      );
    }
    
    return (
      <span className="latex-renderer inline-block max-w-full overflow-x-auto scrollbar-hide vertical-middle">
        <Latex strict="ignore">
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;