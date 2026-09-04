import { getCurrentUserJWT } from "../api/auth";
import { fetchFriendRequests, fetchFriends } from "../api/friends";
import { fetchNotifications } from "../api/notifications";
import {
  fetchAllCategories,
  fetchAllLists,
  fetchCategorySortAlpha,
  fetchListDetails,
  fetchListsSortOrder,
  getSelectedCategory,
} from "../api/todos";
import { setAppCache, setHomeCache, setListTodosCache } from "./storage";

/**
 * Scarica in blocco tutto ciò che l'app userà durante la sessione (liste con
 * i loro todo annidati, categorie, preferenze di ordinamento, amici,
 * richieste di amicizia, notifiche) e lo salva nelle cache locali, così che
 * ogni schermata legga da lì invece di rifare una fetch al proprio
 * mount/focus. Va chiamata una sola volta: subito dopo il login, oppure
 * all'avvio dell'app se l'utente risulta già loggato (token persistiti).
 *
 * Le sole SCRITTURE (creare/modificare/eliminare) restano gestite altrove
 * con optimistic update + coda di sync in background — qui si parla solo
 * del caricamento iniziale, in lettura.
 *
 * Ogni dataset è recuperato con `allSettled`: se uno fallisce (es. un
 * endpoint momentaneamente giù), non deve bloccare gli altri né far fallire
 * l'intero prefetch — le schermate che non trovano cache per quel dataset
 * ricadranno comunque sulla propria fetch on-demand come rete di sicurezza.
 */
export async function prefetchAll(): Promise<void> {
  const user = await getCurrentUserJWT();
  if (!user) return;

  const username: string = user.username ?? user.email ?? "unknown";

  // FASE 1 — essenziale per la Home, in parallelo ma solo 3 richieste:
  // liste, categorie, profilo (già in mano, solo da cachare). È la parte
  // che l'utente aspetta a vista, va scaricata per prima e velocemente.
  const [lists, categories] = await Promise.all([
    fetchAllLists().catch(() => null),
    fetchAllCategories().catch(() => null),
  ]);
  await Promise.all([
    lists ? setHomeCache("lists", lists, username) : Promise.resolve(),
    categories ? setHomeCache("categories", categories, username) : Promise.resolve(),
    setAppCache("profile", user, username),
  ]);

  // FASE 2 — tutto il resto, A CONCORRENZA LIMITATA (non `Promise.all` a
  // raffica): il backend (PythonAnywhere free tier) ha di fatto un solo
  // worker. Sparare insieme una richiesta per il dettaglio di OGNI lista
  // (utenti con 15-20+ liste) più preferenze/amici/richieste/notifiche
  // significava decine di richieste simultanee che si accodavano a vicenda
  // — comprese quelle della UI stessa (Home, la lista che l'utente sta
  // davvero aprendo in quel momento) — ed è la causa del lag diffuso
  // lamentato. Qui si scarica un pezzo alla volta, con poche richieste
  // realmente in volo insieme.
  const listDetailsTasks: Array<() => Promise<void>> = Array.isArray(lists)
    ? lists.map((list: { id: number }) => async () => {
        const data = await fetchListDetails(list.id).catch(() => null);
        if (data) await setListTodosCache(list.id, data);
      })
    : [];

  const otherTasks: Array<() => Promise<void>> = [
    () => fetchListsSortOrder().then(() => {}),
    () => fetchCategorySortAlpha().then(() => {}),
    () => getSelectedCategory().then(() => {}),
    () => fetchFriends().then((data) => setAppCache("friends", data, username)),
    () => fetchFriendRequests().then((data) => setAppCache("friendRequests", data, username)),
    () => fetchNotifications().then((data) => setAppCache("notifications", data, username)),
  ];

  await runWithLimit([...otherTasks, ...listDetailsTasks], PREFETCH_CONCURRENCY);
}

/** Al massimo tante richieste in volo insieme quante ne regge comodamente il
 * backend a worker singolo, senza mettere in coda dietro di sé le richieste
 * della UI (Home, la lista che l'utente sta davvero aprendo). Le richieste
 * in eccesso attendono che si liberi uno slot invece di partire tutte subito. */
const PREFETCH_CONCURRENCY = 3;

async function runWithLimit(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      try {
        await task();
      } catch {
        // Un dataset non scaricato qui verrà comunque richiesto on-demand
        // dalla schermata che lo usa: non deve bloccare gli altri task.
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}
