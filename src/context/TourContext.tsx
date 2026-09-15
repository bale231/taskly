import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { navigate } from "../navigation/navigationRef";
import { TOURS, type TourId } from "../tours/definitions";

const STORAGE_KEY = "tours:completed";

/** Rettangolo (in coordinate assolute schermo) dell'elemento attualmente
 * evidenziato dal tour attivo, misurato dal componente target stesso
 * tramite useTourTarget(). */
export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourContextType {
  /** True solo dopo aver letto lo stato persistito dei tour completati:
   * prima di questo, startTour() rifiuta ogni chiamata (per non far partire
   * un tour già completato in una sessione precedente). Un chiamante che
   * ha bisogno di ritentare startTour() non appena diventa possibile
   * (es. al mount di una schermata, prima che la rehydration sia pronta)
   * deve osservare questo flag invece di un setTimeout a tempo fisso. */
  rehydrated: boolean;
  /** Tour correntemente in corso, o null se nessuno. */
  activeTourId: TourId | null;
  /** Indice dello step corrente all'interno del tour attivo. */
  activeStepIndex: number;
  /** Rettangolo del target dello step corrente, riportato da useTourTarget(). */
  activeRect: TargetRect | null;
  /** Il target dello step corrente, per sapere quale targetId aspettarsi.
   * null anche per uno step "intro" senza targetId. */
  activeTargetId: string | null;
  /** Avvia un tour, solo se non è già stato completato/saltato in passato. */
  startTour: (id: TourId) => void;
  /** Passa allo step successivo, o chiude il tour se era l'ultimo. Se lo
   * step successivo richiede una navigazione, la esegue prima di mostrarlo. */
  nextStep: () => void;
  /** Salta l'intero tour corrente, marcandolo come completato. */
  skipTour: () => void;
  /** Il componente target chiama questa per riportare la propria posizione
   * quando diventa il target attivo dello step corrente. */
  reportTargetRect: (targetId: string, rect: TargetRect | null) => void;
  /** Azzera tutti i tour completati/saltati, così ripartiranno al prossimo
   * evento utile (bottone "Azzera tutorial" in Profilo). */
  resetAllTours: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

export function TourProvider({ children }: { children: ReactNode }) {
  const [completedTours, setCompletedTours] = useState<Set<TourId>>(new Set());
  const [rehydrated, setRehydrated] = useState(false);
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeRect, setActiveRect] = useState<TargetRect | null>(null);
  // Persistito solo dopo il rehydrate iniziale, per non sovrascrivere lo
  // storage con un Set vuoto prima ancora di aver letto quello salvato.
  const hasRehydratedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const ids = JSON.parse(raw) as TourId[];
            setCompletedTours(new Set(ids));
          } catch {
            // Storage corrotto: si riparte da zero, non blocca l'app.
          }
        }
      })
      .finally(() => {
        hasRehydratedRef.current = true;
        setRehydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!hasRehydratedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedTours))).catch(() => {});
  }, [completedTours]);

  const activeTargetId =
    activeTourId != null ? (TOURS[activeTourId].steps[activeStepIndex]?.targetId ?? null) : null;

  const startTour = useCallback(
    (id: TourId) => {
      if (!rehydrated) return;
      if (completedTours.has(id)) return;
      if (activeTourId != null) return; // Un tour alla volta.
      const firstStep = TOURS[id].steps[0];
      if (firstStep?.navigateTo) {
        navigate(firstStep.navigateTo.screen, firstStep.navigateTo.params as never);
      }
      setActiveTourId(id);
      setActiveStepIndex(0);
      setActiveRect(null);
    },
    [rehydrated, completedTours, activeTourId]
  );

  const finishTour = useCallback((id: TourId) => {
    setCompletedTours((prev) => new Set(prev).add(id));
    setActiveTourId(null);
    setActiveStepIndex(0);
    setActiveRect(null);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTourId) return;
    const steps = TOURS[activeTourId].steps;
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= steps.length) {
      finishTour(activeTourId);
      return;
    }
    const step = steps[nextIndex];
    if (step.navigateTo) {
      navigate(step.navigateTo.screen, step.navigateTo.params as never);
    }
    setActiveStepIndex(nextIndex);
    setActiveRect(null);
  }, [activeTourId, activeStepIndex, finishTour]);

  const skipTour = useCallback(() => {
    if (!activeTourId) return;
    finishTour(activeTourId);
  }, [activeTourId, finishTour]);

  const reportTargetRect = useCallback(
    (targetId: string, rect: TargetRect | null) => {
      if (targetId !== activeTargetId) return;
      setActiveRect(rect);
    },
    [activeTargetId]
  );

  const resetAllTours = useCallback(async () => {
    setCompletedTours(new Set());
    setActiveTourId(null);
    setActiveStepIndex(0);
    setActiveRect(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <TourContext.Provider
      value={{
        rehydrated,
        activeTourId,
        activeStepIndex,
        activeRect,
        activeTargetId,
        startTour,
        nextStep,
        skipTour,
        reportTargetRect,
        resetAllTours,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
