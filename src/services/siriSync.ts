import { Platform } from "react-native";
import SiriSharedStorage from "../../modules/siri-shared-storage/src/SiriSharedStorageModule";

/**
 * Ponte verso lo storage condiviso (App Group) letto dall'estensione Siri
 * (ios/TasklyIntents): AsyncStorage/le API in memoria di RN non sono
 * visibili a un'estensione, che gira nel proprio processo anche ad app
 * chiusa — solo UserDefaults(suiteName:) nello stesso App Group lo è.
 *
 * Solo iOS: il modulo nativo non esiste su Android, ogni chiamata è
 * no-op lì (try/catch silenzioso, non deve mai far fallire il chiamante
 * per un problema che riguarda solo la scorciatoia Siri).
 */

function isSupported(): boolean {
  return Platform.OS === "ios";
}

export function syncSiriTokens(accessToken: string, refreshToken: string): void {
  if (!isSupported()) return;
  try {
    SiriSharedStorage.setTokens(accessToken, refreshToken);
  } catch (err) {
    console.warn("Impossibile sincronizzare i token per Siri:", err);
  }
}

export function clearSiriTokens(): void {
  if (!isSupported()) return;
  try {
    SiriSharedStorage.clearTokens();
  } catch (err) {
    console.warn("Impossibile pulire i token Siri:", err);
  }
}

export function syncSiriLists(lists: { id: number; name: string }[]): void {
  if (!isSupported()) return;
  try {
    SiriSharedStorage.setTodoLists(lists);
  } catch (err) {
    console.warn("Impossibile sincronizzare le liste per Siri:", err);
  }
}
