import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useTourTarget } from "../hooks/useTourTarget";

/**
 * Wrapper JSX per useTourTarget(), utile quando il target va registrato
 * solo su UNA istanza dentro una .map() (es. solo sulla card più recente):
 * un hook non può essere chiamato condizionalmente, ma un componente sì.
 * Quando `enabled` è false, registra comunque il ref (nessun costo) ma con
 * un targetId che non corrisponderà mai a nessuno step di alcun tour.
 */
export default function TourTargetView({
  targetId,
  enabled = true,
  style,
  children,
}: {
  targetId: string | string[];
  enabled?: boolean;
  /** Passare `{ flex: 1 }` quando il figlio è un bottone dentro un
   * flex-row (es. le azioni rapide della Home): il wrapper deve occupare
   * lo stesso spazio, altrimenti rompe il layout dei fratelli. */
  style?: ViewStyle;
  children: ReactNode;
}) {
  const ids = Array.isArray(targetId) ? targetId : [targetId];
  const target = useTourTarget(enabled ? ids : ids.map((id) => `__disabled__${id}`));

  return (
    <View ref={target.ref} onLayout={target.onLayout} collapsable={false} style={style}>
      {children}
    </View>
  );
}
