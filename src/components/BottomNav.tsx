import { useNavigation, useRoute } from "@react-navigation/native";
import { Home, ListFilter, Pencil, Plus, Search, User } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "./AnimatedPressable";
import GlassSurface from "./GlassSurface";
import { useTheme } from "../context/ThemeContext";
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
  /** Chiamato quando si preme Home mentre si è già nella schermata Home, come nella webapp (torna in cima invece di non fare nulla). */
  onHomePress?: () => void;
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
  onHomePress,
  addTitle = "Aggiungi",
  editTitle = "Modifica",
}: BottomNavProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isHome = route.name === "Home";
  const isProfile = route.name === "Profile";

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50">
      <View
        className="flex-row items-end justify-around border-t border-gray-200/50 px-2 pt-2 dark:border-white/10"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <GlassSurface
          style={StyleSheet.absoluteFill}
          colorScheme={isDark ? "dark" : "light"}
          tint={isDark ? "dark" : "light"}
          intensity={80}
        />

        {showHome && (
          <AnimatedPressable
            active={isHome}
            onPress={() => {
              if (isHome) {
                onHomePress?.();
              } else if (navigation.canGoBack()) {
                // popToTop invece di navigate: da qualunque schermata
                // secondaria (Profilo, ListDetail, ecc.) Home è sempre la
                // radice dello stack — navigate qui aggiungeva un nuovo
                // push invece di tornare a quella esistente, lasciando la
                // schermata di provenienza sotto e raggiungibile con lo
                // swipe-back nativo anche dopo essere "arrivati" a Home.
                navigation.popToTop();
              } else {
                navigation.navigate("Home");
              }
            }}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl android:rounded-xl py-1.5"
            activeBackgroundColor={isDark ? "rgba(30,58,138,0.5)" : "#DBEAFE"}
            pillStyle={{ borderRadius: 16, padding: 8 }}
            icon={
              <Home
                size={28}
                strokeWidth={isHome ? 2.5 : 2}
                color={isHome ? "#2563EB" : "#6B7280"}
              />
            }
          >
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
            className="min-w-[64px] items-center gap-0.5 rounded-2xl android:rounded-xl py-1.5"
            activeBackgroundColor={isDark ? "rgba(88,28,135,0.5)" : "#F3E8FF"}
            pillStyle={{ borderRadius: 16, padding: 8 }}
            icon={
              <User
                size={28}
                strokeWidth={isProfile ? 2.5 : 2}
                color={isProfile ? "#9333EA" : "#6B7280"}
              />
            }
          >
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
            glass
            onPress={onToggleEdit}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl android:rounded-xl py-1.5"
            accessibilityLabel={editTitle}
            activeBackgroundColor="#16A34A"
            pillStyle={{ borderRadius: 16, padding: 8 }}
            icon={
              <Pencil
                size={28}
                strokeWidth={editMode ? 2.5 : 2}
                color={editMode ? "#FFFFFF" : "#6B7280"}
              />
            }
          >
            <Text
              className={`text-xs font-semibold ${editMode ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              Modifica
            </Text>
          </AnimatedPressable>
        )}

        {showSort && onCycleSortOption && (
          <AnimatedPressable
            onPress={onCycleSortOption}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl android:rounded-xl py-1.5"
            accessibilityLabel={`Ordina: ${SORT_LABELS[sortOption] ?? sortOption}`}
            pillStyle={{ borderRadius: 16, padding: 8 }}
            icon={<ListFilter size={28} color="#6B7280" />}
          >
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Ordina
            </Text>
          </AnimatedPressable>
        )}

        {showSearch && onSearch && (
          <AnimatedPressable
            onPress={onSearch}
            className="min-w-[64px] items-center gap-0.5 rounded-2xl android:rounded-xl py-1.5"
            pillStyle={{ borderRadius: 16, padding: 8 }}
            icon={<Search size={28} color="#6B7280" />}
          >
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Cerca
            </Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}
