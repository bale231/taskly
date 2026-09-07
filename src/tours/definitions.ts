/**
 * Definizione dei tour contestuali dell'app: a differenza di un onboarding
 * unico mostrato tutto insieme al login, qui ogni tour è indipendente e
 * parte al primo verificarsi di un evento specifico (es. la prima lista
 * creata), guidando l'utente sulle funzionalità di quella sola schermata.
 */
export type TourId = "listCard" | "todoCreate" | "categories";

export interface TourStep {
  /** Deve combaciare con l'id passato a useTourTarget() nel componente target. */
  targetId: string;
  title: string;
  description: string;
}

export interface TourDefinition {
  id: TourId;
  steps: TourStep[];
}

export const TOURS: Record<TourId, TourDefinition> = {
  listCard: {
    id: "listCard",
    steps: [
      {
        targetId: "list-edit-mode-button",
        title: "Modalità modifica",
        description:
          "Tocca qui per attivare la modalità modifica: potrai modificare, archiviare, condividere ed eliminare le tue liste.",
      },
      {
        targetId: "list-share-button",
        title: "Condividi",
        description: "In modalità modifica, tocca questa icona per condividere la lista con i tuoi amici.",
      },
      {
        targetId: "list-delete-button",
        title: "Elimina",
        description: "Tocca questa icona per eliminare la lista. Puoi anche archiviarla invece di eliminarla.",
      },
    ],
  },
  todoCreate: {
    id: "todoCreate",
    steps: [
      {
        targetId: "todo-input-field",
        title: "Aggiungi una ToDo",
        description: "Scrivi qui il nome della tua prima attività da fare in questa lista.",
      },
      {
        targetId: "todo-add-button",
        title: "Conferma",
        description: "Tocca questo pulsante per aggiungere la ToDo alla lista, con quantità e unità opzionali.",
      },
    ],
  },
  categories: {
    id: "categories",
    steps: [
      {
        targetId: "category-picker-button",
        title: "Filtra per categoria",
        description: "Tocca qui per filtrare le liste in base alla categoria appena creata.",
      },
    ],
  },
};
