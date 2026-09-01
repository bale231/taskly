import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useNavigation } from "@react-navigation/native";
import { LogOut, User as UserIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentUserJWT, logout } from "../api/auth";
import { GlassBottomSheetBackdrop, GlassBottomSheetBackground } from "./GlassBottomSheet";
import GlassSurface from "./GlassSurface";
import NotificationBadge from "./NotificationBadge";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../context/ThemeContext";

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

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
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const menuRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    getCurrentUserJWT().then((user) => {
      if (user) setAvatarUri(user.profile_picture ?? null);
    });
  }, []);

  const handleLogout = async () => {
    menuRef.current?.dismiss();
    await logout();
    // reset, non replace: azzera l'intero stack di navigazione, non solo
    // la route in cima — altrimenti lo swipe-back nativo poteva riesumare
    // la Home della sessione appena terminata.
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

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
        onPress={() => {
          // popToTop, non navigate: Home è sempre la radice dello stack
          // autenticato, navigate da una schermata secondaria (Profilo,
          // ListDetail) ci aggiungeva sopra invece di tornare a quella
          // esistente, lasciando la schermata di provenienza raggiungibile
          // con lo swipe-back nativo anche dopo essere "arrivati" a Home.
          if (navigation.canGoBack()) navigation.popToTop();
          else navigation.navigate("Home");
        }}
        hitSlop={8}
        style={{ height: "100%", justifyContent: "center", flexShrink: 1 }}
      >
        <Image
          source={
            isDark
              ? require("../../assets/logo-theme-dark.png")
              : require("../../assets/logo-theme-light.png")
          }
          // Stesso box per entrambi i temi, ma il file light appare più
          // piccolo a percezione anche a parità di width/height: un
          // transform scale compensa solo quella versione, senza toccare
          // il layout (il box che occupa resta identico in entrambi i casi).
          style={{
            width: 165,
            height: 52,
            resizeMode: "contain",
            transform: [{ scale: isDark ? 1 : 1.06 }],
          }}
        />
      </Pressable>

      <View className="flex-row items-center gap-3">
        <ThemeToggle isDark={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />

        <NotificationBadge />

        <Pressable
          onPress={() => menuRef.current?.present()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200/50 bg-white/50 dark:border-white/20 dark:bg-gray-700/50"
        >
          {avatarUri ? (
            <Image
              source={{
                uri: avatarUri.startsWith("http") ? avatarUri : `${AVATAR_BASE_URL}${avatarUri}`,
              }}
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <UserIcon size={18} color={isDark ? "#D1D5DB" : "#6B7280"} />
          )}
        </Pressable>
      </View>

      {/* Menu contestuale stile iOS (Messaggi/Contatti): tap sull'avatar
          apre una scelta rapida invece di navigare subito al Profilo,
          così da poter uscire senza dover prima entrare in quella schermata. */}
      <BottomSheetModal
        ref={menuRef}
        enableDynamicSizing
        backgroundComponent={GlassBottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#4B5563" : "#D1D5DB" }}
        backdropComponent={(props) => (
          <GlassBottomSheetBackdrop {...props} onClose={() => menuRef.current?.dismiss()} />
        )}
      >
        <BottomSheetView
          style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <Pressable
            onPress={() => {
              menuRef.current?.dismiss();
              navigation.navigate("Profile");
            }}
            className="mb-2 flex-row items-center gap-3 rounded-2xl bg-gray-100 px-6 py-5 dark:bg-gray-800"
          >
            <UserIcon size={20} color={isDark ? "#E5E7EB" : "#374151"} />
            <Text className="text-lg font-medium text-gray-800 dark:text-gray-200">Profilo</Text>
          </Pressable>
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center gap-3 rounded-2xl bg-red-50 px-6 py-5 dark:bg-red-900/30"
          >
            <LogOut size={20} color="#DC2626" />
            <Text className="text-lg font-medium text-red-600 dark:text-red-400">Esci</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
