import { AppState } from '../types';

export const exportService = {
  exportData: (state: AppState) => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Prompt_RKN_Backup.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: async (file: File): Promise<AppState | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedState = JSON.parse(event.target?.result as string);
          if (importedState.gates && Array.isArray(importedState.gates) && 
              importedState.prompts && Array.isArray(importedState.prompts)) {
            resolve(importedState);
          } else {
            reject(new Error('Invalid backup file format'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  },
};