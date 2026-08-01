import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable è null finché indeterminato: in quel caso
      // ci fidiamo di isConnected.
      setIsOnline(
        Boolean(state.isConnected) && state.isInternetReachable !== false
      );
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
