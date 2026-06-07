import { AppState } from '../types';
import { z } from 'zod';

// 1. تعريف Schema صارم للتحقق من بنية البيانات المستوردة
const AppStateSchema = z.object({
  gates: z.array(z.any()),   // يمكنك لاحقاً استبدال z.any() بمخطط دقيق يمثل الـ Gate
  prompts: z.array(z.any())  // يمكنك لاحقاً استبدال z.any() بمخطط دقيق يمثل الـ Prompt
}).passthrough(); // passthrough تسمح بقبول أي خصائص إضافية قد تكون موجودة في AppState دون إحداث خطأ

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
          // محاولة تحويل النص إلى كائن JSON
          const parsedData = JSON.parse(event.target?.result as string);
          
          // 2. استخدام Zod للتحقق من الهيكلة
          // إذا كانت البيانات غير صالحة، ستُلقي parse خطأ من نوع ZodError
          const validatedState = AppStateSchema.parse(parsedData);
          
          resolve(validatedState as AppState);
        } catch (err) {
          // 3. معالجة الأخطاء بشكل احترافي
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
