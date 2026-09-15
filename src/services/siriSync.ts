import { Platform } from "react-native";
import type SiriSharedStorageModule from "../../modules/siri-shared-storage/src/SiriSharedStorageModule";

/**
 * Ponte verso lo storage condiviso (App Group) letto dall'estensione Siri
 * (ios/TasklyIntents): AsyncStorage/le API in memoria di RN non sono
 * visibili a un'estensione, che gira nel proprio processo anche ad app
 * chiusa — solo UserDefaults(suiteName:) nello stesso App Group lo è.
 *
 * Solo iOS: il modulo nativo non esiste su Android, e non ha nessuna
 * registrazione lato Android (il podspec è ios/ soltanto). L'import
 * dell'implementazione (`requireNativeModule`) va quindi fatto in modo
 * PIGRO, dentro le funzioni sotto — mai a livello di modulo: un
 * `require`/`import` statico esegue `requireNativeModule` non appena il
 * file viene caricato, indipendentemente dalla piattaforma, e su un
 * modulo Expo nativo assente questo lancia un'eccezione JS non
 * recuperabile che fa crashare l'intero runtime invece di essere
 * catturabile da un try/catch a valle.
 */

function isSupported(): boolean {
  return Platform.OS === "ios";
}

function getNativeModule(): typeof SiriSharedStorageModule | null {
  if (!isSupported()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../../modules/siri-shared-storage/src/SiriSharedStorageModule").default;
}

export function syncSiriTokens(accessToken: string, refreshToken: string): void {
  try {
    getNativeModule()?.setTokens(accessToken, refreshToken);
  } catch (err) {
    console.warn("Impossibile sincronizzare i token per Siri:", err);
  }
}

export function clearSiriTokens(): void {
  try {
    getNativeModule()?.clearTokens();
  } catch (err) {
    console.warn("Impossibile pulire i token Siri:", err);
  }
}

export function syncSiriLists(lists: { id: number; name: string }[]): void {
  try {
    getNativeModule()?.setTodoLists(lists);
  } catch (err) {
    console.warn("Impossibile sincronizzare le liste per Siri:", err);
  }
}
