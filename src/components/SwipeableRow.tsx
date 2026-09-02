import { type ReactNode, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const IS_ANDROID = Platform.OS === "android";

/**
 * Unifica SwipeableListItem e SwipeableTodoItem della webapp (erano quasi
 * identici, differivano solo nelle azioni disponibili). Là lo swipe era
 * gestito a mano con onMouseDown/onTouchMove + gsap.quickTo, e scattava
 * subito al rilascio oltre soglia.
 *
 * Su iOS segue il comportamento nativo (Mail, Promemoria): lo swipe apre e
 * la riga resta ferma alla larghezza dell'azione finché non tocchi il
 * bottone (la esegue) o altrove (richiude senza fare nulla).
 *
 * Su Android segue invece il pattern Material (Gmail): superata la soglia,
 * l'azione parte subito al rilascio del dito, senza ancoraggio — la riga
 * torna a translateX 0 mentre l'azione si esegue.
 */
const ACTION_WIDTH = 76; // larghezza a cui la riga resta ancorata quando aperta (iOS)
const MAX_TRANSLATE = ACTION_WIDTH * 1.3; // overscroll elastico oltre l'ancoraggio/soglia
const OPEN_THRESHOLD = ACTION_WIDTH / 2; // superata questa soglia, si ancora aperta (iOS) o scatta l'azione (Android)

interface SwipeAction {
  icon: ReactNode;
  backgroundClassName: string;
  /** Se assente, l'azione su questo lato è disabilitata (nessun indicatore, nessun trigger). */
  onTrigger?: () => void;
  /** Se true, il tap sul bottone chiede conferma al genitore invece di eseguire onTrigger direttamente. */
  confirm?: {
    title: string;
    message: string;
  };
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Azione mostrata/attivata con swipe verso destra (rivela il lato sinistro). */
  leftAction?: SwipeAction;
  /** Azione mostrata/attivata con swipe verso sinistra (rivela il lato destro). */
  rightAction?: SwipeAction;
  disabled?: boolean;
  /**
   * Chiamato quando un'azione con `confirm` viene attivata dal tap sul
   * bottone rivelato: il genitore mostra un'unica modale condivisa invece
   * che ogni riga ne monti una propria. Un <Modal> nativo per riga (anche
   * con visible={false}) è costoso da montare su iOS ed era la causa del
   * lag di ~2s sui tap in questa schermata: bastavano una decina di righe
   * visibili in una FlatList per saturare il thread nativo ad ogni commit.
   */
  onConfirmNeeded?: (confirm: { title: string; message: string; onConfirm: () => void }) => void;
}

export default function SwipeableRow({
  children,
  leftAction,
  rightAction,
  disabled = false,
  onConfirmNeeded,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  // "closed" | "left" | "right": quale lato è ancorato aperto, per sapere
  // dove far tornare la riga quando la si richiude col tap altrove.
  const [openSide, setOpenSide] = useState<"closed" | "left" | "right">("closed");

  const runTrigger = (side: "left" | "right") => {
    const action = side === "left" ? leftAction : rightAction;
    if (!action?.onTrigger) return;
    translateX.value = withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true });
    setOpenSide("closed");
    if (action.confirm) {
      onConfirmNeeded?.({ ...action.confirm, onConfirm: action.onTrigger });
    } else {
      action.onTrigger();
    }
  };

  const close = () => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true });
    setOpenSide("closed");
  };

  // Il worklet di .onEnd() gira sullo UI thread e cattura per closure tutto
  // ciò che referenzia: passargli leftAction/rightAction (che contengono
  // `icon: ReactNode`, cioè un FiberNode) fa fallire la serializzazione
  // verso quel thread. Si estraggono qui solo i due booleani primitivi
  // che servono davvero dentro il worklet.
  const hasLeftTrigger = Boolean(leftAction?.onTrigger);
  const hasRightTrigger = Boolean(rightAction?.onTrigger);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    // Attiva il pan solo su un movimento orizzontale deciso, e cede subito
    // il gesto allo ScrollView se il movimento è prevalentemente verticale:
    // senza questi vincoli il pan intercettava anche lo scroll della lista.
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    // Esclude i primi 25px dal bordo sinistro dall'area di rilevamento del
    // gesto: senza questo, uno swipe che parte dal bordo (esattamente dove
    // inizia lo swipe-back nativo di iOS per tornare indietro) veniva
    // intercettato da questo Pan invece che dal gesto di navigazione,
    // rendendo impossibile tornare indietro con lo swipe in questa schermata.
    .hitSlop({ left: -25 })
    .onUpdate((e) => {
      // Parte sempre dalla posizione corrente (0 se chiusa, ±ACTION_WIDTH
      // se già ancorata aperta), così un secondo swipe sopra una riga già
      // aperta la sposta in modo continuo invece di saltare da 0.
      const base = openSide === "left" ? ACTION_WIDTH : openSide === "right" ? -ACTION_WIDTH : 0;
      const next = base + e.translationX;
      translateX.value = Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, next));
    })
    .onEnd(() => {
      const value = translateX.value;
      if (value > OPEN_THRESHOLD && hasLeftTrigger) {
        if (IS_ANDROID) {
          // Material (Gmail): l'azione scatta subito al rilascio, niente
          // ancoraggio — la riga torna a 0 mentre `runTrigger` la esegue.
          translateX.value = withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true });
          runOnJS(runTrigger)("left");
        } else {
          translateX.value = withSpring(ACTION_WIDTH, { damping: 22, stiffness: 260 });
          runOnJS(setOpenSide)("left");
        }
      } else if (value < -OPEN_THRESHOLD && hasRightTrigger) {
        if (IS_ANDROID) {
          translateX.value = withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true });
          runOnJS(runTrigger)("right");
        } else {
          translateX.value = withSpring(-ACTION_WIDTH, { damping: 22, stiffness: 260 });
          runOnJS(setOpenSide)("right");
        }
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true });
        runOnJS(setOpenSide)("closed");
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="relative overflow-hidden rounded-xl">
      {/* Larghezza pari a MAX_TRANSLATE (l'overscroll massimo raggiungibile
          trascinando), non un valore fisso più stretto: altrimenti, andando
          oltre con lo swipe, si vedeva per un attimo lo sfondo della card
          oltre il bordo destro/sinistro del bottone colorato. */}
      {leftAction && (
        <Pressable
          onPress={() => runTrigger("left")}
          style={{ width: MAX_TRANSLATE }}
          className={`absolute inset-y-0 left-0 items-start justify-center pl-5 ${leftAction.backgroundClassName}`}
        >
          {leftAction.icon}
        </Pressable>
      )}

      {rightAction && (
        <Pressable
          onPress={() => runTrigger("right")}
          style={{ width: MAX_TRANSLATE }}
          className={`absolute inset-y-0 right-0 items-end justify-center pr-5 ${rightAction.backgroundClassName}`}
        >
          {rightAction.icon}
        </Pressable>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View
          style={animatedStyle}
          className="relative bg-white dark:bg-gray-800 rounded-xl"
        >
          {/* Overlay trasparente sopra il contenuto: quando la riga è aperta,
              intercetta il primo tap per richiuderla invece di lasciarlo
              passare al contenuto sottostante (es. navigazione al dettaglio
              lista). Assente quando chiusa, per non aggiungere un layer di
              tocco su ogni riga sempre. */}
          {openSide !== "closed" && (
            <Pressable
              onPress={close}
              style={{ position: "absolute", inset: 0, zIndex: 10 }}
            />
          )}
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
