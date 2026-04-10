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
    // 3. THUẬT TOÁN "BẺ KHÓA" SAFARI: ĐỔI $...$ THÀNH \(...\)
    // Safari lỗi khi phân biệt $ toán và $ tiền. Đổi sang \(...\) là Safari hiểu 100%.
    // =========================================================================
    
    // Bước A: Cất giấu các khối $$...$$ đi (thành thẻ tạm) để không bị đổi nhầm
    text = text.split('$$').join('__TEMP_BLOCK__');

    // Bước B: Cắt chuỗi theo dấu $ đơn, và lần lượt bọc \( và \) vào
    let parts = text.split('$');
    let newText = "";
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        newText += parts[i]; // Phần cuối cùng
      } else if (i % 2 === 0) {
        newText += parts[i] + '\\('; // Thay $ mở bằng \(
      } else {
        newText += parts[i] + '\\)'; // Thay $ đóng bằng \)
      }
    }
    text = newText;

    // Bước C: Trả lại các khối $$...$$ cũ
    text = text.split('__TEMP_BLOCK__').join('$$');

    // (Lưu ý: Không dùng replace(/\n/g, '<br/>') nữa vì <br/> làm rối Katex. 
    // Ta sẽ dùng CSS white-space ở dưới để tự động xuống dòng chuẩn xác).

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
      // Style whiteSpace: 'pre-wrap' giúp giữ nguyên các dòng xuống hàng của đề thi
      <span className="latex-container-safari" style={{ whiteSpace: 'pre-wrap' }}>
        <Latex 
          strict="ignore"
          delimiters={[
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false } // Đã chuẩn hóa tất cả $ về dạng này
          ]}
        >
          {safeText}
        </Latex>
      </span>
    );
  }
}

export default SafeLatex;