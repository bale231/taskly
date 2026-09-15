import "./global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { proactiveTokenRefresh } from "./src/api/auth";
import AnimatedAlert from "./src/components/AnimatedAlert";
import AnimatedSplashScreen from "./src/components/AnimatedSplashScreen";
import NotificationPopup from "./src/components/NotificationPopup";
import TourOverlay from "./src/components/TourOverlay";
import { AlertProvider, useAlert } from "./src/context/AlertContext";
import { NetworkProvider } from "./src/context/NetworkContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { TourProvider } from "./src/context/TourContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { prefetchAll } from "./src/services/prefetch";
import { clearSessionTokensIfNeeded } from "./src/services/storage";

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Ordine importante: prima si scartano i token di una sessione
      // non persistente, poi si tenta il refresh proattivo su ciò che resta.
      // Il delay minimo evita che lo splash animato lampeggi per una
      // frazione di secondo quando il bootstrap è già istantaneo.
      //
      // Solo il lavoro sui TOKEN è bloccante: senza, le schermate partirebbero
      // con richieste non autenticate. Il prefetch dei dati invece NON viene
      // atteso — parte e prosegue in background mentre l'app è già usabile.
      // Aspettarlo qui significava tenere lo splash finché non era scaricato
      // il dettaglio di OGNI lista (una richiesta per lista, a gruppi di 3,
      // più amici/notifiche/richieste) verso un backend a worker singolo: con
      // 15-20 liste sono secondi interi di attesa prima ancora di vedere la
      // Home, ed è la causa principale della lentezza percepita all'avvio.
      // Le schermate hanno già la propria fetch on-demand come rete di
      // sicurezza: il prefetch è un'ottimizzazione, non un prerequisito.
      await Promise.all([
        clearSessionTokensIfNeeded()
          .then(() => proactiveTokenRefresh())
          .catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
      setBootstrapped(true);
      prefetchAll().catch(() => {});
    };

    bootstrap();
  }, []);

  if (!bootstrapped) {
    return <AnimatedSplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AlertProvider>
                <TourProvider>
                  <BottomSheetModalProvider>
                    <StatusBar style="auto" />
                    <RootNavigator />
                    <NotificationPopup />
                    <GlobalAlert />
                    <TourOverlay />
                  </BottomSheetModalProvider>
                </TourProvider>
              </AlertProvider>
            </NotificationProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function GlobalAlert() {
  const { alert, hideAlert, hasOpenModal } = useAlert();
  // Mentre una BubbleModal è aperta, è lei stessa a renderizzare l'alert al
  // suo interno (sopra il proprio blur): questo toast globale deve restare
  // muto, altrimenti l'alert comparirebbe anche qui, sotto quella finestra
  // nativa e quindi invisibile ma comunque montato/animato in parallelo.
  if (hasOpenModal()) return null;
  return <AnimatedAlert alert={alert} onClose={hideAlert} />;
}
