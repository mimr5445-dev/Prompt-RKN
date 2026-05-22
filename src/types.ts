export interface Gate {
  id: string;
  name: string;
  isDeletable: boolean;
}

export interface Prompt {
  id: string;
  gateId: string;
  title: string;
  content: string;
  note: string;
  isFavorite: boolean;
}

export type View = 'home' | 'gate' | 'prompt' | 'settings' | 'add-prompt' | 'add-gate' | 'edit-gate' | 'ai-chat';

export interface AppState {
  gates: Gate[];
  prompts: Prompt[];
}
