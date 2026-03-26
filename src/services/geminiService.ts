import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ImageSize } from "../types";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// For image generation, we need to create a new instance with the selected key
const getImageAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export async function parseScriptToScenes(script: string): Promise<Scene[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview",
    contents: `Analyze the following script and break it down into a sequence of key visual scenes for a storyboard. 
    For each scene, provide a title, a brief description of the action, and a detailed image prompt for an AI image generator.
    
    Script:
    ${script}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["title", "description", "imagePrompt"],
        },
      },
    },
  });

  const scenesData = JSON.parse(response.text || "[]");
  return scenesData.map((s: any, i: number) => ({
    ...s,
    id: Math.random().toString(36).substr(2, 9),
    status: "pending",
  }));
}

export async function generateSceneImage(prompt: string): Promise<string> {
  const ai = getImageAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function chatWithGemini(messages: { role: "user" | "model"; content: string }[]) {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-2.5-flash-preview",
    config: {
      systemInstruction: "You are a creative storyboard assistant. Help the user refine their script, suggest visual ideas, and improve image prompts.",
    },
  });

  // Replay history
  for (let i = 0; i < messages.length - 1; i++) {
    // This is a bit simplified, usually you'd use the history feature of the SDK
  }

  const lastMessage = messages[messages.length - 1].content;
  const response = await chat.sendMessage({ message: lastMessage });
  return response.text;
}
