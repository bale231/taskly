import { CheckSquare, Square } from "lucide-react-native";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedCheckboxProps {
  /** Se assente, l'icona è sempre CheckSquare (es. completamento: cambia solo colore). */
  checked?: boolean;
  onPress: () => void;
  size?: number;
  checkedColor: string;
  uncheckedColor?: string;
  className?: string;
}

/**
 * Checkbox con pop elastico quando passa a "checked" e feedback di scala al
 * tocco, per sostituire lo scatto istantaneo Square/CheckSquare usato finora
 * sia per il completamento che per la selezione multipla.
 */
export default function AnimatedCheckbox({
  checked = true,
  onPress,
  size = 20,
  checkedColor,
  uncheckedColor = checkedColor,
  className,
}: AnimatedCheckboxProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressableBase
      style={animatedStyle}
      className={className}
      onPress={() => {
        scale.value = withTiming(1.15, { duration: 60 }, () => {
          scale.value = withTiming(1, { duration: 80 });
        });
        onPress();
      }}
      onPressIn={() => {
        scale.value = withTiming(0.85, { duration: 40 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 80 });
      }}
    >
      {checked ? (
        <CheckSquare size={size} color={checkedColor} />
      ) : (
        <Square size={size} color={uncheckedColor} />
      )}
    </AnimatedPressableBase>
  );
}
