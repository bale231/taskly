import { useState } from "react";
import {
  Pressable,
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
  /**
   * Quando false, il componente si riduce a un semplice <Text> troncato:
   * niente <Text> nascosto di misura, niente onLayout/onTextLayout (quindi
   * nessun setState per riga), niente shared value/worklet Reanimated,
   * niente GestureDetector o Pressable.
   *
   * Serve nelle liste lunghe: il costo del marquee è per-riga e si paga
   * anche sulle righe il cui titolo non ecceda affatto (la maggioranza),
   * perché per scoprirlo bisogna comunque misurare. Su 100+ todo montate
   * significa 100 handler nativi da arbitrare a ogni gesto e 200 setState
   * a cascata durante lo scroll — la causa del lag e dei glitch di
   * virtualizzazione. Le prime righe restano interattive (vedi
   * MARQUEE_ROW_LIMIT in ListDetailScreen), che è dove l'utente
   * effettivamente tocca i titoli.
   */
  interactive?: boolean;
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
  interactive = true,
}: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const overflow = textWidth - containerWidth;
  // In modalità non interattiva non si misura nulla, quindi non c'è niente
  // da far scorrere: il testo viene semplicemente troncato.
  const canScroll = interactive && overflow > 4;

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  // Il <Text> di misura è forzato a `width: 9999` (mai vincolato dal
  // contenitore reale): senza questo, anche senza `numberOfLines` il testo
  // veniva comunque wrappato su più righe ereditando un vincolo di
  // larghezza dal layout circostante, e `lines[0].width` misurava solo la
  // prima riga (più STRETTA del container, mai più larga — il bug di oggi:
  // canScroll risultava sempre falso perché il confronto avveniva contro un
  // frammento del testo, non l'intera stringa). Con `width: 9999` il testo
  // sta sempre su un'unica riga e la sua larghezza è quella reale.
  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const width = e.nativeEvent.lines.reduce((sum, line) => sum + line.width, 0);
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
  //
  // Montato SOLO quando canScroll è vero: un GestureDetector nativo per
  // OGNI riga della lista (anche quelle il cui titolo entra tranquillamente
  // nello spazio disponibile, la maggioranza) è un handler nativo in più da
  // arbitrare ad ogni gesto/scroll — su liste da 90-100+ elementi il costo
  // cumulativo faceva degradare progressivamente lo scroll fino al crash.
  // Un titolo che non eccede non ha comunque nulla da far scorrere al tap.
  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handlePress)();
  });

  // Versione statica: un solo <Text> troncato, nessun handler né misura.
  // Tutti gli hook sopra restano chiamati (le regole degli hook non
  // ammettono uscite anticipate prima di loro), ma il loro costo è
  // trascurabile: quello che pesa davvero è ciò che NON viene montato qui
  // sotto — il <Text> ombra di misura, l'Animated.View e il detector.
  if (!interactive) {
    return (
      <View style={{ flex: 1 }}>
        <Text className={className} style={style} numberOfLines={1}>
          {renderHighlighted(children, highlight, highlightClassName)}
        </Text>
      </View>
    );
  }

  const content = (
    <View onLayout={onContainerLayout} style={{ flex: 1, overflow: "hidden" }}>
        {/* Misura sempre la stringa piatta, mai il markup con l'highlight
            annidato sotto (un <Text> figlio con l'highlight rompe la misura
            allo stesso modo). `width: 9999` forza un'unica riga: senza un
            vincolo esplicito il testo veniva comunque wrappato su più righe
            (ereditando la larghezza del contenitore reale nonostante
            `position: absolute`), e `onTextLayout` misurava solo la prima
            riga — più stretta del container, mai più larga: canScroll
            risultava sempre falso perché il confronto avveniva contro un
            frammento del testo, non l'intera stringa (il vero bug). */}
        <View style={{ position: "absolute", opacity: 0, width: 9999 }} pointerEvents="none">
          <Text className={className} style={style} onTextLayout={onTextLayout}>
            {children}
          </Text>
        </View>
        <Animated.View style={animatedStyle}>
          {/* Niente `numberOfLines`: come nella webapp (overflow-hidden sul
              contenitore + whitespace-nowrap sul testo, senza troncamento a
              "…"), qui il testo resta su una riga sola (`width: textWidth`,
              nota una volta misurata) e il View genitore con
              `overflow: hidden` nasconde la parte eccedente — senza questo,
              anche scorrendo con translateX il testo veniva comunque
              troncato con l'ellissi perché numberOfLines lo considerava
              sempre più largo del contenitore dichiarato. */}
          <Text
            className={className}
            style={[style, { alignSelf: "flex-start" }, textWidth > 0 ? { width: textWidth } : null]}
          >
            {renderHighlighted(children, highlight, highlightClassName)}
          </Text>
        </Animated.View>
      </View>
  );

  return canScroll ? (
    <GestureDetector gesture={tap}>{content}</GestureDetector>
  ) : (
    <Pressable onPress={handlePress}>{content}</Pressable>
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
