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
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, state, chatHistory, customApiKey } = req.body;

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

      const systemInstruction = `
        You are "Prompt RKN Live Organizer", a premium embedded AI system deeply integrated inside a Prompt Manager app.
        In this app, there are "Gates" (which are Categories) and "Prompts" (stored in categories).
        You have FULL CONTROL over the application state. When the user asks to "organize", "categorize", "split", "sort", "restructure", "audit" their prompts, you can create new gates, delete unused gates (except favorites), assign prompts to gates, and improve naming.
        
        Rules:
        1. Always keep the 'favorites' gate intact (id: "favorites", name: "Favorites", isDeletable: false).
        2. Keep prompt content and notes unless the user explicitly asks to edit them. Re-categorizing involves modifying the gateId of prompts.
        3. If you propose edits, set "isProposal" to true and return the complete new State in "proposedState". Include all gates and all prompts.
        4. If you are just answering questions, clarifying user intent, speaking to the user, or no structure changes are needed, set "isProposal" to false and return null or omit "proposedState".
        5. Respond in elegant, premium, professional Arabic (العربية). Be helpful, explain your reasoning, and ask for permission.
        6. Always request approval (e.g. "هل تود أن أقوم بتطبيق هذا التنظيم المقترح؟") when proposing state updates.
      `;

      const prompt = `
        Current App State:
        ${JSON.stringify(state, null, 2)}

        Chat History context:
        ${formattedHistory}

        User message:
        "${message}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "Response speech in Arabic, explaining the plan/clarifying.",
              },
              isProposal: {
                type: Type.BOOLEAN,
                description: "True if proposing state/organization updates.",
              },
              proposedState: {
                type: Type.OBJECT,
                description: "The full proposed app state. Include all gates and prompts.",
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

      const responseText = response.text || "{}";
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
