import { useEffect, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "../context/ThemeContext";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "children"> & {
  /** Stato "attivo" del bottone (selezionato/toggle on): anima uno scale-pop quando cambia. */
  active?: boolean;
  style?: ViewStyle;
  /**
   * Se passato insieme a `pillStyle`, il componente renderizza una pillola
   * di sfondo interna il cui colore fa fade smooth tra "spento" e
   * `activeBackgroundColor" quando `active` cambia, invece dello scatto
   * istantaneo di una className condizionale.
   */
  activeBackgroundColor?: string;
  inactiveBackgroundColor?: string;
  /**
   * Se true, la pillola di sfondo è vero Liquid Glass (blur/vetro) invece di
   * un colore piatto: `activeBackgroundColor` diventa il tintColor del
   * vetro invece del backgroundColor, con la stessa transizione fluida.
   */
  glass?: boolean;
  pillStyle?: ViewStyle;
  /** Contenuto (tipicamente l'icona) racchiuso nella pillola di sfondo animata. */
  icon?: ReactNode;
  children?: ReactNode;
};

/**
 * Pressable con feedback tattile (scale-down al tocco), un piccolo "pop"
 * elastico quando la prop `active` passa a true, e opzionalmente una
 * pillola di sfondo interna con transizione colore fluida (usata per i
 * bottoni di stato come Home/Profilo/Modifica in BottomNav).
 */
export default function AnimatedPressable({
  active,
  style,
  activeBackgroundColor,
  inactiveBackgroundColor = "transparent",
  glass = false,
  pillStyle,
  icon,
  onPressIn,
  onPressOut,
  children,
  ...props
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (active) {
      scale.value = withSpring(1.08, { damping: 8, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      });
    }
    activeProgress.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, scale, activeProgress]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: activeBackgroundColor
      ? interpolateColor(activeProgress.value, [0, 1], [inactiveBackgroundColor, activeBackgroundColor])
      : "transparent",
  }));

  // Tinta sopra al vetro puro (mai un tintColor nativo sul glass: appiattisce
  // la distorsione e lo rende un blur banale invece del Liquid Glass marcato
  // di AnimatedAlert/menu Home). Niente opacity sulla View che contiene il
  // GlassSurface stesso: solo su questa tinta, altrimenti il glass si
  // disabilita in modo permanente.
  const glassTintStyle = useAnimatedStyle(() => ({
    opacity: activeBackgroundColor ? activeProgress.value * 0.55 : 0,
    backgroundColor: activeBackgroundColor ?? "transparent",
  }));

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withTiming(0.92, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      android_ripple={
        Platform.OS === "android"
          ? { color: activeBackgroundColor ?? "rgba(0,0,0,0.1)", borderless: false }
          : undefined
      }
      {...props}
    >
      {icon ? (
        glass ? (
          <Animated.View style={[pillStyle, { overflow: "hidden" }]}>
            {/* Vetro visibile solo quando il bottone è "attivo": altrimenti
                un cerchio di vetro/blur resterebbe sempre visibile dietro
                l'icona anche a riposo, quando lì non dovrebbe esserci
                nessun contenitore. */}
            <GlassSurface
              style={StyleSheet.absoluteFill}
              visible={!!active}
              colorScheme={isDark ? "dark" : "light"}
              tint={isDark ? "dark" : "light"}
              intensity={80}
            />
            <Animated.View style={[StyleSheet.absoluteFill, glassTintStyle]} pointerEvents="none" />
            {icon}
          </Animated.View>
        ) : (
          <Animated.View style={[pillStyle, pillAnimatedStyle]}>{icon}</Animated.View>
        )
      ) : null}
      {children}
    </AnimatedPressableBase>
  );
}
