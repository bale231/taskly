import { useNavigation, useRoute } from "@react-navigation/native";
import { Home, ListFilter, Pencil, Plus, Search, User } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "./AnimatedPressable";
import type { ListSortOption } from "../types/todo";

interface BottomNavProps {
  showHome?: boolean;
  showProfile?: boolean;
  showAdd?: boolean;
  showEdit?: boolean;
  showSort?: boolean;
  showSearch?: boolean;

  editMode?: boolean;
  sortOption?: ListSortOption | "completed";
  onToggleEdit?: () => void;
  onCycleSortOption?: () => void;
  onAdd?: () => void;
  onSearch?: () => void;
  addTitle?: string;
  editTitle?: string;
}

const SORT_LABELS: Record<string, string> = {
  created: "Più recente",
  alphabetical: "Alfabetico",
  complete: "Per completezza",
  completed: "Per completezza",
};

/**
 * Port di src/components/BottomNav.tsx della webapp. Componente custom
 * (non una tab bar di React Navigation): i pulsanti mostrati cambiano in
 * base alla schermata tramite le prop show*, esattamente come lì.
 */
export default function BottomNav({
  showHome = false,
  showProfile = false,
  showAdd = false,
  showEdit = false,
  showSort = false,
  showSearch = false,
  editMode = false,
  sortOption = "created",
  onToggleEdit,
  onCycleSortOption,
  onAdd,
  onSearch,
  addTitle = "Aggiungi",
  editTitle = "Modifica",
}: BottomNavProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const isHome = route.name === "Home";
  const isProfile = route.name === "Profile";

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50">
      <View
        className="flex-row items-end justify-around border-t border-gray-200/50 bg-white/90 px-2 pt-2 dark:border-white/10 dark:bg-gray-900/90"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {showHome && (
          <AnimatedPressable
            active={isHome}
            onPress={() => {
              if (!isHome) navigation.navigate("Home");
            }}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl py-1.5"
          >
            <View
              className={`rounded-2xl p-2 ${isHome ? "bg-blue-100 dark:bg-blue-900/50" : ""}`}
            >
              <Home
                size={28}
                strokeWidth={isHome ? 2.5 : 2}
                color={isHome ? "#2563EB" : "#6B7280"}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${isHome ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              Home
            </Text>
          </AnimatedPressable>
        )}

        {showProfile && (
          <AnimatedPressable
            active={isProfile}
            onPress={() => navigation.navigate("Profile")}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl py-1.5"
          >
            <View
              className={`rounded-2xl p-2 ${isProfile ? "bg-purple-100 dark:bg-purple-900/50" : ""}`}
            >
              <User
                size={28}
                strokeWidth={isProfile ? 2.5 : 2}
                color={isProfile ? "#9333EA" : "#6B7280"}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${isProfile ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              Profilo
            </Text>
          </AnimatedPressable>
        )}

        {showAdd && onAdd && (
          <AnimatedPressable
            onPress={onAdd}
            className="-mt-8 h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-xl dark:border-gray-900"
            accessibilityLabel={addTitle}
          >
            <Plus size={32} strokeWidth={2.5} color="#FFFFFF" />
          </AnimatedPressable>
        )}

        {showEdit && onToggleEdit && (
          <AnimatedPressable
            active={editMode}
            onPress={onToggleEdit}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl py-1.5"
            accessibilityLabel={editTitle}
          >
            <View
              className={`rounded-2xl p-2 ${editMode ? "bg-green-100 dark:bg-green-900/50" : ""}`}
            >
              <Pencil
                size={28}
                strokeWidth={editMode ? 2.5 : 2}
                color={editMode ? "#16A34A" : "#6B7280"}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${editMode ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              Modifica
            </Text>
          </AnimatedPressable>
        )}

        {showSort && onCycleSortOption && (
          <Pressable
            onPress={onCycleSortOption}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl py-1.5"
            accessibilityLabel={`Ordina: ${SORT_LABELS[sortOption] ?? sortOption}`}
          >
            <View className="rounded-2xl p-2">
              <ListFilter size={28} color="#6B7280" />
            </View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Ordina
            </Text>
          </Pressable>
        )}

        {showSearch && onSearch && (
          <Pressable
            onPress={onSearch}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl py-1.5"
          >
            <View className="rounded-2xl p-2">
              <Search size={28} color="#6B7280" />
            </View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Cerca
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
