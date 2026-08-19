// Port di src/api/sharing.ts della webapp: lettura, creazione e rimozione
// delle condivisioni di una lista. Contratto di shareList/unshareList non
// verificato su dispositivo reale (endpoint dedotti dalle convenzioni REST
// del backend, coerenti con friends.ts): parsing tollerante come lì.
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";

export interface SharedUser {
  user_id: number;
  username: string;
  full_name: string;
  profile_picture: string | null;
  can_edit: boolean;
  shared_at: string;
}

export async function getListShares(listId: number): Promise<SharedUser[]> {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/`);
  if (!res.ok) throw new Error("Errore caricamento condivisioni");
  return res.json();
}

export async function shareList(listId: number, userId: number, canEdit: boolean) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, can_edit: canEdit }),
  });
  if (!res.ok) throw new Error("Errore condivisione lista");
  return res.json();
}

export async function unshareList(listId: number, userId: number) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/${userId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Errore rimozione condivisione");
  return res.json();
}
