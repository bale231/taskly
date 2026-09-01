import type { BottomSheetBackdropProps, BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "../context/ThemeContext";

/**
 * Sfondo glass/blur condiviso da tutti i BottomSheetModal dell'app (filtro
 * categoria in Home, ordinamento in ListDetail). Niente animazione di
 * opacità su questa View: il `GlassSurface` qui dentro può essere il vero
 * Liquid Glass (iOS 26+), e animare l'opacità di un suo antenato lo
 * disabilita in modo permanente invece di renderlo solo invisibile. La
 * comparsa/scomparsa è affidata al prop `visible`, che usa la transizione
 * nativa della libreria (vedi GlassSurface).
 */
export function GlassBottomSheetBackground({
  style,
  pointerEvents,
  animatedIndex,
}: BottomSheetBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [visible, setVisible] = useState(false);

  useAnimatedReaction(
    () => animatedIndex.value > -1,
    (isOpen, prevIsOpen) => {
      if (isOpen !== prevIsOpen) runOnJS(setVisible)(isOpen);
    },
    []
  );

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        style,
        {
          overflow: "hidden",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      {Platform.OS === "android" ? (
        // Superficie Material piena invece del blur (il fallback BlurView
        // di GlassSurface su Android rende in modo incoerente): stesso
        // trattamento dello scrim in GlassBottomSheetBackdrop qui sopra.
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? "#111827" : "#FFFFFF" },
          ]}
        />
      ) : (
        <GlassSurface
          style={StyleSheet.absoluteFill}
          visible={visible}
          colorScheme={isDark ? "dark" : "light"}
          tint={isDark ? "dark" : "light"}
          intensity={90}
        />
      )}
    </View>
  );
}

/**
 * Sfondo scuro dietro al bottom sheet: BlurView non ha il limite del
 * GlassView qui sopra, quindi la sua opacità può seguire in continuo
 * `animatedIndex` mentre il sheet si apre/chiude.
 */
export function GlassBottomSheetBackdrop({
  animatedIndex,
  style,
  onClose,
}: BottomSheetBackdropProps & { onClose: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // Il BottomSheetBackdrop di default disattiva i tap quando il sheet è
  // chiuso (pointerEvents "none"); qui non ereditandolo va rifatto a mano,
  // altrimenti questo layer full-screen resta "auto" e blocca ogni tap
  // sullo schermo sottostante una volta chiuso il picker la prima volta.
  const [pointerEvents, setPointerEvents] = useState<"auto" | "none">("none");

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
  }));

  useAnimatedReaction(
    () => animatedIndex.value > -1,
    (isOpen, prevIsOpen) => {
      if (isOpen !== prevIsOpen) runOnJS(setPointerEvents)(isOpen ? "auto" : "none");
    },
    []
  );

  // `close()` di useBottomSheet() è un metodo di basso livello (sposta solo
  // la posizione del pannello): non passa dal ciclo di vita del *modal*,
  // quindi non scatena `onDismiss` sul BottomSheetModal. Qui invece chiudiamo
  // tramite il metodo `dismiss()` del modal (passato dal chiamante), lo
  // stesso usato ovunque altrove: un solo percorso di chiusura, niente stato
  // React intermedio che possa disallinearsi dal ciclo di vita reale della sheet.
  const tapGesture = useMemo(() => Gesture.Tap().onEnd(() => runOnJS(onClose)()), [onClose]);

  // Su Android niente BlurView: il blur software di expo-blur lì rende in
  // modo incoerente (spesso quasi invisibile), lasciando solo l'overlay
  // scuro sotto — risultato che sembrava "opacità senza blur". Meglio uno
  // scrim Material pieno e deciso invece di inseguire un'imitazione del
  // Liquid Glass di iOS, che su Android non esiste.
  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[style, fadeStyle]} pointerEvents={pointerEvents}>
        {Platform.OS === "ios" && (
          <BlurView style={StyleSheet.absoluteFill} intensity={40} tint={isDark ? "dark" : "light"} />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: Platform.OS === "android" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)" },
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}
