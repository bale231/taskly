import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export interface BubbleTapEffectRef {
  trigger: () => void;
}

interface BubbleTapEffectProps {
  color?: string;
}

/**
 * Bolla che si espande dal centro con opacity in dissolvenza al tap, come
 * il ripple material su Android ma sopra un liquid glass: va montata come
 * ultimo figlio assoluto del bottone (sopra icona/tinta), e triggerata
 * imperativamente da chi gestisce l'onPress — non reagisce da sola al tap
 * perché deve restare `pointerEvents="none"` per non rubare la gesture.
 */
const BubbleTapEffect = forwardRef<BubbleTapEffectRef, BubbleTapEffectProps>(
  ({ color = "#FFFFFF" }, ref) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      trigger: () => {
        scale.value = 0;
        opacity.value = 0.5;
        scale.value = withTiming(1, { duration: 380 });
        opacity.value = withTiming(0, { duration: 380 });
      },
    }));

    const style = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color, borderRadius: 999 },
          style,
        ]}
      />
    );
  }
);

export default BubbleTapEffect;
