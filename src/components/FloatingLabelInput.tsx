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

/**
 * Equivalente RN del pattern floating-label che nella webapp era fatto
 * con le pseudo-classi Tailwind `peer-placeholder-shown` / `peer-focus`.
 * Quelle non esistono in RN, quindi la label è animata a mano.
 */
interface Props extends Omit<TextInputProps, "placeholder"> {
  label: string;
  /** Mostra l'occhio per rivelare/nascondere il testo. */
  isPassword?: boolean;
  /** Messaggio di validazione mostrato sotto il campo. */
  error?: string | null;
}

export default function FloatingLabelInput({
  label,
  isPassword = false,
  error,
  value,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // La label sta in alto quando il campo è attivo o già compilato.
  const floating = focused || Boolean(value);
  const anim = useRef(new Animated.Value(floating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: floating ? 1 : 0,
      duration: 150,
      useNativeDriver: false, // animiamo fontSize/top, non trasformazioni
    }).start();
  }, [anim, floating]);

  const borderColor = error
    ? "#EF4444"
    : focused
      ? "#3B82F6"
      : "#D1D5DB";

  return (
    <View className="mb-4 w-full">
      <View
        className="relative w-full justify-end rounded bg-white dark:bg-gray-700"
        style={{ borderWidth: 1, borderColor, height: 60 }}
      >
        <Animated.Text
          // pointerEvents none: la label non deve rubare il tap all'input
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 8] }),
            fontSize: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 12],
            }),
            color: error ? "#EF4444" : focused ? "#3B82F6" : "#9CA3AF",
          }}
        >
          {label}
        </Animated.Text>

        <TextInput
          value={value}
          secureTextEntry={isPassword && !revealed}
          className="px-4 pb-2 pt-6 text-sm text-gray-900 dark:text-white"
          style={{ height: 58 }}
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

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={8}
            className="absolute right-3"
            style={{ top: 20 }}
          >
            {revealed ? (
              <EyeOff size={18} color="#6B7280" />
            ) : (
              <Eye size={18} color="#6B7280" />
            )}
          </Pressable>
        )}
      </View>

      {/* Riga di errore, come i <p className="text-red-500"> della webapp */}
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
