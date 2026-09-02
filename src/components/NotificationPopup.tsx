import { AlertCircle, Check, RefreshCw, Trash2, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BubbleModal from "./BubbleModal";
import GlassSurface from "./GlassSurface";
import { useNotifications, type Notification } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";

function NotificationIcon({ type }: { type: Notification["type"] }) {
  switch (type) {
    case "update_normal":
      return <RefreshCw size={20} color="#3B82F6" />;
    case "update_important":
      return <AlertCircle size={20} color="#EF4444" />;
    default:
      return <AlertCircle size={20} color="#6B7280" />;
  }
}

/**
 * Port di src/components/NotificationPopup.tsx della webapp. Non portato il
 * blocco "Aggiornamento disponibile" (UpdateContext): quello gestiva il
 * self-update della PWA, non applicabile a un'app distribuita dallo store.
 */
export default function NotificationPopup() {
  const { notifications, showPopup, setShowPopup, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <BubbleModal
      visible={showPopup}
      onRequestClose={() => setShowPopup(false)}
      contentStyle={{ width: "100%", maxWidth: 384 }}
    >
      <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">Notifiche</Text>
            <View className="flex-row items-center gap-2">
              {notifications.length > 0 && (
                <Pressable onPress={markAllAsRead} className="rounded-lg p-2">
                  <Check size={18} color="#374151" />
                </Pressable>
              )}
              <Pressable onPress={() => setShowPopup(false)} className="rounded-lg p-2">
                <X size={18} color="#374151" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {notifications.length === 0 ? (
              <View className="items-center py-12">
                <AlertCircle size={48} color="#9CA3AF" />
                <Text className="mt-3 text-gray-500 dark:text-gray-400">Nessuna notifica</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <View
                  key={notif.id}
                  className={`mb-3 rounded-lg p-3 ${
                    notif.read
                      ? "bg-gray-50 dark:bg-gray-800/40"
                      : "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  }`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 flex-row items-start gap-3">
                      <View className="mt-0.5">
                        <NotificationIcon type={notif.type} />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {notif.title}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-300">
                          {notif.message}
                        </Text>
                        <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notif.created_at).toLocaleString("it-IT")}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-1">
                      {!notif.read && (
                        <Pressable onPress={() => markAsRead(notif.id)} className="rounded-lg p-1.5">
                          <Check size={16} color="#374151" />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => deleteNotification(notif.id)}
                        className="rounded-lg p-1.5"
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
      </View>
    </BubbleModal>
  );
}
