import "./global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { proactiveTokenRefresh } from "./src/api/auth";
import AnimatedAlert from "./src/components/AnimatedAlert";
import AnimatedSplashScreen, {
  SPLASH_ANIMATION_MS,
} from "./src/components/AnimatedSplashScreen";
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
      // L'attesa in parallelo lascia completare un giro dell'animazione del
      // logo invece di troncarla a metà quando il bootstrap è già finito.
      //
      // Il bootstrap BLOCCANTE si ferma all'autenticazione: è l'unica cosa
      // che serve davvero per decidere quale schermata mostrare.
      await Promise.all([
        clearSessionTokensIfNeeded()
          .then(() => proactiveTokenRefresh())
          .catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, SPLASH_ANIMATION_MS)),
      ]);
      setBootstrapped(true);

      // Il prefetch (liste+todo, categorie, amici, richieste, notifiche)
      // parte DOPO, senza await: riempie le cache mentre l'utente sta già
      // usando l'app. Aspettarlo qui significava tenere lo splash fermo
      // finché il backend — worker singolo su PythonAnywhere — non aveva
      // risposto a decine di richieste: con 15-20 liste erano svariati
      // secondi di attesa a ogni avvio, per dati che in larga parte
      // l'utente non apriva nemmeno in quella sessione.
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
