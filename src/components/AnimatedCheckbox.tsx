import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import CircleCheck from "./CircleCheck";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedCheckboxProps {
  /** Se assente, l'icona è sempre CheckSquare (es. completamento: cambia solo colore). */
  checked?: boolean;
  onPress: () => void;
  size?: number;
  checkedColor: string;
  uncheckedColor?: string;
  /** Colore a cui sfuma dopo l'animazione di check, se resta checked (vedi CircleCheck). */
  settledColor?: string;
  className?: string;
  /**
   * Se passato insieme a `editMode`, la checkbox non cambia faccia di
   * scatto quando si entra/esce dalla modalità modifica: ruota su se stessa
   * come una carta (rotateY 0 -> 90 -> 180), mostrando la faccia opposta a
   * metà rotazione — la faccia "completamento" quando editMode è false, la
   * faccia "selezione per eliminare" quando è true. Le due non sono più
   * mai montate/smontate insieme nello stesso frame: quella che sta girando
   * via si smonta solo a metà flip, quando è già di taglio e invisibile.
   */
  editMode?: boolean;
  /** Faccia "selezione" mostrata quando editMode è true. */
  editChecked?: boolean;
  onEditPress?: () => void;
  editCheckedColor?: string;
  editUncheckedColor?: string;
  /**
   * Ritardo in ms prima di avviare il flip, per uno stagger "una card alla
   * volta" quando editMode cambia per un'intera lista (tipicamente
   * `index * 30` circa, capped per liste lunghe).
   */
  flipDelay?: number;
}

/**
 * Checkbox con pop elastico al tocco. Se `editMode` è passato, invece di
 * scambiare istantaneamente icona/onPress con un remount condizionale nel
 * genitore, anima un flip 3D (rotateY) tra la faccia di completamento e
 * quella di selezione multipla — le due coesistono nello stesso componente,
 * mai smontate a metà transizione.
 */
export default function AnimatedCheckbox({
  checked = true,
  onPress,
  size = 20,
  checkedColor,
  uncheckedColor = checkedColor,
  settledColor,
  className,
  editMode,
  editChecked = false,
  onEditPress,
  editCheckedColor = "#2563EB",
  editUncheckedColor = "#9CA3AF",
  flipDelay = 0,
}: AnimatedCheckboxProps) {
  const scale = useSharedValue(1);
  const flip = useSharedValue(editMode ? 1 : 0);

  useEffect(() => {
    if (editMode === undefined) return;
    // Delay/durata contenuti: su liste lunghe (90+ righe) ogni checkbox è
    // un worklet indipendente sul UI thread, non blocca il JS thread, ma
    // uno stagger/durata troppo lunghi farebbero comunque "sentire" la
    // transizione come lenta invece che scattante.
    flip.value = withDelay(flipDelay, withTiming(editMode ? 1 : 0, { duration: 220 }));
  }, [editMode, flipDelay, flip]);

  const pressScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${flip.value * 180}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${flip.value * 180 - 180}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
  }));

  const bounce = () => {
    scale.value = withTiming(1.15, { duration: 60 }, () => {
      scale.value = withTiming(1, { duration: 80 });
    });
  };

  // Senza `editMode` passato: comportamento originale, una sola faccia.
  if (editMode === undefined) {
    return (
      <AnimatedPressableBase
        style={pressScaleStyle}
        className={className}
        onPress={() => {
          bounce();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.85, { duration: 40 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 80 });
        }}
      >
        <CircleCheck
          checked={checked}
          size={size}
          color={checkedColor}
          uncheckedBorderColor={uncheckedColor}
          settledColor={settledColor}
        />
      </AnimatedPressableBase>
    );
  }

  return (
    <AnimatedPressableBase
      style={[pressScaleStyle, { width: size, height: size }]}
      className={className}
      onPress={() => {
        bounce();
        if (editMode) onEditPress?.();
        else onPress();
      }}
      onPressIn={() => {
        scale.value = withTiming(0.85, { duration: 40 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 80 });
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
        <CircleCheck
          checked={checked}
          size={size}
          color={checkedColor}
          uncheckedBorderColor={uncheckedColor}
          settledColor={settledColor}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
        <CircleCheck
          checked={editChecked}
          size={size}
          color={editCheckedColor}
          uncheckedBorderColor={editUncheckedColor}
        />
      </Animated.View>
    </AnimatedPressableBase>
  );
}
