// Port di src/api/sharing.ts della webapp: lettura, creazione e rimozione
// delle condivisioni di una lista. Contratto di shareList/unshareList non
// verificato su dispositivo reale (endpoint dedotti dalle convenzioni REST
// del backend, coerenti con friends.ts): parsing tollerante come lì.
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";
import { CACHE_TTL, createCacheKey, deduplicatedFetch, invalidateCache } from "../utils/apiCache";

export interface SharedUser {
  user_id: number;
  username: string;
  full_name: string;
  profile_picture: string | null;
  can_edit: boolean;
  shared_at: string;
}

// Prima non passava da cache/dedup: ogni mount di ListDetailScreen (anche
// per liste non condivise) faceva una richiesta di rete vera, in
// concorrenza con fetchListDetails/il prefetch verso lo stesso backend
// single-worker — un contributo diretto al ritardo di apertura schermata.
export async function getListShares(listId: number): Promise<SharedUser[]> {
  const cacheKey = createCacheKey("list-shares", listId);
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/`);
      if (!res.ok) throw new Error("Errore caricamento condivisioni");
      return res.json();
    },
    CACHE_TTL.LIST_SHARES
  );
}

export async function shareList(listId: number, userId: number, canEdit: boolean) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, can_edit: canEdit }),
  });
  if (!res.ok) throw new Error("Errore condivisione lista");
  invalidateCache(new RegExp(`^list-shares:${listId}`));
  return res.json();
}

export async function unshareList(listId: number, userId: number) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/shares/${userId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Errore rimozione condivisione");
  invalidateCache(new RegExp(`^list-shares:${listId}`));
  return res.json();
}
