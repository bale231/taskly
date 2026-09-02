import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createTodo as apiCreateTodo,
  deleteTodo as apiDeleteTodo,
  toggleTodo as apiToggleTodo,
  updateTodo as apiUpdateTodo,
} from "../api/todos";

/**
 * Coda persistente delle mutazioni sui todo non ancora confermate dal
 * server: permette all'utente di continuare a usare le liste offline (o con
 * connessione instabile) vedendo l'effetto subito, mentre in background la
 * coda tenta di allineare il backend appena possibile — anche dopo aver
 * chiuso e riaperto l'app, dato che è persistita.
 *
 * Non gestisce liste/categorie (solo i todo, primo caso pilota): quelle
 * restano sul vecchio comportamento sincrono finché non verrà esteso.
 */

type PendingOp =
  | {
      id: string;
      type: "create";
      /** ID temporaneo negativo assegnato in locale, sostituito con quello
       * reale del server appena la creazione va a buon fine. */
      tempId: number;
      listId: number | string;
      title: string;
      quantity?: number | null;
      unit?: string | null;
      description?: string | null;
    }
  | { id: string; type: "toggle"; todoId: number }
  | { id: string; type: "delete"; todoId: number }
  | {
      id: string;
      type: "update";
      todoId: number;
      title: string;
      quantity?: number | null;
      unit?: string | null;
      description?: string | null;
    };

const QUEUE_KEY = "syncQueue:todos";
const TEMP_ID_KEY = "syncQueue:nextTempId";

let processing = false;
// Riesecuzioni concorrenti multiple (es. NetInfo che notifica "online" più
// volte di fila) devono comunque risultare in un solo giro sulla coda:
// questa promise fa da lock cooperativo tra le chiamate sovrapposte.
let currentRun: Promise<void> | null = null;

async function readQueue(): Promise<PendingOp[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** ID temporanei sempre negativi e decrescenti: non collidono mai con un
 * ID reale del backend (sempre positivo), e restano univoci tra riavvii. */
export async function nextTempId(): Promise<number> {
  const raw = await AsyncStorage.getItem(TEMP_ID_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) - 1;
  await AsyncStorage.setItem(TEMP_ID_KEY, String(next));
  return next;
}

function genOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueCreateTodo(params: {
  tempId: number;
  listId: number | string;
  title: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
}): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: genOpId(), type: "create", ...params });
  await writeQueue(queue);
}

export async function enqueueToggleTodo(todoId: number): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: genOpId(), type: "toggle", todoId });
  await writeQueue(queue);
}

export async function enqueueDeleteTodo(todoId: number): Promise<void> {
  const queue = await readQueue();
  // Se il todo era stato creato offline (ID temporaneo mai confermato) e
  // viene eliminato prima di essere sincronizzato, non ha senso mandare al
  // server né la create né le operazioni successive su di esso: si annulla
  // tutto localmente invece di accodare un delete per un ID che il server
  // non conoscerà mai.
  const createOp = queue.find((op) => op.type === "create" && op.tempId === todoId);
  if (createOp) {
    await writeQueue(queue.filter((op) => !opTargetsTodo(op, todoId)));
    return;
  }
  queue.push({ id: genOpId(), type: "delete", todoId });
  await writeQueue(queue);
}

export async function enqueueUpdateTodo(params: {
  todoId: number;
  title: string;
  quantity?: number | null;
  unit?: string | null;
  description?: string | null;
}): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: genOpId(), type: "update", ...params });
  await writeQueue(queue);
}

function opTargetsTodo(op: PendingOp, todoId: number): boolean {
  if (op.type === "create") return op.tempId === todoId;
  return op.todoId === todoId;
}

/** True se esistono mutazioni non ancora confermate dal server. */
export async function hasPendingSync(): Promise<boolean> {
  return (await readQueue()).length > 0;
}

/**
 * Elabora la coda in ordine, una operazione alla volta. Chiamata dopo ogni
 * enqueue e alla riconnessione (vedi useSyncQueueOnReconnect). Un errore di
 * rete interrompe il giro (si riprova al prossimo trigger, l'operazione
 * resta in coda); un errore applicativo (4xx: es. lista/todo già cancellati
 * altrove) scarta la singola operazione e continua con le successive,
 * altrimenti un dato ormai non valido bloccherebbe la coda per sempre.
 */
export async function processQueue(): Promise<void> {
  if (processing) return currentRun ?? undefined;
  processing = true;
  currentRun = runQueue().finally(() => {
    processing = false;
    currentRun = null;
  });
  return currentRun;
}

async function runQueue(): Promise<void> {
  for (;;) {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const op = queue[0];
    try {
      await applyOp(op);
      // Rimuove solo la prima: rilegge la coda ad ogni iterazione invece di
      // tenerne una copia in memoria, così un enqueue arrivato nel frattempo
      // (es. l'utente continua a interagire mentre la coda gira) non viene
      // perso da una scrittura che sovrascriverebbe con uno snapshot vecchio.
      const latest = await readQueue();
      await writeQueue(latest.filter((o) => o.id !== op.id));
    } catch (err) {
      if (isNetworkError(err)) return; // riprova al prossimo trigger
      console.warn("syncQueue: operazione scartata dopo errore applicativo", op, err);
      const latest = await readQueue();
      await writeQueue(latest.filter((o) => o.id !== op.id));
    }
  }
}

async function applyOp(op: PendingOp): Promise<void> {
  switch (op.type) {
    case "create": {
      const created = await apiCreateTodo(op.listId, op.title, op.quantity, op.unit, op.description);
      if (created?.id) await remapTempId(op.tempId, created.id);
      return;
    }
    case "toggle":
      await apiToggleTodo(op.todoId);
      return;
    case "delete":
      await apiDeleteTodo(op.todoId);
      return;
    case "update":
      await apiUpdateTodo(op.todoId, op.title, op.quantity, op.unit, op.description);
      return;
  }
}

/** Sostituisce l'ID temporaneo con quello reale in tutte le operazioni
 * successive già in coda (es. l'utente ha spuntato o rinominato il todo
 * appena creato prima che la create fosse confermata). */
async function remapTempId(tempId: number, realId: number): Promise<void> {
  const queue = await readQueue();
  const remapped = queue.map((op) => {
    if (op.type !== "create" && "todoId" in op && op.todoId === tempId) {
      return { ...op, todoId: realId };
    }
    return op;
  });
  await writeQueue(remapped);
  tempIdListeners.forEach((listener) => listener(tempId, realId));
}

type TempIdListener = (tempId: number, realId: number) => void;
const tempIdListeners = new Set<TempIdListener>();

/** Un componente montato (es. ListDetailScreen) si registra qui per
 * aggiornare l'ID nel proprio stato React quando una create in coda viene
 * confermata — altrimenti la UI resterebbe con l'ID temporaneo per sempre,
 * anche se il server ne ha ormai assegnato uno reale. */
export function onTempIdResolved(listener: TempIdListener): () => void {
  tempIdListeners.add(listener);
  return () => tempIdListeners.delete(listener);
}

function isNetworkError(err: unknown): boolean {
  // fetch rifiuta con TypeError("Network request failed") quando non c'è
  // connessione o l'host è irraggiungibile — le funzioni api/todos.ts non
  // distinguono altrimenti un errore di rete da un errore applicativo.
  return err instanceof TypeError;
}
