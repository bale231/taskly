import { useNavigation } from "@react-navigation/native";
import { Moon, Sun, User } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBadge from "./NotificationBadge";
import { useTheme } from "../context/ThemeContext";

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

  return (
    <View
      className="w-full flex-row items-center justify-between border-b border-gray-200/50 bg-white/90 px-4 dark:border-white/20 dark:bg-gray-900/90"
      style={{ height: 76 + insets.top, paddingTop: insets.top }}
    >
      <Pressable
        onPress={() => navigation.navigate("Home")}
        hitSlop={8}
      >
        <Image
          source={
            isDark
              ? require("../../assets/logo-taskly-themedark.png")
              : require("../../assets/logo-taskly-themelight.png")
          }
          style={{ width: 76, height: 76, resizeMode: "contain" }}
        />
      </Pressable>

      <View className="flex-row items-center gap-3">
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
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700"
        >
          <User size={20} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}
