import { useEffect } from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** Stato "attivo" del bottone (selezionato/toggle on): anima uno scale-pop quando cambia. */
  active?: boolean;
  style?: ViewStyle;
};

/**
 * Pressable con feedback tattile (scale-down al tocco) e un piccolo "pop"
 * elastico quando la prop `active` passa a true, per dare vita ai bottoni
 * di stato (Home/Profilo/Modifica in BottomNav, Archivio in HomeScreen, ecc.)
 * che nella webapp cambiavano colore senza alcuna animazione RN nativa.
 */
export default function AnimatedPressable({ active, style, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSpring(1.08, { damping: 8, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      });
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
      {...props}
    />
  );
}
