import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

/**
 * Banner di errore con slide-in da destra: nella webapp era
 * gsap.fromTo(errorRef, {opacity:0, x:100}, {opacity:1, x:0}).
 */
export default function ErrorBanner({
  message,
  variant = "error",
}: {
  message: string;
  /** "warning" replica il banner arancione dell'email non verificata. */
  variant?: "error" | "warning";
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(100);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, translateX]);

  const isWarning = variant === "warning";

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateX }] }}
      className={`mb-4 rounded border px-4 py-2 ${
        isWarning
          ? "border-orange-400 bg-orange-100"
          : "border-red-400 bg-red-100"
      }`}
    >
      <Text
        className={`text-sm ${isWarning ? "text-orange-700" : "text-red-700"}`}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
