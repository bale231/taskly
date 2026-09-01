// Port di src/api/notifications.ts della webapp. Rete identica
// all'originale: cambia solo lo storage del token (async).
import { API_URL } from "./config";
import { fetchWithAuth } from "./todos";

export interface Notification {
  id: number;
  type: "update_normal" | "update_important" | "friend_request" | "list_modified" | "general";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  from_user?: {
    name: string;
    surname: string;
    profile_picture?: string;
  };
  list_name?: string;
}

export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetchWithAuth(`${API_URL}/notifications/`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Errore nel caricamento delle notifiche");
  }

  return response.json();
};

export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/notifications/${notificationId}/read/`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Errore nel marcare la notifica come letta");
  }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/notifications/mark_all_read/`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Errore nel marcare tutte le notifiche come lette");
  }
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/notifications/${notificationId}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Errore nell'eliminazione della notifica");
  }
};
