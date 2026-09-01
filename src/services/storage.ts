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
const LISTS_COUNT = "lastListsCount";

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
  await clearHomeCache();
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

/**
 * Numero di liste dell'ultimo caricamento riuscito: usato solo per
 * dimensionare lo skeleton di caricamento della Home al prossimo avvio,
 * prima che la fetch reale risponda.
 */
export async function getLastListsCount(): Promise<number | null> {
  const saved = await AsyncStorage.getItem(LISTS_COUNT);
  const n = saved ? parseInt(saved, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function setLastListsCount(count: number): Promise<void> {
  await AsyncStorage.setItem(LISTS_COUNT, String(count));
}

const HOME_CACHE_LISTS = "cache:home:lists";
const HOME_CACHE_CATEGORIES = "cache:home:categories";
const HOME_CACHE_USERNAME = "cache:home:username";

/**
 * Cache persistente di liste/categorie: mostrata subito all'apertura
 * dell'app invece dello skeleton, mentre una fetch reale in background la
 * aggiorna silenziosamente se qualcosa è cambiato nel frattempo — evita che
 * ogni apertura mostri un caricamento visibile per dati che nella stragrande
 * maggioranza dei casi non sono cambiati dall'ultima sessione.
 *
 * Scopata per username: se l'utente loggato è diverso da quello a cui
 * appartiene la cache salvata, viene considerata assente invece di rischiare
 * di mostrare per un istante i dati di un altro account (stesso bug visto
 * con la cache API in memoria).
 */
export async function getHomeCache<T>(
  key: "lists" | "categories",
  currentUsername: string
): Promise<T | null> {
  const savedUsername = await AsyncStorage.getItem(HOME_CACHE_USERNAME);
  if (savedUsername !== currentUsername) return null;

  const raw = await AsyncStorage.getItem(
    key === "lists" ? HOME_CACHE_LISTS : HOME_CACHE_CATEGORIES
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setHomeCache(
  key: "lists" | "categories",
  data: unknown,
  username: string
): Promise<void> {
  await AsyncStorage.multiSet([
    [key === "lists" ? HOME_CACHE_LISTS : HOME_CACHE_CATEGORIES, JSON.stringify(data)],
    [HOME_CACHE_USERNAME, username],
  ]);
}

export async function clearHomeCache(): Promise<void> {
  await AsyncStorage.multiRemove([HOME_CACHE_LISTS, HOME_CACHE_CATEGORIES, HOME_CACHE_USERNAME]);
}

/**
 * Stessa idea di getHomeCache/setHomeCache ma per i todo di UNA lista
 * specifica (ListDetailScreen): chiave per listId, non serve lo username
 * dato che l'id della lista è già univoco e non condiviso tra account
 * diversi (una lista di un altro utente ha comunque un id diverso).
 */
export async function getListTodosCache<T>(listId: number | string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`cache:list:${listId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setListTodosCache(listId: number | string, data: unknown): Promise<void> {
  await AsyncStorage.setItem(`cache:list:${listId}`, JSON.stringify(data));
}
