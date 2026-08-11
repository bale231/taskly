import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { getCurrentUserJWT, logout } from "../api/auth";
import BottomNav from "../components/BottomNav";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

/**
 * Placeholder minimo: il port completo di src/pages/Profile.tsx (598 righe:
 * avatar, cambio password, preferenze notifiche, elimina account) è fuori
 * dallo scope di questa fase, che si concentra su liste e todo.
 */
export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<{ username?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUserJWT().then((data) => {
      setUser(data);
      setLoading(false);
    });
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
    <View className="flex-1 bg-gray-100 dark:bg-gray-900">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {user?.username ?? "Profilo"}
        </Text>
        <Text className="mb-6 text-sm text-gray-600 dark:text-gray-300">{user?.email}</Text>

        <Pressable
          onPress={handleLogout}
          className="w-full items-center rounded-lg border border-red-500 py-3"
        >
          <Text className="font-semibold text-red-500">Esci</Text>
        </Pressable>
      </ScrollView>

      <BottomNav showHome showProfile />
    </View>
  );
}
