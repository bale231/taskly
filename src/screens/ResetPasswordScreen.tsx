import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle, Key, XCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { confirmPasswordReset } from "../api/auth";
import FloatingLabelInput from "../components/FloatingLabelInput";
import { useNetwork } from "../context/NetworkContext";
import type { RootStackParamList } from "../navigation/types";
import { clearTokens } from "../services/storage";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const STRENGTH_WIDTHS = ["0%", "25%", "50%", "75%", "100%"] as const;
const STRENGTH_COLORS = [
  "#DC2626",
  "#F59E0B",
  "#FACC15",
  "#22C55E",
  "#16A34A",
] as const;

export default function ResetPasswordScreen({ route, navigation }: Props) {
  // Arrivano dal deep link taskly://reset-password/:uid/:token
  const { uid, token } = route.params;
  const { isOnline } = useNetwork();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    let strength = 0;
    if (newPassword) {
      if (newPassword.length >= 8) strength += 1;
      if (/[A-Z]/.test(newPassword)) strength += 1;
      if (/[0-9]/.test(newPassword)) strength += 1;
      if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;
    }
    setPasswordStrength(strength);
  }, [newPassword]);

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

  const handleSubmit = async () => {
    setError("");

    if (!isOnline) {
      setError(
        "Sei offline. Questa operazione richiede una connessione internet."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    if (passwordStrength < 2) {
      setError(
        "La password deve essere più forte (minimo 8 caratteri, con maiuscole e numeri)"
      );
      return;
    }

    setIsLoading(true);

    try {
      const { ok, data } = await confirmPasswordReset(uid, token, newPassword);

      if (ok) {
        setSuccess(true);

        // ✅ Logout automatico: rimuovi tutti i token
        await clearTokens();

        // ✅ Redirect al login dopo 3 secondi
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }, 3000);
      } else {
        setError(data.message || "Errore durante il reset della password");
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
        <View className="w-full max-w-sm items-center rounded-xl p-6">
          <View className="mb-4 rounded-full bg-green-100 p-4">
            <CheckCircle size={48} color="#16A34A" />
          </View>
          <Text className="mb-2 text-2xl font-bold text-gray-900">
            Password resettata!
          </Text>
          <Text className="mb-4 text-center text-gray-700">
            La tua password è stata modificata con successo.
          </Text>
          <Text className="text-center text-sm text-gray-600">
            Verrai reindirizzato alla pagina di login tra pochi secondi...
          </Text>
        </View>
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
            source={
              Platform.OS === "android"
                ? require("../../assets/android-logo-theme-light.png")
                : require("../../assets/logo-theme-light.png")
            }
            style={{ width: 270, height: 84, resizeMode: "contain" }}
          />
        </View>

        <View className="rounded-xl bg-white p-6 shadow-lg">
          <View className="mb-4 items-center">
            <View className="rounded-full bg-blue-100 p-3">
              <Key size={24} color="#2563EB" />
            </View>
          </View>

          <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
            Reset Password
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-600">
            Inserisci la tua nuova password
          </Text>

          {error ? (
            <View className="mb-4 flex-row items-center gap-2 rounded border border-red-400 bg-red-100 px-4 py-2">
              <XCircle size={16} color="#B91C1C" />
              <Text className="flex-1 text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <FloatingLabelInput
            label="Nuova Password"
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password Strength Bar */}
          <View className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <View
              style={{
                width: STRENGTH_WIDTHS[passwordStrength],
                backgroundColor: STRENGTH_COLORS[passwordStrength],
                height: "100%",
              }}
            />
          </View>

          <FloatingLabelInput
            label="Conferma Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className="w-full items-center rounded-lg py-3"
            style={{ backgroundColor: isLoading ? "#9CA3AF" : "#3B82F6" }}
          >
            <Text className="font-semibold text-white">
              {isLoading ? "Attendi..." : "Resetta Password"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
