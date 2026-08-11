import { AlertCircle, CheckCircle, X, XCircle } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

interface AnimatedAlertProps {
  type: "success" | "error" | "warning";
  message: string;
  onClose: () => void;
}

const CONFIG = {
  success: { Icon: CheckCircle, bg: "bg-green-500/90", border: "border-green-400" },
  error: { Icon: XCircle, bg: "bg-red-500/90", border: "border-red-400" },
  warning: { Icon: AlertCircle, bg: "bg-yellow-500/90", border: "border-yellow-400" },
} as const;

/** Port di src/components/AnimatedAlert.tsx: toast in alto, auto-dismiss dopo 4s. */
export default function AnimatedAlert({ type, message, onClose }: AnimatedAlertProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(handleClose, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { Icon, bg, border } = CONFIG[type];

  return (
    <View
      className="absolute left-0 right-0 top-6 z-50 items-center"
      pointerEvents="box-none"
    >
      <Animated.View
        style={{ transform: [{ translateY }], opacity }}
        className={`flex-row items-center gap-3 rounded-2xl border-2 px-6 py-4 shadow-2xl ${bg} ${border}`}
      >
        <Icon size={24} color="#FFFFFF" />
        <Text className="flex-1 font-medium text-white">{message}</Text>
        <Pressable onPress={handleClose} className="rounded-lg p-1">
          <X size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}
