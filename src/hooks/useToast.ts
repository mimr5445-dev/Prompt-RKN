import { useState, useCallback } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    const timeout = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return {
    toastMessage,
    showToast,
    triggerToast,
    setShowToast,
  };
}