import { Eye, EyeOff } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface Props extends Omit<TextInputProps, "placeholder"> {
  label: string;
  /** Mostra l'occhio per rivelare/nascondere il testo. */
  isPassword?: boolean;
  /** Messaggio di validazione mostrato sotto il campo. */
  error?: string | null;
  /**
   * Forza lo stile chiaro (sfondo bianco, testo scuro) ignorando il tema
   * globale dell'app: usato in Login, che resta sempre a tema chiaro anche
   * se altrove nell'app è attivo il tema scuro — senza questo, la classe
   * `dark:` di questo componente seguiva il tema globale e rendeva l'input
   * scuro su uno sfondo chiaro fisso.
   */
  forceLight?: boolean;
  /**
   * Forza lo stile scuro (sfondo grigio scuro, testo bianco) ignorando il
   * tema globale: usato in Register, che resta sempre a tema scuro. Come
   * `forceLight`, ma nella direzione opposta — senza questo la classe
   * `dark:` seguiva il tema globale invece dello sfondo scuro fisso della
   * schermata, rendendo il testo scritto illeggibile (scuro su scuro).
   */
  forceDark?: boolean;
}

/**
 * Floating label: al tap sale in alto (come al solito), ma mentre si scrive
 * sfuma via con l'opacità invece di restare visibile sopra il testo; se il
 * campo si svuota di nuovo (restando a fuoco) l'etichetta risale in
 * opacità. Non è un semplice placeholder nativo perché deve poter avere
 * questi tre stati indipendenti (posizione via focus, opacità via contenuto).
 */
export default function FloatingLabelInput({
  label,
  isPassword = false,
  error,
  value,
  onFocus,
  onBlur,
  forceLight = false,
  forceDark = false,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const eyeScale = useRef(new Animated.Value(1)).current;

  const toggleRevealed = () => {
    eyeScale.setValue(0.7);
    Animated.spring(eyeScale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
    setRevealed((prev) => !prev);
  };

  // La posizione (in alto/al centro) segue solo il focus: sale al tap,
  // torna al centro quando il campo perde il focus (se vuoto).
  const floating = focused || Boolean(value);
  const positionAnim = useRef(new Animated.Value(floating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(positionAnim, {
      toValue: floating ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [positionAnim, floating]);

  // L'opacità segue solo il contenuto: sparisce mentre c'è testo scritto,
  // indipendentemente dal fatto che l'etichetta sia salita o no.
  const hasValue = Boolean(value);
  const opacityAnim = useRef(new Animated.Value(hasValue ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: hasValue ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim, hasValue]);

  const borderColor = error
    ? "#EF4444"
    : focused
      ? "#3B82F6"
      : "#D1D5DB";

  return (
    <View className="mb-4 w-full">
      <View
        className={
          forceLight || forceDark
            ? "relative w-full justify-center rounded"
            : "relative w-full justify-center rounded bg-white dark:bg-gray-700"
        }
        style={{
          borderWidth: 1,
          borderColor,
          height: 60,
          backgroundColor: forceLight ? "#FFFFFF" : forceDark ? "#374151" : undefined,
        }}
      >
        <Animated.Text
          // pointerEvents none: la label non deve rubare il tap all'input
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            top: 21,
            fontSize: 16,
            color: error ? "#EF4444" : focused ? "#3B82F6" : "#9CA3AF",
            opacity: opacityAnim,
            // Il rimpicciolimento/spostamento è transform (translateY + scale)
            // invece di top/fontSize animati: quelli non sono supportati dal
            // native animated module, e mischiare driver JS e nativo sullo
            // stesso nodo fa crashare Reanimated ("moved to native earlier").
            transform: [
              {
                translateY: positionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -11] }),
              },
              {
                scale: positionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }),
              },
            ],
          }}
        >
          {label}
        </Animated.Text>

        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 21,
            height: 22,
            transform: [
              {
                translateY: positionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
              },
            ],
          }}
        >
          <TextInput
            value={value}
            secureTextEntry={isPassword && !revealed}
            className={
              forceLight || forceDark
                ? "px-4"
                : "px-4 text-gray-900 dark:text-white"
            }
            style={{
              fontSize: 16,
              height: 22,
              paddingVertical: 0,
              color: forceLight ? "#111827" : forceDark ? "#FFFFFF" : undefined,
            }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
        </Animated.View>

        {isPassword && (
          <Pressable
            onPress={toggleRevealed}
            hitSlop={8}
            className="absolute right-3"
            style={{ top: 20 }}
          >
            <Animated.View style={{ transform: [{ scale: eyeScale }] }}>
              {revealed ? (
                <EyeOff size={18} color="#6B7280" />
              ) : (
                <Eye size={18} color="#6B7280" />
              )}
            </Animated.View>
          </Pressable>
        )}
      </View>

      {/* Riga di errore, come i <p className="text-red-500"> della webapp */}
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
