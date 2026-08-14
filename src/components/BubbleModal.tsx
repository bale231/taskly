import { useEffect } from "react";
import { Modal, Pressable, type ModalProps, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type BubbleModalProps = {
  visible: boolean;
  onRequestClose?: () => void;
  /** Chiude la modale al tap sull'overlay. Default true. */
  closeOnOverlayPress?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  animationType?: ModalProps["animationType"];
};

/**
 * Modale con overlay in fade e contenuto che entra con un leggero "bubble"
 * (scale + opacity, overshoot elastico), equivalente RN del pattern GSAP
 * `gsap.fromTo(..., { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(1.2)" })`
 * usato nella webapp per le modali di Home.tsx.
 */
export default function BubbleModal({
  visible,
  onRequestClose,
  closeOnOverlayPress = true,
  children,
  contentStyle,
}: BubbleModalProps) {
  const overlayOpacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.7 });
      contentOpacity.value = withTiming(1, { duration: 220 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
      contentOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, overlayOpacity, scale, contentOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View
        style={[{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", padding: 16 }, overlayStyle]}
      >
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
