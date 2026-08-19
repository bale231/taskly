import { View } from "react-native";
import Skeleton from "./Skeleton";

/** Placeholder di una riga todo (ListDetail), stessa forma della riga reale a dati caricati. */
export default function TodoRowSkeleton() {
  return (
    <View className="flex-row items-center rounded-xl border border-gray-200/50 bg-white/70 px-5 py-4 dark:border-white/20 dark:bg-gray-800/70">
      <Skeleton className="mr-4 h-[26px] w-[26px] rounded-md" />
      <Skeleton className="h-7 flex-1 rounded-md" />
    </View>
  );
}
