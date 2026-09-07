// Port di src/api/aiChat.ts della webapp: stesso endpoint, stesso contratto.
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";

export interface AIChatResponse {
  reply: string;
  error?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendAIChatMessage(
  message: string,
  conversationHistory: ConversationMessage[]
): Promise<AIChatResponse> {
  const res = await fetchWithAuth(`${API_URL}/ai-chat/`, {
    method: "POST",
    body: JSON.stringify({
      message,
      // Stesso limite della webapp: solo gli ultimi 10 scambi, per non far
      // crescere indefinitamente il body/costo della richiesta al provider AI.
      conversation_history: conversationHistory.slice(-10),
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}
