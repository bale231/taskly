import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Schermata mostrata da App.tsx durante il bootstrap (refresh token,
 * lettura storage), nel gap tra lo splash statico di sistema e la prima
 * schermata reale. Il logo pulsa in opacità, invece di uno spinner.
 */
export default function AnimatedSplashScreen() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A4F32",
      }}
    >
      <Animated.Image
        source={require("../../assets/icon-taskly.png")}
        style={[{ width: 220, height: 120, resizeMode: "contain" }, animatedStyle]}
      />
    </View>
  );
}
