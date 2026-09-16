import { useEffect } from "react";
import { Image, Platform, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** Bianco caldo dell'icona dell'app (campionato da ios-icon-taskly.png):
 * usato qui e come backgroundColor dello splash nativo, così il passaggio
 * fra le due schermate non mostra alcuno stacco di colore. */
export const SPLASH_BACKGROUND = "#F6F4F0";

/** Durata di un giro completo della GIF: 60 fotogrammi da 60ms. App.tsx la
 * usa per non troncare l'animazione a metà quando il bootstrap finisce
 * prima. */
export const SPLASH_ANIMATION_MS = 3600;

/**
 * Schermata mostrata da App.tsx durante il bootstrap (refresh token,
 * lettura storage), nel gap tra lo splash statico di sistema e la prima
 * schermata reale.
 *
 * Su iOS riproduce la GIF del logo che si assembla: lo splash NATIVO non
 * può animarla (è una schermata statica di sistema, mostrata prima ancora
 * che React Native esista), quindi lì si usa l'ultimo fotogramma come PNG —
 * il logo già composto — e l'animazione vera parte qui.
 *
 * Su Android resta il logo statico che pulsa: lì lo splash di sistema ha già
 * una propria animazione di ingresso e sovrapporne un'altra stonerebbe.
 */
export default function AnimatedSplashScreen() {
  const opacity = useSharedValue(1);
  const isAndroid = Platform.OS === "android";

  useEffect(() => {
    if (!isAndroid) return;
    opacity.value = withRepeat(withTiming(0.35, { duration: 900 }), -1, true);
  }, [opacity, isAndroid]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isAndroid ? opacity.value : 1,
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SPLASH_BACKGROUND,
      }}
    >
      <Animated.View style={animatedStyle}>
        <Image
          source={
            isAndroid
              ? require("../../assets/android-icon-taskly.png")
              : require("../../assets/taskly_3d_center_assembly_ios.gif")
          }
          style={{ width: 220, height: 220, resizeMode: "contain" }}
        />
      </Animated.View>
    </View>
  );
}
