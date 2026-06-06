import { AppState } from '../types';

interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

interface GeminiVerifyResponse {
  success: boolean;
  message?: string;
  modelName?: string;
  error?: string;
}

interface GeminiChatResponse {
  message: string;
  isProposal: boolean;
  proposedState?: AppState;
  error?: string;
}

export const geminiService = {
  verifyApiKey: async (
    customApiKey: string,
    model: string
  ): Promise<GeminiVerifyResponse> => {
    const response = await fetch('/api/gemini/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customApiKey, model }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }

    return response.json();
  },

  sendChatMessage: async (
    message: string,
    state: AppState,
    chatHistory: ChatMessage[],
    customApiKey: string,
    model: string,
    systemInstruction: string
  ): Promise<GeminiChatResponse> => {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        state,
        chatHistory,
        customApiKey,
        model,
        systemInstruction,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Chat failed');
    }

    return response.json();
  },
};