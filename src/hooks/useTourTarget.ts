import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useTour } from "../context/TourContext";

/**
 * Registra un componente come "target" evidenziabile da un tour: quando
 * questo targetId (o uno degli id, se ne viene passato un array — utile
 * quando lo stesso bottone fisico è il target di più tour diversi, es. il
 * bottone modifica evidenziato sia dal tour di benvenuto che da quello
 * contestuale della card lista) diventa quello attivo dello step corrente,
 * misura la propria posizione assoluta a schermo e la riporta al
 * TourContext, che la usa per disegnare il buco nell'overlay.
 *
 * Uso: <View ref={ref} onLayout={onLayout} collapsable={false}>...</View>
 * `collapsable={false}` è necessario su Android per evitare che la View
 * venga "appiattita" dal renderer nativo, il che farebbe fallire measure().
 */
export function useTourTarget(targetId: string | string[]) {
  const { activeTargetId, reportTargetRect } = useTour();
  const ref = useRef<View>(null);
  const ids = Array.isArray(targetId) ? targetId : [targetId];
  const isActive = activeTargetId != null && ids.includes(activeTargetId);
  // Il targetId "reale" da riportare è sempre quello attivo del tour
  // corrente (non il primo dell'array), altrimenti reportTargetRect lo
  // scarterebbe silenziosamente perché non combacia con activeTargetId.
  const reportId = activeTargetId ?? ids[0];

  const measure = useCallback(() => {
    if (!isActive) return;
    // measureInWindow (non measure()) dà coordinate assolute rispetto allo
    // schermo, indipendenti da scroll/nesting del genitore — quello che
    // serve per disegnare il buco nell'overlay, che è a sua volta assoluto.
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        reportTargetRect(reportId, { x, y, width, height });
      }
    });
  }, [isActive, reportId, reportTargetRect]);

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
      if (isActive) reportTargetRect(reportId, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  return { ref, onLayout: measure, isActive };
}
