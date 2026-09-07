import { useEffect } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Circle, Mask, Rect, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TOURS } from "../tours/definitions";
import { useTour } from "../context/TourContext";
import { useTheme } from "../context/ThemeContext";

const PADDING = 10;

/**
 * Overlay globale del tour attivo: sfondo scuro con un "buco" ritagliato
 * attorno al target corrente (via maschera SVG), un anello pulsante attorno
 * al buco, e una card con titolo/descrizione/progresso/bottone "Salta".
 * Va montato una sola volta, vicino alla radice dell'app (dopo il
 * NavigationContainer, così sta sopra ogni schermata).
 */
export default function TourOverlay() {
  const { activeTourId, activeStepIndex, activeRect, nextStep, skipTour } = useTour();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.55);

  useEffect(() => {
    if (!activeRect) return;
    ringScale.value = 1;
    ringOpacity.value = 0.55;
    ringScale.value = withRepeat(
      withSequence(withTiming(1.45, { duration: 900 }), withTiming(1, { duration: 0 })),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 900 }), withTiming(0.55, { duration: 0 })),
      -1,
      false
    );
  }, [activeRect, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!activeTourId || !activeRect) return null;

  const tour = TOURS[activeTourId];
  const step = tour.steps[activeStepIndex];
  const isLastStep = activeStepIndex === tour.steps.length - 1;

  const holeX = activeRect.x - PADDING;
  const holeY = activeRect.y - PADDING;
  const holeWidth = activeRect.width + PADDING * 2;
  const holeHeight = activeRect.height + PADDING * 2;
  const isWide = holeWidth > holeHeight * 1.3;
  const holeCenterX = holeX + holeWidth / 2;
  const holeCenterY = holeY + holeHeight / 2;
  const holeRadius = Math.max(holeWidth, holeHeight) / 2;

  // La card va sopra il target se questo è nella metà inferiore dello
  // schermo, altrimenti sotto — per non finire mai fuori schermo o dietro
  // la gesture bar/notch.
  const targetCenterY = activeRect.y + activeRect.height / 2;
  const cardBelow = targetCenterY < screenHeight / 2;
  const cardTop = cardBelow ? Math.max(holeY + holeHeight + 24, insets.top + 16) : undefined;
  const cardBottom = !cardBelow ? Math.max(screenHeight - holeY + 24, insets.bottom + 16) : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg width={screenWidth} height={screenHeight} style={{ position: "absolute" }}>
        <Mask id="tourMask">
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
          {isWide ? (
            <Rect x={holeX} y={holeY} width={holeWidth} height={holeHeight} rx={16} fill="black" />
          ) : (
            <Circle cx={holeCenterX} cy={holeCenterY} r={holeRadius} fill="black" />
          )}
        </Mask>
        <Rect
          x={0}
          y={0}
          width={screenWidth}
          height={screenHeight}
          fill="rgba(0,0,0,0.7)"
          mask="url(#tourMask)"
        />
      </Svg>

      {/* Anello pulsante attorno al buco */}
      <Animated.View
        pointerEvents="none"
        style={[
          ringStyle,
          {
            position: "absolute",
            left: holeCenterX - holeRadius - 4,
            top: holeCenterY - holeRadius - 4,
            width: (holeRadius + 4) * 2,
            height: (holeRadius + 4) * 2,
            borderRadius: isWide ? 20 : holeRadius + 4,
            borderWidth: 2,
            borderColor: "#FFFFFF",
          },
        ]}
      />

      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: cardTop,
          bottom: cardBottom,
          borderRadius: 16,
          padding: 18,
          backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Text
          style={{ fontSize: 17, fontWeight: "700", marginBottom: 6 }}
          className="text-gray-900 dark:text-white"
        >
          {step.title}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20 }} className="text-gray-600 dark:text-gray-300">
          {step.description}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <View style={{ flexDirection: "row", gap: 5 }}>
            {tour.steps.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === activeStepIndex ? "#3B82F6" : isDark ? "#4B5563" : "#D1D5DB",
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable onPress={skipTour} hitSlop={8}>
              <Text className="text-sm text-gray-500 dark:text-gray-400">Salta il tutorial</Text>
            </Pressable>
            <Pressable onPress={nextStep} hitSlop={8}>
              <Text className="text-sm font-semibold text-blue-600">
                {isLastStep ? "Fine" : "Avanti"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
