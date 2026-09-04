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
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deactivateAccount,
  getCurrentUserJWT,
  logout,
  updateNotificationPreferences,
  updateProfile,
} from "../api/auth";
import { requestPasswordReset } from "../api/auth";
import BottomNav from "../components/BottomNav";
import BubbleModal from "../components/BubbleModal";
import GlassSurface from "../components/GlassSurface";
import Navbar, { NAVBAR_BASE_HEIGHT } from "../components/Navbar";
import { useAlert } from "../context/AlertContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { getAnyAppCache, setAppCache } from "../services/storage";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

interface ProfileUser {
  username: string;
  email: string;
  profile_picture: string | null;
  push_notifications_enabled?: boolean;
}

const AVATAR_BASE_URL = "https://bale231.pythonanywhere.com";

/**
 * Il polyfill `fetch`/FormData di Expo SDK 57 ha sostituito quello di React
 * Native: il vecchio pattern `formData.append("x", { uri, name, type })` non
 * viene più convertito in un part valido (lancia "Unsupported FormDataPart
 * implementation", perché il loro convertFormData accetta solo `string` o
 * `Blob` reali, non l'oggetto proprietario `{uri}` di RN). Bisogna quindi
 * leggere il file locale e ottenere un vero Blob prima di allegarlo.
 */
async function uriToBlob(uri: string, fallbackName: string, fallbackType: string): Promise<Blob> {
  const res = await fetch(uri);
  const rawBlob = await res.blob();
  // `Blob.type` è un getter nativo, non scrivibile: per garantire il MIME
  // type corretto (spesso assente/generico sui file locali) va ricostruito
  // un nuovo Blob invece di mutare quello esistente.
  const blob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type: fallbackType });
  // @ts-expect-error: `name` non è nell'interfaccia Blob standard, ma il
  // convertFormData di Expo lo legge per l'header Content-Disposition.
  blob.name = fallbackName;
  return blob;
}

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

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

  // Transizione smooth quando si attiva/disattiva "Modifica profilo": prima
  // gli input e il bottone Salva passavano da disabilitati ad abilitati di
  // scatto (solo cambio di className), ora sfumano.
  const editProgress = useSharedValue(0);
  useEffect(() => {
    editProgress.value = withTiming(editMode ? 1 : 0, { duration: 220 });
  }, [editMode, editProgress]);

  const fieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(editProgress.value, [0, 1], [0.6, 1]),
  }));

  const saveButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      editProgress.value,
      [0, 1],
      [isDark ? "#374151" : "#E5E7EB", isDark ? "rgba(22,163,74,0.2)" : "rgba(34,197,94,0.2)"]
    ),
  }));

  const saveTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      editProgress.value,
      [0, 1],
      ["#9CA3AF", isDark ? "#4ADE80" : "#16A34A"]
    ),
  }));

  const applyUser = (data: ProfileUser) => {
    setUser(data);
    setUsername(data.username);
    setEmail(data.email);
    setAvatarUri(data.profile_picture);
    setPushEnabled(data.push_notifications_enabled ?? true);
  };

  const loadUser = async (hadCache: boolean) => {
    const data = await getCurrentUserJWT();
    if (data) {
      applyUser(data);
      await setAppCache("profile", data, data.username ?? data.email ?? "unknown");
    }
    if (!hadCache) setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      // Profilo già scaricato dal prefetch globale (login/avvio app):
      // mostrato subito, poi un fetch silenzioso in background lo aggiorna.
      const cached = await getAnyAppCache<ProfileUser>("profile");
      if (cached) {
        applyUser(cached);
        setLoading(false);
      }
      loadUser(!!cached);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("error", "Serve il permesso per accedere alle foto");
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

    try {
      // Sincronizza subito col backend, come nella webapp (optimistic + background sync).
      const blob = await uriToBlob(
        asset.uri,
        asset.fileName ?? "avatar.jpg",
        asset.mimeType ?? "image/jpeg"
      );
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("profile_picture", blob, asset.fileName ?? "avatar.jpg");

      const res = await updateProfile(formData);
      if (res.ok) {
        showAlert("success", "Immagine aggiornata con successo");
      } else {
        console.error("Upload immagine profilo fallito:", res.status, res);
        showAlert("error", res.error || res.message || "Errore durante l'upload dell'immagine");
      }
    } catch (err: any) {
      console.error("Upload immagine profilo, errore:", err);
      showAlert("error", `Errore upload: ${err?.message || String(err)}`);
    }
  };

  const handleRemoveImage = () => {
    setAvatarUri(null);
    setAvatarAsset(null);
    setClearPicture(true);
    showAlert("success", "Immagine rimossa con successo");

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("clear_picture", "true");
    updateProfile(formData).catch((err) => {
      console.error("Rimozione immagine profilo fallita:", err);
      showAlert("error", "Errore durante la rimozione dell'immagine");
    });
  };

  const handleSave = async () => {
    setEditMode(false);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      if (avatarAsset) {
        const blob = await uriToBlob(
          avatarAsset.uri,
          avatarAsset.fileName ?? "avatar.jpg",
          avatarAsset.mimeType ?? "image/jpeg"
        );
        formData.append("profile_picture", blob, avatarAsset.fileName ?? "avatar.jpg");
      }
      if (clearPicture) formData.append("clear_picture", "true");

      const res = await updateProfile(formData);
      if (res.ok) {
        showAlert("success", "Profilo aggiornato con successo");
      } else {
        console.error("Aggiornamento profilo fallito:", res.status, res);
        showAlert("error", res.error || res.message || "Errore nell'aggiornamento del profilo");
      }
    } catch (err: any) {
      console.error("Aggiornamento profilo, errore:", err);
      showAlert("error", `Errore: ${err?.message || String(err)}`);
    }

    setAvatarAsset(null);
    setClearPicture(false);
  };

  const handleTogglePush = async () => {
    const newValue = !pushEnabled;
    setTogglingPush(true);
    try {
      const res = await updateNotificationPreferences(newValue);
      if (res.error) {
        showAlert("error", res.message || "Errore nell'aggiornamento preferenze");
      } else {
        setPushEnabled(newValue);
        showAlert(
          "success",
          newValue
            ? "Preferenza salvata. Nota: le notifiche push native non sono ancora attive in questa app."
            : "Notifiche push disattivate"
        );
      }
    } catch {
      showAlert("error", "Errore durante l'operazione");
    } finally {
      setTogglingPush(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    setShowResetModal(false);
    try {
      const { ok, data } = await requestPasswordReset(email);
      if (ok) {
        showAlert("success", "Email di reset password inviata! Controlla la tua casella di posta.");
      } else {
        showAlert("error", data.message || "Errore nell'invio dell'email");
      }
    } catch {
      showAlert("error", "Errore di connessione");
    }
  };

  const handleDeactivate = async () => {
    setShowDeactivateModal(false);
    const res = await deactivateAccount();
    if (res.message === "Account disattivato") {
      showAlert("success", "Account disattivato correttamente.");
      setTimeout(async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }, 2000);
    } else {
      showAlert("error", "Errore nella disattivazione dell'account");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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
      <Navbar scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          padding: 24,
          paddingTop: NAVBAR_BASE_HEIGHT + insets.top + 24,
          paddingBottom: 120,
        }}
      >
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
          <Animated.View style={fieldStyle} className="mb-3">
            <Text className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              editable={editMode}
              className="rounded-lg border border-gray-200/50 bg-white px-4 py-3 text-gray-900 dark:border-white/20 dark:bg-gray-700 dark:text-white"
            />
          </Animated.View>

          <Animated.View style={fieldStyle} className="mb-3">
            <Text className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={editMode}
              keyboardType="email-address"
              autoCapitalize="none"
              className="rounded-lg border border-gray-200/50 bg-white px-4 py-3 text-gray-900 dark:border-white/20 dark:bg-gray-700 dark:text-white"
            />
          </Animated.View>

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
            className="mb-4 items-center rounded-lg py-3"
          >
            <Animated.View style={[StyleSheet.absoluteFill, saveButtonStyle, { borderRadius: 8 }]} />
            <Animated.Text style={[{ fontWeight: "500" }, saveTextStyle]}>
              Salva modifiche
            </Animated.Text>
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
      </Animated.ScrollView>

      <BottomNav
        showHome
        showProfile
        showEdit
        editMode={editMode}
        onToggleEdit={() => setEditMode((prev) => !prev)}
        editTitle="Modifica Profilo"
      />

      {/* Modale reset password */}
      <BubbleModal
        visible={showResetModal}
        onRequestClose={() => setShowResetModal(false)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
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
      </BubbleModal>

      {/* Modale conferma disattivazione */}
      <BubbleModal
        visible={showDeactivateModal}
        onRequestClose={() => setShowDeactivateModal(false)}
        contentStyle={{ width: "100%", maxWidth: 320 }}
      >
        <View className="w-full overflow-hidden rounded-3xl android:rounded-xl border border-gray-200/50 p-6 dark:border-white/20">
          <GlassSurface
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={90}
          />
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
      </BubbleModal>
    </View>
  );
}
