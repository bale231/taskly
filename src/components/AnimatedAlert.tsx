import { AlertCircle, CheckCircle, X, XCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassSurface from "./GlassSurface";
import { useTheme } from "../context/ThemeContext";

type Alert = { type: "success" | "error" | "warning"; message: string };

interface AnimatedAlertProps {
  alert: Alert | null;
  onClose: () => void;
}

const CONFIG = {
  success: { Icon: CheckCircle, color: "#22C55E" },
  error: { Icon: XCircle, color: "#EF4444" },
  warning: { Icon: AlertCircle, color: "#F59E0B" },
} as const;

/**
 * Toast in alto, stile banner di notifica iOS: sfondo in blur, icona
 * colorata per tipo, auto-dismiss dopo 4s. Va tenuto sempre montato dal
 * chiamante (mai `{alert && <AnimatedAlert .../>}`): se un nuovo alert
 * arriva mentre uno è già visibile, questo componente anima prima l'uscita
 * di quello vecchio e poi l'entrata del nuovo, invece di sovrascrivere il
 * testo di scatto a metà animazione.
 */
export default function AnimatedAlert({ alert, onClose }: AnimatedAlertProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState<Alert | null>(alert);
  // Il vero Liquid Glass (GlassSurface) resta visibile come "vetro vuoto"
  // finché è montato, anche a translateY/opacity 0 sul contenuto: durante
  // l'uscita va nascosto esplicitamente tramite la sua prop `visible`,
  // altrimenti un residuo di vetro senza contenuto resta incollato sotto la
  // dynamic island per la durata dell'animazione (e -100px non è comunque
  // sufficiente a portarlo del tutto fuori schermo su tutti i device).
  const [glassVisible, setGlassVisible] = useState(false);

  const animateOut = (onDone?: () => void) => {
    setGlassVisible(false);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -200, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone?.();
    });
  };

  const animateIn = () => {
    translateY.setValue(-200);
    opacity.setValue(0);
    setGlassVisible(true);
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  // Sincronizza `displayed` col prop `alert`: se non c'è nulla in vista lo
  // mostra subito, se c'è già un alert diverso lo fa prima uscire e solo
  // dopo mostra il nuovo, così un cambio rapido (es. attiva/disattiva
  // modalità modifica) non sovrascrive il testo senza animazione.
  useEffect(() => {
    if (!alert) {
      if (displayed) animateOut(() => setDisplayed(null));
      return;
    }
    if (!displayed) {
      setDisplayed(alert);
      animateIn();
    } else if (displayed.message !== alert.message || displayed.type !== alert.type) {
      animateOut(() => {
        setDisplayed(alert);
        animateIn();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert?.type, alert?.message]);

  // Auto-dismiss: riparte ogni volta che cambia l'alert effettivamente mostrato.
  useEffect(() => {
    if (!displayed) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed?.type, displayed?.message]);

  if (!displayed) return null;

  const { Icon, color } = CONFIG[displayed.type];

  return (
    <View
      className="absolute left-0 right-0 z-50 items-center"
      style={{ top: insets.top + 8 }}
      pointerEvents="box-none"
    >
      {/* Niente `opacity` qui (solo `transform`): questa View è antenata del
          GlassSurface, e animarne l'opacità disabilita il Liquid Glass in
          modo permanente invece di renderlo solo invisibile (stesso limite
          già visto su navbar/modali). Il "fade" resta comunque visibile
          perché lo applichiamo alla tinta colorata e al contenuto sotto,
          mentre il vetro resta sempre attivo. */}
      <Animated.View
        style={{ transform: [{ translateY }], maxWidth: "88%" }}
        className="overflow-hidden rounded-2xl android:rounded-xl border border-white/20 shadow-2xl"
      >
        {/* Niente `tintColor` qui: sul vero Liquid Glass lo rende quasi
            opaco, coprendo il blur invece di limitarsi a colorarlo. La
            tinta arriva dalla View colorata sotto, il vetro resta puro. */}
        <GlassSurface
          style={StyleSheet.absoluteFill}
          visible={glassVisible}
          colorScheme={isDark ? "dark" : "light"}
          tint={isDark ? "dark" : "light"}
          intensity={80}
        />
        {/* Tinta colorata sopra al blur/vetro: garantisce un colore pieno e
            leggibile (come nella versione originale) invece di affidarsi
            solo alla sottigliezza del tint nativo del glass. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: Animated.multiply(opacity, 0.55) }]}
          pointerEvents="none"
        />
        <Animated.View style={{ opacity }} className="flex-row items-center gap-3 px-6 py-4">
          <Icon size={24} color="#FFFFFF" />
          <Text className="flex-shrink text-base font-medium text-white" numberOfLines={2}>
            {displayed.message}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} className="rounded-full p-1">
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
