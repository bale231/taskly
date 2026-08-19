import { View } from "react-native";
import Skeleton from "./Skeleton";

/** Placeholder di una card lista (Home), stessa forma della card reale a lista caricata. */
export default function ListCardSkeleton() {
  return (
    <View className="min-h-[110px] justify-center rounded-xl border border-l-4 border-gray-200/50 border-l-gray-300 p-4 dark:border-white/20 dark:border-l-gray-700">
      <Skeleton className="mb-3 h-6 w-2/3 rounded-md" />
      <Skeleton className="h-4 w-1/2 rounded-md" />
    </View>
  );
}
