import { type ReactNode } from "react";
import { GripVertical } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

interface DraggableTodoRowProps {
  children: ReactNode;
  /** `drag()` di react-native-draggable-flatlist: attiva il riordino live, con le altre righe che scorrono in tempo reale come le icone della home iOS. */
  onDrag: () => void;
  /** true mentre QUESTA riga è quella attualmente sollevata e trascinata. */
  isActive: boolean;
  disabled?: boolean;
}

/**
 * Wrapper leggero attorno a ogni riga per DraggableFlatList
 * (react-native-draggable-flatlist): il riordino vero e proprio (le altre
 * righe che si spostano dal vivo mentre trascini, non solo a fine gesto) è
 * gestito dalla libreria, che sostituisce il precedente sistema fatto a
 * mano con Gesture Handler puro — quello muoveva solo la riga attiva e
 * lasciava le altre ferme fino al riordino finale dei dati, risultando
 * "scattoso" invece che fluido come un vero drag&drop.
 */
export default function DraggableTodoRow({
  children,
  onDrag,
  isActive,
  disabled = false,
}: DraggableTodoRowProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 0.9 : 1, { duration: 120 }),
    shadowOpacity: withTiming(isActive ? 0.2 : 0, { duration: 120 }),
    elevation: isActive ? 6 : 0,
  }));

  return (
    <Animated.View style={[animatedStyle, { flexDirection: "row", alignItems: "center" }]}>
      {!disabled && (
        <Pressable onLongPress={onDrag} disabled={isActive} className="pr-2 py-2">
          <View>
            <GripVertical size={18} color="#9CA3AF" />
          </View>
        </Pressable>
      )}
      <View className="flex-1">{children}</View>
    </Animated.View>
  );
}
