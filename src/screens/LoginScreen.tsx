import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AtSign, Check, User } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getCurrentUserJWT, login } from "../api/auth";
import ErrorBanner from "../components/ErrorBanner";
import FloatingLabelInput from "../components/FloatingLabelInput";
import { useNetwork } from "../context/NetworkContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { setTokens } from "../services/storage";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

/**
 * Genera messaggi di errore specifici a partire dal messaggio del backend.
 * Logica identica alla webapp (src/pages/Login.tsx).
 */
export const getSpecificErrorMessage = (errorMessage: string): string => {
  if (!errorMessage) return "Credenziali non valide";

  const lowerMessage = errorMessage.toLowerCase();

  // Controlla se è un errore di email non verificata
  if (lowerMessage.includes("email") && lowerMessage.includes("verif")) {
    return "Verifica l'email prima di loggarti!";
  }

  // Errori specifici per password
  if (
    lowerMessage.includes("password") &&
    (lowerMessage.includes("wrong") ||
      lowerMessage.includes("incorrect") ||
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("errata") ||
      lowerMessage.includes("sbagliata"))
  ) {
    return "Password errata, ritenta o ripristina la password.";
  }

  // Errori specifici per username
  if (
    (lowerMessage.includes("username") || lowerMessage.includes("user")) &&
    (lowerMessage.includes("not found") ||
      lowerMessage.includes("does not exist") ||
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("non trovato") ||
      lowerMessage.includes("non esiste"))
  ) {
    return "Username non trovato. Controlla e riprova.";
  }

  // Errori specifici per email
  if (
    (lowerMessage.includes("email") || lowerMessage.includes("e-mail")) &&
    (lowerMessage.includes("not found") ||
      lowerMessage.includes("does not exist") ||
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("non trovata") ||
      lowerMessage.includes("non esiste"))
  ) {
    return "Email non trovata. Controlla e riprova.";
  }

  // Errore generico per credenziali non valide (username/email + password)
  if (
    lowerMessage.includes("credential") ||
    lowerMessage.includes("authentication") ||
    lowerMessage.includes("credenziali")
  ) {
    return "Credenziali non valide. Controlla username/email e password.";
  }

  return errorMessage || "Credenziali non valide";
};

export default function LoginScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const { reloadTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginMode, setLoginMode] = useState<"username" | "email">("username");
  const rememberMeScale = useRef(new Animated.Value(1)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  // Switch Username/Email: un thumb bianco trasla fisicamente da un lato
  // all'altro (segmented control), non un fade indipendente delle due pill.
  // 0 = username attivo, 1 = email attivo.
  const modeAnim = useRef(
    new Animated.Value(loginMode === "email" ? 1 : 0)
  ).current;
  const [toggleWidth, setToggleWidth] = useState(0);
  // `toggleWidth` è la larghezza di UNA delle due metà (misurata via
  // onLayout sul Pressable "Username"): il thumb deve traslare esattamente
  // di quella distanza per allinearsi sotto "Email".
  const THUMB_TRAVEL = toggleWidth;

  useEffect(() => {
    // `useNativeDriver: false`: questo stesso valore alimenta anche
    // l'interpolazione di `color` sui testi (non animabile dal driver
    // nativo), quindi non può essere mixato con l'animazione native-only
    // del transform del thumb.
    Animated.spring(modeAnim, {
      toValue: loginMode === "email" ? 1 : 0,
      friction: 8,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [loginMode, modeAnim]);

  const usernameTextColor = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#111827", "#374151"],
  });
  const emailTextColor = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#374151", "#111827"],
  });

  // Check auth FIRST before showing anything
  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const user = await getCurrentUserJWT();
        if (user) {
          navigation.replace("Home");
        } else {
          setCheckingAuth(false);
        }
      } catch {
        setCheckingAuth(false);
      }
    };
    checkAlreadyLoggedIn();
  }, [navigation]);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fade-in del form: era gsap.fromTo({opacity:0,y:50} -> {opacity:1,y:0})
  useEffect(() => {
    if (checkingAuth) return;

    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checkingAuth, formOpacity, formTranslateY]);

  const handleLogin = async () => {
    if (!isOnline) {
      setError("Sei offline. Il login richiede una connessione internet.");
      return;
    }
    setIsLoading(true);
    setError("");

    const result = await login(username, password, rememberMe);

    if (result.success) {
      // La webapp sceglieva localStorage o sessionStorage in base a rememberMe;
      // qui il flag viene persistito e valutato all'avvio (services/storage.ts).
      await setTokens(result.accessToken, result.refreshToken, rememberMe);

      const user = await getCurrentUserJWT();
      if (user) {
        // Sostituisce il MutationObserver su data-access-token della webapp.
        await reloadTheme();
        navigation.replace("Home");
      } else {
        setError("Errore nel recupero dati utente");
      }
    } else {
      setError(getSpecificErrorMessage(result.message));
    }

    setIsLoading(false);
  };

  // Show loading screen while checking auth
  if (checkingAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <View className="items-center gap-4">
          <Image
            source={require("../../assets/logo-theme-light.png")}
            style={{ width: 200, height: 62, resizeMode: "contain" }}
          />
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  const isWarning = error === "Verifica l'email prima di loggarti!";

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        style={{
          opacity: formOpacity,
          transform: [{ translateY: formTranslateY }],
          width: "100%",
          maxWidth: 384,
        }}
        className="rounded-xl p-6"
      >
        <View className="mb-6 w-full items-center">
          <Image
            source={require("../../assets/logo-theme-light.png")}
            style={{ width: 340, height: 106, resizeMode: "contain" }}
          />
        </View>

        {error ? (
          <ErrorBanner
            message={error}
            variant={isWarning ? "warning" : "error"}
          />
        ) : null}

        <View className="mb-4">
          <Text className="mb-2 text-xs font-medium text-gray-500">
            Accedi con
          </Text>
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              borderRadius: 12,
              backgroundColor: "#E5E7EB",
              padding: 4,
            }}
          >
            {/* Thumb bianco che scorre fisicamente da un lato all'altro
                (segmented control stile iOS), invece del fade indipendente
                di due pill sovrapposte usato prima. */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: 4,
                width: "50%",
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
                elevation: 2,
                transform: [
                  {
                    translateX: modeAnim.interpolate({
                      inputRange: [0, 1],
                      // -4 di padding già incluso nel `left: 4`, il thumb
                      // trasla della larghezza del container meno il padding.
                      outputRange: [0, THUMB_TRAVEL],
                    }),
                  },
                ],
              }}
            />
            <Pressable
              onPress={() => setLoginMode("username")}
              onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <User
                size={16}
                color={loginMode === "username" ? "#111827" : "#374151"}
              />
              <Animated.Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: usernameTextColor,
                }}
              >
                Username
              </Animated.Text>
            </Pressable>
            <Pressable
              onPress={() => setLoginMode("email")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <AtSign
                size={16}
                color={loginMode === "email" ? "#111827" : "#374151"}
              />
              <Animated.Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: emailTextColor,
                }}
              >
                Email
              </Animated.Text>
            </Pressable>
          </View>
        </View>

        <FloatingLabelInput
          label={loginMode === "email" ? "Email" : "Username"}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={loginMode === "email" ? "email-address" : "default"}
          textContentType={loginMode === "email" ? "emailAddress" : "username"}
        />

        <FloatingLabelInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />

        {/* Ricordami */}
        <Pressable
          onPress={() => {
            setRememberMe((prev) => !prev);
            rememberMeScale.setValue(0.7);
            Animated.spring(rememberMeScale, {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }).start();
          }}
          className="mb-4 flex-row items-center"
          hitSlop={6}
        >
          <Animated.View
            style={{ transform: [{ scale: rememberMeScale }] }}
            className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
              rememberMe
                ? "border-blue-600 bg-blue-600"
                : "border-gray-300 bg-white"
            }`}
          >
            {rememberMe ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
          </Animated.View>
          <Text className="ml-2 text-sm text-gray-700">Rimani loggato</Text>
        </Pressable>

        <Pressable
          onPress={handleLogin}
          disabled={isLoading}
          className="w-full items-center rounded py-3"
          style={{ backgroundColor: isLoading ? "#9CA3AF" : "#3B82F6" }}
        >
          <Text className="font-semibold text-white">
            {isLoading ? "Attendi..." : "Accedi"}
          </Text>
        </Pressable>

        <View className="mt-3 items-center">
          <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
            <Text className="text-sm text-blue-600">
              Hai dimenticato la password?
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-sm text-gray-700">Non hai un account? </Text>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text className="text-sm text-blue-500">Registrati</Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
