import "./global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { proactiveTokenRefresh } from "./src/api/auth";
import AnimatedSplashScreen from "./src/components/AnimatedSplashScreen";
import NotificationPopup from "./src/components/NotificationPopup";
import { NetworkProvider } from "./src/context/NetworkContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { clearSessionTokensIfNeeded } from "./src/services/storage";

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Ordine importante: prima si scartano i token di una sessione
      // non persistente, poi si tenta il refresh proattivo su ciò che resta.
      // Il delay minimo evita che lo splash animato lampeggi per una
      // frazione di secondo quando il bootstrap è già istantaneo.
      await Promise.all([
        clearSessionTokensIfNeeded().then(() => proactiveTokenRefresh()),
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
              <BottomSheetModalProvider>
                <StatusBar style="auto" />
                <RootNavigator />
                <NotificationPopup />
              </BottomSheetModalProvider>
            </NotificationProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
