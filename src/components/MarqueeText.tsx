import { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface MarqueeTextProps {
  children: string;
  className?: string;
  style?: TextStyle;
  /** Se passato, la prima occorrenza (case-insensitive) viene evidenziata,
   * come HighlightText — qui reimplementato invece di riusare quel
   * componente perché il testo deve restare una singola stringa passata
   * al layout/onTextLayout per calcolare l'overflow dello scroll. */
  highlight?: string;
  highlightClassName?: string;
}

/**
 * Titolo troncato che, al tap, scorre una sola volta da destra a sinistra
 * per rivelare il testo tagliato e poi torna alla posizione iniziale — come
 * il marquee al click sul titolo nella webapp (2.5s, ease-in-out). Attivo
 * solo se il testo eccede davvero lo spazio disponibile.
 */
export default function MarqueeText({
  children,
  className,
  style,
  highlight,
  highlightClassName = "bg-yellow-200 text-gray-900 dark:bg-yellow-500/40 dark:text-white",
}: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const overflow = textWidth - containerWidth;
  const canScroll = overflow > 4;

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  const onTextLayout = (e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width);

  const handlePress = () => {
    if (!canScroll) return;
    translateX.value = withSequence(
      withTiming(-overflow, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1250, easing: Easing.inOut(Easing.ease) })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable onPress={handlePress} onLayout={onContainerLayout} style={{ flex: 1, overflow: "hidden" }}>
      <Animated.View style={animatedStyle}>
        <Text
          className={className}
          style={[style, { alignSelf: "flex-start" }]}
          numberOfLines={1}
          onLayout={onTextLayout}
        >
          {renderHighlighted(children, highlight, highlightClassName)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function renderHighlighted(text: string, highlight: string | undefined, highlightClassName: string) {
  const trimmed = highlight?.trim();
  if (!trimmed) return text;

  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);

  return (
    <>
      {before}
      <Text className={highlightClassName}>{match}</Text>
      {after}
    </>
  );
}
