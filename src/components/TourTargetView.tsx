import type { ReactNode } from "react";
import { View } from "react-native";
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
  children,
}: {
  targetId: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const target = useTourTarget(enabled ? targetId : `__disabled__${targetId}`);

  return (
    <View ref={target.ref} onLayout={target.onLayout} collapsable={false}>
      {children}
    </View>
  );
}
