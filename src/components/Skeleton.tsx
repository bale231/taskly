import { useEffect, useState } from "react";
import { StyleSheet, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonProps = {
  className?: string;
  style?: ViewStyle;
};

/**
 * Blocco grigio con highlight che scorre da sinistra a destra (shimmer),
 * come nella webapp (gradiente in sweep, 1.5s), al posto della precedente
 * pulsazione di opacità.
 */
export default function Skeleton({ className, style }: SkeletonProps) {
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (width === 0) return;
    translateX.value = -width;
    translateX.value = withRepeat(
      withTiming(width, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [width, translateX]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      onLayout={onLayout}
      className={`overflow-hidden bg-gray-300 dark:bg-gray-700 ${className ?? ""}`}
      style={style}
    >
      {width > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.35)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
