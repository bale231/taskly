import { useState } from "react";
import {
  Text,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
  type TextStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
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
  // `onTextLayout` (non `onLayout`): riporta la larghezza di ogni riga di
  // testo calcolata durante lo shaping del testo stesso, PRIMA che il
  // layout box la vincoli/clippi — è l'equivalente RN dello `scrollWidth`
  // del DOM usato dalla webapp. `onLayout` invece riporta sempre le
  // dimensioni finali del box dopo la risoluzione dei vincoli flex del
  // genitore, che coincidevano sempre con containerWidth (bug di oggi).
  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const width = e.nativeEvent.lines[0]?.width ?? 0;
    setTextWidth(width);
  };

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

  // Ogni riga di ListDetailScreen è avvolta in SwipeableRow, che intercetta
  // i gesti con un GestureDetector (Gesture.Pan, react-native-gesture-handler)
  // per lo swipe-to-delete/modifica: un <Pressable> di RN "core" annidato lì
  // sotto perde sistematicamente il tap su Android, perché i due sistemi di
  // gesture (RNGH e la Response System nativa di RN) non si compongono da
  // soli. Usando anche qui un Gesture.Tap() di RNGH, il tap viene arbitrato
  // correttamente insieme al Pan del genitore invece di essere rubato.
  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handlePress)();
  });

  return (
    <GestureDetector gesture={tap}>
      <View onLayout={onContainerLayout} style={{ flex: 1, overflow: "hidden" }}>
        {/* Misura sempre la stringa piatta, mai il markup con l'highlight
            annidato sotto (un <Text> figlio con l'highlight rompe la misura
            allo stesso modo). `onTextLayout` invece di `onLayout`: riporta
            la larghezza di ogni riga calcolata durante lo shaping del testo
            stesso, PRIMA che il layout box la vincoli al contenitore — è
            l'equivalente RN dello `scrollWidth` del DOM che la webapp usava
            per lo stesso identico effetto. `onLayout` riportava sempre le
            dimensioni finali del box già vincolato dal `flex: 1` del
            genitore, che coincidevano sempre con containerWidth qualunque
            wrapper si provasse (il vero bug di oggi, ci sono volute diverse
            iterazioni per isolarlo). */}
        <View style={{ position: "absolute", opacity: 0 }} pointerEvents="none">
          <Text className={className} style={style} onTextLayout={onTextLayout}>
            {children}
          </Text>
        </View>
        <Animated.View style={animatedStyle}>
          <Text className={className} style={[style, { alignSelf: "flex-start" }]} numberOfLines={1}>
            {renderHighlighted(children, highlight, highlightClassName)}
          </Text>
        </Animated.View>
      </View>
    </GestureDetector>
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
