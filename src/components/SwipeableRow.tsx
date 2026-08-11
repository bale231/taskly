import { type ReactNode, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/**
 * Unifica SwipeableListItem e SwipeableTodoItem della webapp (erano quasi
 * identici, differivano solo nelle azioni disponibili). Là lo swipe era
 * gestito a mano con onMouseDown/onTouchMove + gsap.quickTo; qui lo stesso
 * gesto usa react-native-gesture-handler + Reanimated, l'accoppiata
 * idiomatica per gesti fluidi in RN.
 */
const ACTION_WIDTH = 60; // soglia di swipe per attivare l'azione
const MAX_TRANSLATE = ACTION_WIDTH * 1.2;

interface SwipeAction {
  icon: ReactNode;
  backgroundClassName: string;
  /** Se assente, l'azione su questo lato è disabilitata (nessun indicatore, nessun trigger). */
  onTrigger?: () => void;
  /** Se true, lo swipe apre una conferma invece di eseguire onTrigger direttamente. */
  confirm?: {
    title: string;
    message: string;
  };
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Azione mostrata/attivata con swipe verso destra (rivela il lato sinistro). */
  leftAction?: SwipeAction;
  /** Azione mostrata/attivata con swipe verso sinistra (rivela il lato destro). */
  rightAction?: SwipeAction;
  disabled?: boolean;
}

export default function SwipeableRow({
  children,
  leftAction,
  rightAction,
  disabled = false,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const [confirmAction, setConfirmAction] = useState<SwipeAction | null>(null);

  // Chiamata da runOnJS: deve ricevere solo dati semplici, non l'intero
  // oggetto SwipeAction (contiene icon: ReactNode, cioè un FiberNode che
  // il worklet non può copiare dal thread UI a quello JS).
  const handleSwipeResolved = (side: "left" | "right") => {
    const action = side === "left" ? leftAction : rightAction;
    if (!action?.onTrigger) return;
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      action.onTrigger();
    }
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      const clamped = Math.max(
        -MAX_TRANSLATE,
        Math.min(MAX_TRANSLATE, e.translationX)
      );
      translateX.value = clamped;
    })
    .onEnd((e) => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });

      if (e.translationX > ACTION_WIDTH) {
        runOnJS(handleSwipeResolved)("left");
      } else if (e.translationX < -ACTION_WIDTH) {
        runOnJS(handleSwipeResolved)("right");
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <>
      <View className="relative overflow-hidden rounded-xl">
        {leftAction && (
          <View
            className={`absolute inset-y-0 left-0 w-24 items-start justify-center pl-5 ${leftAction.backgroundClassName}`}
          >
            {leftAction.icon}
          </View>
        )}

        {rightAction && (
          <View
            className={`absolute inset-y-0 right-0 w-24 items-end justify-center pr-5 ${rightAction.backgroundClassName}`}
          >
            {rightAction.icon}
          </View>
        )}

        <GestureDetector gesture={pan}>
          <Animated.View
            style={animatedStyle}
            className="relative bg-white dark:bg-gray-800 rounded-xl"
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </View>

      <Modal visible={confirmAction !== null} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/95 p-8 dark:bg-gray-800/95">
            <Text className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
              {confirmAction?.confirm?.title}
            </Text>
            <Text className="mb-6 text-gray-600 dark:text-gray-300">
              {confirmAction?.confirm?.message}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setConfirmAction(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 dark:bg-gray-700"
              >
                <Text className="text-center font-medium text-gray-700 dark:text-gray-300">
                  Annulla
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  confirmAction?.onTrigger?.();
                  setConfirmAction(null);
                }}
                className="flex-1 rounded-xl bg-red-500 py-2.5"
              >
                <Text className="text-center font-medium text-white">
                  Elimina
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
