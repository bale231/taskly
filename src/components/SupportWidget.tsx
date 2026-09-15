import {
  Bot,
  Mail,
  MessageCircle,
  Send,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
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
import { sendAIChatMessage, type ConversationMessage } from "../api/aiChat";
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      text: "Ciao! 👋 Sono l'assistente di Taskly. Come posso aiutarti?",
      sender: "bot",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
        const response = await sendAIChatMessage(trimmed, history);
        appendMessage({ id: messageIdCounter++, text: response.reply, sender: "bot" });
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
        <Animated.View
          entering={FadeIn.duration(220)}
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
                tema-aware su Android — stesso pattern del bottone "+" di
                ListDetailScreen: GlassSurface come sfondo assoluto, tinta
                colorata sopra. Denso come i pulsanti di chiamata nativi
                iOS (verde/rosso), non un velo semitrasparente: la tinta
                sta su un livello suo, separato dall'icona, che quindi
                resta a piena opacità invece di sbiadire insieme al colore. */}
            <GlassSurface
              style={StyleSheet.absoluteFill}
              colorScheme={isDark ? "dark" : "light"}
              tint={isDark ? "dark" : "light"}
              intensity={80}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: "#3B82F6", opacity: 0.92 }]}
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
            <Pressable onPress={handleClose} hitSlop={8} className="rounded-lg p-1.5">
              <X size={20} color={isDark ? "#D1D5DB" : "#374151"} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: "row" }}>
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} isDark={isDark} />
          </View>

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
        </Animated.View>
      )}
    </>
  );
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
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: activeTab === "ai" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280",
          }}
        >
          Assistente AI
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("contact")}
        style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: activeTab === "contact" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280",
          }}
        >
          Contattaci
        </Text>
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
