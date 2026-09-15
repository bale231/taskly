import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/**
 * Ref globale al NavigationContainer, per navigare da fuori un componente
 * schermo — usato dal tour di benvenuto per spostare l'utente da una
 * schermata all'altra automaticamente durante la sequenza guidata.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[RouteName]
    ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error — overload di navigate troppo rigido per un wrapper generico
    navigationRef.navigate(...args);
  }
}
