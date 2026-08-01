# Taskly

App mobile (iOS + Android) per la gestione di liste e todo, port React Native della webapp
[todowebapp-frontend-reactts](https://github.com/bale231/todowebapp-frontend-reactts).

Usa **lo stesso backend** della webapp: `https://bale231.pythonanywhere.com/api`.
Endpoint, metodi, header e body delle richieste sono identici all'originale.

## Stack

- **Expo** SDK 57 (React Native 0.86, New Architecture)
- **TypeScript** in modalità strict
- **NativeWind 4** (Tailwind per RN) — porta le classi `className` della webapp
- **React Navigation** (native stack) al posto di `react-router-dom`
- **AsyncStorage** al posto di `localStorage` / `sessionStorage`
- **NetInfo** al posto di `navigator.onLine`

## Avvio

```bash
npm install
npx expo start
```

Poi scansiona il QR con l'app **Expo Go**, oppure `npm run android` / `npm run ios`.

Per verificare che il progetto compili senza avviare nulla:

```bash
npx tsc --noEmit                              # typecheck
npx expo export --platform android -d /tmp/b  # bundle di prova
```

## Stato del port

### Fatto

| Area | Note |
| --- | --- |
| Autenticazione | login (username o email), registrazione, logout |
| Reset password | richiesta via email + conferma da deep link |
| Refresh token | singleton + refresh proattivo all'avvio (sliding expiry) |
| "Rimani loggato" | replica la distinzione localStorage / sessionStorage |
| Tema chiaro/scuro | sincronizzato col backend, come nella webapp |
| Stato rete | banner offline, operazioni bloccate quando serve la rete |

### Da fare

| Area | Note |
| --- | --- |
| Home e liste | port di `Home.tsx` (1.336 righe) |
| Todo | port di `ToDoListPage.tsx` (1.244 righe), swipe e riordino |
| Offline / sync | Dexie + IndexedDB + Web Worker → SQLite |
| Notifiche push | Firebase web SDK → `@react-native-firebase` |
| Profilo, amici, condivisione | — |
| Assistente AI | port di `SupportWidget.tsx` |

## Struttura

```text
App.tsx                     bootstrap: provider, refresh token all'avvio
src/
  api/
    config.ts               base URL del backend (condiviso con la webapp)
    auth.ts                 port di src/api/auth.ts, rete identica
  components/
    ErrorBanner.tsx         banner errore con slide-in
    FloatingLabelInput.tsx  input con floating label (sostituisce i peer-* CSS)
  context/
    NetworkContext.tsx      stato rete via NetInfo
    ThemeContext.tsx        tema chiaro/scuro + sync backend
  navigation/
    RootNavigator.tsx       stack + deep linking
    types.ts                tipi delle rotte
  screens/
    LoginScreen.tsx
    RegisterScreen.tsx
    ForgotPasswordScreen.tsx
    ResetPasswordScreen.tsx
    HomeScreen.tsx          placeholder, sostituito nella fase successiva
  services/
    storage.ts              AsyncStorage: token e tema
```

## Deep link del reset password

Il link nell'email della webapp punta a `/reset-password/:uid/:token`.
Sull'app lo stesso path apre la schermata di reset:

```text
taskly://reset-password/<uid>/<token>
```

Perché il link dell'email apra direttamente l'app serve configurare un
universal link (iOS) / app link (Android) sul dominio, oppure far includere
al backend anche lo schema `taskly://`.
