import {
  Bot,
  History,
  Mail,
  MessageSquarePlus,
  MessageCircle,
  Send,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchConversation,
  fetchConversations,
  sendAIChatMessage,
  type ConversationMessage,
  type ConversationSummary,
} from "../api/aiChat";
import { getAIResponse } from "../data/appKnowledgeBase";
import { useNetwork } from "../context/NetworkContext";
import { useTheme } from "../context/ThemeContext";
import GlassSurface from "./GlassSurface";

interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "bot";
}

type Tab = "ai" | "contact";
type RequestType = "question" | "bug" | "suggestion";

/** Messaggio di apertura, ricreato identico quando si avvia una nuova
 * chat o si torna alle domande rapide. */
const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  text: "Ciao! 👋 Sono l'assistente di Taskly. Come posso aiutarti?",
  sender: "bot",
};

const QUICK_SUGGESTIONS = [
  "Come creo una lista?",
  "Come funziona l'offline?",
  "Come condivido una lista?",
  "Come uso la guida?",
];

const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  question: "Domanda",
  bug: "Bug",
  suggestion: "Suggerimento",
};

const SUPPORT_EMAIL = "bale231@gmail.com";

let messageIdCounter = 1;

/**
 * Port di src/components/SupportWidget.tsx della webapp: bottone flottante +
 * pannello con due tab (Assistente AI, Contattaci). Montato solo in Home,
 * come nell'originale — non globale in App.tsx.
 *
 * Differenze dal port web: niente GSAP (non esiste in RN), le stesse
 * animazioni sono rifatte con Reanimated; il tab "Contattaci" non apre un
 * client email via `window.location.href` ma via `Linking.openURL`.
 */
export default function SupportWidget() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();

  const [isOpen, setIsOpen] = useState(false);
  // Il pannello va smontato solo DOPO l'animazione di chiusura, non subito
  // quando isOpen diventa false: altrimenti sparisce di scatto invece di
  // sfumare via (lo stesso pattern usato da BubbleModal).
  const [shouldRenderPanel, setShouldRenderPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ai");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // Conversazione corrente lato server: il server la crea al primo
  // messaggio e da lì in poi la si continua invece di aprirne una nuova ad
  // ogni scambio. Resta null per chi non ha fatto accesso.
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [requestType, setRequestType] = useState<RequestType>("question");
  const [subject, setSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const chatInputRef = useRef<TextInput>(null);

  const panelScale = useSharedValue(0.85);
  const panelOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  // Material container transform (Android): il pannello si espande dal
  // bottone FAB (basso a destra) invece di scalare dal centro come su iOS,
  // con una curva decelerate netta e senza rimbalzo a molla.
  const androidReveal = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === "android") {
      if (isOpen) {
        setShouldRenderPanel(true);
        androidReveal.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
        setTimeout(() => chatInputRef.current?.focus(), 260);
      } else {
        androidReveal.value = withTiming(
          0,
          { duration: 180, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(setShouldRenderPanel)(false);
          }
        );
      }
      return;
    }

    if (isOpen) {
      setShouldRenderPanel(true);
      panelOpacity.value = withTiming(1, { duration: 200 });
      panelScale.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.7 });
      setTimeout(() => chatInputRef.current?.focus(), 250);
    } else {
      panelOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(setShouldRenderPanel)(false);
      });
      panelScale.value = withTiming(0.85, { duration: 150 });
    }
  }, [isOpen, panelOpacity, panelScale, androidReveal]);

  // Su iOS, solo lo scale/posizione sull'Animated.View esterno, che è
  // antenato del GlassSurface: animarne l'opacità disabiliterebbe il vero
  // Liquid Glass in modo permanente invece di renderlo solo invisibile
  // (limite noto, vedi commento su GlassSurface.tsx). Il fade vero è sul
  // contenuto sopra al vetro, vedi contentFadeStyle.
  // Su Android, GlassSurface è una superficie piena (non vetro nativo), che
  // non ha quel limite: lì l'opacità sul contenitore esterno guida il
  // Material container transform (androidReveal) senza controindicazioni.
  const panelStyle = useAnimatedStyle(() => {
    if (Platform.OS === "android") {
      return {
        opacity: androidReveal.value,
        transform: [
          // L'origine dell'espansione è già ancorata in basso a destra da
          // transformOrigin sotto: qui basta lo scale, senza offset di
          // traslazione aggiuntivi.
          { scale: 0.4 + androidReveal.value * 0.6 },
        ],
      };
    }
    return {
      transform: [{ scale: panelScale.value }],
    };
  });

  // Su Android il fade del contenuto è già coperto dall'opacity di
  // panelStyle (il contenitore esterno lì non è vetro nativo, quindi
  // animarne l'opacità non ha controindicazioni): qui basta restare
  // sempre visibile, per non applicare il fade due volte.
  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: Platform.OS === "android" ? 1 : panelOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleOpen = () => {
    buttonScale.value = withSequence(withTiming(0.85, { duration: 80 }), withTiming(1, { duration: 120 }));
    setIsOpen(true);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setIsOpen(false);
  };

  const appendMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { id: messageIdCounter++, text: trimmed, sender: "user" };
    appendMessage(userMsg);
    setChatInput("");
    setIsTyping(true);

    const history: ConversationMessage[] = chatMessages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

    try {
      if (isOnline) {
        const response = await sendAIChatMessage(trimmed, history, conversationId);
        appendMessage({ id: messageIdCounter++, text: response.reply, sender: "bot" });
        // Il server assegna l'id al primo messaggio: da qui in poi lo si
        // rimanda, così gli scambi successivi finiscono nella stessa
        // conversazione invece di crearne una per ognuno.
        if (response.conversation_id) setConversationId(response.conversation_id);
        setIsTyping(false);
        return;
      }
    } catch {
      // Rete presente ma il servizio AI non risponde correttamente (es.
      // "Servizio AI non configurato" lato server): passa al fallback come
      // se fosse offline, invece di mostrare un errore all'utente.
    }

    setTimeout(() => {
      appendMessage({ id: messageIdCounter++, text: getAIResponse(trimmed), sender: "bot" });
      setIsTyping(false);
    }, 300);
  };

  const handleQuickSuggestion = (text: string) => {
    setChatInput(text);
    setTimeout(() => handleSendMessage(), 0);
  };

  /** Riporta la chat allo stato iniziale, con le domande rapide di nuovo
   * visibili. La conversazione precedente non si perde: resta salvata sul
   * server e si riapre dalla cronologia. */
  const handleNewChat = () => {
    setChatMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setChatInput("");
    setShowHistory(false);
  };

  const handleOpenHistory = async () => {
    setShowHistory(true);
    setIsLoadingHistory(true);
    try {
      setConversations(await fetchConversations());
    } catch {
      // Non autenticato o rete assente: si mostra l'elenco vuoto col
      // relativo messaggio, senza interrompere l'uso del bot.
      setConversations([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectConversation = async (id: number) => {
    setIsLoadingHistory(true);
    try {
      const detail = await fetchConversation(id);
      setChatMessages([
        WELCOME_MESSAGE,
        ...detail.messages.map((m, i) => ({
          id: i + 1,
          text: m.content,
          sender: (m.role === "user" ? "user" : "bot") as ChatMessage["sender"],
        })),
      ]);
      // Gli id ripartono dal fondo della conversazione caricata, così i
      // messaggi nuovi non collidono con quelli appena ripristinati.
      messageIdCounter = detail.messages.length + 1;
      setConversationId(detail.id);
      setShowHistory(false);
    } catch {
      setShowHistory(false);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendContact = () => {
    const subjectLine = `[Taskly - ${REQUEST_TYPE_LABEL[requestType]}] ${subject || "Richiesta di supporto"}`;
    const body = contactMessage || "";
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailto).catch(() => {});
  };

  const showQuickSuggestions = chatMessages.length <= 2 && !isTyping;

  return (
    <>
      {!isOpen && (
        // Niente `entering={FadeIn}` qui: anima l'opacità di questo
        // contenitore, che è antenato del GlassSurface sotto, e ciò SPEGNE
        // il vetro nativo invece di limitarsi a renderlo trasparente —
        // restava solo la tinta blu piatta. Il bottone compare comunque in
        // modo morbido grazie allo scale di buttonStyle.
        <Animated.View
          style={[
            buttonStyle,
            {
              position: "absolute",
              right: 16,
              bottom: insets.bottom + 96,
              zIndex: 50,
            },
          ]}
        >
          <Pressable
            onPress={handleOpen}
            accessibilityLabel="Apri assistenza"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            {/* Vetro nativo su iOS 26+ (o BlurView <26), superficie piena
                tema-aware su Android — stesso pattern dei bottoni flottanti
                di ListDetailScreen: GlassSurface come sfondo assoluto, tinta
                colorata sopra su un livello suo (così l'icona resta a piena
                opacità invece di sbiadire insieme al colore). L'opacità
                della tinta è la stessa degli altri bottoni: più densa e il
                vetro sotto sparisce, rendendolo un cerchio pieno. */}
            <GlassSurface
              style={StyleSheet.absoluteFill}
              colorScheme={isDark ? "dark" : "light"}
              tint={isDark ? "dark" : "light"}
              intensity={80}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: "#3B82F6", opacity: 0.55 }]}
            />
            <MessageCircle size={26} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {shouldRenderPanel && (
        <Animated.View
          style={[
            panelStyle,
            {
              position: "absolute",
              right: 16,
              left: 16,
              bottom: insets.bottom + 96,
              maxWidth: 384,
              alignSelf: "flex-end",
              height: 480,
              borderRadius: 20,
              overflow: "hidden",
              zIndex: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
              // Ancora l'espansione Android all'angolo basso-destra (dove
              // sta il FAB che apre il pannello), invece che al centro.
              transformOrigin: Platform.OS === "android" ? "bottom right" : "center",
            },
          ]}
        >
          <GlassSurface
            style={StyleSheet.absoluteFill}
            visible={isOpen}
            colorScheme={isDark ? "dark" : "light"}
            tint={isDark ? "dark" : "light"}
            intensity={95}
          />
          <Animated.View style={[{ flex: 1 }, contentFadeStyle]}>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#3B82F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeTab === "ai" ? (
                  <Bot size={20} color="#FFFFFF" />
                ) : (
                  <Mail size={20} color="#FFFFFF" />
                )}
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {activeTab === "ai" ? "Assistente AI" : "Contattaci"}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {activeTab === "ai" ? "Risposte immediate" : "Scrivici un messaggio"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              {activeTab === "ai" && (
                <>
                  <Pressable
                    onPress={handleNewChat}
                    hitSlop={8}
                    className="rounded-lg p-1.5"
                    accessibilityLabel="Nuova chat"
                  >
                    <MessageSquarePlus size={19} color={isDark ? "#D1D5DB" : "#374151"} />
                  </Pressable>
                  <Pressable
                    onPress={handleOpenHistory}
                    hitSlop={8}
                    className="rounded-lg p-1.5"
                    accessibilityLabel="Cronologia chat"
                  >
                    <History size={19} color={isDark ? "#D1D5DB" : "#374151"} />
                  </Pressable>
                </>
              )}
              <Pressable onPress={handleClose} hitSlop={8} className="rounded-lg p-1.5">
                <X size={20} color={isDark ? "#D1D5DB" : "#374151"} />
              </Pressable>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: "row" }}>
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} isDark={isDark} />
          </View>

          {/* `key` sul tab attivo: senza, React riusa lo stesso albero e il
              contenuto cambia di scatto mentre il segmented control sta
              ancora animando. Con la key il vecchio esce e il nuovo entra
              in dissolvenza, in sincrono con lo scorrimento del riquadro. */}
          <Animated.View
            key={activeTab}
            entering={FadeIn.duration(180)}
            style={{ flex: 1 }}
          >
            {activeTab === "ai" ? (
              <ChatTab
                messages={chatMessages}
                input={chatInput}
                onInputChange={setChatInput}
                onSend={handleSendMessage}
                isTyping={isTyping}
                showQuickSuggestions={showQuickSuggestions}
                onQuickSuggestion={handleQuickSuggestion}
                scrollRef={scrollRef}
                inputRef={chatInputRef}
                isDark={isDark}
              />
            ) : (
              <ContactTab
                requestType={requestType}
                onRequestTypeChange={setRequestType}
                subject={subject}
                onSubjectChange={setSubject}
                message={contactMessage}
                onMessageChange={setContactMessage}
                onSend={handleSendContact}
                isDark={isDark}
              />
            )}
          </Animated.View>

          {showHistory && (
            <HistoryPanel
              conversations={conversations}
              isLoading={isLoadingHistory}
              onSelect={handleSelectConversation}
              onClose={() => setShowHistory(false)}
              isDark={isDark}
            />
          )}
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

/**
 * Elenco delle conversazioni salvate, sovrapposto alla chat. Copre l'intero
 * pannello invece di comparire di lato: lo spazio è poco e una lista
 * affiancata renderebbe illeggibili sia i titoli sia la chat sotto.
 */
function HistoryPanel({
  conversations,
  isLoading,
  onSelect,
  onClose,
  isDark,
}: {
  conversations: ConversationSummary[];
  isLoading: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={{
        position: "absolute",
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? "#111827" : "#FFFFFF",
        zIndex: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        }}
      >
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          Chat salvate
        </Text>
        <Pressable onPress={onClose} hitSlop={8} className="rounded-lg p-1">
          <X size={18} color={isDark ? "#D1D5DB" : "#374151"} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            Nessuna chat salvata. Le conversazioni si salvano automaticamente
            quando hai effettuato l'accesso.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {conversations.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 10,
                marginBottom: 6,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              }}
            >
              <Text
                numberOfLines={1}
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {c.title || "Chat senza titolo"}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatConversationDate(c.updated_at)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

/** Data relativa e compatta: in una lista di chat "2 ore fa" dice più di
 * una data completa, e le conversazioni vecchie restano distinguibili. */
function formatConversationDate(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMin < 1) return "Adesso";
  if (diffMin < 60) return `${diffMin} min fa`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ${diffH === 1 ? "ora" : "ore"} fa`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ${diffD === 1 ? "giorno" : "giorni"} fa`;

  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/**
 * Segmented control con thumb che trasla fisicamente da un tab all'altro,
 * stesso pattern di LoginScreen (switch Username/Email): non un fade
 * indipendente delle due label, un'unica pillola che scorre sotto quella
 * attiva, con lo sfondo che si tinge di blu e il testo che sfuma a bianco.
 */
function TabSwitcher({
  activeTab,
  onChange,
  isDark,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  isDark: boolean;
}) {
  const [halfWidth, setHalfWidth] = useState(0);
  const progress = useSharedValue(activeTab === "contact" ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(activeTab === "contact" ? 1 : 0, { damping: 16, stiffness: 180 });
  }, [activeTab, progress]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * halfWidth }],
  }));

  // Il colore del testo segue la stessa progress del riquadro, invece di
  // cambiare di scatto al tap: altrimenti per tutta la durata dello
  // scorrimento si vedeva testo bianco su fondo trasparente (il riquadro
  // blu non era ancora arrivato sotto) e testo grigio su fondo blu
  // dall'altra parte.
  const inactive = isDark ? "#9CA3AF" : "#6B7280";

  const aiTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ["#FFFFFF", inactive]),
  }));

  const contactTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactive, "#FFFFFF"]),
  }));

  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        borderRadius: 10,
        padding: 3,
        marginBottom: 10,
        backgroundColor: trackBg,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          thumbStyle,
          {
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 3,
            width: halfWidth,
            borderRadius: 8,
            backgroundColor: "#3B82F6",
          },
        ]}
      />
      <Pressable
        onPress={() => onChange("ai")}
        onLayout={(e) => setHalfWidth(e.nativeEvent.layout.width)}
        style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
      >
        <Animated.Text style={[{ fontSize: 13, fontWeight: "600" }, aiTextStyle]}>
          Assistente AI
        </Animated.Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("contact")}
        style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
      >
        <Animated.Text style={[{ fontSize: 13, fontWeight: "600" }, contactTextStyle]}>
          Contattaci
        </Animated.Text>
      </Pressable>
    </View>
  );
}

function TypingDots() {
  return (
    <View style={{ flexDirection: "row", gap: 4, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <TypingDot key={i} delay={i * 150} />
      ))}
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View
      style={[style, { width: 6, height: 6, borderRadius: 3, backgroundColor: "#9CA3AF" }]}
    />
  );
}

function ChatTab({
  messages,
  input,
  onInputChange,
  onSend,
  isTyping,
  showQuickSuggestions,
  onQuickSuggestion,
  scrollRef,
  inputRef,
  isDark,
}: {
  messages: ChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  isTyping: boolean;
  showQuickSuggestions: boolean;
  onQuickSuggestion: (text: string) => void;
  scrollRef: React.RefObject<ScrollView | null>;
  inputRef: React.RefObject<TextInput | null>;
  isDark: boolean;
}) {
  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <Animated.View
            key={msg.id}
            entering={FadeIn.duration(200)}
            style={{
              maxWidth: "85%",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 9,
              backgroundColor:
                msg.sender === "user" ? "#3B82F6" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            }}
          >
            <Text
              style={{
                color: msg.sender === "user" ? "#FFFFFF" : isDark ? "#F3F4F6" : "#111827",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {msg.text}
            </Text>
          </Animated.View>
        ))}

        {isTyping && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={{
              alignSelf: "flex-start",
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            }}
          >
            <TypingDots />
          </Animated.View>
        )}

        {showQuickSuggestions && (
          <View style={{ gap: 6, marginTop: 4 }}>
            {QUICK_SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => onQuickSuggestion(s)}
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text className="text-sm text-gray-700 dark:text-gray-300">{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        }}
      >
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onInputChange}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
          onSubmitEditing={onSend}
          returnKeyType="send"
          style={{
            flex: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === "ios" ? 10 : 8,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            color: isDark ? "#F3F4F6" : "#111827",
            fontSize: 14,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!input.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: input.trim() ? "#3B82F6" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          }}
        >
          <Send size={16} color={input.trim() ? "#FFFFFF" : "#9CA3AF"} />
        </Pressable>
      </View>
    </>
  );
}

function ContactTab({
  requestType,
  onRequestTypeChange,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  onSend,
  isDark,
}: {
  requestType: RequestType;
  onRequestTypeChange: (t: RequestType) => void;
  subject: string;
  onSubjectChange: (v: string) => void;
  message: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  isDark: boolean;
}) {
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "#F3F4F6" : "#111827";

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo di richiesta</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => onRequestTypeChange(type)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: requestType === type ? "#3B82F6" : inputBg,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: requestType === type ? "#FFFFFF" : isDark ? "#D1D5DB" : "#374151",
              }}
            >
              {REQUEST_TYPE_LABEL[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Oggetto</Text>
      <TextInput
        value={subject}
        onChangeText={onSubjectChange}
        placeholder="Oggetto del messaggio"
        placeholderTextColor="#9CA3AF"
        style={{
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 9,
          backgroundColor: inputBg,
          color: textColor,
          fontSize: 14,
        }}
      />

      <Text className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Messaggio</Text>
      <TextInput
        value={message}
        onChangeText={onMessageChange}
        placeholder="Descrivi la tua richiesta..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        style={{
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 9,
          backgroundColor: inputBg,
          color: textColor,
          fontSize: 14,
          minHeight: 90,
          textAlignVertical: "top",
        }}
      />

      <Pressable
        onPress={onSend}
        disabled={!subject.trim() || !message.trim()}
        style={{
          marginTop: 8,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor: subject.trim() && message.trim() ? "#3B82F6" : inputBg,
        }}
      >
        <Text
          style={{
            fontWeight: "600",
            color: subject.trim() && message.trim() ? "#FFFFFF" : "#9CA3AF",
          }}
        >
          Invia richiesta
        </Text>
      </Pressable>
    </ScrollView>
  );
}
