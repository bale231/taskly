import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircleCheckProps {
  checked: boolean;
  size?: number;
  /** Colore del riempimento/splash nell'istante in cui si spunta. */
  color?: string;
  /** Colore del bordo quando NON checked. */
  uncheckedBorderColor?: string;
  /**
   * Colore "stabile" a cui il cerchio sfuma dopo l'animazione di splash, se
   * resta checked (es. grigio per una todo completata): lo splash colorato
   * segna solo il momento dell'azione, non lo stato a riposo.
   */
  settledColor?: string;
}

// Path della spunta (viewBox 0 0 15 14, dal riferimento Uiverse) — la
// lunghezza approssimata è usata come stroke-dasharray/dashoffset per
// l'animazione di "disegno" del tratto.
const CHECK_PATH = "M2 8.36364L6.23077 12L13 2";
const CHECK_PATH_LENGTH = 19;

// 6 pallini a raggiera attorno al cerchio per il "goo splash": il vero
// filtro SVG feGaussianBlur/feColorMatrix del riferimento CSS non esiste in
// react-native-svg, quindi l'effetto "gocce che si fondono e dissolvono" è
// approssimato con cerchietti pieni che si espandono in scala/opacità dal
// centro — stessa sensazione, tecnica di rendering diversa.
const SPLASH_ANGLES_DEG = [0, 60, 120, 180, 240, 300];

/**
 * Checkbox circolare con spunta disegnata via stroke-dashoffset e "splash"
 * di pallini radiali al check, ispirata al design Uiverse (Shoh2008)
 * fornito dall'utente — riadattata ai colori dell'app invece del viola
 * originale.
 */
export default function CircleCheck({
  checked,
  size = 24,
  color = "#16A34A",
  uncheckedBorderColor = "#BFBFC0",
  settledColor,
}: CircleCheckProps) {
  const checkProgress = useSharedValue(checked ? 1 : 0);
  const splashProgress = useSharedValue(0);
  const fillProgress = useSharedValue(checked ? 1 : 0);
  // 0 = colore splash (`color`), 1 = colore stabile (`settledColor`): resta
  // a 0 durante l'animazione di check, poi sfuma a 1 una volta assestato —
  // così lo splash è sempre colorato, ma lo stato a riposo (completato) può
  // diventare grigio invece di restare verde per sempre.
  const settleProgress = useSharedValue(checked && settledColor ? 1 : 0);

  useEffect(() => {
    if (checked) {
      fillProgress.value = withTiming(1, { duration: 150 });
      splashProgress.value = 0;
      splashProgress.value = withTiming(1, { duration: 450 });
      checkProgress.value = withDelay(180, withTiming(1, { duration: 260 }));
      if (settledColor) {
        settleProgress.value = 0;
        settleProgress.value = withDelay(500, withTiming(1, { duration: 350 }));
      }
    } else {
      checkProgress.value = withTiming(0, { duration: 120 });
      fillProgress.value = withTiming(0, { duration: 150 });
      splashProgress.value = 0;
      settleProgress.value = 0;
    }
  }, [checked, checkProgress, splashProgress, fillProgress, settleProgress, settledColor]);

  const checkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_PATH_LENGTH * (1 - checkProgress.value),
  }));

  const circleAnimatedProps = useAnimatedProps(() => {
    const fillColor = settledColor
      ? interpolateColor(settleProgress.value, [0, 1], [color, settledColor])
      : color;
    return {
      fillOpacity: fillProgress.value,
      fill: fillColor,
      stroke: checked ? fillColor : uncheckedBorderColor,
    };
  });

  const scale = size / 24;

  return (
    <View style={{ width: size, height: size }}>
      {SPLASH_ANGLES_DEG.map((angle) => (
        <SplashDot key={angle} angle={angle} progress={splashProgress} color={color} scale={scale} />
      ))}

      <Svg width={size} height={size} viewBox="0 0 24 24">
        <AnimatedCircle
          cx={12}
          cy={12}
          r={11}
          strokeWidth={2}
          animatedProps={circleAnimatedProps}
        />
        <AnimatedPath
          d={CHECK_PATH}
          transform="translate(4.5, 5)"
          stroke="#FFFFFF"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_PATH_LENGTH}
          fill="none"
          animatedProps={checkAnimatedProps}
        />
      </Svg>
    </View>
  );
}

function SplashDot({
  angle,
  progress,
  color,
  scale,
}: {
  angle: number;
  progress: SharedValue<number>;
  color: string;
  scale: number;
}) {
  const radius = 16 * scale;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * radius;
  const dy = Math.sin(rad) * radius;

  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.05 ? 0 : (1 - progress.value) * 0.9,
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: 1 - progress.value * 0.6 },
    ],
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 6 * scale,
            height: 6 * scale,
            borderRadius: 3 * scale,
            backgroundColor: color,
          },
          dotStyle,
        ]}
      />
    </View>
  );
}
