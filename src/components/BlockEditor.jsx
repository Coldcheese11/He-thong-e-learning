import React, { useEffect, useState } from 'react';
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";

export default function BlockEditor({ initialContent, onChange }) {
  const editor = useCreateBlockNote();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadHTML() {
      if (initialContent && !isLoaded) {
        const safeHTML = initialContent.trim().startsWith('<') 
          ? initialContent 
          : `<p>${initialContent}</p>`;
          
        const blocks = await editor.tryParseHTMLToBlocks(safeHTML);
        editor.replaceBlocks(editor.document, blocks);
        
        // Đợi xíu cho Editor load xong mới cho phép onChange hoạt động
        setTimeout(() => setIsLoaded(true), 200); 
      }
    }
    loadHTML();
  }, [editor, initialContent, isLoaded]);

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-300 shadow-sm transition-all hover:border-blue-400">
      <BlockNoteView
        editor={editor}
        theme="light"
        onChange={async () => {
          if (!isLoaded) return; // CHỐNG LỖI MẤT CHỮ TẠI ĐÂY
          const html = await editor.blocksToHTMLLossy(editor.document);
          onChange(html); 
        }}
      />
      <style>{`
        .bn-container { min-height: 100px; padding: 10px 0; font-family: inherit; }
      `}</style>
    </div>
  );
}