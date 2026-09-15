/**
 * Definizione dei tour dell'app.
 *
 * "welcome": il vero tour di benvenuto, parte al primo login (o alla prima
 * apertura della Home dopo la registrazione) e guida l'utente attraverso le
 * funzionalità principali di più schermate in sequenza, navigando
 * automaticamente da una all'altra — come un vero tour guidato, non un
 * singolo suggerimento isolato. Il primo step è sempre uno schermo di
 * benvenuto puro (nessun target da evidenziare), con la scelta esplicita
 * "Inizia il tour" / "Salta il tutorial".
 *
 * Gli altri tour (listCard, todoCreate, categories) restano contestuali:
 * partono al verificarsi di un evento specifico (prima lista creata, prima
 * apertura di una lista vuota, prima categoria creata) invece che in
 * sequenza fissa al login — utili anche se l'utente salta il welcome tour,
 * o li rivede singolarmente dopo un "Azzera tutorial".
 */
export type TourId = "welcome" | "listCard" | "todoCreate" | "categories";

export type RouteName = "Home" | "ListDetail" | "Profile";

export interface TourStep {
  /**
   * Assente per lo step introduttivo "welcome" (schermata di benvenuto pura,
   * nessun elemento da evidenziare). Deve combaciare con l'id passato a
   * useTourTarget() nel componente target per tutti gli altri step.
   */
  targetId?: string;
  title: string;
  description: string;
  /** Se presente, il tour naviga verso questa schermata prima di mostrare
   * lo step (con eventuali params, es. il listId della prima lista
   * disponibile per aprire ListDetail). */
  navigateTo?: { screen: RouteName; params?: Record<string, unknown> };
}

export interface TourDefinition {
  id: TourId;
  steps: TourStep[];
}

export const TOURS: Record<TourId, TourDefinition> = {
  welcome: {
    id: "welcome",
    steps: [
      {
        title: "Benvenuto su Taskly! 👋",
        description:
          "Ti va di fare un breve tour guidato per scoprire le funzionalità principali dell'app? Richiede solo un minuto.",
      },
      {
        targetId: "welcome-find-users",
        title: "Trova utenti",
        description: "Cerca altre persone per username e invia loro una richiesta di amicizia.",
      },
      {
        targetId: "welcome-friend-requests",
        title: "Richieste di amicizia",
        description: "Da qui gestisci le richieste di amicizia in arrivo: accetta o rifiuta.",
      },
      {
        targetId: "welcome-friends",
        title: "I tuoi amici",
        description: "L'elenco dei tuoi amici, con cui potrai condividere liste e categorie.",
      },
      {
        targetId: "welcome-new-category",
        title: "Nuova categoria",
        description: "Crea categorie (es. Casa, Lavoro, Spesa) per organizzare le tue liste.",
      },
      {
        targetId: "welcome-archive",
        title: "Archivio",
        description: "Le liste archiviate non vengono eliminate: le trovi sempre qui, pronte a essere ripristinate.",
      },
      {
        targetId: "welcome-search",
        title: "Ricerca",
        description: "Cerca liste e todo in tempo reale, mentre scrivi.",
      },
      {
        targetId: "welcome-create-list",
        title: "Crea una lista",
        description: "Tocca qui per creare la tua prima lista: dalle un nome, un colore e opzionalmente una categoria.",
      },
      {
        targetId: "welcome-edit-mode",
        title: "Modalità modifica",
        description: "Attiva la modalità modifica per modificare, archiviare, condividere ed eliminare le tue liste.",
      },
    ],
  },
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
