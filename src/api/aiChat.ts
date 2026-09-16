// Port di src/api/aiChat.ts della webapp: stesso endpoint, stesso contratto.
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";

export interface AIChatResponse {
  reply: string;
  error?: string;
  /** Assente se l'utente non è autenticato: il server risponde comunque,
   * ma senza legare la chat a un account non la salva. */
  conversation_id?: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: number;
  title: string;
  messages: ConversationMessage[];
}

export async function sendAIChatMessage(
  message: string,
  conversationHistory: ConversationMessage[],
  conversationId?: number | null
): Promise<AIChatResponse> {
  const res = await fetchWithAuth(`${API_URL}/ai-chat/`, {
    method: "POST",
    body: JSON.stringify({
      message,
      // Stesso limite della webapp: solo gli ultimi 10 scambi, per non far
      // crescere indefinitamente il body/costo della richiesta al provider AI.
      conversation_history: conversationHistory.slice(-10),
      // Se presente, il server continua quella conversazione invece di
      // aprirne una nuova ad ogni messaggio.
      conversation_id: conversationId ?? undefined,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetchWithAuth(`${API_URL}/ai-chat/conversations/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchConversation(id: number): Promise<ConversationDetail> {
  const res = await fetchWithAuth(`${API_URL}/ai-chat/conversations/${id}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteConversation(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/ai-chat/conversations/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
