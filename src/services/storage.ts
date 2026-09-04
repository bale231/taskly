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
  await clearAppCache();
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
 *
 * Oltre alla copia persistita su AsyncStorage (necessaria per un avvio a
 * freddo dell'app), viene mantenuto uno specchio in memoria: ListDetailScreen
 * viene smontata e rimontata da zero ogni volta che si esce e si rientra in
 * una lista (push/pop nello stack di navigazione), e leggere da AsyncStorage
 * è comunque asincrono — anche solo un frame di attesa per liste già viste
 * (o già scaricate dal prefetch iniziale) faceva ricomparire lo skeleton a
 * ogni rientro. Lo specchio sincrono elimina quel frame per tutto ciò che è
 * già stato scaricato in questa sessione dell'app.
 */
const listTodosCacheMemory = new Map<string, unknown>();

export function getListTodosCacheSync<T>(listId: number | string): T | null {
  const cached = listTodosCacheMemory.get(String(listId));
  return (cached as T) ?? null;
}

export async function getListTodosCache<T>(listId: number | string): Promise<T | null> {
  const key = String(listId);
  const inMemory = listTodosCacheMemory.get(key);
  if (inMemory) return inMemory as T;

  const raw = await AsyncStorage.getItem(`cache:list:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as T;
    listTodosCacheMemory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function setListTodosCache(listId: number | string, data: unknown): Promise<void> {
  listTodosCacheMemory.set(String(listId), data);
  await AsyncStorage.setItem(`cache:list:${listId}`, JSON.stringify(data));
}

const LIST_TODOS_CACHE_DEBOUNCE_MS = 400;
const listTodosCacheTimers = new Map<string, ReturnType<typeof setTimeout>>();
const listTodosCachePending = new Map<string, unknown[]>();

/**
 * Aggiorna solo l'array `todos` dentro la cache esistente (nome, colore,
 * ordinamento, ecc. restano quelli già salvati), invece di sovrascrivere
 * l'intera struttura con il solo array: usata dagli optimistic update
 * (toggle/crea/modifica/elimina un todo), che conoscono solo la lista di
 * todo aggiornata, non l'intero ListDetailsResponse.
 *
 * Con debounce: con liste da 90-100+ todo, riscrivere l'intera struttura
 * (parse + stringify + I/O su AsyncStorage) ad OGNI singolo tap rallentava
 * vistosamente la UI e in alcuni casi mandava in crash l'app spuntando più
 * todo di fila. Qui si accoda solo l'ultimo array richiesto per quella
 * lista e si scrive una volta sola dopo un breve periodo di inattività,
 * invece di una scrittura pesante per ogni singola interazione.
 */
export function updateListTodosCacheTodos(listId: number | string, todos: unknown[]): void {
  const key = String(listId);
  // Aggiorna subito lo specchio in memoria (sincrono, letto da
  // getListTodosCacheSync/getListTodosCache): solo la scrittura persistita
  // su AsyncStorage resta debounced per non appesantire il tap ripetuto.
  const existingEntry = listTodosCacheMemory.get(key);
  if (existingEntry && typeof existingEntry === "object") {
    listTodosCacheMemory.set(key, { ...(existingEntry as object), todos });
  }
  listTodosCachePending.set(key, todos);

  const existingTimer = listTodosCacheTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  listTodosCacheTimers.set(
    key,
    setTimeout(() => {
      listTodosCacheTimers.delete(key);
      const latestTodos = listTodosCachePending.get(key);
      listTodosCachePending.delete(key);
      if (latestTodos) flushListTodosCache(key, latestTodos);
    }, LIST_TODOS_CACHE_DEBOUNCE_MS)
  );
}

async function flushListTodosCache(listId: string, todos: unknown[]): Promise<void> {
  const raw = await AsyncStorage.getItem(`cache:list:${listId}`);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      parsed.todos = todos;
      await AsyncStorage.setItem(`cache:list:${listId}`, JSON.stringify(parsed));
    }
  } catch {
    // Cache corrotta: la fetch successiva la sovrascriverà comunque.
  }
}

const APP_CACHE_KEYS = {
  friends: "cache:app:friends",
  friendRequests: "cache:app:friendRequests",
  notifications: "cache:app:notifications",
  profile: "cache:app:profile",
  username: "cache:app:username",
} as const;

type AppCacheKind = keyof Omit<typeof APP_CACHE_KEYS, "username">;

/**
 * Cache persistente generica per i dataset scaricati dal prefetch globale
 * all'avvio (amici, richieste di amicizia, notifiche, profilo utente) —
 * stessa idea di getHomeCache/setHomeCache ma riusata per più dataset,
 * scopata per username per evitare di mostrare dati dell'account sbagliato
 * a cavallo di un logout/login con utenti diversi sullo stesso device.
 */
export async function getAppCache<T>(kind: AppCacheKind, currentUsername: string): Promise<T | null> {
  const savedUsername = await AsyncStorage.getItem(APP_CACHE_KEYS.username);
  if (savedUsername !== currentUsername) return null;

  const raw = await AsyncStorage.getItem(APP_CACHE_KEYS[kind]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Come getAppCache, ma senza verificare lo username corrente: usata solo per
 * il profilo utente in ProfileScreen, l'unico caso in cui lo username non è
 * ancora noto al momento della lettura (è proprio ciò che si sta per
 * caricare). Il rischio — mostrare per un istante il profilo cachato di un
 * account diverso da uno switch precedente — si autocorregge subito che
 * arriva la risposta fresca di getCurrentUserJWT, quindi è accettabile.
 */
export async function getAnyAppCache<T>(kind: AppCacheKind): Promise<T | null> {
  const raw = await AsyncStorage.getItem(APP_CACHE_KEYS[kind]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setAppCache(kind: AppCacheKind, data: unknown, username: string): Promise<void> {
  await AsyncStorage.multiSet([
    [APP_CACHE_KEYS[kind], JSON.stringify(data)],
    [APP_CACHE_KEYS.username, username],
  ]);
}

export async function clearAppCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    APP_CACHE_KEYS.friends,
    APP_CACHE_KEYS.friendRequests,
    APP_CACHE_KEYS.notifications,
    APP_CACHE_KEYS.profile,
    APP_CACHE_KEYS.username,
  ]);
}
