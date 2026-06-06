import React, { useState, useEffect, useRef } from 'react';
import { Edit3 } from 'lucide-react';

interface PromptEditorProps {
  content: string;
  onSave: (val: string) => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ content, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave(value);
  };

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div className="relative group">
      {!isEditing && (
        <button 
          onClick={startEditing}
          className="absolute top-4 right-4 p-2 bg-[#4E342E]/10 hover:bg-[#4E342E]/20 rounded-lg text-[#4E342E] opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Edit3 size={16} />
        </button>
      )}
      
      <div className={`w-full rounded-2xl border transition-all overflow-hidden ${
        isEditing ? 'border-[#4E342E]/50 ring-1 ring-[#4E342E]/20' : 'border-[#4E342E]/10'
      }`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            className="w-full min-h-[300px] bg-[#FDF5E6] p-6 font-mono text-sm leading-relaxed text-[#4E342E] focus:outline-none resize-none"
          />
        ) : (
          <div 
            onClick={startEditing}
            className="w-full min-h-[300px] bg-[#FDF5E6] p-6 font-mono text-sm leading-relaxed text-[#4E342E]/80 whitespace-pre-wrap cursor-text"
          >
            {value || <span className="text-[#4E342E]/30 italic">Empty prompt...</span>}
          </div>
        )}
      </div>
    </div>
  );
};