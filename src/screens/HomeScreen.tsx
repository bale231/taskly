import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  archiveList,
  createCategory,
  createList,
  deleteList,
  editCategory,
  editList,
  fetchAllCategories,
  fetchAllLists,
  fetchCategorySortAlpha,
  fetchListsSortOrder,
  getSelectedCategory,
  saveSelectedCategory,
  unarchiveList,
  updateListsSortOrder,
} from "../api/todos";
import { getCurrentUserJWT, logout } from "../api/auth";
import AnimatedAlert from "../components/AnimatedAlert";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import BubbleModal from "../components/BubbleModal";
import GlassSurface from "../components/GlassSurface";
import { GlassBottomSheetBackdrop, GlassBottomSheetBackground } from "../components/GlassBottomSheet";
import ListCardSkeleton from "../components/ListCardSkeleton";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import ShareListModal from "../components/ShareListModal";
import SwipeableRow from "../components/SwipeableRow";
import WiggleView from "../components/WiggleView";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { getLastListsCount, setLastListsCount } from "../services/storage";
import type { Category, ListSortOption, TodoList } from "../types/todo";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type Alert = { type: "success" | "error" | "warning"; message: string } | null;

/** Sfondo della card in base al colore lista, sostituisce colorClasses della webapp. */
const CARD_BORDER: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-500/10",
  green: "border-l-green-500 bg-green-500/10",
  yellow: "border-l-yellow-500 bg-yellow-500/10",
  red: "border-l-red-500 bg-red-500/10",
  purple: "border-l-purple-500 bg-purple-500/10",
};

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const categoryPickerRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [user, setUser] = useState<{ id: number } | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sortOption, setSortOption] = useState<ListSortOption>("created");
  const [categorySortAlpha, setCategorySortAlpha] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const [isLoadingLists, setIsLoadingLists] = useState(true);
  // Quante ListCardSkeleton mostrare mentre isLoadingLists è true: il numero
  // di liste dell'ultimo caricamento riuscito (persistito), così lo skeleton
  // non è mai un numero a caso di placeholder scollegato dal contenuto reale.
  const [skeletonCount, setSkeletonCount] = useState(3);
  const [alert, setAlert] = useState<Alert>(null);

  // Modale lista
  const [showForm, setShowForm] = useState(false);
  const [editListId, setEditListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
  const [newListCategory, setNewListCategory] = useState<number | null>(null);

  // Modale categoria
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState("");

  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<number | null>(null);
  const [shareListTarget, setShareListTarget] = useState<TodoList | null>(null);

  const fetchLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const data = await fetchAllLists();
      if (Array.isArray(data)) {
        setLists(data);
        if (data.length > 0) setLastListsCount(data.length);
      }
    } catch (err) {
      console.error("Errore nel caricamento liste:", err);
    } finally {
      setIsLoadingLists(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await fetchAllCategories();
      if (Array.isArray(data)) setCategories(data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    getLastListsCount().then((n) => {
      if (n) setSkeletonCount(n);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      const resUser = await getCurrentUserJWT();
      if (!resUser) {
        navigation.replace("Login");
        return;
      }
      setUser(resUser);

      try {
        const [order, alpha] = await Promise.all([
          fetchListsSortOrder(),
          fetchCategorySortAlpha(),
        ]);
        setSortOption(order);
        setCategorySortAlpha(alpha);
      } catch (err) {
        console.error("Impossibile caricare preferenze:", err);
      }

      const [, categoriesData] = await Promise.all([fetchLists(), fetchCategories()]);

      try {
        const result = await getSelectedCategory();
        if (result && result.selected_category !== null && result.selected_category !== undefined) {
          const cat = categoriesData.find((c) => c.id === result.selected_category);
          if (cat) setSelectedCategory(cat);
        }
      } catch (err) {
        console.warn("Impossibile caricare la categoria selezionata:", err);
      }
    };
    load();
  }, [navigation, fetchLists, fetchCategories]);

  const handleSortChange = async (newOpt: ListSortOption) => {
    setSortOption(newOpt);
    const messages: Record<ListSortOption, string> = {
      created: "Ordinamento: Più recente",
      alphabetical: "Ordinamento: Alfabetico",
      complete: "Ordinamento: Per completezza",
    };
    setAlert({ type: "success", message: messages[newOpt] });
    updateListsSortOrder(newOpt);
  };

  const handleCreateOrEditList = async () => {
    if (!newListName.trim()) {
      setAlert({ type: "warning", message: "Inserisci un nome per la lista" });
      return;
    }

    if (editListId !== null) {
      setLists((prev) =>
        prev.map((list) =>
          list.id === editListId
            ? {
                ...list,
                name: newListName,
                color: newListColor,
                category: newListCategory
                  ? categories.find((c) => c.id === newListCategory) || null
                  : null,
              }
            : list
        )
      );
      setAlert({ type: "success", message: "Lista modificata con successo!" });
      editList(editListId, newListName, newListColor, newListCategory);
    } else {
      const created = await createList(newListName, newListColor, newListCategory);
      if (created?.id) {
        setLists((prev) => [...prev, created as TodoList]);
        setAlert({ type: "success", message: "Lista creata con successo!" });
      }
    }

    setShowForm(false);
    setEditListId(null);
    setNewListName("");
    setNewListColor("blue");
    setNewListCategory(null);
  };

  const handleEditList = (list: TodoList) => {
    setEditListId(list.id);
    setNewListName(list.name);
    setNewListColor(list.color);
    setNewListCategory(list.category?.id ?? null);
    setShowForm(true);
  };

  const handleDeleteList = (id: number) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
    setAlert({ type: "success", message: "Lista eliminata" });
    deleteList(id);
  };

  const handleArchiveList = (id: number, isCurrentlyArchived: boolean) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === id ? { ...list, is_archived: !isCurrentlyArchived } : list
      )
    );
    setAlert({
      type: "success",
      message: isCurrentlyArchived ? "Lista ripristinata" : "Lista archiviata",
    });
    if (isCurrentlyArchived) unarchiveList(id);
    else archiveList(id);
  };

  const handleCreateOrEditCat = async () => {
    if (!catName.trim()) {
      setAlert({ type: "warning", message: "Inserisci un nome per la categoria" });
      return;
    }

    if (editCatId) {
      setCategories((prev) =>
        prev.map((cat) => (cat.id === editCatId ? { ...cat, name: catName } : cat))
      );
      setAlert({ type: "success", message: "Categoria modificata!" });
      editCategory(editCatId, catName);
    } else {
      const created = await createCategory(catName);
      if (created?.id) {
        setCategories((prev) => [...prev, created as Category]);
        setAlert({ type: "success", message: "Categoria creata!" });
      }
    }

    setShowCatForm(false);
    setEditCatId(null);
    setCatName("");
  };

  const handleSelectCategory = async (cat: Category | null) => {
    setSelectedCategory(cat);
    categoryPickerRef.current?.dismiss();
    try {
      await saveSelectedCategory(cat ? cat.id : null);
    } catch (err) {
      console.error("Errore salvataggio categoria selezionata:", err);
    }
    setAlert({
      type: "success",
      message: cat ? `Filtro: ${cat.name}` : "Filtro: Tutte le categorie",
    });
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  // --- Filtri e ordinamento ---
  const searchFilteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    const query = searchQuery.toLowerCase().trim();
    return lists.filter((list) => {
      if (list.name?.toLowerCase().includes(query)) return true;
      return list.todos?.some((todo) =>
        (todo.text || todo.title || "").toLowerCase().includes(query)
      );
    });
  }, [lists, searchQuery]);

  const categoryFilteredLists = selectedCategory
    ? searchFilteredLists.filter((l) => l.category?.id === selectedCategory.id)
    : searchFilteredLists;

  const filteredLists = categoryFilteredLists.filter((l) =>
    showArchived ? l.is_archived : !l.is_archived
  );

  const archivedCount = categoryFilteredLists.filter((l) => l.is_archived).length;

  const sortedLists = useMemo(() => {
    return [...filteredLists].sort((a, b) => {
      if (sortOption === "alphabetical") return a.name.localeCompare(b.name);
      if (sortOption === "complete") {
        const aComplete = a.todos.filter((t) => t.completed).length / (a.todos.length || 1);
        const bComplete = b.todos.filter((t) => t.completed).length / (b.todos.length || 1);
        return aComplete - bComplete;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredLists, sortOption]);

  const groupedLists = useMemo(() => {
    const groups: { categoryName: string; lists: TodoList[] }[] = [];

    if (!selectedCategory) {
      const uncategorized = sortedLists.filter((l) => !l.category);
      if (uncategorized.length > 0) {
        groups.push({ categoryName: "Senza categoria", lists: uncategorized });
      }

      const categoriesWithLists = categories
        .map((cat) => ({
          categoryName: cat.name,
          lists: sortedLists.filter((l) => l.category?.id === cat.id),
        }))
        .filter((g) => g.lists.length > 0);

      if (categorySortAlpha) {
        categoriesWithLists.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      }

      groups.push(...categoriesWithLists);
    } else {
      groups.push({ categoryName: selectedCategory.name, lists: sortedLists });
    }

    return groups;
  }, [sortedLists, categories, selectedCategory, categorySortAlpha]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Chiude la ricerca al tap in un punto qualsiasi dello schermo, non solo
  // sulla X: un Pressable esterno che avvolge tutto il contenuto, il cui
  // onPress scatta solo quando il tocco non è già stato gestito da un
  // Pressable/gesture più interno (card, bottoni, ecc.) — comportamento di
  // default in RN, non serve stopPropagation esplicito.
  const closeSearchOnOutsideTap = searchOpen
    ? () => {
        setSearchOpen(false);
        setSearchQuery("");
      }
    : undefined;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900">
      <Navbar scrollY={scrollY} />

      <AnimatedAlert alert={alert} onClose={() => setAlert(null)} />

      <Pressable className="flex-1" onPress={closeSearchOnOutsideTap}>
      <Animated.ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{
          padding: 24,
          paddingTop: NAVBAR_BASE_HEIGHT + insets.top + 24,
          paddingBottom: 120,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
              placeholder="Cerca liste o todo..."
              className="flex-1 py-3 text-gray-900 dark:text-white"
            />
            <Pressable
              onPress={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </Animated.View>
        )}

        {/* Azioni rapide: amici */}
        <View className="mb-4 flex-row gap-3">
          <Pressable
            onPress={() => navigation.navigate("FindUsers")}
            accessibilityLabel="Trova Utenti"
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-blue-500"
          >
            <Users size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("FriendRequests")}
            accessibilityLabel="Richieste di Amicizia"
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-green-500"
          >
            <UserPlus size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Friends")}
            accessibilityLabel="I Miei Amici"
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-purple-500"
          >
            <UserCheck size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Azioni rapide: categoria, archivio, cerca */}
        <View className="mb-4 flex-row gap-3">
          <Pressable
            onPress={() => {
              setShowCatForm(true);
              setEditCatId(null);
              setCatName("");
            }}
            accessibilityLabel="Nuova Categoria"
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-yellow-500"
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>

          <AnimatedPressable
            active={showArchived}
            onPress={() => setShowArchived((prev) => !prev)}
            accessibilityLabel={showArchived ? "Mostra attive" : "Mostra archivio"}
            className={`flex-1 h-14 items-center justify-center rounded-2xl ${
              showArchived ? "bg-orange-500" : "bg-gray-500"
            }`}
          >
            {showArchived ? (
              <ArchiveRestore size={22} color="#FFFFFF" />
            ) : (
              <Archive size={22} color="#FFFFFF" />
            )}
            {archivedCount > 0 && !showArchived && (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-orange-600">
                <Text className="text-xs text-white">{archivedCount}</Text>
              </View>
            )}
          </AnimatedPressable>

          {!searchOpen && (
            <Pressable
              onPress={() => setSearchOpen(true)}
              accessibilityLabel="Cerca"
              className="flex-1 h-14 items-center justify-center rounded-2xl bg-gray-600"
            >
              <Search size={22} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {/* Selettore categoria */}
        <View className="mb-6 flex-row gap-2">
          <Pressable
            onPress={() => categoryPickerRef.current?.present()}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <Text className="font-medium text-gray-800 dark:text-gray-200">
              {selectedCategory ? selectedCategory.name : "Tutte le categorie"}
            </Text>
          </Pressable>

          {selectedCategory && (
            <Pressable
              onPress={() => {
                setEditCatId(selectedCategory.id);
                setCatName(selectedCategory.name);
                setShowCatForm(true);
              }}
              className="items-center justify-center rounded-xl border border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <Pencil size={18} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {isLoadingLists ? (
          <View className="gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ListCardSkeleton key={i} />
            ))}
          </View>
        ) : sortedLists.length === 0 ? (
          <Animated.View
            key={`empty-${showArchived}`}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            className="mt-6 rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70"
          >
            <Text className="text-center text-lg text-gray-700 dark:text-gray-300">
              {searchQuery.trim()
                ? `Nessun risultato per "${searchQuery}"`
                : showArchived
                  ? "Qui andranno le tue ToDo Archiviate"
                  : "Qui andranno le tue liste ToDo"}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View key={`lists-${showArchived}`} entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
            {groupedLists.map((group) => (
            <View key={group.categoryName} className="mb-8">
              <Text className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                {group.categoryName}
              </Text>

              <View className="gap-4">
                {group.lists.map((list) => {
                  const completed = list.todos.filter((t) => t.completed).length;
                  const pending = list.todos.length - completed;

                  return (
                    <SwipeableRow
                      key={list.id}
                      leftAction={{
                        icon: <Pencil size={20} color="#FFFFFF" />,
                        backgroundClassName: "bg-yellow-400",
                        onTrigger: () => handleEditList(list),
                      }}
                      rightAction={{
                        icon: list.is_archived ? (
                          <ArchiveRestore size={20} color="#FFFFFF" />
                        ) : (
                          <Archive size={20} color="#FFFFFF" />
                        ),
                        backgroundClassName: list.is_archived
                          ? "bg-green-500"
                          : "bg-orange-500",
                        onTrigger: () =>
                          handleArchiveList(list.id, list.is_archived || false),
                      }}
                    >
                      <WiggleView enabled={editMode && list.is_owner !== false}>
                        <Pressable
                          onPress={() =>
                            navigation.navigate("ListDetail", {
                              listId: list.id,
                              todosCount: list.todos.length,
                            })
                          }
                          className={`min-h-[110px] justify-center rounded-xl border-l-4 border border-gray-200/50 p-4 dark:border-white/20 ${CARD_BORDER[list.color] ?? CARD_BORDER.blue}`}
                        >
                          {list.is_shared && list.shared_by && (
                            <View className="mb-1 flex-row items-center gap-1 self-start rounded-md bg-purple-100 px-2 py-1 dark:bg-purple-900/60">
                              <Users size={12} color="#7C3AED" />
                              <Text className="text-xs text-purple-700 dark:text-purple-300">
                                Condivisa da {list.shared_by.full_name}
                              </Text>
                            </View>
                          )}
                          <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                            {list.name}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-300">
                            {list.todos.length === 0
                              ? "Nessuna ToDo"
                              : `${pending} ToDo da completare, ${completed} completate.`}
                          </Text>

                          {editMode && list.is_owner !== false && (
                            <Animated.View
                              entering={FadeIn.duration(180)}
                              exiting={FadeOut.duration(140)}
                              className="mt-3 flex-row gap-2 self-end"
                            >
                              <Pressable
                                onPress={() => setShareListTarget(list)}
                                className="rounded-lg bg-purple-100/80 p-2 dark:bg-purple-900/60"
                              >
                                <Share2 size={16} color="#7C3AED" />
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  handleArchiveList(list.id, list.is_archived || false)
                                }
                                className={`rounded-lg p-2 ${
                                  list.is_archived
                                    ? "bg-green-100 dark:bg-green-900/60"
                                    : "bg-orange-100 dark:bg-orange-900/60"
                                }`}
                              >
                                {list.is_archived ? (
                                  <ArchiveRestore size={16} color="#16A34A" />
                                ) : (
                                  <Archive size={16} color="#EA580C" />
                                )}
                              </Pressable>
                              <Pressable
                                onPress={() => handleEditList(list)}
                                className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/60"
                              >
                                <Pencil size={16} color="#2563EB" />
                              </Pressable>
                              <Pressable
                                onPress={() => setShowDeleteConfirmId(list.id)}
                                className="rounded-lg bg-red-100 p-2 dark:bg-red-900/60"
                              >
                                <Trash size={16} color="#DC2626" />
                              </Pressable>
                            </Animated.View>
                          )}
                        </Pressable>
                      </WiggleView>
                    </SwipeableRow>
                  );
                })}
              </View>
            </View>
          ))}
          </Animated.View>
        )}
      </Animated.ScrollView>
      </Pressable>

      <BottomNav
        showHome
        showProfile
        showAdd
        showEdit
        showSort
        editMode={editMode}
        sortOption={sortOption}
        onHomePress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
        onToggleEdit={() => {
          const next = !editMode;
          setEditMode(next);
          setAlert({
            type: next ? "warning" : "success",
            message: next ? "Modalità modifica attivata" : "Modalità modifica disattivata",
          });
        }}
        onCycleSortOption={() => {
          const options: ListSortOption[] = ["created", "alphabetical", "complete"];
          const next = options[(options.indexOf(sortOption) + 1) % options.length];
          handleSortChange(next);
        }}
        onAdd={() => {
          setShowForm(true);
          setEditListId(null);
          setNewListName("");
          setNewListColor("blue");
          setNewListCategory(null);
        }}
        addTitle="Nuova Lista"
        editTitle="Modifica Liste"
      />

      {/* Modale creazione/modifica lista */}
      <BubbleModal
        visible={showForm}
        onRequestClose={() => {
          setShowForm(false);
          setEditListId(null);
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
              {editListId !== null ? "Modifica Lista" : "Nuova Lista"}
            </Text>

            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Nome della lista"
              className="mb-3 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
            />

            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Colore
            </Text>
            <View className="mb-4 flex-row gap-2">
              {(["blue", "green", "yellow", "red", "purple"] as const).map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setNewListColor(color)}
                  className={`h-9 w-9 rounded-full border-2 ${
                    newListColor === color ? "border-gray-900 dark:border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_HEX[color] }}
                />
              ))}
            </View>

            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria
            </Text>
            <ScrollView horizontal className="mb-4" showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => setNewListCategory(null)}
                className={`mr-2 rounded-full px-3 py-1.5 ${
                  newListCategory === null ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <Text
                  className={newListCategory === null ? "text-white" : "text-gray-700 dark:text-gray-300"}
                >
                  Nessuna
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setNewListCategory(cat.id)}
                  className={`mr-2 rounded-full px-3 py-1.5 ${
                    newListCategory === cat.id ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={newListCategory === cat.id ? "text-white" : "text-gray-700 dark:text-gray-300"}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowForm(false);
                  setEditListId(null);
                }}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateOrEditList}
                className="flex-1 rounded-lg bg-blue-600 py-2.5"
              >
                <Text className="text-center font-medium text-white">
                  {editListId !== null ? "Salva" : "Crea"}
                </Text>
              </Pressable>
            </View>
          </View>
      </BubbleModal>

      {/* Modale categoria */}
      <BubbleModal
        visible={showCatForm}
        onRequestClose={() => {
          setShowCatForm(false);
          setEditCatId(null);
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
              {editCatId ? "Modifica Categoria" : "Nuova Categoria"}
            </Text>
            <TextInput
              value={catName}
              onChangeText={setCatName}
              placeholder="Nome categoria"
              className="mb-4 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 dark:border-white/20 dark:text-white"
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowCatForm(false);
                  setEditCatId(null);
                }}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateOrEditCat}
                className="flex-1 rounded-lg bg-blue-600 py-2.5"
              >
                <Text className="text-center font-medium text-white">
                  {editCatId ? "Salva" : "Crea"}
                </Text>
              </Pressable>
            </View>
          </View>
      </BubbleModal>

      {/* Selettore categoria: bottom sheet nativo con gesture di trascinamento */}
      <BottomSheetModal
        ref={categoryPickerRef}
        enableDynamicSizing
        maxDynamicContentSize={Dimensions.get("window").height - insets.top - 40}
        backgroundComponent={GlassBottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#4B5563" : "#D1D5DB" }}
        backdropComponent={(props) => (
          <GlassBottomSheetBackdrop {...props} onClose={() => categoryPickerRef.current?.dismiss()} />
        )}
      >
        <BottomSheetScrollView
          style={{ paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <Text className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Filtra per categoria
          </Text>

          <Pressable
            onPress={() => handleSelectCategory(null)}
            className={`mb-3 rounded-2xl px-6 py-5 ${
              selectedCategory === null ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
            }`}
          >
            <Text
              className={`text-center text-lg font-medium ${
                selectedCategory === null ? "text-white" : "text-gray-800 dark:text-gray-200"
              }`}
            >
              Tutte le categorie
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const selected = selectedCategory?.id === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleSelectCategory(cat)}
                className={`mb-3 rounded-2xl px-6 py-5 ${
                  selected ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-center text-lg font-medium ${
                    selected ? "text-white" : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Conferma eliminazione lista */}
      <BubbleModal
        visible={showDeleteConfirmId !== null}
        onRequestClose={() => setShowDeleteConfirmId(null)}
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
            Confermi eliminazione?
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setShowDeleteConfirmId(null)}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
            >
              <Text className="text-center text-gray-700 dark:text-gray-300">No</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (showDeleteConfirmId !== null) handleDeleteList(showDeleteConfirmId);
                setShowDeleteConfirmId(null);
              }}
              className="flex-1 rounded-lg bg-red-600 py-2.5"
            >
              <Text className="text-center font-medium text-white">Sì</Text>
            </Pressable>
          </View>
        </View>
      </BubbleModal>

      <ShareListModal
        isOpen={shareListTarget !== null}
        onClose={() => setShareListTarget(null)}
        listId={shareListTarget?.id ?? 0}
        listName={shareListTarget?.name ?? ""}
      />
    </View>
  );
}

const COLOR_HEX: Record<string, string> = {
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  purple: "#A855F7",
};
