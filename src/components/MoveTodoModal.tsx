import { ArrowRight, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BubbleModal from "./BubbleModal";
import GlassSurface from "./GlassSurface";
import { useTheme } from "../context/ThemeContext";

interface MoveTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  todoTitle: string;
  currentListId: number;
  currentListName: string;
  allLists: { id: number; name: string; color: string }[];
  onMove: (newListId: number) => void;
}

const COLOR_BORDER: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-500/10",
  green: "border-l-green-500 bg-green-500/10",
  yellow: "border-l-yellow-500 bg-yellow-500/10",
  red: "border-l-red-500 bg-red-500/10",
  purple: "border-l-purple-500 bg-purple-500/10",
};

/** Port di src/components/MoveTodoModal.tsx della webapp. */
export default function MoveTodoModal({
  isOpen,
  onClose,
  todoTitle,
  currentListId,
  currentListName,
  allLists,
  onMove,
}: MoveTodoModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const availableLists = allLists.filter((list) => list.id !== currentListId);

  const handleMove = () => {
    if (selectedListId) {
      onMove(selectedListId);
      onClose();
    }
  };

  return (
    <BubbleModal
      visible={isOpen}
      onRequestClose={onClose}
      contentStyle={{ width: "100%", maxWidth: 384 }}
    >
      <View className="w-full overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              Sposta Todo
            </Text>
            <Pressable onPress={onClose} className="rounded-lg p-2">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          <View className="mb-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
              Stai spostando:
            </Text>
            <Text className="font-semibold text-gray-900 dark:text-white">{todoTitle}</Text>
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Da: <Text className="font-medium">{currentListName}</Text>
            </Text>
          </View>

          <Text className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Seleziona lista di destinazione:
          </Text>

          <ScrollView className="mb-4" style={{ maxHeight: 240 }}>
            {availableLists.length === 0 ? (
              <Text className="py-4 text-center text-gray-500">
                Nessun&apos;altra lista disponibile
              </Text>
            ) : (
              availableLists.map((list) => {
                const selected = selectedListId === list.id;
                return (
                  <Pressable
                    key={list.id}
                    onPress={() => setSelectedListId(list.id)}
                    className={`mb-2 flex-row items-center justify-between rounded-lg border-l-4 p-3 ${
                      COLOR_BORDER[list.color] ?? COLOR_BORDER.blue
                    } ${selected ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {list.name}
                    </Text>
                    {selected && <ArrowRight size={18} color="#3B82F6" />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800">
              <Text className="text-center text-gray-700 dark:text-gray-300">Annulla</Text>
            </Pressable>
            <Pressable
              onPress={handleMove}
              disabled={!selectedListId}
              className={`flex-1 rounded-lg py-2.5 ${
                selectedListId ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  selectedListId ? "text-white" : "text-gray-500"
                }`}
              >
                Sposta
              </Text>
            </Pressable>
          </View>
      </View>
    </BubbleModal>
  );
}
