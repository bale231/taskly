// Port parziale di src/api/sharing.ts della webapp: solo la lettura delle
// condivisioni, usata per il badge "condivisa con" in ListDetailScreen.
// La UI di condivisione (shareList/unshareList/ShareModal) non è ancora
// stata portata: è una feature a parte, fuori dallo scope di questa fase.
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
