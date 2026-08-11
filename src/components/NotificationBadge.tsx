import { Bell } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useNotifications } from "../context/NotificationContext";

/** Port di src/components/NotificationBadge.tsx: campanello con badge conteggio. */
export default function NotificationBadge() {
  const { unreadCount, showPopup, setShowPopup } = useNotifications();
  const scale = useSharedValue(1);
  const prevCountRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, scale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={() => setShowPopup(!showPopup)} className="relative p-1">
      <Bell size={24} color="#2563EB" />
      {unreadCount > 0 && (
        <Animated.View
          style={badgeStyle}
          className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red-500"
        >
          <Text className="text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}
