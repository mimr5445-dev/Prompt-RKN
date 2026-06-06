import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, title }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md bg-[#F5F5DC] border border-[#4E342E]/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#4E342E]/5 flex justify-between items-center">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};