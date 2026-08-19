import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Check, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  acceptFriendRequest,
  fetchFriendRequests,
  rejectFriendRequest,
  type FriendRequest,
} from "../api/friends";
import AnimatedAlert from "../components/AnimatedAlert";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "FriendRequests">;

type Alert = { type: "success" | "error" | "warning"; message: string } | null;

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/** Port di "Richieste di Amicizia" della webapp: lista richieste in arrivo con Accetta/Rifiuta. */
export default function FriendRequestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFriendRequests();
      setRequests(data);
    } catch (err) {
      console.error("Errore caricamento richieste:", err);
      setAlert({ type: "error", message: "Errore nel caricamento delle richieste" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAccept = async (request: FriendRequest) => {
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    setAlert({ type: "success", message: "Richiesta accettata" });
    try {
      await acceptFriendRequest(request.id);
    } catch (err) {
      console.error("Errore accettazione richiesta:", err);
      setAlert({ type: "error", message: "Errore nell'accettare la richiesta" });
    }
  };

  const handleReject = async (request: FriendRequest) => {
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    setAlert({ type: "success", message: "Richiesta rifiutata" });
    try {
      await rejectFriendRequest(request.id);
    } catch (err) {
      console.error("Errore rifiuto richiesta:", err);
      setAlert({ type: "error", message: "Errore nel rifiutare la richiesta" });
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
          Richieste di Amicizia
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" />
        ) : requests.length === 0 ? (
          <View className="mt-6 rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70">
            <Text className="text-center text-gray-700 dark:text-gray-300">
              Nessuna richiesta di amicizia in sospeso
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {requests.map((request) => {
              const sender = request.from_user ?? request.sender;
              return (
                <View
                  key={request.id}
                  className="flex-row items-center gap-3 rounded-xl border border-gray-200/50 bg-white/70 p-4 dark:border-white/20 dark:bg-gray-800/70"
                >
                  <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {sender?.profile_picture ? (
                      <Image
                        source={{
                          uri: sender.profile_picture.startsWith("http")
                            ? sender.profile_picture
                            : `${AVATAR_BASE_URL}${sender.profile_picture}`,
                        }}
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <Text className="text-lg">👤</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      {sender?.full_name || sender?.username || "Utente sconosciuto"}
                    </Text>
                    {sender?.username && (
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        @{sender.username}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleAccept(request)}
                    className="rounded-lg bg-green-500/10 border border-green-400/30 p-2"
                  >
                    <Check size={16} color="#16A34A" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(request)}
                    className="rounded-lg bg-red-500/10 border border-red-400/30 p-2"
                  >
                    <X size={16} color="#DC2626" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
