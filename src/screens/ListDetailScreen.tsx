import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckSquare,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Square,
  Trash,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createTodo,
  deleteTodo,
  fetchAllLists,
  fetchListDetails,
  moveTodo,
  reorderTodos,
  toggleTodo,
  updateSortOrder,
  updateTodo,
} from "../api/todos";
import { getListShares } from "../api/sharing";
import DraggableTodoRow from "../components/DraggableTodoRow";
import MoveTodoModal from "../components/MoveTodoModal";
import SwipeableRow from "../components/SwipeableRow";
import type { RootStackParamList } from "../navigation/types";
import type { Todo, TodoSortOption } from "../types/todo";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;

const HEADER_BG: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950",
  green: "bg-green-50 dark:bg-green-950",
  yellow: "bg-yellow-50 dark:bg-yellow-950",
  red: "bg-red-50 dark:bg-red-950",
  purple: "bg-purple-50 dark:bg-purple-950",
};

const ADD_BUTTON_BG: Record<string, string> = {
  blue: "bg-blue-600",
  green: "bg-green-600",
  yellow: "bg-yellow-500",
  red: "bg-red-600",
  purple: "bg-purple-600",
};

function sortTodos(todos: Todo[], sortBy: TodoSortOption): Todo[] {
  const sorted = [...todos];
  switch (sortBy) {
    case "alphabetical":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "it", { sensitivity: "base" }));
      break;
    case "completed":
      sorted.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
      });
      break;
    default:
      sorted.sort((a, b) => (a._originalIndex ?? 0) - (b._originalIndex ?? 0));
  }
  return sorted;
}

export default function ListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const insets = useSafeAreaInsets();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState("blue");
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState<Array<{ full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortOption, setSortOption] = useState<TodoSortOption>("created");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modale nuova/edit todo
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [title, setTitle] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null);

  // Modale sposta
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [todoToMove, setTodoToMove] = useState<Todo | null>(null);
  const [allLists, setAllLists] = useState<{ id: number; name: string; color: string }[]>([]);

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchListDetails(listId);
      if (!data) return;

      const todosWithIndex: Todo[] = data.todos.map((t: Todo, index: number) => ({
        ...t,
        _originalIndex: t._originalIndex ?? index,
      }));

      const effectiveSort: TodoSortOption =
        data.sort_order === "alphabetical" || data.sort_order === "completed"
          ? data.sort_order
          : "created";

      setSortOption(effectiveSort);
      setTodos(sortTodos(todosWithIndex, effectiveSort));
      setListName(data.name);
      setListColor(data.color || "blue");
      setIsShared(data.is_shared || false);

      getListShares(listId)
        .then((shares) => setSharedWith(shares.map((s) => ({ full_name: s.full_name }))))
        .catch(() => setSharedWith([]));
    } catch (err) {
      console.error("Errore nel caricamento della lista:", err);
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const loadAllLists = useCallback(async () => {
    try {
      const lists = await fetchAllLists();
      if (Array.isArray(lists)) setAllLists(lists);
    } catch (err) {
      console.error("Errore caricamento liste per lo spostamento:", err);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    loadAllLists();
  }, [fetchTodos, loadAllLists]);

  const handleToggle = (todoId: number) => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t));
      return sortOption === "completed" ? sortTodos(updated, "completed") : updated;
    });
    toggleTodo(todoId);
  };

  const handleDelete = (todoId: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    deleteTodo(todoId);
  };

  const handleCreateTodo = async () => {
    if (!title.trim()) return;

    let qty: number | null = null;
    let unit: string | null = null;
    if (quantityValue && unitValue.trim()) {
      qty = parseInt(quantityValue, 10);
      if (Number.isNaN(qty) || qty <= 0) return;
      unit = unitValue;
    } else if (quantityValue || unitValue.trim()) {
      return;
    }

    const created = await createTodo(listId, title, qty, unit);
    if (created?.id) {
      setTodos((prev) => {
        const shifted = prev.map((t) => ({ ...t, _originalIndex: (t._originalIndex ?? 0) + 1 }));
        return [{ ...created, _originalIndex: -1 } as Todo, ...shifted];
      });
    }

    setTitle("");
    setQuantityValue("");
    setUnitValue("");
    setShowQuantityModal(false);
  };

  const handleEditTodo = () => {
    if (!editedTodo) return;
    setTodos((prev) => {
      const updated = prev.map((t) =>
        t.id === editedTodo.id
          ? { ...t, title: editedTodo.title, quantity: editedTodo.quantity, unit: editedTodo.unit }
          : t
      );
      return sortOption === "alphabetical" ? sortTodos(updated, "alphabetical") : updated;
    });
    updateTodo(editedTodo.id, editedTodo.title, editedTodo.quantity, editedTodo.unit);
    setEditedTodo(null);
  };

  const handleMoveTodo = (newListId: number) => {
    if (!todoToMove) return;
    setTodos((prev) => prev.filter((t) => t.id !== todoToMove.id));
    setShowMoveModal(false);
    setTodoToMove(null);
    moveTodo(todoToMove.id, newListId);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setTodos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const withIndex = next.map((t, i) => ({ ...t, _originalIndex: i }));
      reorderTodos(String(listId), withIndex.map((t) => t.id));
      return withIndex;
    });
  };

  const handleSortSelect = (newSort: TodoSortOption) => {
    setSortOption(newSort);
    setTodos((prev) => sortTodos(prev, newSort));
    updateSortOrder(listId, newSort);
    setShowSortMenu(false);
  };

  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;
    const query = searchQuery.toLowerCase().trim();
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.unit && t.unit.toLowerCase().includes(query))
    );
  }, [todos, searchQuery]);

  const canDrag = sortOption === "created" && !searchQuery.trim();

  return (
    <View className={`flex-1 ${HEADER_BG[listColor] ?? HEADER_BG.blue}`}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 24 + insets.top,
          paddingBottom: 140,
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">{listName}</Text>
            {sharedWith.length > 0 && (
              <View className="mt-2 flex-row items-center gap-2">
                <Users size={16} color="#9333EA" />
                <Text className="text-sm text-purple-600 dark:text-purple-400">
                  Condivisa con {sharedWith.map((s) => s.full_name).join(", ")}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-row items-center gap-2 rounded-xl border border-gray-200/50 bg-white/60 px-4 py-2 dark:border-white/20 dark:bg-gray-800/60"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
        </View>

        {searchOpen && (
          <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800">
            <Search size={18} color="#6B7280" />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cerca todo..."
              className="flex-1 py-3 text-gray-900 dark:text-white"
            />
          </View>
        )}

        {editMode && (
          <View className="mb-4 rounded-xl border border-gray-200/50 bg-white/60 p-4 dark:border-white/20 dark:bg-gray-800/60">
            <Pressable
              onPress={() =>
                setSelectedIds(selectedIds.length === todos.length ? [] : todos.map((t) => t.id))
              }
              className="flex-row items-center gap-2"
            >
              {selectedIds.length === todos.length && todos.length > 0 ? (
                <CheckSquare size={20} color="#2563EB" />
              ) : (
                <Square size={20} color="#9CA3AF" />
              )}
              <Text className="font-medium text-gray-800 dark:text-gray-200">
                Seleziona tutte le ToDo
              </Text>
            </Pressable>

            {selectedIds.length > 0 && (
              <Pressable
                onPress={() => setShowBulkConfirm(true)}
                className="mt-3 self-start rounded-lg bg-red-600 px-4 py-2"
              >
                <Text className="text-white">Elimina selezionate ({selectedIds.length})</Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="mb-6 flex-row items-center gap-2">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Nuova ToDo..."
            onSubmitEditing={() => setShowQuantityModal(true)}
            className="flex-1 rounded-xl border border-gray-200/50 bg-white/60 px-4 py-3 text-gray-900 dark:border-white/20 dark:bg-gray-800/60 dark:text-white"
          />
          <Pressable
            onPress={() => setShowQuantityModal(true)}
            className={`rounded-xl p-3 ${ADD_BUTTON_BG[listColor] ?? ADD_BUTTON_BG.blue}`}
          >
            <Plus size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {isLoading ? (
          <View className="mt-8 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : filteredTodos.length === 0 ? (
          <View className="mt-8 items-center">
            <Text className="text-center text-gray-600 dark:text-gray-300">
              {searchQuery.trim() ? `Nessun risultato per "${searchQuery}"` : "Nessuna ToDo"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredTodos.map((todo, index) => (
              <DraggableTodoRow
                key={todo.id}
                index={index}
                itemCount={filteredTodos.length}
                onReorder={handleReorder}
                disabled={!canDrag || editMode}
              >
                <SwipeableRow
                  disabled={editMode}
                  leftAction={{
                    icon: <Pencil size={20} color="#FFFFFF" />,
                    backgroundClassName: "bg-yellow-400",
                    onTrigger: () => setEditedTodo(todo),
                  }}
                  rightAction={{
                    icon: <Trash size={20} color="#FFFFFF" />,
                    backgroundClassName: "bg-red-500",
                    onTrigger: () => handleDelete(todo.id),
                    confirm: {
                      title: "Elimina Todo",
                      message: `Sei sicuro di voler eliminare "${todo.title}"?`,
                    },
                  }}
                >
                  <View className="flex-row items-center rounded-xl border border-gray-200/50 bg-white/70 px-4 py-3 dark:border-white/20 dark:bg-gray-800/70">
                    {editMode && (
                      <Pressable
                        onPress={() =>
                          setSelectedIds((ids) =>
                            ids.includes(todo.id)
                              ? ids.filter((i) => i !== todo.id)
                              : [...ids, todo.id]
                          )
                        }
                        className="mr-2"
                      >
                        {selectedIds.includes(todo.id) ? (
                          <CheckSquare size={20} color="#2563EB" />
                        ) : (
                          <Square size={20} color="#9CA3AF" />
                        )}
                      </Pressable>
                    )}

                    <Pressable onPress={() => handleToggle(todo.id)} className="mr-3">
                      <CheckSquare size={20} color={todo.completed ? "#9CA3AF" : "#16A34A"} />
                    </Pressable>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className={`flex-1 text-lg font-semibold ${
                            todo.completed
                              ? "text-gray-400 line-through"
                              : "text-gray-900 dark:text-white"
                          }`}
                          numberOfLines={1}
                        >
                          {todo.title}
                        </Text>
                        {todo.quantity && todo.unit && (
                          <View className="rounded-full bg-blue-500/20 px-2 py-0.5">
                            <Text className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              {todo.quantity} {todo.unit}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isShared && todo.created_by && (
                        <Text className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                          Aggiunta da {todo.created_by.full_name}
                        </Text>
                      )}
                    </View>

                    {editMode && (
                      <View className="ml-2 flex-row gap-2">
                        <Pressable
                          onPress={() => {
                            setTodoToMove(todo);
                            setShowMoveModal(true);
                          }}
                          className="rounded bg-purple-500/20 p-1.5"
                        >
                          <ArrowRightLeft size={16} color="#7C3AED" />
                        </Pressable>
                        <Pressable
                          onPress={() => setEditedTodo(todo)}
                          className="rounded bg-blue-500/20 p-1.5"
                        >
                          <Pencil size={16} color="#2563EB" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(todo.id)}
                          className="rounded bg-red-500/20 p-1.5"
                        >
                          <Trash size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </SwipeableRow>
              </DraggableTodoRow>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Barra azioni flottante in basso */}
      <View className="absolute bottom-6 left-6 right-6 flex-row justify-between">
        <Pressable
          onPress={() => setEditMode((prev) => !prev)}
          className={`rounded-full p-4 shadow-lg ${editMode ? "bg-green-600" : "bg-gray-700"}`}
        >
          <Pencil size={22} color="#FFFFFF" />
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setSearchOpen((prev) => !prev)}
            className="rounded-full bg-gray-700 p-4 shadow-lg"
          >
            <Search size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => setShowSortMenu(true)}
            className="rounded-full bg-yellow-500 p-4 shadow-lg"
          >
            <ListFilter size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Modale aggiungi todo */}
      <Modal visible={showQuantityModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/30 p-4">
          <View className="w-full max-w-xs rounded-xl border border-gray-200/50 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
            <Text className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Aggiungi ToDo
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Es: Latte, Pane, Uova..."
              className="mb-3 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
            />
            <View className="mb-4 flex-row gap-3">
              <TextInput
                value={quantityValue}
                onChangeText={setQuantityValue}
                placeholder="Quantità"
                keyboardType="numeric"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
              />
              <TextInput
                value={unitValue}
                onChangeText={setUnitValue}
                placeholder="Unità (pz, kg...)"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
              />
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowQuantityModal(false);
                  setQuantityValue("");
                  setUnitValue("");
                }}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
              </Pressable>
              <Pressable onPress={handleCreateTodo} className="flex-1 rounded-lg bg-blue-600 py-2.5">
                <Text className="text-center font-medium text-white">Aggiungi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale modifica todo */}
      <Modal visible={editedTodo !== null} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/30 p-4">
          <View className="w-full max-w-xs rounded-xl border border-gray-200/50 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
            <Text className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Modifica ToDo
            </Text>
            {editedTodo && (
              <>
                <TextInput
                  value={editedTodo.title}
                  onChangeText={(text) => setEditedTodo({ ...editedTodo, title: text })}
                  className="mb-3 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
                />
                <View className="mb-4 flex-row gap-3">
                  <TextInput
                    value={editedTodo.quantity ? String(editedTodo.quantity) : ""}
                    onChangeText={(text) =>
                      setEditedTodo({
                        ...editedTodo,
                        quantity: text ? parseInt(text, 10) : null,
                      })
                    }
                    placeholder="Quantità"
                    keyboardType="numeric"
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
                  />
                  <TextInput
                    value={editedTodo.unit ?? ""}
                    onChangeText={(text) =>
                      setEditedTodo({ ...editedTodo, unit: text || null })
                    }
                    placeholder="Unità"
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
                  />
                </View>
              </>
            )}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setEditedTodo(null)}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
              </Pressable>
              <Pressable onPress={handleEditTodo} className="flex-1 rounded-lg bg-blue-600 py-2.5">
                <Text className="text-center font-medium text-white">Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Conferma elimina multipla */}
      <Modal visible={showBulkConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/30 p-4">
          <View className="w-full max-w-xs rounded-xl border border-gray-200/50 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
            <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Elimina {selectedIds.length} ToDo?
            </Text>
            <Text className="mb-6 text-gray-600 dark:text-gray-300">
              Questa operazione è irreversibile.
            </Text>
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowBulkConfirm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-gray-700 dark:text-gray-300">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTodos((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
                  selectedIds.forEach((id) => deleteTodo(id));
                  setSelectedIds([]);
                  setShowBulkConfirm(false);
                }}
                className="rounded-lg bg-red-600 px-4 py-2.5"
              >
                <Text className="text-white">Conferma</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu di ordinamento */}
      <Modal visible={showSortMenu} transparent animationType="slide">
        <Pressable className="flex-1 justify-end bg-black/30" onPress={() => setShowSortMenu(false)}>
          <View
            className="rounded-t-3xl bg-white p-6 dark:bg-gray-900"
            style={{ paddingBottom: Math.max(insets.bottom, 24) + 8 }}
          >
            <Text className="mb-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
              Ordina per
            </Text>
            {(
              [
                ["created", "Per Creazione"],
                ["alphabetical", "Alfabetico"],
                ["completed", "Per Completezza"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => handleSortSelect(value)}
                className={`mb-3 rounded-xl px-4 py-3 ${
                  sortOption === value ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={sortOption === value ? "text-white" : "text-gray-800 dark:text-gray-200"}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {showMoveModal && todoToMove && (
        <MoveTodoModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setTodoToMove(null);
          }}
          todoTitle={todoToMove.title}
          currentListId={listId}
          currentListName={listName}
          allLists={allLists}
          onMove={handleMoveTodo}
        />
      )}
    </View>
  );
}
