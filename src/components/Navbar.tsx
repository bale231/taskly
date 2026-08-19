import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassSurface from "./GlassSurface";
import NotificationBadge from "./NotificationBadge";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../context/ThemeContext";

/**
 * Altezza della navbar esclusa la safe area. Ora che la navbar è un overlay
 * assoluto (per lasciar scorrere il contenuto dietro al blur), le schermate
 * che la usano devono aggiungere `NAVBAR_BASE_HEIGHT + insets.top` di
 * padding-top alla loro ScrollView per non farci finire i contenuti sotto.
 */
export const NAVBAR_BASE_HEIGHT = 72;

/** Oltre quanti px di scroll il glass/blur è completamente visibile. */
const SCROLL_FADE_DISTANCE = 30;

interface NavbarProps {
  /** Offset di scroll dello schermo che la ospita: se passato, il glass/blur
   * di sfondo compare in fade-in scrollando invece di essere sempre visibile. */
  scrollY?: SharedValue<number>;
}

/**
 * Port parziale di src/components/Navbar.tsx della webapp: logo, toggle
 * tema, badge notifiche e pallino profilo. Il pulsante di sync manuale
 * (offline queue) non è ancora stato portato - dipende dall'offline layer,
 * fuori dallo scope di questa fase.
 */
export default function Navbar({ scrollY }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  // Il vetro compare/scompare come booleano a soglia, non con un'opacità
  // continua: su GlassView (Liquid Glass, iOS 26+) impostare l'opacità a 0
  // su un antenato disabilita del tutto l'effetto invece di renderlo solo
  // invisibile, quindi GlassSurface gestisce la transizione internamente
  // (vedi `visible` prop). Qui serve solo sapere quando si è superata la
  // soglia, aggiornando uno stato React solo al cambio (non ad ogni frame).
  const [scrolled, setScrolled] = useState(false);
  useAnimatedReaction(
    () => (scrollY ? scrollY.value > SCROLL_FADE_DISTANCE : true),
    (isScrolled, prevIsScrolled) => {
      if (isScrolled !== prevIsScrolled) runOnJS(setScrolled)(isScrolled);
    },
    [scrollY]
  );

  const borderStyle = useAnimatedStyle(() => ({
    opacity: scrollY
      ? interpolate(scrollY.value, [0, SCROLL_FADE_DISTANCE], [0, 1], Extrapolation.CLAMP)
      : 1,
  }));

  return (
    <View
      className="absolute left-0 right-0 top-0 z-50 w-full flex-row items-center justify-between pl-2 pr-3"
      style={{ height: NAVBAR_BASE_HEIGHT + insets.top, paddingTop: insets.top }}
    >
      <GlassSurface
        style={StyleSheet.absoluteFill}
        visible={scrollY ? scrolled : true}
        colorScheme={isDark ? "dark" : "light"}
        tint={isDark ? "dark" : "light"}
        intensity={80}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          borderStyle,
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(229,231,235,0.5)",
          },
        ]}
      />

      <Pressable
        onPress={() => navigation.navigate("Home")}
        hitSlop={8}
        style={{ height: "100%", justifyContent: "center", flexShrink: 1 }}
      >
        <Image
          source={
            isDark
              ? require("../../assets/logo-theme-dark.png")
              : require("../../assets/logo-theme-light.png")
          }
          // Aspect ratio ~3:1 dei nuovi loghi (logo-theme-dark/light.png).
          style={{ width: 165, height: 52, resizeMode: "contain" }}
        />
      </Pressable>

      <View className="flex-row items-center gap-3">
        <ThemeToggle isDark={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />

        <NotificationBadge />
      </View>
    </View>
  );
}
