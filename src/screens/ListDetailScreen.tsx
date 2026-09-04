import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckSquare,
  GripVertical,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Square,
  Trash,
  Users,
  X,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  InteractionManager,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchAllLists,
  fetchListDetails,
  moveTodo,
  reorderTodos,
  updateSortOrder,
  type ListDetailsResponse,
} from "../api/todos";
import { getListShares } from "../api/sharing";
import AnimatedCheckbox from "../components/AnimatedCheckbox";
import BubbleModal from "../components/BubbleModal";
import DraggableTodoRow from "../components/DraggableTodoRow";
import BubbleTapEffect, { type BubbleTapEffectRef } from "../components/BubbleTapEffect";
import GlassSurface from "../components/GlassSurface";
import { GlassBottomSheetBackdrop, GlassBottomSheetBackground } from "../components/GlassBottomSheet";
import MarqueeText from "../components/MarqueeText";
import MoveTodoModal from "../components/MoveTodoModal";
import ParticleBurst, { type ParticleBurstRef } from "../components/ParticleBurst";
import SwipeableRow from "../components/SwipeableRow";
import TodoRowSkeleton from "../components/TodoRowSkeleton";
import { useAlert } from "../context/AlertContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import {
  enqueueCreateTodo,
  enqueueDeleteTodo,
  enqueueToggleTodo,
  enqueueUpdateTodo,
  nextTempId,
  onTempIdResolved,
  processQueue,
} from "../services/syncQueue";
import {
  playCreateFeedback,
  playDeleteFeedback,
  playTodoCompleteFeedback,
  playTodoUncompleteFeedback,
} from "../services/feedback";
import {
  getListTodosCache,
  getListTodosCacheSync,
  setListTodosCache,
  updateListTodosCacheTodos,
} from "../services/storage";
import type { Todo, TodoSortOption } from "../types/todo";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;

const HEADER_BG: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950",
  green: "bg-green-50 dark:bg-green-950",
  yellow: "bg-yellow-50 dark:bg-yellow-950",
  red: "bg-red-50 dark:bg-red-950",
  purple: "bg-purple-50 dark:bg-purple-950",
};

/** Colore del vetro del bottone "+": tintColor nativo di GlassSurface
 * (non può leggere una className Tailwind, serve l'hex diretto). */
const ADD_BUTTON_HEX: Record<string, string> = {
  blue: "#2563EB",
  green: "#16A34A",
  yellow: "#EAB308",
  red: "#DC2626",
  purple: "#9333EA",
};

interface TodoRowProps {
  todo: Todo;
  editMode: boolean;
  isShared: boolean;
  selected: boolean;
  canDrag: boolean;
  isActive: boolean;
  /** Indice nella lista visibile: usato solo per lo stagger del flip 3D
   * della checkbox quando editMode cambia (una riga dopo l'altra). */
  index: number;
  /** Termine di ricerca corrente, per evidenziare il match nel titolo. */
  searchQuery: string;
  onDrag: () => void;
  onToggle: (todoId: number, event: GestureResponderEvent) => void;
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
  index,
  searchQuery,
  onDrag,
  onToggle,
  onToggleSelect,
  onEdit,
  onDelete,
  onMove,
  onConfirmNeeded,
}: TodoRowProps) {
  return (
    <DraggableTodoRow isActive={isActive}>
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
            <AnimatedCheckbox
              size={26}
              checked={todo.completed}
              checkedColor="#16A34A"
              uncheckedColor="#BFBFC0"
              settledColor="#9CA3AF"
              onPress={(event) => onToggle(todo.id, event)}
              editMode={editMode}
              editChecked={selected}
              editCheckedColor="#2563EB"
              editUncheckedColor="#9CA3AF"
              onEditPress={() => onToggleSelect(todo.id)}
              flipDelay={Math.min(index * 15, 300)}
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <MarqueeText
                className={`text-xl font-semibold ${
                  todo.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"
                }`}
                highlight={searchQuery}
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
            {todo.description && (
              <Text
                numberOfLines={2}
                className="mt-1 text-sm text-gray-500 dark:text-gray-400"
              >
                {todo.description}
              </Text>
            )}
            {isShared && todo.created_by && (
              <Text className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                Aggiunta da {todo.created_by.full_name}
              </Text>
            )}
          </View>

          {canDrag && !editMode && (
            <Pressable onLongPress={onDrag} disabled={isActive} className="ml-2 p-1.5">
              <GripVertical size={18} color="#9CA3AF" />
            </Pressable>
          )}

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
  const { listId, todosCount, initialSearch } = route.params;
  // `todosCount` distingue "assente" (deep link diretto, senza passare dalla
  // Home: qui si indovina un default) da "0" (lista vuota, nessuno skeleton
  // da mostrare) — `todosCount ?? 5` invece di un check `&&` che tratterebbe
  // 0 come falsy e mostrerebbe 5 skeleton finti per una lista vuota.
  const skeletonCount = todosCount ?? 5;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { showAlert } = useAlert();

  // Lazy initializer: letto UNA volta, in modo sincrono, dallo specchio in
  // memoria della cache (popolato dal prefetch all'avvio/login o da una
  // visita precedente a questa stessa lista in questa sessione). Serve a
  // evitare che ogni volta che si esce e si rientra in una lista già vista
  // (la schermata viene smontata e rimontata da zero ad ogni push/pop nello
  // stack) compaia per un frame lo skeleton in attesa della lettura async
  // di AsyncStorage — qui i dati sono già pronti al primissimo render.
  //
  // Il map+sort dei todo, però, NON va fatto qui nel lazy initializer: con
  // liste grandi (100+ todo) è abbastanza pesante da bloccare il thread JS
  // proprio nel frame in cui la transizione nativa di ingresso (Home ->
  // ListDetail) sta animando, facendola percepire come uno scatto secco
  // invece che fluida. `todos` parte vuoto ed è popolato subito dopo, in un
  // effect che gira DOPO il commit del primo render (quindi dopo che
  // l'animazione è già partita) — vedi useEffect qui sotto.
  const initialCache = getListTodosCacheSync<ListDetailsResponse>(listId);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [listName, setListName] = useState(initialCache?.name ?? "");
  const [listColor, setListColor] = useState(initialCache?.color || "blue");
  const [isShared, setIsShared] = useState(initialCache?.is_shared || false);
  const [sharedWith, setSharedWith] = useState<Array<{ full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(!initialCache);

  const [sortOption, setSortOption] = useState<TodoSortOption>(
    initialCache?.sort_order === "alphabetical" || initialCache?.sort_order === "completed"
      ? initialCache.sort_order
      : "created"
  );
  const sortMenuRef = useRef<BottomSheetModal>(null);

  const [editMode, setEditMode] = useState(false);
  const editBubbleRef = useRef<BubbleTapEffectRef>(null);
  const particleBurstRef = useRef<ParticleBurstRef>(null);
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

  const [searchOpen, setSearchOpen] = useState(!!initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
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

  // Col back gesture/hardware, se la ricerca è aperta va chiusa prima
  // (tastiera compresa) invece di uscire subito dalla schermata: un secondo
  // back, a ricerca già chiusa, torna alla Home come di consueto.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!searchOpen) return;
      e.preventDefault();
      Keyboard.dismiss();
      setSearchOpen(false);
      setSearchQuery("");
    });
    return unsubscribe;
  }, [navigation, searchOpen]);

  // Modale nuova/edit todo
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [title, setTitle] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null);

  // Modale sposta
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [todoToMove, setTodoToMove] = useState<Todo | null>(null);
  const [allLists, setAllLists] = useState<{ id: number; name: string; color: string }[]>([]);
  // Modale sposta multiplo, per l'azione bulk dal selettore in edit mode.
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);

  // `silent`: quando la cache locale ha già mostrato le todo, la fetch di
  // aggiornamento gira dietro le quinte senza far ricomparire lo skeleton.
  const fetchTodos = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
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
        setListTodosCache(listId, data);

        getListShares(listId)
          .then((shares) => setSharedWith(shares.map((s) => ({ full_name: s.full_name }))))
          .catch(() => setSharedWith([]));
      } catch (err) {
        console.error("Errore nel caricamento della lista:", err);
        if (!silent) showAlert("error", "Impossibile caricare la lista. Controlla la connessione.");
      } finally {
        setIsLoading(false);
      }
    },
    [listId, showAlert]
  );

  const loadAllLists = useCallback(async () => {
    try {
      const lists = await fetchAllLists();
      if (Array.isArray(lists)) setAllLists(lists);
    } catch (err) {
      console.error("Errore caricamento liste per lo spostamento:", err);
      showAlert("error", "Impossibile caricare le altre liste.");
    }
  }, [showAlert]);

  useEffect(() => {
    // Il caso cache-hit ha nome/colore/is_shared già impostati sincronamente
    // dai lazy initializer sopra — qui resta solo popolare l'array `todos`
    // (il map+sort potenzialmente pesante), fatto apposta DENTRO
    // `runAfterInteractions`: aspetta che la transizione nativa di ingresso
    // sia terminata prima di fare quel lavoro, così non le ruba frame e la
    // navigazione resta fluida anche su liste da 100+ todo.
    const applyTodos = (cached: ListDetailsResponse) => {
      InteractionManager.runAfterInteractions(() => {
        const todosWithIndex: Todo[] = cached.todos.map((t: Todo, index: number) => ({
          ...t,
          _originalIndex: t._originalIndex ?? index,
        }));
        const effectiveSort: TodoSortOption =
          cached.sort_order === "alphabetical" || cached.sort_order === "completed"
            ? cached.sort_order
            : "created";
        setSortOption(effectiveSort);
        setTodos(sortTodos(todosWithIndex, effectiveSort));
      });
    };

    const load = async () => {
      if (initialCache) {
        applyTodos(initialCache);
        fetchTodos(true);
        return;
      }
      const cached = await getListTodosCache<ListDetailsResponse>(listId);
      if (cached) {
        applyTodos(cached);
        setListName(cached.name);
        setListColor(cached.color || "blue");
        setIsShared(cached.is_shared || false);
        setIsLoading(false);
      }
      fetchTodos(!!cached);
    };
    load();
    loadAllLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTodos, loadAllLists, listId]);

  // Un todo creato offline vive con un ID temporaneo (negativo) finché la
  // sua `create` in coda non viene confermata dal server: quando succede,
  // syncQueue notifica qui il nuovo ID reale, altrimenti la UI (e ogni
  // azione successiva su quel todo) resterebbe agganciata per sempre a un
  // ID che il backend non conosce.
  useEffect(() => {
    return onTempIdResolved((tempId, realId) => {
      setTodos((prev) => {
        const updated = prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t));
        updateListTodosCacheTodos(listId, updated);
        return updated;
      });
    });
  }, [listId]);

  const handleToggle = (todoId: number, event: GestureResponderEvent) => {
    const wasCompleted = todos.find((t) => t.id === todoId)?.completed ?? false;
    if (wasCompleted) {
      playTodoUncompleteFeedback();
    } else {
      playTodoCompleteFeedback();
      const { pageX, pageY } = event.nativeEvent;
      particleBurstRef.current?.trigger(pageX, pageY);
    }
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t));
      const sorted = sortOption === "completed" ? sortTodos(updated, "completed") : updated;
      updateListTodosCacheTodos(listId, sorted);
      return sorted;
    });
    enqueueToggleTodo(todoId).then(processQueue);
  };

  const handleDelete = (todoId: number) => {
    playDeleteFeedback();
    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== todoId);
      updateListTodosCacheTodos(listId, updated);
      return updated;
    });
    enqueueDeleteTodo(todoId).then(processQueue);
  };

  const handleCreateTodo = async () => {
    if (!title.trim()) {
      showAlert("warning", "Inserisci il nome della task.");
      return;
    }

    let qty: number | null = null;
    let unit: string | null = null;
    if (quantityValue && unitValue.trim()) {
      qty = parseInt(quantityValue, 10);
      if (Number.isNaN(qty) || qty <= 0) {
        showAlert("warning", "Inserisci una quantità valida.");
        return;
      }
      unit = unitValue;
    } else if (quantityValue || unitValue.trim()) {
      showAlert("warning", "Inserisci sia la quantità che l'unità di misura.");
      return;
    }

    const description = descriptionValue.trim() || null;
    const tempId = await nextTempId();
    const optimisticTodo: Todo = {
      id: tempId,
      title,
      completed: false,
      quantity: qty,
      unit,
      description,
      _originalIndex: -1,
    };

    setTodos((prev) => {
      const shifted = prev.map((t) => ({ ...t, _originalIndex: (t._originalIndex ?? 0) + 1 }));
      const updated = [optimisticTodo, ...shifted];
      updateListTodosCacheTodos(listId, updated);
      return updated;
    });

    enqueueCreateTodo({ tempId, listId, title, quantity: qty, unit, description }).then(processQueue);
    playCreateFeedback();

    setTitle("");
    setQuantityValue("");
    setUnitValue("");
    setDescriptionValue("");
    setShowQuantityModal(false);
  };

  const handleEditTodo = () => {
    if (!editedTodo) return;
    setTodos((prev) => {
      const updated = prev.map((t) =>
        t.id === editedTodo.id
          ? {
              ...t,
              title: editedTodo.title,
              quantity: editedTodo.quantity,
              unit: editedTodo.unit,
              description: editedTodo.description,
            }
          : t
      );
      const sorted = sortOption === "alphabetical" ? sortTodos(updated, "alphabetical") : updated;
      updateListTodosCacheTodos(listId, sorted);
      return sorted;
    });
    enqueueUpdateTodo({
      todoId: editedTodo.id,
      title: editedTodo.title,
      quantity: editedTodo.quantity,
      unit: editedTodo.unit,
      description: editedTodo.description,
    }).then(processQueue);
    setEditedTodo(null);
  };

  const handleMoveTodo = (newListId: number) => {
    if (!todoToMove) return;
    setTodos((prev) => prev.filter((t) => t.id !== todoToMove.id));
    setShowMoveModal(false);
    setTodoToMove(null);
    moveTodo(todoToMove.id, newListId);
  };

  const handleBulkMove = (newListId: number) => {
    setTodos((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    selectedIds.forEach((id) => moveTodo(id, newListId));
    setSelectedIds([]);
    setShowBulkMoveModal(false);
  };

  // Se anche una sola delle selezionate è ancora da fare, "completa tutte";
  // altrimenti (sono già tutte completate) "riapri tutte" — stesso criterio
  // usato per la spunta "seleziona tutte" più sotto.
  const bulkToggleTarget = selectedIds.some(
    (id) => !todos.find((t) => t.id === id)?.completed
  );

  const handleBulkToggleComplete = () => {
    const idsToToggle = selectedIds.filter((id) => {
      const current = todos.find((t) => t.id === id);
      return current && current.completed !== bulkToggleTarget;
    });
    if (bulkToggleTarget) playTodoCompleteFeedback();
    else playTodoUncompleteFeedback();
    setTodos((prev) => {
      const updated = prev.map((t) =>
        selectedIds.includes(t.id) ? { ...t, completed: bulkToggleTarget } : t
      );
      updateListTodosCacheTodos(listId, updated);
      return updated;
    });
    Promise.all(idsToToggle.map((id) => enqueueToggleTodo(id))).then(processQueue);
    setSelectedIds([]);
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
          className="overflow-hidden rounded-xl border border-gray-200/50 dark:border-white/20"
        >
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={80}
          />
          <View className="flex-row items-center gap-2 px-4 py-3">
            <ArrowLeft size={20} color={isDark ? "#E5E7EB" : "#374151"} />
          </View>
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
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setSearchOpen(false);
              setSearchQuery("");
            }}
            hitSlop={8}
          >
            <X size={18} color="#6B7280" />
          </Pressable>
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
          className="overflow-hidden rounded-xl"
        >
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={80}
          />
          <View
            className="p-3.5"
            style={{ backgroundColor: ADD_BUTTON_HEX[listColor] ?? ADD_BUTTON_HEX.blue, opacity: 0.55 }}
          >
            <Plus size={20} color="#FFFFFF" />
          </View>
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
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              className="mt-3 flex-row gap-2"
            >
              <Pressable
                onPress={handleBulkToggleComplete}
                className="flex-row items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2"
              >
                <CheckSquare size={16} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">
                  {bulkToggleTarget ? "Completa" : "Riapri"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowBulkMoveModal(true)}
                className="flex-row items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2"
              >
                <ArrowRightLeft size={16} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">Sposta</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowBulkConfirm(true)}
                className="flex-row items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2"
              >
                <Trash size={16} color="#FFFFFF" />
                <Text className="text-sm font-medium text-white">
                  Elimina ({selectedIds.length})
                </Text>
              </Pressable>
            </Animated.View>
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
        // Ogni riga (RowItem) è React.memo internamente alla libreria e non
        // sa che filteredTodos è cambiato solo perché cambia `data`: senza
        // extraData, cancellare una lettera nella ricerca lasciava la lista
        // visivamente ferma al filtro precedente finché qualcos'altro non
        // forzava un re-render.
        extraData={searchQuery}
        // Default della libreria è 0 (nessuna soglia): il Pan interno della
        // FlatList (sempre attivo su tutta l'area, per gestire il drag una
        // volta iniziato con onLongPress) competeva con lo swipe orizzontale
        // di ogni riga per il riconoscimento del gesto su OGNI tocco,
        // risolvendosi in modo non deterministico — causa dello swipe che
        // "a volte non parte" in modo apparentemente casuale. Una piccola
        // soglia lascia vincere lo swipe orizzontale sui movimenti laterali.
        activationDistance={12}
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
        renderItem={({ item: todo, drag, isActive, getIndex }) => (
          <TodoRow
            todo={todo}
            editMode={editMode}
            isShared={isShared}
            selected={selectedIds.includes(todo.id)}
            canDrag={canDrag}
            isActive={isActive}
            index={getIndex() ?? 0}
            searchQuery={searchQuery}
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

      {/* Barra azioni flottante in basso: vero vetro puro (mai tintColor sul
          glass stesso: lo appiattisce, perde la distorsione) con una tinta
          colorata sopra a opacità moderata, esattamente come AnimatedAlert
          e i menu di Home — quello è il pattern che dà l'effetto vetro
          marcato, non il tintColor nativo del GlassView. */}
      <View
        className="absolute left-6 right-6 flex-row justify-between"
        style={{ bottom: insets.bottom + 24 }}
      >
        <Pressable
          onPress={() => {
            editBubbleRef.current?.trigger();
            setEditMode((prev) => !prev);
          }}
          className="rounded-full shadow-lg"
        >
          <View className="overflow-hidden rounded-full">
            <GlassSurface
              style={StyleSheet.absoluteFill}
              colorScheme={isDark ? "dark" : "light"}
              tint={isDark ? "dark" : "light"}
              intensity={80}
            />
            <View
              style={{ padding: 16, backgroundColor: editMode ? "#16A34A" : "#374151", opacity: 0.55 }}
            >
              <Pencil size={22} color="#FFFFFF" />
            </View>
            <BubbleTapEffect ref={editBubbleRef} color="#FFFFFF" />
          </View>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable onPress={() => setSearchOpen((prev) => !prev)} className="rounded-full shadow-lg">
            <View className="overflow-hidden rounded-full">
              <GlassSurface
                style={StyleSheet.absoluteFill}
                colorScheme={isDark ? "dark" : "light"}
                tint={isDark ? "dark" : "light"}
                intensity={80}
              />
              <View style={{ padding: 16, backgroundColor: "#374151", opacity: 0.55 }}>
                <Search size={22} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
          <Pressable onPress={() => sortMenuRef.current?.present()} className="rounded-full shadow-lg">
            <View className="overflow-hidden rounded-full">
              <GlassSurface
                style={StyleSheet.absoluteFill}
                colorScheme={isDark ? "dark" : "light"}
                tint={isDark ? "dark" : "light"}
                intensity={80}
              />
              <View style={{ padding: 16, backgroundColor: "#EAB308", opacity: 0.55 }}>
                <ListFilter size={22} color="#FFFFFF" />
              </View>
            </View>
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
          setDescriptionValue("");
        }}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
          <TextInput
            value={descriptionValue}
            onChangeText={setDescriptionValue}
            placeholder="Descrizione (facoltativa)"
            multiline
            className="mb-3 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
            style={{ minHeight: 44, textAlignVertical: "top" }}
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
                setDescriptionValue("");
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
              <TextInput
                value={editedTodo.description ?? ""}
                onChangeText={(text) =>
                  setEditedTodo({ ...editedTodo, description: text || null })
                }
                placeholder="Descrizione (facoltativa)"
                multiline
                className="mb-3 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
                style={{ minHeight: 44, textAlignVertical: "top" }}
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
                playDeleteFeedback();
                setTodos((prev) => {
                  const updated = prev.filter((t) => !selectedIds.includes(t.id));
                  updateListTodosCacheTodos(listId, updated);
                  return updated;
                });
                Promise.all(selectedIds.map((id) => enqueueDeleteTodo(id))).then(processQueue);
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
              className={`mb-2 rounded-2xl android:rounded-xl px-6 py-5 ${
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

      <MoveTodoModal
        isOpen={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        todoTitle={`${selectedIds.length} ToDo selezionate`}
        currentListId={listId}
        currentListName={listName}
        allLists={allLists}
        onMove={handleBulkMove}
      />

      <ParticleBurst ref={particleBurstRef} />
    </View>
  );
}
