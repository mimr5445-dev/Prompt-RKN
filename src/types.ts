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

export type View = 'home' | 'gate' | 'prompt' | 'settings' | 'add-prompt' | 'add-gate' | 'edit-gate';

export interface AppState {
  gates: Gate[];
  prompts: Prompt[];
}
