import React, { useState } from 'react';

interface AddGateFormProps {
  onAdd: (name: string) => void;
  initialValue?: string;
  buttonLabel?: string;
}

export const AddGateForm: React.FC<AddGateFormProps> = ({ 
  onAdd, 
  initialValue = '', 
  buttonLabel = 'Create Gate' 
}) => {
  const [name, setName] = useState(initialValue);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Gate Name</label>
        <input 
          autoFocus
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Creative Writing"
          className="w-full bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 focus:outline-none focus:border-[#4E342E]/50 transition-all"
        />
      </div>
      <button 
        onClick={() => name && onAdd(name)}
        disabled={!name}
        className="w-full bg-[#4E342E] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4E342E]/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        {buttonLabel}
      </button>
    </div>
  );
};