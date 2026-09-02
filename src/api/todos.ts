// Port di src/api/todos.ts della webapp.
// Le chiamate di rete sono identiche all'originale: cambia solo lo storage
// del token, che qui è asincrono (AsyncStorage) e il refresh su 401.
import { API_URL } from "./config";
import { refreshTokenIfNeeded } from "./auth";
import { getAccessToken } from "../services/storage";
import {
  deduplicatedFetch,
  invalidateCache,
  CACHE_TTL,
  createCacheKey,
} from "../utils/apiCache";
import type { Todo } from "../types/todo";

/**
 * Parsa una Response come JSON solo se lo status è ok. Una risposta di
 * errore del backend (404/500/gateway) spesso è HTML, non JSON: chiamare
 * res.json() direttamente su quella produce "Unexpected character: <" come
 * unhandled rejection invece di un errore leggibile.
 */
async function safeJson<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ ${context} failed: ${res.status}`, text.slice(0, 200));
    throw new Error(`${context} failed: ${res.status}`);
  }
  return res.json();
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch wrapper that automatically handles 401 by refreshing token and retrying.
 * Use this for all authenticated API calls to prevent auth failures.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();
  const mergedHeaders = { ...headers, ...(options.headers as Record<string, string>) };

  const res = await fetch(url, { ...options, headers: mergedHeaders });

  if (res.status === 401) {
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      const retryHeaders = { ...mergedHeaders, Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return res;
}

// --- 📋 LISTE ---
export async function fetchAllLists() {
  const cacheKey = createCacheKey("lists", "all");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      // fetchWithAuth, non fetch diretto: senza il retry automatico su 401
      // (refresh del token + nuovo tentativo), un access token scaduto nel
      // momento esatto di questa chiamata falliva definitivamente — più
      // probabile su sessioni non persistenti, dove il token è più "fresco"
      // e la finestra di race con il refresh proattivo di App.tsx è più
      // stretta — mostrando liste vuote invece di ritentare.
      const res = await fetchWithAuth(`${API_URL}/lists/`, { method: "GET" });
      return safeJson(res, "fetchAllLists");
    },
    CACHE_TTL.LISTS
  );
}

// Force refresh lists (bypasses cache)
export async function fetchAllListsForce() {
  invalidateCache(/^lists:/);
  return fetchAllLists();
}

export interface ListDetailsResponse {
  name: string;
  color: string;
  is_shared?: boolean;
  is_owner?: boolean;
  sort_order?: string;
  todos: Todo[];
}

export async function fetchListDetails(listId: number | string) {
  const cacheKey = createCacheKey("list", listId.toString());
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetchWithAuth(`${API_URL}/lists/${listId}/`, {
        method: "GET",
      });
      return safeJson<ListDetailsResponse>(res, `fetchListDetails(${listId})`);
    },
    CACHE_TTL.TODO_DETAILS
  );
}

// Force refresh list details (bypasses cache)
export async function fetchListDetailsForce(listId: number | string) {
  invalidateCache(new RegExp(`^list:${listId}`));
  return fetchListDetails(listId);
}

export async function renameList(listId: number, newName: string) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/rename/`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

// ✅ Modifica lista con categoria (PUT su /lists/:id/)
export async function editList(
  listId: number,
  name: string,
  color: string,
  categoryId?: number | null
) {
  const body: Record<string, unknown> = { name, color };
  if (typeof categoryId !== "undefined") body.category = categoryId;
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function createList(
  name: string,
  color: string,
  categoryId?: number | null
) {
  const body: Record<string, unknown> = { name, color };
  if (typeof categoryId !== "undefined") body.category = categoryId;
  const res = await fetchWithAuth(`${API_URL}/lists/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateCache(/^lists:/);
  return res.json();
}

export async function deleteList(listId: number) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/`, {
    method: "DELETE",
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// 📦 Archivia/Disarchivia lista
export async function archiveList(listId: number) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/archive/`, {
    method: "PATCH",
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function unarchiveList(listId: number) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/unarchive/`, {
    method: "PATCH",
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// --- 📂 CATEGORIE ---
export async function fetchAllCategories() {
  const cacheKey = createCacheKey("categories", "all");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetchWithAuth(`${API_URL}/categories/`, {
        method: "GET",
      });
      return safeJson(res, "fetchAllCategories");
    },
    CACHE_TTL.CATEGORIES
  );
}

export async function fetchAllCategoriesForce() {
  invalidateCache(/^categories:/);
  return fetchAllCategories();
}

export async function createCategory(name: string) {
  const res = await fetchWithAuth(`${API_URL}/categories/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  invalidateCache(/^categories:/);
  return res.json();
}

export async function editCategory(categoryId: number, name: string) {
  const res = await fetchWithAuth(`${API_URL}/categories/${categoryId}/`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  invalidateCache(/^categories:/);
  return res.json();
}

export async function deleteCategory(categoryId: number) {
  const res = await fetchWithAuth(`${API_URL}/categories/${categoryId}/`, {
    method: "DELETE",
  });
  invalidateCache(/^categories:/);
  return res.json();
}

// --- ✅ TODOS ---
export async function createTodo(
  listId: number | string,
  title: string,
  quantity?: number | null,
  unit?: string | null,
  description?: string | null
) {
  const body: Record<string, unknown> = { title };
  if (quantity !== undefined && quantity !== null) body.quantity = quantity;
  if (unit !== undefined && unit !== null) body.unit = unit;
  if (description !== undefined && description !== null && description !== "") {
    body.description = description;
  }

  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/todos/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Errore creazione todo: ${res.status}`);
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function toggleTodo(todoId: number) {
  const res = await fetchWithAuth(`${API_URL}/todos/${todoId}/toggle/`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(`Errore toggle todo: ${res.status}`);
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function deleteTodo(todoId: number) {
  const res = await fetchWithAuth(`${API_URL}/todos/${todoId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Errore eliminazione todo: ${res.status}`);
  invalidateCache(/^lists?:/);
  // DELETE risponde tipicamente 204 No Content: nessun body da parsare.
  return null;
}

// ✅ PATCH modifica titolo di una ToDo (e opzionalmente quantità/unità)
export async function updateTodo(
  todoId: number,
  title: string,
  quantity?: number | null,
  unit?: string | null,
  description?: string | null
) {
  const body: Record<string, unknown> = { title };
  if (quantity !== undefined) body.quantity = quantity;
  if (unit !== undefined) body.unit = unit;
  if (description !== undefined) body.description = description;

  const res = await fetchWithAuth(`${API_URL}/todos/${todoId}/update/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Errore aggiornamento todo: ${res.status}`);
  invalidateCache(/^lists?:/);
  return res.json();
}

// ✅ POST per riordinare le ToDo
export async function reorderTodos(
  listId: string | undefined,
  order: number[]
) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/reorder/`, {
    method: "POST",
    body: JSON.stringify({ order }),
  });
  invalidateCache(new RegExp(`^list:${listId}`));
  return res.json();
}

// ✅ PATCH per modificare l'ordine
export async function updateSortOrder(
  listId: number | string,
  sortOrder: string
) {
  const res = await fetchWithAuth(`${API_URL}/lists/${listId}/sort_order/`, {
    method: "PATCH",
    body: JSON.stringify({ sort_order: sortOrder }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ updateSortOrder failed:", res.status, errorText);
    throw new Error(`Failed to update sort order: ${res.status}`);
  }

  invalidateCache(new RegExp(`^list:${listId}`));
  return res.json();
}

// ✅ PATCH per spostare una ToDo in un'altra lista
export async function moveTodo(todoId: number, newListId: number) {
  const res = await fetchWithAuth(`${API_URL}/todos/${todoId}/move/`, {
    method: "PATCH",
    body: JSON.stringify({ new_list_id: newListId }),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// --- 🎯 PREFERENZE CATEGORIA ---
export async function saveSelectedCategory(categoryId: number | null) {
  const res = await fetchWithAuth(`${API_URL}/categories/selected/`, {
    method: "PATCH",
    body: JSON.stringify({ selected_category: categoryId }),
  });
  invalidateCache(/^prefs:/);
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ saveSelectedCategory failed: ${res.status}`, errText);
    return null;
  }
  return res.json();
}

export async function getSelectedCategory() {
  const cacheKey = createCacheKey("prefs", "selected_category");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetchWithAuth(`${API_URL}/categories/selected/`, {
        method: "GET",
      });
      return res.json();
    },
    CACHE_TTL.USER_PREFS
  );
}

// --- 📊 PREFERENZE ORDINAMENTO ---
export async function fetchListsSortOrder(): Promise<
  "created" | "alphabetical" | "complete"
> {
  const res = await fetchWithAuth(`${API_URL}/lists/sort_order/`, {});
  if (!res.ok) return "created";
  const { sort_order } = await res.json();
  return sort_order === "alphabetical" || sort_order === "complete"
    ? sort_order
    : "created";
}

export async function updateListsSortOrder(
  sortOrder: "created" | "alphabetical" | "complete"
) {
  const res = await fetchWithAuth(`${API_URL}/lists/sort_order/`, {
    method: "PATCH",
    body: JSON.stringify({ sort_order: sortOrder }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ lists sort_order save failed: ${res.status}`, errText);
  }
}

export async function fetchCategorySortAlpha(): Promise<boolean> {
  const res = await fetchWithAuth(`${API_URL}/categories/sort_preference/`, {});
  if (!res.ok) return false;
  const { category_sort_alpha } = await res.json();
  return Boolean(category_sort_alpha);
}

export async function updateCategorySortAlpha(value: boolean) {
  const res = await fetchWithAuth(`${API_URL}/categories/sort_preference/`, {
    method: "PATCH",
    body: JSON.stringify({ category_sort_alpha: value }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ categorySortAlpha save failed: ${res.status}`, errText);
  }
}

// --- 🔄 CACHE UTILITIES ---
export function clearApiCache() {
  invalidateCache();
}
