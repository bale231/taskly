import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, type ModalProps, type ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";

type BubbleModalProps = {
  visible: boolean;
  onRequestClose?: () => void;
  /** Chiude la modale al tap sull'overlay. Default true. */
  closeOnOverlayPress?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  animationType?: ModalProps["animationType"];
  /**
   * "center": dialogo centrato con pop elastico (scale + opacity).
   * "bottom": sheet ancorato in basso con slide-up elastico.
   * Componente unico per ogni modale dell'app: cambia solo il contenuto.
   */
  variant?: "center" | "bottom";
};

/**
 * Modale con overlay in blur (mai vetro, sempre BlurView) e contenuto che
 * entra con un leggero "bubble" (scale/translate + opacity, overshoot
 * elastico), equivalente RN del pattern GSAP
 * `gsap.fromTo(..., { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(1.2)" })`
 * usato nella webapp per le modali di Home.tsx. Unico componente per tutte
 * le modali dell'app: solo `children` e `variant` cambiano.
 */
export default function BubbleModal({
  visible,
  onRequestClose,
  closeOnOverlayPress = true,
  children,
  contentStyle,
  variant = "center",
}: BubbleModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // Il Modal nativo smonta il contenuto non appena `visible` diventa false,
  // quindi teniamolo montato (`shouldRender`) finché l'animazione di uscita
  // non è finita, altrimenti la chiusura sarebbe istantanea e non animata.
  const [shouldRender, setShouldRender] = useState(visible);
  const overlayOpacity = useSharedValue(0);
  const scale = useSharedValue(variant === "center" ? 0.9 : 1);
  const translateY = useSharedValue(variant === "bottom" ? 80 : 0);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      overlayOpacity.value = withTiming(1, { duration: 200 });
      if (variant === "bottom") {
        translateY.value = withSpring(0, { damping: 16, stiffness: 200, mass: 0.7 });
      } else {
        scale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.7 });
      }
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(setShouldRender)(false);
      });
      if (variant === "bottom") {
        translateY.value = withTiming(80, { duration: 150 });
      } else {
        scale.value = withTiming(0.9, { duration: 150 });
      }
    }
  }, [visible, variant, overlayOpacity, scale, translateY]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  // Niente opacity qui (a differenza dell'overlay sopra): il contenuto può
  // contenere un GlassSurface (vero Liquid Glass su iOS 26+), e impostare
  // l'opacità di un suo antenato a un valore diverso da 1 disabilita
  // l'effetto in modo permanente per quell'istanza, non lo rende solo
  // invisibile. L'ingresso resta comunque "smooth" grazie allo scale/slide.
  const contentAnimStyle = useAnimatedStyle(() => ({
    // Senza transformOrigin esplicito, lo scale durante il pop-in si ancora
    // all'angolo invece che al centro (visibile come contenuto "spostato a
    // sinistra" mentre l'animazione è in corso, con width in percentuale).
    transformOrigin: "50% 50%",
    transform: variant === "bottom" ? [{ translateY: translateY.value }] : [{ scale: scale.value }],
  }));

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View
        style={[
          {
            flex: 1,
            alignItems: "center",
            justifyContent: variant === "bottom" ? "flex-end" : "center",
            padding: variant === "bottom" ? 0 : 16,
          },
          overlayStyle,
        ]}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={40}
          tint={isDark ? "dark" : "light"}
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)" }]}
          pointerEvents="none"
        />

        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={closeOnOverlayPress ? onRequestClose : undefined}
        />
        <Animated.View style={[contentStyle, contentAnimStyle]} pointerEvents="box-none">
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
