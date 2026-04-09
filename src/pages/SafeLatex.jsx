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
  
  render() {
    let safeText = this.props.children || "";
    if (typeof safeText === 'string') {
      // Chuyển đổi định dạng ngoặc toán học của LaTeX
      safeText = safeText.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$'); 
      safeText = safeText.replace(/\\\(/g, '$$').replace(/\\\)/g, '$$');     
    }
    
    // Nếu công thức bị lỗi cú pháp, hiển thị chữ thô màu đỏ thay vì làm sập cả web
    if (this.state.hasError) {
      return <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-sm">{safeText}</span>;
    }
    
    return (
      <Latex strict="ignore" macros={{"\\heva": "\\begin{cases} #1 \\end{cases}", "\\hoac": "\\left[\\begin{matrix} #1 \\end{matrix}\\right."}}>
        {safeText}
      </Latex>
    );
  }
}

export default SafeLatex;