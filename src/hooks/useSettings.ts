import { useState, useEffect } from 'react';

export function useSettings() {
  const [customApiKey, setCustomApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_key') || '';
    }
    return '';
  });

  const [isApiKeyVerified, setIsApiKeyVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_key_verified') === 'true';
    }
    return false;
  });

  const [customModel, setCustomModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_model') || 'gemini-3.5-flash';
    }
    return 'gemini-3.5-flash';
  });

  const [customSystemInstruction, setCustomSystemInstruction] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_sys_inst') || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_key', customApiKey);
    }
  }, [customApiKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_key_verified', isApiKeyVerified ? 'true' : 'false');
    }
  }, [isApiKeyVerified]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_model', customModel);
    }
  }, [customModel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_sys_inst', customSystemInstruction);
    }
  }, [customSystemInstruction]);

  return {
    customApiKey,
    setCustomApiKey,
    isApiKeyVerified,
    setIsApiKeyVerified,
    customModel,
    setCustomModel,
    customSystemInstruction,
    setCustomSystemInstruction,
  };
}