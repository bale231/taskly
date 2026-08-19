import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import Animated, {
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
import AnimatedCheckbox from "../components/AnimatedCheckbox";
import BubbleModal from "../components/BubbleModal";
import DraggableTodoRow from "../components/DraggableTodoRow";
import GlassSurface from "../components/GlassSurface";
import { GlassBottomSheetBackdrop, GlassBottomSheetBackground } from "../components/GlassBottomSheet";
import MarqueeText from "../components/MarqueeText";
import MoveTodoModal from "../components/MoveTodoModal";
import SwipeableRow from "../components/SwipeableRow";
import TodoRowSkeleton from "../components/TodoRowSkeleton";
import { useTheme } from "../context/ThemeContext";
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

interface TodoRowProps {
  todo: Todo;
  editMode: boolean;
  isShared: boolean;
  selected: boolean;
  canDrag: boolean;
  isActive: boolean;
  onDrag: () => void;
  onToggle: (todoId: number) => void;
  onToggleSelect: (todoId: number) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todoId: number) => void;
  onMove: (todo: Todo) => void;
  onConfirmNeeded: (confirm: { title: string; message: string; onConfirm: () => void }) => void;
}

/**
 * Riga estratta come componente a parte (memoizzato) perché con FlatList
 * `renderItem` deve restare stabile: prima era inline dentro il `.map()`
 * di una ScrollView, che montava tutti i todo insieme (anche 90+) e faceva
 * ripartire animazioni di layout/fade su ognuno ad ogni cambio di editMode,
 * causando il lag di diversi secondi.
 */
const TodoRow = memo(function TodoRow({
  todo,
  editMode,
  isShared,
  selected,
  canDrag,
  isActive,
  onDrag,
  onToggle,
  onToggleSelect,
  onEdit,
  onDelete,
  onMove,
  onConfirmNeeded,
}: TodoRowProps) {
  return (
    <DraggableTodoRow onDrag={onDrag} isActive={isActive} disabled={!canDrag || editMode}>
      <SwipeableRow
        disabled={editMode}
        onConfirmNeeded={onConfirmNeeded}
        leftAction={{
          icon: <Pencil size={20} color="#FFFFFF" />,
          backgroundClassName: "bg-yellow-400",
          onTrigger: () => onEdit(todo),
        }}
        rightAction={{
          icon: <Trash size={20} color="#FFFFFF" />,
          backgroundClassName: "bg-red-500",
          onTrigger: () => onDelete(todo.id),
          confirm: {
            title: "Elimina Todo",
            message: `Sei sicuro di voler eliminare "${todo.title}"?`,
          },
        }}
      >
        <View className="flex-row items-center rounded-xl border border-gray-200/50 bg-white/70 px-5 py-4 dark:border-white/20 dark:bg-gray-800/70">
          <View className="mr-4">
            {editMode ? (
              <AnimatedCheckbox
                checked={selected}
                onPress={() => onToggleSelect(todo.id)}
                checkedColor="#2563EB"
                uncheckedColor="#9CA3AF"
                size={26}
              />
            ) : (
              <AnimatedCheckbox
                onPress={() => onToggle(todo.id)}
                checkedColor={todo.completed ? "#9CA3AF" : "#16A34A"}
                size={26}
              />
            )}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <MarqueeText
                className={`text-xl font-semibold ${
                  todo.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"
                }`}
              >
                {todo.title}
              </MarqueeText>
              {todo.quantity && todo.unit && (
                <View className="rounded-full bg-blue-500/20 px-3 py-1">
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
              <Pressable onPress={() => onMove(todo)} className="rounded bg-purple-500/20 p-1.5">
                <ArrowRightLeft size={16} color="#7C3AED" />
              </Pressable>
              <Pressable onPress={() => onEdit(todo)} className="rounded bg-blue-500/20 p-1.5">
                <Pencil size={16} color="#2563EB" />
              </Pressable>
              <Pressable onPress={() => onDelete(todo.id)} className="rounded bg-red-500/20 p-1.5">
                <Trash size={16} color="#DC2626" />
              </Pressable>
            </View>
          )}
        </View>
      </SwipeableRow>
    </DraggableTodoRow>
  );
});

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
  const { listId, todosCount } = route.params;
  // Senza un hint (es. deep link diretto, non passando dalla Home) si mostra
  // un numero di skeleton di default invece di indovinare.
  const skeletonCount = todosCount && todosCount > 0 ? todosCount : 5;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [todos, setTodos] = useState<Todo[]>([]);
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState("blue");
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState<Array<{ full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortOption, setSortOption] = useState<TodoSortOption>("created");
  const sortMenuRef = useRef<BottomSheetModal>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Conferma condivisa per lo swipe-to-delete: un'unica modale invece di
  // una per riga (vedi commento in SwipeableRow.tsx sul lag causato da
  // <Modal> nativi multipli montati insieme in una FlatList).
  const [rowConfirm, setRowConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Transizione smooth del colore del FAB "Modifica" invece dello scatto
  // grigio/verde.
  const editFabProgress = useSharedValue(0);
  useEffect(() => {
    editFabProgress.value = withTiming(editMode ? 1 : 0, { duration: 200 });
  }, [editMode, editFabProgress]);
  const editFabStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(editFabProgress.value, [0, 1], ["#374151", "#16A34A"]),
  }));

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  // `autoFocus` non è affidabile quando il campo compare dentro una View
  // che sta animando l'ingresso (`entering`): il focus va chiesto a mano
  // dopo il mount, altrimenti la tastiera non si apre.
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

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

  // `data` è il nuovo array già riordinato da DraggableFlatList (calcolato
  // dal riordino live durante il drag): basta ri-derivare _originalIndex e
  // persistere, niente più splice manuale su from/to.
  const handleReorder = (data: Todo[]) => {
    const withIndex = data.map((t, i) => ({ ...t, _originalIndex: i }));
    setTodos(withIndex);
    reorderTodos(String(listId), withIndex.map((t) => t.id));
  };

  const handleSortSelect = (newSort: TodoSortOption) => {
    setSortOption(newSort);
    setTodos((prev) => sortTodos(prev, newSort));
    updateSortOrder(listId, newSort);
    sortMenuRef.current?.dismiss();
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

  // Header (nome lista, input nuova todo, barra ricerca) fisso in overlay
  // sopra la FlatList, sullo stesso pattern della Navbar in Home: uno spazio
  // scrolla dietro, l'header resta ancorato in cima.
  const stickyHeader = (
    <View
      className={`absolute left-0 right-0 top-0 z-50 px-6 ${HEADER_BG[listColor] ?? HEADER_BG.blue}`}
      style={{ paddingTop: 24 + insets.top }}
      onLayout={(e) => setStickyHeaderHeight(e.nativeEvent.layout.height)}
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
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(160)}
          className="mb-4 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <Search size={18} color="#6B7280" />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cerca todo..."
            className="flex-1 py-3 text-gray-900 dark:text-white"
          />
        </Animated.View>
      )}

      <View className="mb-4 flex-row items-center gap-2">
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
    </View>
  );

  // Altezza dell'header fisso, per far partire la FlatList sotto di esso
  // invece che farci scrollare il contenuto dietro (a differenza della
  // Navbar in Home, qui l'header ha sfondo pieno quindi deve spingere via
  // il contenuto, non sovrapporsi in trasparenza).
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);

  const listHeader = (
    <>
      {editMode && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(160)}
          className="mb-4 rounded-xl border border-gray-200/50 bg-white/60 p-4 dark:border-white/20 dark:bg-gray-800/60"
        >
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
        </Animated.View>
      )}

      {isLoading && (
        <View className="gap-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <TodoRowSkeleton key={i} />
          ))}
        </View>
      )}
    </>
  );

  return (
    <View className={`flex-1 ${HEADER_BG[listColor] ?? HEADER_BG.blue}`}>
      <DraggableFlatList
        data={isLoading ? [] : filteredTodos}
        keyExtractor={(todo) => String(todo.id)}
        onDragEnd={({ data }) => handleReorder(data)}
        contentContainerStyle={{
          padding: 24,
          paddingTop: stickyHeaderHeight + 16,
          paddingBottom: 140,
        }}
        // Di default windowSize=21 tiene montate molte più righe di quelle
        // visibili (fino a ~10 schermate di contenuto): con liste da 100+
        // todo questo vanifica in parte la virtualizzazione, perché ogni
        // cambio di editMode forza comunque il re-render di decine di righe
        // montate ma fuori schermo. Valori più stretti limitano il lavoro a
        // ciò che serve davvero per uno scroll fluido.
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={30}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="mt-8 items-center">
              <Text className="text-center text-gray-600 dark:text-gray-300">
                {searchQuery.trim() ? `Nessun risultato per "${searchQuery}"` : "Nessuna ToDo"}
              </Text>
            </View>
          )
        }
        renderItem={({ item: todo, drag, isActive }) => (
          <TodoRow
            todo={todo}
            editMode={editMode}
            isShared={isShared}
            selected={selectedIds.includes(todo.id)}
            canDrag={canDrag}
            isActive={isActive}
            onDrag={drag}
            onToggle={handleToggle}
            onToggleSelect={(todoId) =>
              setSelectedIds((ids) =>
                ids.includes(todoId) ? ids.filter((i) => i !== todoId) : [...ids, todoId]
              )
            }
            onEdit={setEditedTodo}
            onDelete={handleDelete}
            onMove={(todo) => {
              setTodoToMove(todo);
              setShowMoveModal(true);
            }}
            onConfirmNeeded={setRowConfirm}
          />
        )}
      />

      {stickyHeader}

      {/* Barra azioni flottante in basso */}
      <View className="absolute bottom-6 left-6 right-6 flex-row justify-between">
        <Pressable onPress={() => setEditMode((prev) => !prev)} className="rounded-full shadow-lg">
          <Animated.View style={[editFabStyle, { borderRadius: 999, padding: 16 }]}>
            <Pencil size={22} color="#FFFFFF" />
          </Animated.View>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setSearchOpen((prev) => !prev)}
            className="rounded-full bg-gray-700 p-4 shadow-lg"
          >
            <Search size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => sortMenuRef.current?.present()}
            className="rounded-full bg-yellow-500 p-4 shadow-lg"
          >
            <ListFilter size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Modale aggiungi todo */}
      <BubbleModal
        visible={showQuantityModal}
        onRequestClose={() => {
          setShowQuantityModal(false);
          setQuantityValue("");
          setUnitValue("");
        }}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
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
      </BubbleModal>

      {/* Modale modifica todo */}
      <BubbleModal
        visible={editedTodo !== null}
        onRequestClose={() => setEditedTodo(null)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
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
      </BubbleModal>

      {/* Conferma elimina da swipe: unica modale condivisa per tutte le righe */}
      <BubbleModal
        visible={rowConfirm !== null}
        onRequestClose={() => setRowConfirm(null)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {rowConfirm?.title}
          </Text>
          <Text className="mb-6 text-gray-600 dark:text-gray-300">{rowConfirm?.message}</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setRowConfirm(null)}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
            >
              <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                rowConfirm?.onConfirm();
                setRowConfirm(null);
              }}
              className="flex-1 rounded-lg bg-red-500 py-2.5"
            >
              <Text className="text-center font-medium text-white">Elimina</Text>
            </Pressable>
          </View>
        </View>
      </BubbleModal>

      {/* Conferma elimina multipla */}
      <BubbleModal
        visible={showBulkConfirm}
        onRequestClose={() => setShowBulkConfirm(false)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
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
      </BubbleModal>

      {/* Menu di ordinamento: stesso BottomSheetModal nativo del filtro
          categoria in Home, non più una BubbleModal custom. */}
      <BottomSheetModal
        ref={sortMenuRef}
        enableDynamicSizing
        maxDynamicContentSize={Dimensions.get("window").height - insets.top - 40}
        backgroundComponent={GlassBottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#4B5563" : "#D1D5DB" }}
        backdropComponent={(props) => (
          <GlassBottomSheetBackdrop {...props} onClose={() => sortMenuRef.current?.dismiss()} />
        )}
      >
        <BottomSheetScrollView
          style={{ paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <Text className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">
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
              className={`mb-2 rounded-2xl px-6 py-5 ${
                sortOption === value ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <Text
                className={`text-center text-lg font-medium ${
                  sortOption === value ? "text-white" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <MoveTodoModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        todoTitle={todoToMove?.title ?? ""}
        currentListId={listId}
        currentListName={listName}
        allLists={allLists}
        onMove={handleMoveTodo}
      />
    </View>
  );
}
