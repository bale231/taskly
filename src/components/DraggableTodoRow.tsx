import { type ReactNode } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const ROW_HEIGHT = 68; // altezza riga + gap, usata per calcolare lo spostamento in slot

interface DraggableTodoRowProps {
  children: ReactNode;
  index: number;
  itemCount: number;
  /** Chiamato a fine drag con l'indice di destinazione, se cambiato. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
}

/**
 * Sostituisce @dnd-kit (DndContext + useSortable) della webapp: qui il
 * riordino a lungo-premi-e-trascina è implementato con Gesture Handler +
 * Reanimated, l'accoppiata idiomatica per gesti fluidi in RN. Ogni riga
 * traccia il proprio spostamento in "slot" (multipli di ROW_HEIGHT) e
 * comunica il nuovo indice al genitore solo a fine gesto.
 */
export default function DraggableTodoRow({
  children,
  index,
  itemCount,
  onReorder,
  onDragStart,
  onDragEnd,
  disabled = false,
}: DraggableTodoRowProps) {
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const longPress = Gesture.LongPress()
    .enabled(!disabled)
    .minDuration(200)
    .onStart(() => {
      isActive.value = true;
      if (onDragStart) runOnJS(onDragStart)();
    });

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      if (!isActive.value) return;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const slots = Math.round(e.translationY / ROW_HEIGHT);
      const targetIndex = Math.max(0, Math.min(itemCount - 1, index + slots));

      translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      isActive.value = false;

      if (targetIndex !== index) {
        runOnJS(onReorder)(index, targetIndex);
      }
      if (onDragEnd) runOnJS(onDragEnd)();
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive.value ? 10 : 0,
    opacity: isActive.value ? 0.9 : 1,
    shadowOpacity: isActive.value ? 0.2 : 0,
    elevation: isActive.value ? 6 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
