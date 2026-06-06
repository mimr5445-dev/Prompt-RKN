import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ show, message }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#4E342E] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#4E342E]/20 flex items-center gap-2"
        >
          <Check size={18} />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};