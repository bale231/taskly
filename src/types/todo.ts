export interface SharedBy {
  id: number;
  username: string;
  full_name: string;
}

export interface Category {
  id: number;
  name: string;
  is_owner?: boolean;
  is_shared?: boolean;
  can_edit?: boolean;
  shared_by?: SharedBy | null;
}

export interface TodoSummary {
  id: number;
  text?: string;
  title?: string;
  completed: boolean;
}

export interface TodoList {
  id: number;
  name: string;
  color: string;
  created_at: string;
  todos: TodoSummary[];
  category?: Category | null;
  is_owner?: boolean;
  is_shared?: boolean;
  is_archived?: boolean;
  can_edit?: boolean;
  shared_by?: SharedBy | null;
}

export interface Todo {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  quantity?: number | null;
  unit?: string | null;
  created_by?: SharedBy | null;
  modified_by?: SharedBy | null;
  /** Traccia la posizione originale per un ordinamento stabile. */
  _originalIndex?: number;
}

export type ListSortOption = "created" | "alphabetical" | "complete";
export type TodoSortOption = "created" | "alphabetical" | "completed";

export const LIST_COLORS = ["blue", "green", "yellow", "red", "purple"] as const;
export type ListColor = (typeof LIST_COLORS)[number];
