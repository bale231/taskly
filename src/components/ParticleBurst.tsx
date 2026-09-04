import { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export interface ParticleBurstRef {
  /** Fa esplodere un burst di particelle centrato su (x, y), in coordinate
   * assolute rispetto allo schermo (es. da `measure()`/`onLayout` del
   * bottone che ha scatenato l'azione). */
  trigger: (x: number, y: number, color?: string) => void;
}

const PARTICLE_COUNT = 10;
const BURST_RADIUS = 46;
const PARTICLE_SIZE = 7;
const DURATION = 480;

interface Burst {
  id: number;
  x: number;
  y: number;
  color: string;
}

/**
 * Overlay per un burst di piccoli cerchi che esplodono radialmente da un
 * punto e sfumano in dissolvenza — il "confetti" leggero per completare un
 * todo o creare/eliminare qualcosa. Stessa architettura imperativa di
 * `BubbleTapEffect` (ref.trigger()), ma pensato per essere montato UNA sola
 * volta vicino alla radice dello schermo (non dentro ogni riga), dato che le
 * particelle devono poter esplodere liberamente oltre i confini della riga
 * che le ha generate, sopra il resto del contenuto.
 */
const ParticleBurst = forwardRef<ParticleBurstRef>((_props, ref) => {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useImperativeHandle(ref, () => ({
    trigger: (x: number, y: number, color = "#22C55E") => {
      const id = Date.now() + Math.random();
      setBursts((prev) => [...prev, { id, x, y, color }]);
      // Smontata dopo la durata dell'animazione: evita che l'array cresca
      // indefinitamente se l'utente completa molti todo di fila.
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, DURATION + 50);
    },
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst) => (
        <BurstParticles key={burst.id} {...burst} />
      ))}
    </View>
  );
});

function BurstParticles({ x, y, color }: Burst) {
  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} originX={x} originY={y} color={color} />
      ))}
    </>
  );
}

function Particle({
  index,
  originX,
  originY,
  color,
}: {
  index: number;
  originX: number;
  originY: number;
  color: string;
}) {
  const progress = useSharedValue(0);

  // Angoli distribuiti uniformemente sul cerchio, con un piccolo jitter per
  // non sembrare un pattern troppo geometrico/artificiale.
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
  const distance = BURST_RADIUS * (0.7 + Math.random() * 0.5);
  const targetX = Math.cos(angle) * distance;
  const targetY = Math.sin(angle) * distance;

  useState(() => {
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
  });

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: targetX * progress.value },
      { translateY: targetY * progress.value },
      { scale: 1 - progress.value * 0.5 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: originX - PARTICLE_SIZE / 2,
          top: originY - PARTICLE_SIZE / 2,
          width: PARTICLE_SIZE,
          height: PARTICLE_SIZE,
          borderRadius: PARTICLE_SIZE / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export default ParticleBurst;
