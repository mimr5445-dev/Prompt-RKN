import React, { useState } from 'react';

interface AddPromptFormProps {
  onAdd: (title: string, content: string, note: string) => void;
}

export const AddPromptForm: React.FC<AddPromptFormProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Title</label>
        <input 
          autoFocus
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Prompt Title"
          className="w-full bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 focus:outline-none focus:border-[#4E342E]/50 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Prompt Content</label>
        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your prompt here..."
          className="w-full h-40 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-[#4E342E]/50 transition-all resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Notes (Optional)</label>
        <textarea 
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What is this prompt for?"
          className="w-full h-24 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all resize-none"
        />
      </div>
      <button 
        onClick={() => title && content && onAdd(title, content, note)}
        disabled={!title || !content}
        className="w-full bg-[#4E342E] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4E342E]/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        Save Prompt
      </button>
    </div>
  );
};