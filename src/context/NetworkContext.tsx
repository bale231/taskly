import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { processQueue } from "../services/syncQueue";

/**
 * Equivalente RN del NetworkContext della webapp, che si basava su
 * navigator.onLine + eventi online/offline. Qui la fonte è NetInfo.
 */
interface NetworkContextProps {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextProps>({ isOnline: true });

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  // Ottimista finché NetInfo non riporta il primo stato: evita di mostrare
  // "sei offline" per una frazione di secondo all'avvio.
  const [isOnline, setIsOnline] = useState(true);
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    // Tentativo anche all'avvio: se l'app era stata chiusa con mutazioni
    // pendenti (es. l'utente ha usato l'app offline e poi l'ha terminata),
    // non bisogna aspettare un cambio di stato della rete per riprovare.
    processQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable è null finché indeterminato: in quel caso
      // ci fidiamo di isConnected.
      const nowOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(nowOnline);

      if (nowOnline && !wasOnlineRef.current) processQueue();
      wasOnlineRef.current = nowOnline;
    });

    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
