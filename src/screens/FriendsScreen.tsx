import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserMinus } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchFriends, removeFriend, type Friend } from "../api/friends";
import AnimatedAlert from "../components/AnimatedAlert";
import BubbleModal from "../components/BubbleModal";
import GlassSurface from "../components/GlassSurface";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Friends">;

type Alert = { type: "success" | "error" | "warning"; message: string } | null;

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/** Port di "I Miei Amici" della webapp: lista amici con rimozione (con conferma). */
export default function FriendsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFriends();
      setFriends(data);
    } catch (err) {
      console.error("Errore caricamento amici:", err);
      setAlert({ type: "error", message: "Errore nel caricamento degli amici" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleRemove = async (id: number) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setAlert({ type: "success", message: "Amico rimosso" });
    try {
      await removeFriend(id);
    } catch (err) {
      console.error("Errore rimozione amico:", err);
      setAlert({ type: "error", message: "Errore nella rimozione dell'amico" });
    }
  };

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900">
      <Navbar scrollY={scrollY} />

      <AnimatedAlert alert={alert} onClose={() => setAlert(null)} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          padding: 24,
          paddingTop: NAVBAR_BASE_HEIGHT + insets.top + 24,
          paddingBottom: 120,
        }}
      >
        <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          I Miei Amici
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" />
        ) : friends.length === 0 ? (
          <View className="mt-6 rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70">
            <Text className="text-center text-gray-700 dark:text-gray-300">
              Non hai ancora nessun amico
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {friends.map((friend) => {
              const person = friend.user ?? friend.friend;
              const displayName = person?.full_name || friend.full_name || person?.username || friend.username || "Utente";
              const username = person?.username || friend.username;
              const picture = person?.profile_picture ?? friend.profile_picture;
              return (
                <View
                  key={friend.id}
                  className="flex-row items-center gap-3 rounded-xl border border-gray-200/50 bg-white/70 p-4 dark:border-white/20 dark:bg-gray-800/70"
                >
                  <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {picture ? (
                      <Image
                        source={{
                          uri: picture.startsWith("http") ? picture : `${AVATAR_BASE_URL}${picture}`,
                        }}
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <Text className="text-lg">👤</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      {displayName}
                    </Text>
                    {username && (
                      <Text className="text-xs text-gray-500 dark:text-gray-400">@{username}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setRemoveConfirmId(friend.id)}
                    className="rounded-lg bg-red-500/10 border border-red-400/30 p-2"
                  >
                    <UserMinus size={16} color="#DC2626" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>

      {/* Conferma rimozione amico */}
      <BubbleModal
        visible={removeConfirmId !== null}
        onRequestClose={() => setRemoveConfirmId(null)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Rimuovere questo amico?
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setRemoveConfirmId(null)}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
            >
              <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (removeConfirmId !== null) handleRemove(removeConfirmId);
                setRemoveConfirmId(null);
              }}
              className="flex-1 rounded-lg bg-red-600 py-2.5"
            >
              <Text className="text-center font-medium text-white">Rimuovi</Text>
            </Pressable>
          </View>
        </View>
      </BubbleModal>
    </View>
  );
}
