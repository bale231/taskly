import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { getCurrentUserJWT, logout } from "../api/auth";
import { useNetwork } from "../context/NetworkContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

/**
 * Placeholder della Home: serve a chiudere il flusso di autenticazione.
 * Il port completo di src/pages/Home.tsx (liste, todo, drag&drop, offline)
 * è previsto nella fase successiva.
 */
export default function HomeScreen({ navigation }: Props) {
  const { theme, setTheme } = useTheme();
  const { isOnline } = useNetwork();
  const [user, setUser] = useState<{
    username?: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getCurrentUserJWT();
      setUser(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100 dark:bg-gray-900"
      contentContainerStyle={{ padding: 24 }}
    >
      <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        Ciao {user?.username ?? "utente"} 👋
      </Text>
      <Text className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        {user?.email}
      </Text>

      {!isOnline ? (
        <View className="mb-4 rounded-lg border border-orange-400 bg-orange-100 px-4 py-3">
          <Text className="text-sm text-orange-700">Sei offline</Text>
        </View>
      ) : null}

      <View className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="mb-2 font-semibold text-gray-900 dark:text-white">
          Autenticazione funzionante
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          Login, registrazione e reset password sono collegati allo stesso
          backend della webapp. Liste e todo arrivano nella prossima fase.
        </Text>
      </View>

      <Pressable
        onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="mb-3 w-full items-center rounded-lg bg-blue-600 py-3"
      >
        <Text className="font-semibold text-white">
          Tema: {theme === "dark" ? "scuro" : "chiaro"}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleLogout}
        className="w-full items-center rounded-lg border border-red-500 py-3"
      >
        <Text className="font-semibold text-red-500">Esci</Text>
      </Pressable>
    </ScrollView>
  );
}
