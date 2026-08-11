import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Bell,
  BellOff,
  Globe,
  Key,
  LogOut,
  Pencil,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  deactivateAccount,
  getCurrentUserJWT,
  logout,
  updateNotificationPreferences,
  updateProfile,
} from "../api/auth";
import { requestPasswordReset } from "../api/auth";
import AnimatedAlert from "../components/AnimatedAlert";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

type Alert = { type: "success" | "error" | "warning"; message: string } | null;

interface ProfileUser {
  username: string;
  email: string;
  profile_picture: string | null;
  push_notifications_enabled?: boolean;
}

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/**
 * Port di src/pages/Profile.tsx della webapp: avatar, modifica
 * username/email, notifiche push, reset password, disattivazione account,
 * logout.
 *
 * Non portato: la vera attivazione delle notifiche push (richiede
 * @react-native-firebase e configurazione FCM nativa, fuori scope). Il
 * toggle qui aggiorna solo la preferenza sul backend, senza registrare un
 * token push reale — nessuna notifica arriverà finché quella parte non
 * viene implementata.
 */
export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [clearPicture, setClearPicture] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const showAlert = (message: string, type: "success" | "error" | "warning") =>
    setAlert({ type, message });

  const loadUser = async () => {
    const data = await getCurrentUserJWT();
    if (data) {
      setUser(data);
      setUsername(data.username);
      setEmail(data.email);
      setAvatarUri(data.profile_picture);
      setPushEnabled(data.push_notifications_enabled ?? true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Serve il permesso per accedere alle foto", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarAsset(asset);
    setAvatarUri(asset.uri);
    setClearPicture(false);

    // Sincronizza subito col backend, come nella webapp (optimistic + background sync).
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("profile_picture", {
      uri: asset.uri,
      name: asset.fileName ?? "avatar.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);

    updateProfile(formData)
      .then((res) => {
        if (res.message === "Profile updated") {
          showAlert("Immagine aggiornata con successo", "success");
        } else {
          showAlert("Errore durante l'upload dell'immagine", "error");
        }
      })
      .catch(() => showAlert("Errore durante l'upload dell'immagine", "error"));
  };

  const handleRemoveImage = () => {
    setAvatarUri(null);
    setAvatarAsset(null);
    setClearPicture(true);
    showAlert("Immagine rimossa con successo", "success");

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("clear_picture", "true");
    updateProfile(formData).catch(() =>
      showAlert("Errore durante la rimozione dell'immagine", "error")
    );
  };

  const handleSave = () => {
    showAlert("Profilo aggiornato con successo", "success");
    setEditMode(false);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    if (avatarAsset) {
      formData.append("profile_picture", {
        uri: avatarAsset.uri,
        name: avatarAsset.fileName ?? "avatar.jpg",
        type: avatarAsset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
    }
    if (clearPicture) formData.append("clear_picture", "true");

    updateProfile(formData)
      .then((res) => {
        if (res.message !== "Profile updated") {
          showAlert("Errore nell'aggiornamento del profilo", "error");
        }
      })
      .catch(() => showAlert("Errore nell'aggiornamento del profilo", "error"));

    setAvatarAsset(null);
    setClearPicture(false);
  };

  const handleTogglePush = async () => {
    const newValue = !pushEnabled;
    setTogglingPush(true);
    try {
      const res = await updateNotificationPreferences(newValue);
      if (res.error) {
        showAlert(res.message || "Errore nell'aggiornamento preferenze", "error");
      } else {
        setPushEnabled(newValue);
        showAlert(
          newValue
            ? "Preferenza salvata. Nota: le notifiche push native non sono ancora attive in questa app."
            : "Notifiche push disattivate",
          "success"
        );
      }
    } catch {
      showAlert("Errore durante l'operazione", "error");
    } finally {
      setTogglingPush(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    setShowResetModal(false);
    try {
      const { ok, data } = await requestPasswordReset(email);
      if (ok) {
        showAlert("Email di reset password inviata! Controlla la tua casella di posta.", "success");
      } else {
        showAlert(data.message || "Errore nell'invio dell'email", "error");
      }
    } catch {
      showAlert("Errore di connessione", "error");
    }
  };

  const handleDeactivate = async () => {
    setShowDeactivateModal(false);
    const res = await deactivateAccount();
    if (res.message === "Account disattivato") {
      showAlert("Account disattivato correttamente.", "success");
      setTimeout(async () => {
        await logout();
        navigation.replace("Login");
      }, 2000);
    } else {
      showAlert("Errore nella disattivazione dell'account", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-900">
      <Navbar />

      {alert && (
        <AnimatedAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <View className="rounded-xl border border-gray-200/50 bg-white/70 p-6 dark:border-white/20 dark:bg-gray-800/70">
          <Text className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Profilo
          </Text>

          {/* Avatar */}
          <View className="mb-4 items-center">
            <Pressable
              onPress={handlePickImage}
              className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-white/50 dark:border-white/20 dark:bg-gray-700/50"
            >
              {avatarUri ? (
                <Image
                  source={{
                    uri: avatarUri.startsWith("http") ? avatarUri : `${AVATAR_BASE_URL}${avatarUri}`,
                  }}
                  style={{ width: 96, height: 96 }}
                />
              ) : (
                <Text className="text-3xl">👤</Text>
              )}
            </Pressable>
          </View>

          <View className="mb-6 flex-row items-center justify-between gap-4">
            {avatarUri && (
              <Pressable
                onPress={handleRemoveImage}
                className="flex-row items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2"
              >
                <X size={14} color="#DC2626" />
                <Text className="text-xs text-red-600 dark:text-red-400">Rimuovi immagine</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setEditMode((prev) => !prev)}
              className="flex-row items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2"
            >
              <Pencil size={14} color="#2563EB" />
              <Text className="text-xs text-blue-600 dark:text-blue-400">
                {editMode ? "Annulla modifica" : "Modifica profilo"}
              </Text>
            </Pressable>
          </View>

          {/* Notifiche push */}
          <View className="mb-6 rounded-lg border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-500/30 dark:bg-blue-900/20">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-3">
                {pushEnabled ? (
                  <Bell size={20} color="#2563EB" />
                ) : (
                  <BellOff size={20} color="#6B7280" />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    Notifiche Push
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    {pushEnabled ? "Ricevi notifiche sul dispositivo" : "Solo notifiche in-app"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleTogglePush}
                disabled={togglingPush}
                className={`h-6 w-11 rounded-full ${pushEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                style={{ opacity: togglingPush ? 0.5 : 1 }}
              >
                <View
                  className="h-4 w-4 rounded-full bg-white"
                  style={{
                    marginTop: 4,
                    marginLeft: pushEnabled ? 24 : 4,
                  }}
                />
              </Pressable>
            </View>
          </View>

          {/* Username / Email */}
          <View className="mb-3">
            <Text className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              editable={editMode}
              className={`rounded-lg border border-gray-200/50 px-4 py-3 text-gray-900 dark:border-white/20 dark:text-white ${
                editMode ? "bg-white dark:bg-gray-700" : "bg-white/50 opacity-60 dark:bg-gray-700/50"
              }`}
            />
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={editMode}
              keyboardType="email-address"
              autoCapitalize="none"
              className={`rounded-lg border border-gray-200/50 px-4 py-3 text-gray-900 dark:border-white/20 dark:text-white ${
                editMode ? "bg-white dark:bg-gray-700" : "bg-white/50 opacity-60 dark:bg-gray-700/50"
              }`}
            />
          </View>

          <View className="mb-4">
            <Text className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Password
            </Text>
            <TextInput
              value="********"
              editable={false}
              secureTextEntry
              className="rounded-lg border border-gray-200/50 bg-white/50 px-4 py-3 text-gray-900 opacity-60 dark:border-white/20 dark:bg-gray-700/50 dark:text-white"
            />
            <Pressable
              onPress={() => setShowResetModal(true)}
              className="mt-2 flex-row items-center gap-1 self-start"
            >
              <Key size={14} color="#2563EB" />
              <Text className="text-xs text-blue-600 dark:text-blue-400">Cambia la password</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!editMode}
            className={`mb-4 items-center rounded-lg py-3 ${
              editMode ? "bg-green-500/20 dark:bg-green-600/20" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <Text
              className={`font-medium ${editMode ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}
            >
              Salva modifiche
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            className="mb-3 flex-row items-center justify-center gap-2 rounded-lg bg-gray-500/20 py-3 dark:bg-gray-600/20"
          >
            <LogOut size={18} color="#374151" />
            <Text className="font-medium text-gray-700 dark:text-gray-300">
              Esci dall&apos;account
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowDeactivateModal(true)}
            className="mb-4 items-center rounded-lg bg-red-500/20 py-3 dark:bg-red-600/20"
          >
            <Text className="font-medium text-red-600 dark:text-red-400">
              Disattiva il mio account
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL("https://todowebapp-websites.vercel.app/")}
            className="flex-row items-center justify-center gap-2"
          >
            <Globe size={16} color="#6B7280" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">Visita il nostro sito web</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav
        showHome
        showProfile
        showEdit
        editMode={editMode}
        onToggleEdit={() => setEditMode((prev) => !prev)}
        editTitle="Modifica Profilo"
      />

      {/* Modale reset password */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/30 p-4">
          <View className="w-full max-w-xs rounded-lg border border-gray-200/50 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
            <View className="mb-4 items-center">
              <View className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <Key size={24} color="#2563EB" />
              </View>
            </View>
            <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
              Reset Password
            </Text>
            <Text className="mb-6 text-center text-sm text-gray-700 dark:text-gray-300">
              Ti invieremo un&apos;email con un link per resettare la password.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowResetModal(false)}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-800 dark:text-white">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={handleRequestPasswordReset}
                className="flex-1 rounded-lg bg-blue-600 py-2.5"
              >
                <Text className="text-center text-white">Invia email</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale conferma disattivazione */}
      <Modal visible={showDeactivateModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/30 p-4">
          <View className="w-full max-w-xs rounded-lg border border-gray-200/50 bg-white p-6 dark:border-white/20 dark:bg-gray-900">
            <Text className="mb-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
              Conferma disattivazione
            </Text>
            <Text className="mb-6 text-center text-sm text-gray-700 dark:text-gray-300">
              Sei sicuro di voler disattivare il tuo account?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDeactivateModal(false)}
                className="flex-1 rounded-lg bg-gray-100 py-2.5 dark:bg-gray-800"
              >
                <Text className="text-center text-gray-800 dark:text-white">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={handleDeactivate}
                className="flex-1 rounded-lg bg-red-600 py-2.5"
              >
                <Text className="text-center text-white">Conferma</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
