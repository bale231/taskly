import "./global.css";

import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { proactiveTokenRefresh } from "./src/api/auth";
import { NetworkProvider } from "./src/context/NetworkContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { clearSessionTokensIfNeeded } from "./src/services/storage";

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Ordine importante: prima si scartano i token di una sessione
      // non persistente, poi si tenta il refresh proattivo su ciò che resta.
      await clearSessionTokensIfNeeded();
      await proactiveTokenRefresh();
      setBootstrapped(true);
    };

    bootstrap();
  }, []);

  if (!bootstrapped) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
