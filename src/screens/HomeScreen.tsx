import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  Platform,
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
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import BubbleModal from "../components/BubbleModal";
import GlassSurface from "../components/GlassSurface";
import { GlassBottomSheetBackdrop, GlassBottomSheetBackground } from "../components/GlassBottomSheet";
import HighlightText from "../components/HighlightText";
import ListCardSkeleton from "../components/ListCardSkeleton";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import ShareListModal from "../components/ShareListModal";
import SwipeableRow from "../components/SwipeableRow";
import WiggleView from "../components/WiggleView";
import { useAlert } from "../context/AlertContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import {
  getHomeCache,
  getLastListsCount,
  setHomeCache,
  setLastListsCount,
} from "../services/storage";
import type { Category, ListSortOption, TodoList } from "../types/todo";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

/** Sfondo della card in base al colore lista, sostituisce colorClasses della webapp. */
const CARD_BG: Record<string, string> = {
  blue: "bg-blue-500/10",
  green: "bg-green-500/10",
  yellow: "bg-yellow-500/10",
  red: "bg-red-500/10",
  purple: "bg-purple-500/10",
};

/** Stessa mappatura di CARD_BG, in hex: serve alla barretta colorata accanto
 * al testo (non può leggere una className Tailwind per il backgroundColor). */
const CARD_ACCENT_HEX: Record<string, string> = {
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  purple: "#A855F7",
};

/**
 * Avvolge la lista di card con un fade in (Reanimated), tranne mentre la
 * ricerca è attiva: un Animated.View con key stabile aggiornato ad ogni
 * tasto premuto poteva disallineare temporaneamente cosa si vede da cosa
 * React ha già aggiornato (la lista filtrata sembrava non aggiornarsi
 * cancellando una lettera). Un View semplice durante la ricerca non ha
 * questo problema, a costo di perdere il fade in quel caso.
 *
 * Niente `exiting`: con una key che cambia (serve per far ripartire il
 * fade-in al cambio Attive/Archivio), il vecchio contenuto in uscita
 * restava sovrapposto al nuovo in entrata per la durata dell'animazione,
 * mostrando per un istante i pulsanti/icone del set sbagliato (es. il tasto
 * "Disarchivia" delle liste archiviate sopra quello "Archivia" delle
 * attive). Il vecchio ora sparisce subito, il nuovo continua a fare fade-in.
 */
function ListsContainer({
  searchActive,
  showArchived,
  children,
}: {
  searchActive: boolean;
  showArchived: boolean;
  children: ReactNode;
}) {
  if (searchActive) return <View>{children}</View>;
  return (
    <Animated.View key={`lists-${showArchived}`} entering={FadeIn.duration(220)}>
      {children}
    </Animated.View>
  );
}

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

  // Col back gesture/hardware, se la ricerca è aperta va chiusa prima
  // (tastiera compresa) invece di uscire subito dalla schermata.
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

  const [isLoadingLists, setIsLoadingLists] = useState(true);
  // Quante ListCardSkeleton mostrare mentre isLoadingLists è true: il numero
  // di liste dell'ultimo caricamento riuscito (persistito), così lo skeleton
  // non è mai un numero a caso di placeholder scollegato dal contenuto reale.
  const [skeletonCount, setSkeletonCount] = useState(3);
  const { showAlert } = useAlert();

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

  // `silent`: quando la cache locale ha già mostrato qualcosa, la fetch di
  // aggiornamento gira dietro le quinte senza far ricomparire lo skeleton —
  // solo il primissimo avvio (nessuna cache) mostra un caricamento visibile.
  const fetchLists = useCallback(
    async (silent = false, username?: string) => {
      if (!silent) setIsLoadingLists(true);
      try {
        const data = await fetchAllLists();
        if (Array.isArray(data)) {
          setLists(data);
          // Anche 0 va persistito: altrimenti un utente senza liste continua a
          // vedere lo skeleton count di default (3) a ogni apertura, invece
          // di 0 skeleton per uno stato realmente vuoto.
          setLastListsCount(data.length);
          if (username) setHomeCache("lists", data, username);
        }
      } catch (err) {
        console.error("Errore nel caricamento liste:", err);
        // Silenzioso: la cache mostrata resta valida, un fallimento in
        // background non deve interrompere l'utente con un alert per un
        // refresh che lui non ha nemmeno richiesto esplicitamente.
        if (!silent) showAlert("error", "Impossibile caricare le liste. Controlla la connessione.");
      } finally {
        setIsLoadingLists(false);
      }
    },
    [showAlert]
  );

  const fetchCategories = useCallback(
    async (silent = false, username?: string) => {
      try {
        const data = await fetchAllCategories();
        if (Array.isArray(data)) {
          setCategories(data);
          if (username) setHomeCache("categories", data, username);
        }
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("Errore caricamento categorie:", err);
        if (!silent) showAlert("error", "Impossibile caricare le categorie.");
        return [];
      }
    },
    [showAlert]
  );

  useEffect(() => {
    getLastListsCount().then((n) => {
      // `n` può essere 0 (utente senza liste): va rispettato comunque,
      // altrimenti `if (n)` lo scarta come falsy e resta il default (3).
      if (n !== null) setSkeletonCount(n);
    });
  }, []);

  // Id dell'utente i cui dati sono attualmente in memoria: React Navigation
  // può riusare la stessa istanza di HomeScreen dopo un logout/login con un
  // account diverso (reset dello stack, ma componente non necessariamente
  // rimontato da zero), lasciando `lists`/`categories`/`user` del vecchio
  // account visibili finché qualcosa non forza un refetch. `useFocusEffect`
  // gira anche in quel caso (a ogni volta che la Home riceve focus), a
  // differenza di un useEffect puro che gira solo al mount del componente.
  const loadedUsernameRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const resUser = await getCurrentUserJWT();
        if (!resUser) {
          // reset, non replace: azzera l'intero stack, non solo la route in
          // cima — altrimenti lo swipe-back nativo poteva riesumare questa
          // stessa Home (con dati della sessione appena scaduta/invalidata).
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }

        const isDifferentUser =
          loadedUsernameRef.current !== null && loadedUsernameRef.current !== resUser.username;
        if (isDifferentUser) {
          // Cambio account rilevato: azzera tutto lo state prima di
          // ricaricare, altrimenti per un istante si vedrebbero ancora le
          // liste del vecchio utente mentre la nuova fetch è in corso.
          setLists([]);
          setCategories([]);
          setSelectedCategory(null);
        }
        const isFirstLoadThisMount = loadedUsernameRef.current === null;
        loadedUsernameRef.current = resUser.username;
        setUser(resUser);

        // Cache locale mostrata subito, prima di qualunque fetch di rete:
        // solo al primissimo focus di questo mount (i focus successivi
        // hanno già lo state in memoria, non serve rileggerla da disco).
        let hadCache = false;
        if (isFirstLoadThisMount) {
          const [cachedLists, cachedCategories] = await Promise.all([
            getHomeCache<TodoList[]>("lists", resUser.username),
            getHomeCache<Category[]>("categories", resUser.username),
          ]);
          if (cachedLists) {
            setLists(cachedLists);
            setIsLoadingLists(false);
            hadCache = true;
          }
          if (cachedCategories) setCategories(cachedCategories);
        }

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

        const [, categoriesData] = await Promise.all([
          fetchLists(hadCache, resUser.username),
          fetchCategories(hadCache, resUser.username),
        ]);

        try {
          const result = await getSelectedCategory();
          if (result && result.selected_category !== null && result.selected_category !== undefined) {
            const cat = categoriesData.find((c) => c.id === result.selected_category);
            setSelectedCategory(cat ?? null);
          } else if (isDifferentUser) {
            setSelectedCategory(null);
          }
        } catch (err) {
          console.warn("Impossibile caricare la categoria selezionata:", err);
        }
      };
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, fetchLists, fetchCategories])
  );

  const handleSortChange = async (newOpt: ListSortOption) => {
    setSortOption(newOpt);
    const messages: Record<ListSortOption, string> = {
      created: "Ordinamento: Più recente",
      alphabetical: "Ordinamento: Alfabetico",
      complete: "Ordinamento: Per completezza",
    };
    showAlert("success", messages[newOpt]);
    updateListsSortOrder(newOpt);
  };

  const handleCreateOrEditList = async () => {
    if (!newListName.trim()) {
      showAlert("warning", "Inserisci un nome per la lista");
      return;
    }

    try {
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
        showAlert("success", "Lista modificata con successo!");
        await editList(editListId, newListName, newListColor, newListCategory);
      } else {
        const created = await createList(newListName, newListColor, newListCategory);
        if (created?.id) {
          setLists((prev) => [...prev, created as TodoList]);
          showAlert("success", "Lista creata con successo!");
        } else {
          showAlert("error", "Impossibile creare la lista. Riprova.");
          return;
        }
      }
    } catch (err) {
      console.error("Errore nel salvataggio della lista:", err);
      showAlert("error", "Errore di connessione. Riprova più tardi.");
      return;
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

  const handleDeleteList = async (id: number) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
    showAlert("success", "Lista eliminata");
    try {
      await deleteList(id);
    } catch (err) {
      console.error("Errore nell'eliminazione della lista:", err);
      showAlert("error", "Errore nell'eliminazione. Riprova più tardi.");
    }
  };

  const handleArchiveList = async (id: number, isCurrentlyArchived: boolean) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === id ? { ...list, is_archived: !isCurrentlyArchived } : list
      )
    );
    showAlert("success", isCurrentlyArchived ? "Lista ripristinata" : "Lista archiviata");
    try {
      if (isCurrentlyArchived) await unarchiveList(id);
      else await archiveList(id);
    } catch (err) {
      console.error("Errore nell'archiviazione della lista:", err);
      showAlert("error", "Errore di connessione. Riprova più tardi.");
    }
  };

  const handleCreateOrEditCat = async () => {
    if (!catName.trim()) {
      showAlert("warning", "Inserisci un nome per la categoria");
      return;
    }

    try {
      if (editCatId) {
        setCategories((prev) =>
          prev.map((cat) => (cat.id === editCatId ? { ...cat, name: catName } : cat))
        );
        showAlert("success", "Categoria modificata!");
        await editCategory(editCatId, catName);
      } else {
        const created = await createCategory(catName);
        if (created?.id) {
          setCategories((prev) => [...prev, created as Category]);
          showAlert("success", "Categoria creata!");
        } else {
          showAlert("error", "Impossibile creare la categoria. Riprova.");
          return;
        }
      }
    } catch (err) {
      console.error("Errore nel salvataggio della categoria:", err);
      showAlert("error", "Errore di connessione. Riprova più tardi.");
      return;
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
    showAlert("success", cat ? `Filtro: ${cat.name}` : "Filtro: Tutte le categorie");
  };

  const handleLogout = async () => {
    await logout();
    // reset, non replace: vedi commento sopra sul caricamento utente.
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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
      <View className="flex-1 items-center justify-center gap-6 bg-gray-100 dark:bg-gray-900">
        <Image
          source={
            Platform.OS === "android"
              ? isDark
                ? require("../../assets/android-logo-theme-dark.png")
                : require("../../assets/android-logo-theme-light.png")
              : isDark
                ? require("../../assets/logo-theme-dark.png")
                : require("../../assets/logo-theme-light.png")
          }
          style={{ width: 165, height: 52, resizeMode: "contain" }}
        />
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
            className="flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl bg-blue-500"
          >
            <Users size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("FriendRequests")}
            accessibilityLabel="Richieste di Amicizia"
            className="flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl bg-green-500"
          >
            <UserPlus size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Friends")}
            accessibilityLabel="I Miei Amici"
            className="flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl bg-purple-500"
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
            className="flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl bg-yellow-500"
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>

          <AnimatedPressable
            active={showArchived}
            onPress={() => setShowArchived((prev) => !prev)}
            accessibilityLabel={showArchived ? "Mostra attive" : "Mostra archivio"}
            className={`flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl ${
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
              className="flex-1 h-14 items-center justify-center rounded-2xl android:rounded-xl bg-gray-600"
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
          searchQuery.trim() ? (
            <Animated.View
              key={`empty-search`}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
              className="mt-6 rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70"
            >
              <Text className="text-center text-lg text-gray-700 dark:text-gray-300">
                {`Nessun risultato per "${searchQuery}"`}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View
              key={`empty-${showArchived}`}
              entering={FadeIn.duration(220)}
            >
              <Image
                source={
                  theme === "dark"
                    ? require("../../assets/feedback-empty-themedark.png")
                    : require("../../assets/feedback-empty-themelight.png")
                }
                style={{
                  // Il contenitore ha 24px di padding per lato: per uscirne
                  // ed essere visibilmente più grande della larghezza
                  // disponibile, va usata l'intera larghezza schermo (px
                  // assoluti, non percentuale del contenitore) più un extra.
                  width: Dimensions.get("window").width * 1.15,
                  alignSelf: "center",
                  height: undefined,
                  aspectRatio: 1536 / 1024,
                  resizeMode: "contain",
                }}
              />
            </Animated.View>
          )
        ) : (
          <ListsContainer searchActive={!!searchQuery.trim()} showArchived={showArchived}>
            {groupedLists.map((group) => (
            <View key={group.categoryName} className="mb-8">
              <Text className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                {group.categoryName}
              </Text>

              <View className="gap-4">
                {group.lists.map((list) => {
                  const completed = list.todos.filter((t) => t.completed).length;
                  const pending = list.todos.length - completed;

                  // Se la ricerca ha portato questa lista in vista per un
                  // match su un suo todo (non sul nome lista), mostra quel
                  // todo evidenziato al posto del contatore: è quello che
                  // l'utente stava cercando, non quante ToDo restano.
                  const trimmedQuery = searchQuery.trim().toLowerCase();
                  const matchedTodo = trimmedQuery
                    ? list.todos.find((t) =>
                        (t.text || t.title || "").toLowerCase().includes(trimmedQuery)
                      )
                    : undefined;

                  return (
                    // WiggleView fuori da SwipeableRow, non dentro: quella
                    // ha overflow-hidden per contenere lo swipe orizzontale,
                    // e tagliava gli angoli della card durante la rotazione
                    // del tremolio (che li fa sporgere di qualche px).
                    <WiggleView key={list.id} enabled={editMode && list.is_owner !== false}>
                      <SwipeableRow
                        disabled={editMode}
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
                        <Pressable
                          onPress={() =>
                            navigation.navigate("ListDetail", {
                              listId: list.id,
                              todosCount: list.todos.length,
                              initialSearch: matchedTodo ? searchQuery.trim() : undefined,
                            })
                          }
                          className={`min-h-[110px] flex-row items-center rounded-xl border border-gray-200/50 p-4 dark:border-white/20 ${CARD_BG[list.color] ?? CARD_BG.blue}`}
                        >
                          {/* Barretta accento accanto al testo, non più sul
                              bordo della card: stesso pattern del riferimento
                              (piccola pillola verticale con inset invece di
                              un border-left a tutta altezza). */}
                          <View
                            style={{
                              width: 4,
                              borderRadius: 2,
                              alignSelf: "stretch",
                              marginVertical: 6,
                              marginRight: 14,
                              backgroundColor: CARD_ACCENT_HEX[list.color] ?? CARD_ACCENT_HEX.blue,
                            }}
                          />
                          <View className="flex-1 justify-center">
                            {list.is_shared && list.shared_by && (
                              <View className="mb-1 flex-row items-center gap-1 self-start rounded-md bg-purple-100 px-2 py-1 dark:bg-purple-900/60">
                                <Users size={12} color="#7C3AED" />
                                <Text className="text-xs text-purple-700 dark:text-purple-300">
                                  Condivisa da {list.shared_by.full_name}
                                </Text>
                              </View>
                            )}
                            <HighlightText
                              text={list.name}
                              highlight={searchQuery}
                              className="mb-2 text-xl font-semibold text-gray-900 dark:text-white"
                            />
                            {matchedTodo ? (
                              <HighlightText
                                text={matchedTodo.text || matchedTodo.title || ""}
                                highlight={searchQuery}
                                numberOfLines={1}
                                className="text-sm text-gray-600 dark:text-gray-300"
                              />
                            ) : (
                              <Text className="text-sm text-gray-600 dark:text-gray-300">
                                {list.todos.length === 0
                                  ? "Nessuna ToDo"
                                  : `${pending} ToDo da completare, ${completed} completate.`}
                              </Text>
                            )}

                            {editMode && list.is_owner !== false && (
                              <Animated.View
                                entering={FadeIn.duration(180)}
                                exiting={FadeOut.duration(140)}
                                className="mt-3 flex-row gap-2 self-end"
                              >
                                {/* Solo Condividi ed Elimina: Modifica e
                                    Archivia sono coperti dallo swipe, ma con
                                    lo swipe disabilitato in edit mode (sotto)
                                    restano comunque raggiungibili uscendo
                                    dalla modalità modifica. */}
                                <Pressable
                                  onPress={() => setShareListTarget(list)}
                                  className="rounded-lg bg-purple-100/80 p-2 dark:bg-purple-900/60"
                                >
                                  <Share2 size={16} color="#7C3AED" />
                                </Pressable>
                                <Pressable
                                  onPress={() => setShowDeleteConfirmId(list.id)}
                                  className="rounded-lg bg-red-100 p-2 dark:bg-red-900/60"
                                >
                                  <Trash size={16} color="#DC2626" />
                                </Pressable>
                              </Animated.View>
                            )}
                          </View>
                        </Pressable>
                      </SwipeableRow>
                    </WiggleView>
                  );
                })}
              </View>
            </View>
          ))}
          </ListsContainer>
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
          showAlert(next ? "warning" : "success", next ? "Modalità modifica attivata" : "Modalità modifica disattivata");
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
            className={`mb-3 rounded-2xl android:rounded-xl px-6 py-5 ${
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
                className={`mb-3 rounded-2xl android:rounded-xl px-6 py-5 ${
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
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
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
