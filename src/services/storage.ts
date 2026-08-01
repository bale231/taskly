import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Sostituto di localStorage/sessionStorage per React Native.
 *
 * Nella webapp la scelta fra localStorage e sessionStorage implementava
 * "Rimani loggato": sessionStorage moriva alla chiusura del tab.
 * In RN non esiste storage volatile legato alla sessione, quindi la
 * semantica è replicata così:
 *   - i token stanno sempre in AsyncStorage (unico storage disponibile)
 *   - `persistent` registra se l'utente aveva scelto "Rimani loggato"
 *   - all'avvio, se `persistent` è false, i token vengono scartati
 *     (vedi clearSessionTokensIfNeeded) — l'equivalente del tab chiuso.
 *
 * Nota: tutte le API sono async, a differenza di localStorage.
 */

const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";
const PERSISTENT = "authPersistent";
const THEME = "theme";

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN);
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
  persistent: boolean
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN, accessToken],
    [REFRESH_TOKEN, refreshToken],
    [PERSISTENT, persistent ? "1" : "0"],
  ]);
}

/** Aggiorna il solo access token (dopo un refresh), preservando il resto. */
export async function setAccessToken(accessToken: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN, accessToken);
}

/** Il backend può ruotare il refresh token: in quel caso va sovrascritto. */
export async function setRefreshToken(refreshToken: string): Promise<void> {
  await AsyncStorage.setItem(REFRESH_TOKEN, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, PERSISTENT, THEME]);
}

export async function isPersistentSession(): Promise<boolean> {
  return (await AsyncStorage.getItem(PERSISTENT)) === "1";
}

/**
 * Da chiamare una volta sola all'avvio, prima di leggere i token.
 * Se l'utente non aveva scelto "Rimani loggato", i token dell'avvio
 * precedente vengono buttati — replica la morte di sessionStorage.
 */
export async function clearSessionTokensIfNeeded(): Promise<void> {
  const hasToken = await AsyncStorage.getItem(ACCESS_TOKEN);
  if (!hasToken) return;

  if (!(await isPersistentSession())) {
    await clearTokens();
  }
}

export async function getStoredTheme(): Promise<"light" | "dark" | null> {
  const saved = await AsyncStorage.getItem(THEME);
  return saved === "dark" ? "dark" : saved === "light" ? "light" : null;
}

export async function setStoredTheme(theme: "light" | "dark"): Promise<void> {
  await AsyncStorage.setItem(THEME, theme);
}
