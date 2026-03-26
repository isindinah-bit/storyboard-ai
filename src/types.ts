export type ImageSize = "1K" | "2K" | "4K";

export interface Scene {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  status: "pending" | "generating" | "completed" | "error";
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}
