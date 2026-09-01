import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { register } from "../api/auth";
import BubbleModal from "../components/BubbleModal";
import FloatingLabelInput from "../components/FloatingLabelInput";
import GlassSurface from "../components/GlassSurface";
import { useAlert } from "../context/AlertContext";
import { useNetwork } from "../context/NetworkContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const { showAlert } = useAlert();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [passwordValid, setPasswordValid] = useState(true);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

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

  useEffect(() => {
    setPasswordValid(
      password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
    );
    setPasswordMatch(password === confirmPassword);
    // Prima bastava un "@" per essere "valida": "a@" o "a@b" passavano.
    // Formato standard nome@dominio.tld, senza spazi.
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }, [password, confirmPassword, email]);

  const handleRegister = async () => {
    setEmailTouched(true);
    setConfirmTouched(true);

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      showAlert("warning", "Compila tutti i campi per registrarti.");
      return;
    }
    if (!isOnline) {
      showAlert("error", "Sei offline. La registrazione richiede una connessione internet.");
      return;
    }
    if (!emailValid) {
      showAlert("warning", "Inserisci un'email valida.");
      return;
    }
    if (!passwordValid) {
      showAlert("warning", "La password deve avere almeno 8 caratteri, una maiuscola e un numero.");
      return;
    }
    if (!passwordMatch) {
      showAlert("warning", "Le password non corrispondono.");
      return;
    }

    try {
      const res = await register(username, email, password);

      // Il backend ritorna: "Registrazione completata! Controlla la tua email..."
      if (res.message && res.message.includes("Registrazione completata")) {
        setShowModal(true);
      } else if (/username/i.test(res.error ?? "")) {
        showAlert("error", "Username già esistente.");
      } else if (/email/i.test(res.error ?? "")) {
        // Copre sia "Email già registrata" sia errori lato server come
        // "Errore invio email di verifica" (SMTP giù, non un problema dei
        // dati inseriti): mostriamo il messaggio del backend così com'è
        // invece del generico "Errore nella registrazione", che nascondeva
        // completamente la causa reale.
        showAlert("error", res.error);
      } else {
        showAlert("error", res.error || "Errore nella registrazione.");
      }
    } catch {
      showAlert("error", "Errore imprevisto, riprova.");
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-900"
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
            source={require("../../assets/logo-theme-dark.png")}
            style={{ width: 270, height: 84, resizeMode: "contain" }}
          />
        </View>

        <FloatingLabelInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          forceDark
        />

        <FloatingLabelInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailTouched(true)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          error={
            !emailValid && emailTouched ? "Inserisci una email valida" : null
          }
          forceDark
        />

        <FloatingLabelInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          error={
            !passwordValid && password.length > 0
              ? "Almeno 8 caratteri, una maiuscola e un numero"
              : null
          }
          forceDark
        />

        <FloatingLabelInput
          label="Conferma Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onFocus={() => setConfirmTouched(true)}
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          error={
            !passwordMatch && confirmTouched
              ? "Le password non corrispondono"
              : null
          }
          forceDark
        />

        <Pressable
          onPress={handleRegister}
          className="w-full items-center rounded border border-green-600 bg-green-600 py-3"
        >
          <Text className="font-semibold text-white">Registrati</Text>
        </Pressable>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-sm text-gray-300">Hai già un account? </Text>
          <Pressable onPress={() => navigation.replace("Login")}>
            <Text className="text-sm text-blue-500">Accedi</Text>
          </Pressable>
        </View>
      </Animated.View>

      <BubbleModal
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full items-center overflow-hidden rounded-3xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
          <View className="mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/60">
            <CheckCircle size={40} color="#16A34A" />
          </View>
          <Text className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
            Registrazione completata!
          </Text>
          <Text className="mb-6 text-center text-gray-600 dark:text-gray-300">
            Conferma la mail per effettuare il login.
          </Text>
          <Pressable
            onPress={() => {
              setShowModal(false);
              navigation.replace("Login");
            }}
            className="w-full rounded-lg bg-blue-600 py-2.5"
          >
            <Text className="text-center font-medium text-white">Ok</Text>
          </Pressable>
        </View>
      </BubbleModal>
    </ScrollView>
  );
}
