import { useNavigation } from "@react-navigation/native";
import { Moon, Sun, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentUserJWT } from "../api/auth";
import NotificationBadge from "./NotificationBadge";
import { useTheme } from "../context/ThemeContext";

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/**
 * Port parziale di src/components/Navbar.tsx della webapp: logo, toggle
 * tema, badge notifiche e pallino profilo. Il pulsante di sync manuale
 * (offline queue) non è ancora stato portato - dipende dall'offline layer,
 * fuori dallo scope di questa fase.
 *
 * Il toggle tema qui è uno switch semplice con icone sole/luna, non
 * l'animazione CSS sole/luna/nuvole/stelle della webapp: quella è
 * interamente CSS custom (ThemeToggle.tsx + un file di stili a parte) e
 * riprodurla in RN richiederebbe SVG animati dedicati.
 */
export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Carica l'avatar al mount, e lo ricarica ogni volta che la Navbar
  // torna in focus (es. dopo aver cambiato foto in ProfileScreen).
  // "focus" da solo non basta: non scatta al primo render se lo schermo
  // è già quello attivo, quindi l'avatar non appariva al lancio dell'app.
  useEffect(() => {
    const load = () => {
      getCurrentUserJWT().then((data) => {
        setAvatarUri(data?.profile_picture ?? null);
      });
    };

    load();
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  return (
    <View
      className="w-full flex-row items-center justify-between border-b border-gray-200/50 bg-white/90 pl-2 pr-3 dark:border-white/20 dark:bg-gray-900/90"
      style={{ height: 72 + insets.top, paddingTop: insets.top }}
    >
      <Pressable
        onPress={() => navigation.navigate("Home")}
        hitSlop={8}
        style={{ height: "100%", justifyContent: "center", flexShrink: 1 }}
      >
        <Image
          source={
            isDark
              ? require("../../assets/logo-taskly-themedark-cropped.png")
              : require("../../assets/logo-taskly-themelight-cropped.png")
          }
          // I file "-cropped" hanno i margini vuoti rimossi: i file originali
          // avevano il wordmark su un canvas 500x500 che occupava solo
          // l'80% della larghezza e il 28% dell'altezza, quindi con
          // resizeMode contain il logo sembrava piccolo anche aumentando
          // le dimensioni del box.
          style={{ width: 130, height: 52, resizeMode: "contain" }}
        />
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setTheme(isDark ? "light" : "dark")}
          className="h-9 w-16 flex-row items-center rounded-full bg-gray-200 px-1 dark:bg-gray-700"
          accessibilityLabel="Cambia tema"
        >
          <View
            className={`h-7 w-7 items-center justify-center rounded-full bg-white shadow ${
              isDark ? "ml-auto" : ""
            }`}
          >
            {isDark ? (
              <Moon size={16} color="#1E293B" />
            ) : (
              <Sun size={16} color="#F59E0B" />
            )}
          </View>
        </Pressable>

        <NotificationBadge />

        <Pressable
          onPress={() => navigation.navigate("Profile")}
          className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700"
        >
          {avatarUri ? (
            <Image
              source={{
                uri: avatarUri.startsWith("http")
                  ? avatarUri
                  : `${AVATAR_BASE_URL}${avatarUri}`,
              }}
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <User size={20} color="#6B7280" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
