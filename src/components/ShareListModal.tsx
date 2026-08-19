import { Check, Share2, Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BubbleModal from "./BubbleModal";
import GlassSurface from "./GlassSurface";
import { fetchFriends, type Friend } from "../api/friends";
import { getListShares, shareList, unshareList } from "../api/sharing";
import { useTheme } from "../context/ThemeContext";

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  listName: string;
}

function friendLabel(friend: Friend): string {
  const user = friend.user ?? friend.friend;
  return user?.full_name || user?.username || friend.full_name || friend.username || "Utente";
}

function friendUserId(friend: Friend): number {
  const user = friend.user ?? friend.friend;
  return user?.id ?? friend.id;
}

/** Modale di condivisione lista, modellata su MoveTodoModal.tsx. */
export default function ShareListModal({ isOpen, onClose, listId, listName }: ShareListModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([fetchFriends(), getListShares(listId)])
      .then(([friendsData, shares]) => {
        setFriends(friendsData);
        setSharedUserIds(shares.map((s) => s.user_id));
      })
      .catch((err) => console.error("Errore caricamento condivisione:", err))
      .finally(() => setLoading(false));
  }, [isOpen, listId]);

  const handleShare = async (userId: number) => {
    setBusyIds((prev) => [...prev, userId]);
    try {
      await shareList(listId, userId, true);
      setSharedUserIds((prev) => [...prev, userId]);
    } catch (err) {
      console.error("Errore condivisione lista:", err);
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleUnshare = async (userId: number) => {
    setBusyIds((prev) => [...prev, userId]);
    try {
      await unshareList(listId, userId);
      setSharedUserIds((prev) => prev.filter((id) => id !== userId));
    } catch (err) {
      console.error("Errore rimozione condivisione:", err);
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  return (
    <BubbleModal
      visible={isOpen}
      onRequestClose={onClose}
      contentStyle={{ width: "100%", maxWidth: 384 }}
    >
      <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
        <GlassSurface
          style={StyleSheet.absoluteFill}
          colorScheme={isDark ? "dark" : "light"}
          tint={isDark ? "dark" : "light"}
          intensity={90}
        />

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white">
            Condividi Lista
          </Text>
          <Pressable onPress={onClose} className="rounded-lg p-2">
            <X size={20} color="#6B7280" />
          </Pressable>
        </View>

        <View className="mb-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            Stai condividendo:
          </Text>
          <Text className="font-semibold text-gray-900 dark:text-white">{listName}</Text>
        </View>

        <Text className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          Seleziona un amico:
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#7C3AED" style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView className="mb-4" style={{ maxHeight: 280 }}>
            {friends.length === 0 ? (
              <Text className="py-4 text-center text-gray-500">
                Nessun amico da invitare
              </Text>
            ) : (
              friends.map((friend) => {
                const userId = friendUserId(friend);
                const alreadyShared = sharedUserIds.includes(userId);
                const busy = busyIds.includes(userId);
                return (
                  <View
                    key={friend.id}
                    className="mb-2 flex-row items-center justify-between gap-3 rounded-xl bg-white/70 p-3 dark:bg-gray-800/70"
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      <Users size={16} color="#7C3AED" />
                      <Text className="flex-1 font-medium text-gray-900 dark:text-white">
                        {friendLabel(friend)}
                      </Text>
                    </View>

                    {busy ? (
                      <ActivityIndicator size="small" color="#7C3AED" />
                    ) : alreadyShared ? (
                      <Pressable
                        onPress={() => handleUnshare(userId)}
                        className="flex-row items-center gap-1 rounded-lg bg-green-500/10 border border-green-400/30 px-3 py-2"
                      >
                        <Check size={14} color="#16A34A" />
                        <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                          Condivisa
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleShare(userId)}
                        className="flex-row items-center gap-1 rounded-lg bg-purple-100/80 px-3 py-2 dark:bg-purple-900/60"
                      >
                        <Share2 size={14} color="#7C3AED" />
                        <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          Condividi
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <Pressable onPress={onClose} className="rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800">
          <Text className="text-center text-gray-700 dark:text-gray-300">Chiudi</Text>
        </Pressable>
      </View>
    </BubbleModal>
  );
}
