// Port di src/data/appKnowledgeBase.ts della webapp: fallback offline del
// chatbot quando il servizio AI reale non risponde (rete assente o errore
// server). Motore a scoring per keyword, non un semplice mapping 1:1 —
// nessuna dipendenza DOM, portato quasi identico dalla webapp.
export interface KnowledgeEntry {
  keywords: string[];
  answer: string;
  category: string;
}

export const knowledgeBase: KnowledgeEntry[] = [
  // === REGISTRAZIONE ===
  {
    keywords: ["registrazione", "registrare", "registrarmi", "creare account", "signup", "sign up", "nuovo account", "iscrivermi", "iscrizione"],
    answer: "Per registrarti:\n1. Dalla schermata di login, tocca \"Registrati\"\n2. Inserisci username, email e password\n3. La password deve avere almeno 8 caratteri, una maiuscola e un numero\n4. Conferma la password e tocca \"Registrati\"\n5. Controlla la tua email e tocca sul link di verifica per attivare l'account",
    category: "account",
  },
  {
    keywords: ["verificare email", "verifica email", "conferma email", "link verifica", "email verifica", "non riesco a loggarmi", "mail conferma"],
    answer: "Dopo la registrazione, riceverai un'email con un link di verifica. Devi toccare quel link prima di poter accedere. Controlla anche la cartella spam se non la trovi nella posta in arrivo.",
    category: "account",
  },

  // === LOGIN ===
  {
    keywords: ["login", "accedere", "accesso", "entrare", "loggare", "loggarmi", "autenticazione", "credenziali"],
    answer: "Per accedere:\n1. Scegli se usare Username o Email con i pulsanti in alto\n2. Inserisci le tue credenziali\n3. Attiva \"Rimani loggato\" se vuoi restare connesso\n4. Tocca \"Accedi\"\n\nRicorda: devi aver verificato l'email prima di poter accedere.",
    category: "account",
  },
  {
    keywords: ["rimani loggato", "resta connesso", "ricordami", "remember me", "sessione", "disconnette"],
    answer: "Attiva l'opzione \"Rimani loggato\" nella schermata di login per non dover reinserire le credenziali ogni volta. Se non la attivi, la sessione scade alla chiusura dell'app.",
    category: "account",
  },

  // === PASSWORD ===
  {
    keywords: ["password dimenticata", "dimenticato password", "recupero password", "reset password", "reimpostare password", "cambiare password", "nuova password", "non ricordo password"],
    answer: "Se hai dimenticato la password:\n1. Dalla schermata di login, tocca \"Hai dimenticato la password?\"\n2. Inserisci la tua email\n3. Controlla la casella di posta\n4. Tocca sul link ricevuto e imposta una nuova password\n\nPuoi anche cambiare la password dalla pagina Profilo toccando \"Cambia la password\".",
    category: "account",
  },

  // === PROFILO ===
  {
    keywords: ["profilo", "modificare profilo", "cambiare username", "cambiare nome", "cambiare email", "foto profilo", "immagine profilo", "avatar"],
    answer: "Dalla pagina Profilo puoi:\n- Cambiare la foto profilo toccando l'immagine\n- Rimuovere la foto con il pulsante apposito\n- Modificare username e email toccando \"Modifica profilo\"\n- Cambiare password toccando \"Cambia la password\"\n- Gestire le notifiche push",
    category: "account",
  },

  // === LOGOUT ===
  {
    keywords: ["logout", "uscire", "disconnettere", "esci", "scollegare"],
    answer: "Per effettuare il logout:\n1. Vai nella pagina Profilo\n2. Tocca il pulsante \"Esci dall'account\" in basso",
    category: "account",
  },

  // === DISATTIVAZIONE ===
  {
    keywords: ["disattivare account", "eliminare account", "cancellare account", "rimuovere account", "disattivazione"],
    answer: "Per disattivare l'account:\n1. Vai nella pagina Profilo\n2. Scorri fino in fondo\n3. Tocca \"Disattiva il mio account\"\n4. Conferma nel popup\n\n⚠️ Attenzione: questa operazione è irreversibile e tutti i tuoi dati verranno eliminati definitivamente.",
    category: "account",
  },

  // === LISTE - CREAZIONE ===
  {
    keywords: ["creare lista", "nuova lista", "aggiungere lista", "come creo", "crea lista", "creazione lista"],
    answer: "Per creare una nuova lista:\n\nTocca l'icona \"+\" gialla nella Home. Inserisci il nome, scegli un colore e opzionalmente una categoria, poi tocca \"Crea\".",
    category: "liste",
  },

  // === LISTE - COLORI ===
  {
    keywords: ["colori", "colore lista", "personalizzare colore", "cambiare colore", "blu", "verde", "giallo", "rosso", "viola"],
    answer: "Puoi personalizzare ogni lista con 5 colori:\n🔵 Blu - Colore predefinito\n🟢 Verde - Per liste importanti\n🟡 Giallo - Per liste in corso\n🔴 Rosso - Per liste urgenti\n🟣 Viola - Per liste speciali\n\nPuoi cambiare il colore durante la creazione o la modifica della lista.",
    category: "liste",
  },

  // === LISTE - MODIFICA ===
  {
    keywords: ["modificare lista", "modifica lista", "editare lista", "rinominare lista", "cambiare nome lista"],
    answer: "Per modificare una lista:\n\nMetodo 1: Attiva la \"Modalità modifica\" dal menu, poi tocca l'icona matita sulla lista\nMetodo 2: Scorri la lista verso sinistra per vedere le opzioni rapide\n\nPuoi modificare nome, colore e categoria della lista.",
    category: "liste",
  },

  // === LISTE - ELIMINAZIONE ===
  {
    keywords: ["eliminare lista", "cancellare lista", "rimuovere lista", "elimina lista"],
    answer: "Per eliminare una lista:\n- In modalità modifica, tocca l'icona cestino\n- Oppure scorri verso sinistra\n- Conferma l'eliminazione\n\n⚠️ Attenzione: eliminare una lista cancellerà anche tutte le to-do al suo interno. Considera l'archiviazione come alternativa.",
    category: "liste",
  },

  // === LISTE - ARCHIVIAZIONE ===
  {
    keywords: ["archiviare", "archivio", "archiviazione", "ripristinare lista", "nascondere lista"],
    answer: "Per archiviare una lista:\n- In modalità modifica, tocca l'icona archivio\n\nPer vedere le liste archiviate:\n- Tocca il pulsante \"Archivio\" nella Home\n\nPer ripristinare una lista:\n- Nell'archivio, tocca l'icona di ripristino sulla lista\n\nL'archiviazione è un'ottima alternativa all'eliminazione!",
    category: "liste",
  },

  // === LISTE - ORDINAMENTO ===
  {
    keywords: ["ordinare liste", "ordinamento liste", "ordine liste", "filtrare liste", "filtro liste", "sort"],
    answer: "Puoi ordinare le liste in 3 modi:\n1. Per creazione - Le più recenti per prime\n2. Alfabetico - Dalla A alla Z\n3. Per completezza - Le meno complete per prime\n\nUsa il pulsante \"Ordina\" nella barra in basso per cambiare l'ordinamento.",
    category: "liste",
  },

  // === LISTE - CONDIVISIONE ===
  {
    keywords: ["condividere lista", "condivisione", "sharing", "share", "lista condivisa", "invitare", "permessi"],
    answer: "Per condividere una lista:\n1. Attiva la modalità modifica\n2. Tocca l'icona di condivisione (viola) sulla lista\n3. Seleziona gli amici con cui condividere\n4. Scegli i permessi: solo lettura o modifica\n5. Conferma\n\nLe liste condivise con te appariranno con un badge \"Condivisa da [nome]\".",
    category: "social",
  },

  // === TODO - CREAZIONE ===
  {
    keywords: ["creare todo", "nuova todo", "aggiungere todo", "aggiungere attivita", "aggiungere elemento", "come aggiungo", "nuova attivita"],
    answer: "Per aggiungere una to-do:\n1. Apri una lista toccandola\n2. Scrivi il nome nel campo di testo in alto\n3. Tocca \"+\"\n4. Nel popup, puoi aggiungere quantità e unità di misura\n5. Tocca \"Aggiungi\"\n\nPuoi aggiungere dettagli come \"Latte - 2 litri\" o \"Uova - 6 pz\".",
    category: "todo",
  },

  // === TODO - QUANTITÀ ===
  {
    keywords: ["quantita", "unita", "unita di misura", "litri", "kg", "pezzi", "quanto", "peso"],
    answer: "Puoi aggiungere quantità e unità di misura alle tue to-do! Perfetto per la lista della spesa.\n\nEsempi:\n- Latte → 2 litri\n- Uova → 6 pz\n- Farina → 1 kg\n- Biscotti → 3 confezioni\n\nInserisci quantità e unità nel popup di creazione o modifica della to-do.",
    category: "todo",
  },

  // === TODO - COMPLETAMENTO ===
  {
    keywords: ["completare", "completato", "fatto", "segnare fatto", "check", "spuntare", "checkbox", "barrare"],
    answer: "Per segnare una to-do come completata:\n- Tocca la checkbox verde a sinistra della to-do\n- La to-do verrà barrata\n- Tocca di nuovo per rimuovere il completamento\n\nPuoi ordinare le to-do per completezza per vedere prima quelle non ancora fatte.",
    category: "todo",
  },

  // === TODO - MODIFICA ===
  {
    keywords: ["modificare todo", "editare todo", "cambiare todo", "aggiornare todo", "modifica attivita"],
    answer: "Per modificare una to-do:\n\nMetodo 1: Attiva la modalità modifica dal menu, poi tocca l'icona matita\nMetodo 2: Scorri verso sinistra e tocca \"Modifica\"\n\nPuoi modificare titolo, quantità e unità di misura.",
    category: "todo",
  },

  // === TODO - ELIMINAZIONE ===
  {
    keywords: ["eliminare todo", "cancellare todo", "rimuovere todo", "eliminazione multipla", "eliminare piu todo", "elimina selezionate"],
    answer: "Per eliminare una to-do:\n- In modalità modifica, tocca l'icona cestino\n- Oppure: scorri verso sinistra e tocca \"Elimina\"\n\nPer eliminare più to-do:\n1. Attiva la modalità modifica\n2. Seleziona le to-do con le checkbox\n3. Usa \"Seleziona tutte\" se necessario\n4. Tocca \"Elimina selezionate\"",
    category: "todo",
  },

  // === TODO - SPOSTAMENTO ===
  {
    keywords: ["spostare todo", "muovere todo", "trasferire todo", "altra lista", "sposta"],
    answer: "Per spostare una to-do in un'altra lista:\n1. Attiva la modalità modifica\n2. Tocca l'icona con le frecce (Sposta)\n3. Seleziona la lista di destinazione\n4. Conferma lo spostamento\n\nLa to-do verrà rimossa dalla lista attuale e aggiunta a quella selezionata.",
    category: "todo",
  },

  // === TODO - DRAG & DROP ===
  {
    keywords: ["drag drop", "drag and drop", "trascinare", "riordinare", "ordine manuale", "spostare ordine"],
    answer: "Puoi riordinare le to-do tenendo premuto sull'icona \"maniglia\" a destra della to-do e trascinandola nella posizione desiderata.\n\nNota: il riordino funziona solo con l'ordinamento \"Per creazione\". Con altri ordinamenti, la posizione è automatica.",
    category: "todo",
  },

  // === TODO - ORDINAMENTO ===
  {
    keywords: ["ordinare todo", "ordinamento todo", "ordine todo", "filtrare todo"],
    answer: "Puoi ordinare le to-do in 3 modi:\n1. Per creazione - Ordine manuale personalizzabile trascinando\n2. Alfabetico - Dalla A alla Z\n3. Per completezza - Le to-do non completate per prime\n\nUsa l'icona filtro nella pagina della lista per cambiare l'ordinamento.",
    category: "todo",
  },

  // === CATEGORIE ===
  {
    keywords: ["categoria", "categorie", "creare categoria", "nuova categoria", "organizzare", "raggruppare"],
    answer: "Le categorie ti aiutano a organizzare le liste!\n\nPer creare una categoria:\n1. Dalla Home, tocca il pulsante \"Categoria\" (verde)\n2. Inserisci il nome\n3. Tocca \"Crea\"\n\nPuoi assegnare una categoria durante la creazione o modifica di una lista, e filtrare le liste per categoria dal selettore nella Home.\n\nSuggerimento: crea categorie come \"Casa\", \"Lavoro\", \"Spesa\", \"Progetti\"!",
    category: "categorie",
  },

  // === RICERCA ===
  {
    keywords: ["cercare", "ricerca", "ricercare", "trovare", "cerca", "search", "lente"],
    answer: "Per cercare liste o to-do:\n\nNella Home: Tocca l'icona lente d'ingrandimento e digita il termine. I risultati mostreranno liste il cui nome corrisponde o che contengono to-do corrispondenti.\n\nDentro una lista: Usa l'icona di ricerca per filtrare le to-do in tempo reale, mentre scrivi.",
    category: "funzionalita",
  },

  // === SWIPE ===
  {
    keywords: ["swipe", "scorrere", "gesto", "gesture", "azioni rapide"],
    answer: "Puoi usare lo swipe verso sinistra per accedere alle azioni rapide:\n\nSulle liste: Modifica, Archivia, Elimina\nSulle to-do: Modifica, Elimina\n\nScorri semplicemente l'elemento verso sinistra per vedere i pulsanti delle azioni.",
    category: "funzionalita",
  },

  // === MODALITÀ MODIFICA ===
  {
    keywords: ["modalita modifica", "edit mode", "matita", "icona matita", "modifica multipla"],
    answer: "La modalità modifica ti permette di:\n- Modificare liste e to-do (icona matita)\n- Eliminare elementi (icona cestino)\n- Archiviare liste (icona archivio)\n- Condividere liste (icona condivisione)\n- Spostare to-do tra liste\n- Selezionare ed eliminare più to-do contemporaneamente\n\nAttivala dalla barra in basso.",
    category: "funzionalita",
  },

  // === AMICIZIE ===
  {
    keywords: ["amici", "amicizia", "aggiungere amico", "richiesta amicizia", "trovare utenti", "friend", "amico"],
    answer: "Per gestire le amicizie:\n\n🔍 Trovare utenti: Dalla Home, tocca \"Utenti\" (icona persone blu) e cerca per username\n\n📨 Richieste: Tocca \"Richieste\" (icona verde) per vedere e gestire le richieste di amicizia\n\n👥 Amici: Tocca \"Amici\" (icona viola) per vedere la lista dei tuoi amici\n\nDevi essere amico di qualcuno prima di poter condividere liste!",
    category: "social",
  },

  // === NOTIFICHE ===
  {
    keywords: ["notifiche", "notifica", "push", "campanella", "avvisi", "avviso", "notification"],
    answer: "Taskly ha due tipi di notifiche:\n\n🔔 In-app: Sempre attive, visibili come badge nella campanella. Ti notificano di richieste di amicizia, accettazioni e liste condivise.\n\n📱 Push: Opzionali, arrivano anche con l'app chiusa.\n\nPer attivare le push:\n1. Vai in Profilo\n2. Trova \"Notifiche Push\"\n3. Attiva l'interruttore",
    category: "notifiche",
  },

  // === OFFLINE ===
  {
    keywords: ["offline", "senza internet", "senza connessione", "non funziona", "connessione", "sincronizzazione", "sync", "dati locali"],
    answer: "Taskly funziona anche offline!\n\n✅ Cosa puoi fare offline:\n- Visualizzare liste e to-do\n- Creare nuove liste e to-do\n- Completare e modificare to-do\n\n❌ Cosa richiede internet:\n- Login e registrazione\n- Modifica email/password\n- Gestione amicizie e condivisione\n\nQuando torni online, le modifiche si sincronizzano automaticamente in background.",
    category: "offline",
  },

  // === TEMA ===
  {
    keywords: ["tema", "dark mode", "light mode", "modalita scura", "modalita chiara", "scuro", "chiaro", "notte"],
    answer: "Puoi scegliere tra tema chiaro e scuro toccando l'icona sole/luna nella barra in alto. Il tema cambia istantaneamente e la preferenza viene salvata automaticamente.",
    category: "personalizzazione",
  },

  // === GUIDA ===
  {
    keywords: ["guida", "guida utente", "manuale", "documentazione", "istruzioni", "help", "aiuto"],
    answer: "Trovi una guida contestuale direttamente nell'app: appare automaticamente la prima volta che usi una nuova funzionalità (es. quando crei la tua prima lista o il primo todo), mostrandoti dove sono i vari pulsanti.\n\nSe l'hai saltata e vuoi rivederla, vai in Profilo e tocca \"Azzera tutorial\".",
    category: "generale",
  },

  // === SICUREZZA ===
  {
    keywords: ["sicurezza", "sicuro", "dati", "privacy", "protezione", "crittografia"],
    answer: "I tuoi dati sono al sicuro! Le tue informazioni sono crittografate e salvate in modo sicuro. Non condividiamo i tuoi dati con terze parti. Le password sono protette con hashing sicuro.",
    category: "generale",
  },

  // === GRATUITA ===
  {
    keywords: ["gratis", "gratuita", "costo", "prezzo", "pagamento", "abbonamento", "premium"],
    answer: "Taskly è completamente gratuita! Non ci sono abbonamenti, costi nascosti o funzionalità premium. Tutte le funzionalità sono disponibili per tutti gli utenti.",
    category: "generale",
  },

  // === LISTA CONDIVISA DETTAGLI ===
  {
    keywords: ["permessi condivisione", "solo lettura", "modifica condivisa", "chi ha modificato", "tracciamento"],
    answer: "Nelle liste condivise ci sono due livelli di permessi:\n\n👁️ Solo lettura: Puoi solo visualizzare le to-do\n✏️ Modifica: Puoi aggiungere, completare, modificare ed eliminare to-do\n\nIn ogni caso, puoi vedere chi ha aggiunto o modificato ogni to-do grazie al badge di tracciamento sotto ciascun elemento.",
    category: "social",
  },

  // === SUPPORTO ===
  {
    keywords: ["contattare", "contatto", "supporto", "assistenza", "problema", "segnalare", "bug report"],
    answer: "Per contattare l'assistenza usa la sezione \"Contattaci\" qui nel widget! Puoi:\n- Fare una domanda\n- Segnalare un bug\n- Inviare un suggerimento\n\nCompila oggetto e messaggio: si aprirà la tua app email per inviare la richiesta.",
    category: "generale",
  },
];

// Normalize text: lowercase, remove accents, trim
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim();
}

// Tokenize text into words
function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter((w) => w.length > 1);
}

// Score a query against a knowledge entry
function scoreEntry(queryTokens: string[], entry: KnowledgeEntry): number {
  let score = 0;
  const normalizedQuery = queryTokens.join(" ");

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    // Exact phrase match (highest score)
    if (normalizedQuery.includes(normalizedKeyword)) {
      score += 10;
      continue;
    }

    // Token overlap
    const keywordTokens = tokenize(keyword);
    for (const kt of keywordTokens) {
      for (const qt of queryTokens) {
        // Exact token match
        if (qt === kt) {
          score += 5;
        }
        // Partial match (one contains the other)
        else if (qt.length >= 3 && kt.length >= 3 && (qt.includes(kt) || kt.includes(qt))) {
          score += 3;
        }
      }
    }
  }

  return score;
}

const defaultResponses = [
  "Posso aiutarti solo con le funzionalità di Taskly. Prova a chiedermi qualcosa su liste, to-do, categorie, condivisione o il tuo profilo!",
  "Non ho capito la domanda. Prova a riformularla in modo più semplice, ad esempio: \"Come creo una lista?\" o \"Come funziona la condivisione?\"",
  "Questa domanda non riguarda l'app. Se hai bisogno di altro tipo di supporto, usa la sezione \"Contattaci\" per scrivere all'assistenza!",
  "Mi dispiace, posso rispondere solo a domande relative a Taskly. Chiedimi come usare le liste, le to-do, le categorie, la condivisione, le notifiche e molto altro!",
];

const greetingResponses = [
  "Ciao! 👋 Come posso aiutarti con Taskly? Chiedimi qualsiasi cosa sulle funzionalità dell'app!",
  "Ciao! Sono l'assistente di Taskly. Puoi chiedermi come creare liste, gestire to-do, condividere con amici e molto altro!",
];

const greetingKeywords = ["ciao", "salve", "buongiorno", "buonasera", "hey", "ehi", "hello", "hi", "hola"];

const thankKeywords = ["grazie", "thanks", "thank", "perfetto", "ottimo", "grande"];

const thankResponses = [
  "Di nulla! Se hai altre domande sull'app, sono qui! 😊",
  "Figurati! Non esitare a chiedere se hai bisogno di altro!",
];

export function getAIResponse(query: string): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return "Scrivi una domanda e ti aiuterò con le funzionalità di Taskly!";
  }

  const normalizedQuery = normalizeText(trimmedQuery);
  const tokens = tokenize(trimmedQuery);

  // Check greetings
  if (tokens.length <= 3 && tokens.some((t) => greetingKeywords.some((g) => t.includes(g) || g.includes(t)))) {
    return greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
  }

  // Check thanks
  if (tokens.length <= 4 && tokens.some((t) => thankKeywords.some((g) => t.includes(g) || g.includes(t)))) {
    return thankResponses[Math.floor(Math.random() * thankResponses.length)];
  }

  // Score all entries
  let bestScore = 0;
  let bestEntry: KnowledgeEntry | null = null;

  for (const entry of knowledgeBase) {
    const score = scoreEntry(tokens, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // If we also check the normalized query directly for common patterns
  if (bestScore < 5) {
    for (const entry of knowledgeBase) {
      for (const keyword of entry.keywords) {
        const nk = normalizeText(keyword);
        if (normalizedQuery.includes(nk) && nk.length >= 4) {
          return entry.answer;
        }
      }
    }
  }

  // Return best match or default
  if (bestScore >= 5 && bestEntry) {
    return bestEntry.answer;
  }

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
