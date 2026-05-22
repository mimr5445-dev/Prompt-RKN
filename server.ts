import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API router
  app.get("/api/config", (req, res) => {
    res.json({
      hasServerKey: !!process.env.GEMINI_API_KEY,
      defaultModel: process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash"
    });
  });

  app.post("/api/gemini/verify", async (req, res) => {
    try {
      const { customApiKey, model } = req.body;

      if (!customApiKey) {
        return res.status(400).json({ error: "الرجاء إدخال مفتاح الـ API للتحقق." });
      }

      const ai = new GoogleGenAI({
        apiKey: customApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Perform a minimal, zero-cost token verification test
      const testModel = model || "gemini-2.5-flash";
      const testResponse = await ai.models.generateContent({
        model: testModel,
        contents: "Hello, confirm this key is active with a single word yes",
      });

      if (testResponse && testResponse.text) {
        return res.json({ 
          success: true, 
          message: "تم التحقق والتفعيل بنجاح! الاتصال بالنموذج نشط ومستقر.",
          modelName: testModel
        });
      } else {
        return res.status(400).json({ error: "فشل التحقق: لم يستجب النموذج بشكل صحيح." });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      return res.status(500).json({ 
        error: error?.message || "مفتاح API غير صالح أو غير مفعل. يرجى التأكد من المفتاح والمحاولة مجدداً." 
      });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, state, chatHistory, customApiKey, model, systemInstruction } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "Please configure a Gemini API Key in Settings or set it on the server.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Format previous chat history for system context
      const formattedHistory = (chatHistory || [])
        .map((h: any) => `${h.role === "user" ? "User" : "AI"}: ${h.message}`)
        .join("\n");

      const defaultSystemInstruction = `
        أنت "منظم ومساعد نصوص Prompt RKN الذكي" (Prompt RKN Live Organizer)، وهو نظام ذكاء اصطناعي مدمج في صلب تطبيق لإدارة النصوص والبرومبتات.
        يحتوي التطبيق على "بوابات/فئات" (Gates/Categories) وعلى "نصوص برمجة وملاحظات" (Prompts) مخزنة بداخلها.
        أنت تتمتع بصلاحيات كاملة للتحكم في حالة التطبيق (State).

        قواعد الفهم والتنظير والعمل (مهم جداً):
        1. الفهم أولاً والاستيضاح: إذا طلب المستخدم منك إضافة نص جديد أو تعديل نص أو تنظيم أو نقله، ولم يوضح لك كامل التفاصيل الأساسية (مثل: عنوان النص، محتوى النص، الملاحظة الخاصة بالنص، أو الفئة المستهدفة التي يريد وضع النص فيها)، يجب أن لا تفترض قيماً وهمية من عندك بل قم بالرد عليه فوراً باللغة العربية واطلب منه التفاصيل بلطف تام (قم بتعيين isProposal: false وأبقِ proposedState فارغاً أو null).
        2. عند اكتمال الرؤية وتوضيح التفاصيل: بمجرد أن يزودك المستخدم بالتفاصيل أو عندما يكون طلبه واضحاً ومباشراً (مثال: "أضف نص باسم كذا ومحتوى كذا وملاحظة كذا في فئة العمل")، قم بإنشاء الفئة إذا لم تكن موجودة بقائمة الفئات، ثم قم بإدراج البرومبت الجديد بالقيم الصحيحة التي أرسلها، وضعه في proposedState مع تعيين isProposal: true.
        3. هيكلية البرومبتات في التطبيق تحتوي على:
           - id: معرف فريد من نوعه (مثال: id-xxxxx).
           - gateId: معرف الفئة التي ينتمي إليها.
           - title: عنوان النص (Prompt Title).
           - content: كتابة النص الفعلي ومحتواه (Prompt Content).
           - note: الملاحظة المخصصة لهذا النص (Note).
           - isFavorite: هل هو مفضل أم لا (قيمة بولينية).
        4. الحفاظ على البيانات: لا تحذف بوابات تحتوي على نصوص إلا إذا طلب المستخدم ذلك صراحة. حافظ دائماً على بوابة المفضلة (id: "favorites", name: "Favorites").
        5. اللغة: تواصل دائماً بلغة عربية راقية ومفهومة ومحترفة وأظهر أنك تفهم رغباته وتقارير التفاصيل المقترحة قبل مطالبته بالضغط على "تطبيق".
      `;

      const activeSystemInstruction = systemInstruction || defaultSystemInstruction;

      const prompt = `
        Current App State:
        ${JSON.stringify(state, null, 2)}

        Chat History context:
        ${formattedHistory}

        User message:
        "${message}"
      `;

      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: activeSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "الرد المكتوب بالعربية للشرح أو الاستيضاح أو طلب التفاصيل.",
              },
              isProposal: {
                type: Type.BOOLEAN,
                description: "تعيينها كـ True فقط إذا كنت تقترح تغييراً أو إضافة هيكلية فعلية في البيانات.",
              },
              proposedState: {
                type: Type.OBJECT,
                description: "الحالة الكاملة الجديدة للتطبيق بعد الإضافة أو التعديل.",
                properties: {
                  gates: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        isDeletable: { type: Type.BOOLEAN },
                      },
                      required: ["id", "name", "isDeletable"],
                    },
                  },
                  prompts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        gateId: { type: Type.STRING },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        note: { type: Type.STRING },
                        isFavorite: { type: Type.BOOLEAN },
                      },
                      required: ["id", "gateId", "title", "content", "note", "isFavorite"],
                    },
                  },
                },
                required: ["gates", "prompts"],
              },
            },
            required: ["message", "isProposal"],
          },
        },
      });

      let responseText = response.text || "{}";
      
      // Safety clean of Markdown JSON wrappers
      if (responseText.includes("```")) {
        responseText = responseText.replace(/```json/gi, "").replace(/```/gi, "");
      }
      responseText = responseText.trim();
      
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Endpoint error:", error);
      res.status(500).json({ error: error?.message || "An error occurred with Gemini API." });
    }
  });

  // Vite static file server / dev middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
