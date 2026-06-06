import { useState, useEffect, useCallback } from 'react';
import { AppState, Gate, Prompt } from '../types';

const STORAGE_KEY = 'prompt_rkn_data';
const ROLLBACK_KEY = 'prompt_rkn_rollback';

const INITIAL_STATE: AppState = {
  gates: [
    { id: 'favorites', name: 'Favorites', isDeletable: false },
    { id: 'gate-1', name: 'General', isDeletable: true },
  ],
  prompts: [],
};

const generateId = () => {
  return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    }
    return INITIAL_STATE;
  });

  const [rollbackState, setRollbackState] = useState<AppState | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ROLLBACK_KEY);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const addGate = useCallback((name: string) => {
    const newGate: Gate = {
      id: generateId(),
      name,
      isDeletable: true,
    };
    setState(prev => ({ ...prev, gates: [...prev.gates, newGate] }));
  }, []);

  const updateGate = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      gates: prev.gates.map(g => g.id === id ? { ...g, name } : g),
    }));
  }, []);

  const deleteGate = useCallback((id: string) => {
    if (id === 'favorites') return;
    setState(prev => ({
      ...prev,
      gates: prev.gates.filter(g => g.id !== id),
      prompts: prev.prompts.filter(p => p.gateId !== id),
    }));
  }, []);

  const addPrompt = useCallback((title: string, content: string, note: string, gateId: string) => {
    const newPrompt: Prompt = {
      id: generateId(),
      gateId,
      title,
      content,
      note,
      isFavorite: false,
    };
    setState(prev => ({ ...prev, prompts: [...prev.prompts, newPrompt] }));
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.filter(p => p.id !== id),
    }));
  }, []);

  const updatePrompt = useCallback((id: string, updates: Partial<Prompt>) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p),
    }));
  }, []);

  const saveRollbackState = useCallback(() => {
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(state));
    setRollbackState(state);
  }, [state]);

  const restoreRollbackState = useCallback(() => {
    if (!rollbackState) return;
    const temp = state;
    setState(rollbackState);
    setRollbackState(temp);
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(temp));
  }, [rollbackState, state]);

  return {
    state,
    setState,
    rollbackState,
    addGate,
    updateGate,
    deleteGate,
    addPrompt,
    deletePrompt,
    updatePrompt,
    toggleFavorite,
    saveRollbackState,
    restoreRollbackState,
  };
}