import { AppState } from '../types';
import { z } from 'zod';

// Schema للتحقق من صحة ملف الـ JSON المرفوع للتطبيق لحمايته من الملفات التالفة
const AppStateSchema = z.object({
  gates: z.array(z.any()),
  prompts: z.array(z.any())
}).passthrough();

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
          const parsedData = JSON.parse(event.target?.result as string);
          
          // التحقق الصارم عبر مكتبة Zod
          const validatedState = AppStateSchema.parse(parsedData);
          
          resolve(validatedState as AppState);
        } catch (err) {
          if (err instanceof z.ZodError) {
            console.error('❌ Zod Validation Error:', err.errors);
            reject(new Error('هيكل ملف النسخة الاحتياطية غير صالح أو تالف.'));
          } else {
            console.error('❌ JSON Parse Error:', err);
            reject(new Error('تعذرت قراءة الملف. يرجى التأكد من أنه ملف JSON صالح.'));
          }
        }
      };

      reader.onerror = () => reject(new Error('حدث خطأ أثناء قراءة الملف.'));
      reader.readAsText(file);
    });
  },
};
