import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Search, UserPlus, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchUsers, sendFriendRequest, type FriendUser } from "../api/friends";
import AnimatedAlert from "../components/AnimatedAlert";
import HighlightText from "../components/HighlightText";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import type { RootStackParamList } from "../navigation/types";

/** Attesa dopo l'ultimo carattere digitato prima di lanciare la ricerca:
 * abbastanza breve da sembrare "live", ma evita una richiesta per ogni
 * singolo tasto mentre l'utente sta ancora scrivendo. */
const SEARCH_DEBOUNCE_MS = 250;

type Props = NativeStackScreenProps<RootStackParamList, "FindUsers">;

type Alert = { type: "success" | "error" | "warning"; message: string } | null;

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/** Port di "Trova Amici" della webapp: ricerca utenti e invio richiesta di amicizia. */
export default function FindUsersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<number[]>([]);
  const [alert, setAlert] = useState<Alert>(null);

  // Tiene traccia della query più recente per cui è partita una richiesta:
  // se una ricerca precedente (più lenta a rispondere, es. per una query
  // più corta con più risultati) torna dopo una più recente, il suo
  // risultato va scartato invece di sovrascrivere quello giusto.
  const latestQueryRef = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Cancellando l'ultima lettera si torna subito allo stato vuoto,
      // senza aspettare il debounce: è quello il "rimuovimi le persone
      // man mano che cancello" richiesto.
      latestQueryRef.current = "";
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      latestQueryRef.current = trimmed;
      try {
        const data = await searchUsers(trimmed);
        if (latestQueryRef.current === trimmed) setResults(data);
      } catch (err) {
        console.error("Errore ricerca utenti:", err);
        if (latestQueryRef.current === trimmed) {
          setAlert({ type: "error", message: "Errore durante la ricerca" });
        }
      } finally {
        if (latestQueryRef.current === trimmed) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (user: FriendUser) => {
    try {
      await sendFriendRequest(user.id);
      setSentIds((prev) => [...prev, user.id]);
      setAlert({ type: "success", message: `Richiesta inviata a ${user.username}` });
    } catch (err) {
      console.error("Errore invio richiesta:", err);
      setAlert({ type: "error", message: "Errore durante l'invio della richiesta" });
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
          Trova Utenti
        </Text>

        <View className="mb-6 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca per username o email..."
            autoCapitalize="none"
            returnKeyType="search"
            className="flex-1 py-3 text-gray-900 dark:text-white"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={18} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" />
        ) : results.length === 0 ? (
          <View className="mt-6 rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70">
            <Text className="text-center text-gray-700 dark:text-gray-300">
              {query.trim() ? "Nessun utente trovato" : "Cerca un utente per aggiungerlo agli amici"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {results.map((user) => {
              const alreadySent = sentIds.includes(user.id);
              return (
                <View
                  key={user.id}
                  className="flex-row items-center gap-3 rounded-xl border border-gray-200/50 bg-white/70 p-4 dark:border-white/20 dark:bg-gray-800/70"
                >
                  <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {user.profile_picture ? (
                      <Image
                        source={{
                          uri: user.profile_picture.startsWith("http")
                            ? user.profile_picture
                            : `${AVATAR_BASE_URL}${user.profile_picture}`,
                        }}
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <Text className="text-lg">👤</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <HighlightText
                      text={user.full_name || user.username}
                      highlight={query}
                      className="font-semibold text-gray-900 dark:text-white"
                    />
                    <HighlightText
                      text={`@${user.username}`}
                      highlight={query}
                      className="text-xs text-gray-500 dark:text-gray-400"
                    />
                  </View>
                  {!alreadySent && (
                    <Pressable
                      onPress={() => handleSendRequest(user)}
                      className="flex-row items-center gap-1 rounded-lg bg-green-500/10 border border-green-400/30 px-3 py-2"
                    >
                      <UserPlus size={14} color="#16A34A" />
                      <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                        Aggiungi
                      </Text>
                    </Pressable>
                  )}
                  {alreadySent && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Inviata</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
