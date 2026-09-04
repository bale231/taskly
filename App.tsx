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
import { AlertProvider, useAlert } from "./src/context/AlertContext";
import { NetworkProvider } from "./src/context/NetworkContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ThemeProvider } from "./src/context/ThemeContext";
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
      // Se l'utente risulta già loggato (token persistiti da "Rimani
      // loggato"), il prefetch di TUTTI i dati (liste+todo, categorie,
      // amici, richieste, notifiche, profilo) avviene qui, prima di
      // mostrare l'app: così la Home e ogni altra schermata partono già
      // con i dati pronti in cache, senza fetch on-demand né skeleton
      // durante la navigazione. Se il prefetch fallisce (offline, backend
      // giù), non blocca l'avvio: le schermate ricadranno sulla cache
      // salvata in una sessione precedente o sulla propria fetch normale.
      await Promise.all([
        clearSessionTokensIfNeeded()
          .then(() => proactiveTokenRefresh())
          .then(() => prefetchAll())
          .catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
      setBootstrapped(true);
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
                <BottomSheetModalProvider>
                  <StatusBar style="auto" />
                  <RootNavigator />
                  <NotificationPopup />
                  <GlobalAlert />
                </BottomSheetModalProvider>
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
