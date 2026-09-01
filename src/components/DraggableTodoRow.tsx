import { type ReactNode } from "react";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

interface DraggableTodoRowProps {
  children: ReactNode;
  /** true mentre QUESTA riga è quella attualmente sollevata e trascinata (drag attivato dalla maniglia dentro la card, vedi ListDetailScreen). */
  isActive: boolean;
}

/**
 * Effetto visivo di "sollevamento" per la riga attiva durante il drag di
 * DraggableFlatList (react-native-draggable-flatlist). La maniglia che
 * attiva il drag vive dentro la card stessa (TodoRow in ListDetailScreen),
 * non più qui: prima stava a sinistra fuori dalla card, ma l'utente la
 * voleva dentro, ed era comunque più facile far competere accidentalmente
 * l'area a sinistra con lo swipe-back nativo di iOS.
 */
export default function DraggableTodoRow({ children, isActive }: DraggableTodoRowProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 0.9 : 1, { duration: 120 }),
    shadowOpacity: withTiming(isActive ? 0.2 : 0, { duration: 120 }),
    elevation: isActive ? 6 : 0,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
