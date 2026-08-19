import { BlurView, type BlurTint } from "expo-blur";
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from "expo-glass-effect";
import { useEffect } from "react";
import type { ViewProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type GlassSurfaceProps = ViewProps & {
  /** Stile del vetro nativo su iOS 26+ (ignorato nel fallback BlurView). */
  glassStyle?: GlassStyle;
  /** Colore di sfondo per il fallback BlurView (iOS <26, Android, web). */
  tint?: BlurTint;
  /** Intensità del blur di fallback, 1-100. */
  intensity?: number;
  /** Tinta di colore applicata al vetro nativo (es. per bottoni glass colorati). */
  tintColor?: string;
  colorScheme?: "auto" | "light" | "dark";
  isInteractive?: boolean;
  /**
   * Mostra/nasconde l'effetto con una transizione fluida (default true).
   * Da usare per superfici che compaiono/scompaiono (es. col scroll) invece
   * di animare l'opacità dall'esterno: su GlassView impostare l'opacità a 0
   * (anche di un antenato) disabilita del tutto l'effetto Liquid Glass
   * invece di renderlo solo invisibile, quindi qui si passa a
   * `glassEffectStyle: 'none'` con l'`animate` nativo della libreria; su
   * BlurView si anima invece l'opacità, che lì non ha questo limite.
   */
  visible?: boolean;
};

const GLASS_AVAILABLE = isLiquidGlassAvailable();

/**
 * Vetro nativo Liquid Glass su iOS 26+ (GlassView), con fallback a BlurView
 * altrove (iOS <26, Android, web). Va usato come layer di sfondo, tipicamente
 * con position absolute + fill, dietro al contenuto reale della UI.
 */
export default function GlassSurface({
  glassStyle = "regular",
  tint = "default",
  intensity = 60,
  tintColor,
  colorScheme = "auto",
  isInteractive = false,
  visible = true,
  style,
  ...rest
}: GlassSurfaceProps) {
  if (GLASS_AVAILABLE) {
    return (
      <GlassView
        glassEffectStyle={{ style: visible ? glassStyle : "none", animate: true, animationDuration: 0.25 }}
        tintColor={tintColor}
        colorScheme={colorScheme}
        isInteractive={isInteractive}
        style={style}
        {...rest}
      />
    );
  }

  return (
    <FadingBlur visible={visible} intensity={intensity} tint={tint} style={style} {...rest} />
  );
}

function FadingBlur({
  visible,
  intensity,
  tint,
  style,
  ...rest
}: Pick<GlassSurfaceProps, "visible" | "intensity" | "tint" | "style"> & ViewProps) {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 250 });
  }, [visible, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, fadeStyle]} {...rest}>
      <BlurView
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        intensity={intensity}
        tint={tint}
      />
    </Animated.View>
  );
}
