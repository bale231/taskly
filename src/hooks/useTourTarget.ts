import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useTour } from "../context/TourContext";

/**
 * Registra un componente come "target" evidenziabile da un tour: quando
 * questo targetId diventa quello attivo dello step corrente, misura la
 * propria posizione assoluta a schermo e la riporta al TourContext, che la
 * usa per disegnare il buco nell'overlay.
 *
 * Uso: <View ref={ref} onLayout={onLayout} collapsable={false}>...</View>
 * `collapsable={false}` è necessario su Android per evitare che la View
 * venga "appiattita" dal renderer nativo, il che farebbe fallire measure().
 */
export function useTourTarget(targetId: string) {
  const { activeTargetId, reportTargetRect } = useTour();
  const ref = useRef<View>(null);
  const isActive = activeTargetId === targetId;

  const measure = useCallback(() => {
    if (!isActive) return;
    // measureInWindow (non measure()) dà coordinate assolute rispetto allo
    // schermo, indipendenti da scroll/nesting del genitore — quello che
    // serve per disegnare il buco nell'overlay, che è a sua volta assoluto.
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        reportTargetRect(targetId, { x, y, width, height });
      }
    });
  }, [isActive, targetId, reportTargetRect]);

  useEffect(() => {
    if (!isActive) return;
    // Un frame di ritardo: measureInWindow subito dopo il mount/attivazione
    // a volte restituisce 0,0,0,0 se il layout non si è ancora assestato
    // (es. subito dopo una navigazione).
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [isActive, measure]);

  useEffect(() => {
    return () => {
      if (isActive) reportTargetRect(targetId, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  return { ref, onLayout: measure, isActive };
}
