import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type AlertType = "success" | "error" | "warning";
type Alert = { type: AlertType; message: string };

interface AlertContextType {
  alert: Alert | null;
  showAlert: (type: AlertType, message: string) => void;
  hideAlert: () => void;
  /**
   * Ogni <BubbleModal> visibile si registra qui e renderizza al suo interno
   * una copia dell'alert (unico modo per farlo apparire SOPRA il blur di
   * quella modale, che è una finestra nativa separata): il toast globale in
   * App.tsx deve quindi restare muto mentre almeno una modale è aperta,
   * altrimenti comparirebbe due volte (uno sotto il blur, invisibile; uno
   * dentro la modale, visibile — ma comunque duplicato in coda quando la
   * modale si chiude prima che l'alert scompaia).
   */
  registerModalOpen: () => void;
  registerModalClosed: () => void;
  hasOpenModal: () => boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
};

/**
 * Un solo alert globale (toast in blur, vedi AnimatedAlert) invece di uno
 * stato locale duplicato in ogni schermata: prima ogni form aveva la sua
 * gestione errori diversa (banner statico, alert silenzioso, niente feedback
 * affatto per errori di rete su creazione todo/liste) — ora ogni azione
 * dell'app, dalla validazione di un campo vuoto a un fallimento del backend,
 * passa da qui con lo stesso linguaggio visivo (colore/icona coerenti col
 * tipo: successo, errore, warning).
 */
export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [openModalCount, setOpenModalCount] = useState(0);
  const openModalCountRef = useRef(0);

  const showAlert = useCallback((type: AlertType, message: string) => {
    setAlert({ type, message });
  }, []);

  const hideAlert = useCallback(() => setAlert(null), []);

  const registerModalOpen = useCallback(() => {
    openModalCountRef.current += 1;
    setOpenModalCount(openModalCountRef.current);
  }, []);

  const registerModalClosed = useCallback(() => {
    openModalCountRef.current = Math.max(0, openModalCountRef.current - 1);
    setOpenModalCount(openModalCountRef.current);
  }, []);

  const hasOpenModal = useCallback(() => openModalCount > 0, [openModalCount]);

  return (
    <AlertContext.Provider
      value={{ alert, showAlert, hideAlert, registerModalOpen, registerModalClosed, hasOpenModal }}
    >
      {children}
    </AlertContext.Provider>
  );
};
