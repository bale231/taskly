import { useEffect, useRef } from "react";
import type { ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type WiggleViewProps = ViewProps & {
  enabled: boolean;
  children: React.ReactNode;
};

/**
 * Piccola oscillazione continua stile "jiggle" delle icone della home di
 * iOS quando si entra in modalità modifica. Ogni istanza parte con uno
 * sfasamento leggermente diverso (`phaseOffset`), così le card non
 * oscillano tutte perfettamente all'unisono, come su iOS.
 */
export default function WiggleView({ enabled, style, children, ...rest }: WiggleViewProps) {
  const rotation = useSharedValue(0);
  const phaseOffset = useRef(Math.random() * 100).current;

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 100 });
      return;
    }

    const timer = setTimeout(() => {
      rotation.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 120 }),
          withTiming(1, { duration: 240 }),
          withTiming(0, { duration: 120 })
        ),
        -1,
        false
      );
    }, phaseOffset);

    return () => {
      clearTimeout(timer);
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 100 });
    };
  }, [enabled, rotation, phaseOffset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}
