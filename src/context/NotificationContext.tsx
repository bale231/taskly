import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deleteNotification as deleteNotificationAPI,
  fetchNotifications as fetchNotificationsAPI,
  markAllNotificationsAsRead as markAllNotificationsAsReadAPI,
  markNotificationAsRead as markNotificationAsReadAPI,
  type Notification,
} from "../api/notifications";

export type { Notification };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showPopup: boolean;
  setShowPopup: (show: boolean) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: number) => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

const POLL_INTERVAL = 30_000;

/**
 * Port di src/context/NotificationContext.tsx della webapp. Non portata la
 * parte di notifiche di sistema (Notification API del browser): qui restano
 * solo il badge e il popup in-app. Le vere push nativa (Firebase) sono fuori
 * scope, dipendono da @react-native-firebase e configurazione FCM.
 */
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await fetchNotificationsAPI();
      setNotifications(data);
    } catch (error) {
      // console.warn, non console.error: il polling ogni 30s può incontrare
      // errori di rete transitori che non devono aprire la LogBox a schermo
      // intero in dev mode - l'errore è già gestito, i dati restano quelli
      // dell'ultimo fetch riuscito.
      console.warn("Errore nel caricamento notifiche:", error);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await markNotificationAsReadAPI(id);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      console.error("Errore nel marcare come letta:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsReadAPI();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    } catch (error) {
      console.error("Errore nel marcare tutte come lette:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await deleteNotificationAPI(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (error) {
      console.error("Errore nell'eliminazione notifica:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopup,
        setShowPopup,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
