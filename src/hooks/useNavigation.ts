import { useState, useCallback } from 'react';
import { View } from '../types';

export function useNavigation() {
  const [view, setView] = useState<View>('home');
  const [currentGateId, setCurrentGateId] = useState<string | null>(null);
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);

  const navigateToHome = useCallback(() => setView('home'), []);
  const navigateToGate = useCallback((id: string) => {
    setCurrentGateId(id);
    setView('gate');
  }, []);
  const navigateToPrompt = useCallback((id: string) => {
    setCurrentPromptId(id);
    setView('prompt');
  }, []);
  const navigateToSettings = useCallback(() => setView('settings'), []);
  const navigateToAIChat = useCallback(() => setView('ai-chat'), []);
  const navigateToAddGate = useCallback(() => setView('add-gate'), []);
  const navigateToAddPrompt = useCallback(() => setView('add-prompt'), []);
  const navigateToEditGate = useCallback((id: string) => {
    setCurrentGateId(id);
    setView('edit-gate');
  }, []);

  return {
    view,
    setView,
    currentGateId,
    setCurrentGateId,
    currentPromptId,
    setCurrentPromptId,
    navigateToHome,
    navigateToGate,
    navigateToPrompt,
    navigateToSettings,
    navigateToAIChat,
    navigateToAddGate,
    navigateToAddPrompt,
    navigateToEditGate,
  };
}