import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { register } from "../api/auth";
import ErrorBanner from "../components/ErrorBanner";
import FloatingLabelInput from "../components/FloatingLabelInput";
import { useNetwork } from "../context/NetworkContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const [passwordValid, setPasswordValid] = useState(true);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

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
    if (showModal) {
      modalOpacity.setValue(0);
      modalScale.setValue(0.9);
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showModal, modalOpacity, modalScale]);

  // Stesse regole di validazione della webapp
  useEffect(() => {
    setPasswordValid(
      password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
    );
    setPasswordMatch(password === confirmPassword);
    setEmailValid(email.includes("@"));
  }, [password, confirmPassword, email]);

  const handleRegister = async () => {
    if (!isOnline) {
      setError(
        "Sei offline. La registrazione richiede una connessione internet."
      );
      return;
    }
    if (!passwordValid || !passwordMatch || !emailValid) {
      setError("Controlla i campi inseriti.");
      return;
    }

    try {
      const res = await register(username, email, password);

      // Il backend ritorna: "Registrazione completata! Controlla la tua email..."
      if (res.message && res.message.includes("Registrazione completata")) {
        setError("");
        setShowModal(true);
      } else if (res.error?.includes("Username")) {
        setError("Username già esistente.");
      } else if (res.error?.includes("Email")) {
        setError("Email già registrata.");
      } else {
        setError("Errore nella registrazione.");
      }
    } catch {
      setError("Errore imprevisto, riprova.");
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
            source={require("../../assets/logo-taskly-themedark.png")}
            style={{ width: 270, height: 80, resizeMode: "contain" }}
          />
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <FloatingLabelInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
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

      <Modal visible={showModal} transparent animationType="none">
        <View className="flex-1 items-center justify-center bg-black/60">
          <Animated.View
            style={{
              opacity: modalOpacity,
              transform: [{ scale: modalScale }],
              width: "90%",
              maxWidth: 448,
            }}
            className="items-center rounded-2xl bg-gray-900 p-6"
          >
            <Text className="mb-2 text-2xl font-bold text-white">
              ✅ Registrazione completata!
            </Text>
            <Text className="mb-6 text-center text-white">
              Conferma la mail per effettuare il login.
            </Text>
            <Pressable
              onPress={() => {
                setShowModal(false);
                navigation.replace("Login");
              }}
              className="rounded-lg bg-green-600 px-5 py-2"
            >
              <Text className="text-white">Ok</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
}
