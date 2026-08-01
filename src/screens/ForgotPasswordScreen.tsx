import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { requestPasswordReset } from "../api/auth";
import ErrorBanner from "../components/ErrorBanner";
import FloatingLabelInput from "../components/FloatingLabelInput";
import { useNetwork } from "../context/NetworkContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [formOpacity, formTranslateY]);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!success) return;

    // Era gsap con ease "back.out(1.7)" + "elastic.out" sul check:
    // qui uso una spring, che dà lo stesso rimbalzo.
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(checkScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, [success, successOpacity, successScale, checkScale]);

  const handleSubmit = async () => {
    if (!isOnline) {
      setError(
        "Sei offline. Questa operazione richiede una connessione internet."
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { ok, data } = await requestPasswordReset(email);

      if (ok) {
        setSuccess(true);
      } else {
        // Gestione errori specifici, come nella webapp
        const lowerMessage = (data.message || "").toLowerCase();

        if (
          lowerMessage.includes("email") &&
          (lowerMessage.includes("not found") ||
            lowerMessage.includes("non trovata") ||
            lowerMessage.includes("not exist") ||
            lowerMessage.includes("non esiste") ||
            lowerMessage.includes("invalid"))
        ) {
          setError("Email non registrata, ritenta con un email corretta.");
        } else {
          setError(data.message || "Errore nell'invio dell'email");
        }
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Animated.View
          style={{
            opacity: successOpacity,
            transform: [{ scale: successScale }],
            width: "100%",
            maxWidth: 384,
          }}
          className="rounded-xl p-6"
        >
          <View className="items-center rounded-xl bg-white p-8 shadow-lg">
            <Animated.View
              style={{ transform: [{ scale: checkScale }] }}
              className="mb-6 rounded-full bg-green-100 p-4"
            >
              <CheckCircle size={64} color="#16A34A" />
            </Animated.View>
            <Text className="mb-4 text-2xl font-bold text-gray-900">
              Email inviata!
            </Text>
            <Text className="mb-2 text-center text-gray-700">
              Controlla la tua casella di posta!
            </Text>
            <Text className="mb-6 text-center text-sm text-gray-600">
              Ti abbiamo inviato un link per reimpostare la tua password.
            </Text>
            <Pressable
              onPress={() => navigation.replace("Login")}
              className="flex-row items-center gap-2"
            >
              <ArrowLeft size={16} color="#2563EB" />
              <Text className="text-blue-600">Torna al login</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

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
            source={require("../../assets/logo-themelight.png")}
            style={{ width: 270, height: 80, resizeMode: "contain" }}
          />
        </View>

        <View className="rounded-xl bg-white p-6 shadow-lg">
          <View className="mb-4 items-center">
            <View className="rounded-full bg-blue-100 p-3">
              <Mail size={24} color="#2563EB" />
            </View>
          </View>

          <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
            Password dimenticata?
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-600">
            Inserisci la tua email e ti invieremo un link per reimpostare la
            password.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <FloatingLabelInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className={`mb-4 w-full items-center rounded py-3 ${
              isLoading ? "bg-gray-400" : "bg-blue-600"
            }`}
          >
            <Text className="font-semibold text-white">
              {isLoading ? "Invio in corso..." : "Invia email di reset"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.replace("Login")}
            className="flex-row items-center justify-center gap-2"
          >
            <ArrowLeft size={16} color="#374151" />
            <Text className="text-sm text-gray-700">Torna al login</Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
