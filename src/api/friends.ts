// Port di src/api/friends.ts della webapp: ricerca utenti, richieste di
// amicizia e lista amici. Forme di risposta non ancora verificate su
// dispositivo reale: parsing tollerante con fallback su tutti i campi opzionali.
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";

export interface FriendUser {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  profile_picture?: string | null;
}

export interface FriendRequest {
  id: number;
  from_user?: FriendUser;
  to_user?: FriendUser;
  sender?: FriendUser;
  receiver?: FriendUser;
  status?: string;
  created_at?: string;
}

export interface Friend {
  id: number;
  user?: FriendUser;
  friend?: FriendUser;
  username?: string;
  full_name?: string;
  profile_picture?: string | null;
}

export async function searchUsers(query: string): Promise<FriendUser[]> {
  const res = await fetchWithAuth(`${API_URL}/users/?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Errore ricerca utenti");
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function sendFriendRequest(userId: number) {
  const res = await fetchWithAuth(`${API_URL}/friend-requests/send/${userId}/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Errore invio richiesta di amicizia");
  return res.json();
}

export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  const res = await fetchWithAuth(`${API_URL}/friend-requests/`);
  if (!res.ok) throw new Error("Errore caricamento richieste di amicizia");
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return data?.incoming ?? data?.results ?? [];
}

export async function acceptFriendRequest(requestId: number) {
  const res = await fetchWithAuth(`${API_URL}/friend-requests/${requestId}/accept/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Errore accettazione richiesta");
  return res.json();
}

export async function rejectFriendRequest(requestId: number) {
  const res = await fetchWithAuth(`${API_URL}/friend-requests/${requestId}/reject/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Errore rifiuto richiesta");
  return res.json();
}

export async function fetchFriends(): Promise<Friend[]> {
  const res = await fetchWithAuth(`${API_URL}/friends/`);
  if (!res.ok) throw new Error("Errore caricamento amici");
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function removeFriend(friendId: number) {
  const res = await fetchWithAuth(`${API_URL}/friends/${friendId}/remove/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Errore rimozione amico");
  return res.json();
}
