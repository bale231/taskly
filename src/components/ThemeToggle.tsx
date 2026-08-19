import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse } from "react-native-svg";

const WIDTH = 64;
const HEIGHT = 32;
const KNOB_SIZE = 26;
const KNOB_MARGIN = 3;
const TRAVEL = WIDTH - KNOB_SIZE - KNOB_MARGIN * 2;

const SKY_DAY = "#7DD3FC";
const SKY_NIGHT = "#1E293B";

type Props = {
  isDark: boolean;
  onToggle: () => void;
};

/**
 * Toggle tema ispirato al design "Uiverse.io by Galahhad" (sole/luna con
 * nuvole e stelle) fornito come riferimento CSS: qui reimplementato con
 * Reanimated + react-native-svg dato che l'originale si basa su box-shadow
 * multipli, pseudo-elementi e keyframe CSS non traducibili 1:1 in RN.
 */
const SCALE = 1.15;

export default function ThemeToggle({ isDark, onToggle }: Props) {
  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, { duration: 350 });
  }, [isDark, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [SKY_DAY, SKY_NIGHT]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: KNOB_MARGIN + progress.value * TRAVEL }],
  }));

  const starsStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cloudsStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const sunRaysStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const moonCratersStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      onPress={onToggle}
      accessibilityLabel="Cambia tema"
      hitSlop={8}
      style={{ width: WIDTH * SCALE, height: HEIGHT * SCALE, justifyContent: "center", alignItems: "center" }}
    >
      <Animated.View
        style={[
          {
            width: WIDTH,
            height: HEIGHT,
            borderRadius: HEIGHT / 2,
            overflow: "hidden",
            justifyContent: "center",
            transform: [{ scale: SCALE }],
          },
          trackStyle,
        ]}
      >
        {/* Stelle: visibili solo in tema scuro */}
        <Animated.View style={[{ position: "absolute", inset: 0 }, starsStyle]}>
          <Svg width={WIDTH} height={HEIGHT}>
            <Circle cx={10} cy={9} r={1.2} fill="#FFFFFF" />
            <Circle cx={18} cy={20} r={1} fill="#FFFFFF" />
            <Circle cx={26} cy={7} r={0.9} fill="#FFFFFF" />
            <Circle cx={12} cy={16} r={0.7} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {/* Nuvole: visibili solo in tema chiaro */}
        <Animated.View
          style={[{ position: "absolute", right: 6, bottom: 5 }, cloudsStyle]}
        >
          <Svg width={30} height={14}>
            <Ellipse cx={10} cy={9} rx={9} ry={5} fill="#FFFFFF" opacity={0.9} />
            <Ellipse cx={19} cy={6} rx={7} ry={4.2} fill="#FFFFFF" opacity={0.9} />
          </Svg>
        </Animated.View>

        {/* Pallina: sole di giorno, luna craterizzata di notte */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              alignItems: "center",
              justifyContent: "center",
            },
            knobStyle,
          ]}
        >
          <Svg width={KNOB_SIZE} height={KNOB_SIZE}>
            <Circle
              cx={KNOB_SIZE / 2}
              cy={KNOB_SIZE / 2}
              r={KNOB_SIZE / 2 - 1}
              fill={isDark ? "#E2E8F0" : "#FDE68A"}
            />
          </Svg>

          {/* Raggi del sole */}
          <Animated.View style={[{ position: "absolute", inset: 0 }, sunRaysStyle]}>
            <Svg width={KNOB_SIZE} height={KNOB_SIZE}>
              <Circle
                cx={KNOB_SIZE / 2}
                cy={KNOB_SIZE / 2}
                r={KNOB_SIZE / 2 - 4}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={1.5}
                opacity={0.6}
              />
            </Svg>
          </Animated.View>

          {/* Crateri della luna */}
          <Animated.View style={[{ position: "absolute", inset: 0 }, moonCratersStyle]}>
            <Svg width={KNOB_SIZE} height={KNOB_SIZE}>
              <Circle cx={9} cy={8} r={2.4} fill="#94A3B8" opacity={0.6} />
              <Circle cx={17} cy={12} r={1.8} fill="#94A3B8" opacity={0.5} />
              <Circle cx={10} cy={17} r={1.4} fill="#94A3B8" opacity={0.5} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
