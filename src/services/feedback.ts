import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

/**
 * Feedback sonoro + aptico per le azioni principali su todo/liste (completa,
 * crea, elimina). Un solo `AudioPlayer` per suono, riavvolto e rilanciato ad
 * ogni trigger invece di crearne uno nuovo ogni volta: evita il costo di
 * allocare/decodificare il file ripetutamente quando l'utente spunta più
 * todo di fila in rapida successione.
 */
const SOUND_SOURCES = {
  todoComplete: require("../../assets/sounds/todo-complete.wav"),
  todoUncomplete: require("../../assets/sounds/todo-uncomplete.wav"),
  create: require("../../assets/sounds/create.wav"),
  delete: require("../../assets/sounds/delete.wav"),
} as const;

type SoundName = keyof typeof SOUND_SOURCES;

const players = new Map<SoundName, AudioPlayer>();
let audioModeConfigured = false;

function getPlayer(name: SoundName): AudioPlayer {
  let player = players.get(name);
  if (!player) {
    player = createAudioPlayer(SOUND_SOURCES[name]);
    players.set(name, player);
  }
  return player;
}

/**
 * `playsInSilentMode`: questi sono effetti sonori dell'interfaccia (non
 * musica), devono sentirsi anche con la suoneria disattivata su iOS — come
 * fanno la generalità delle app che usano suoni UI brevi.
 */
async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // Non bloccante: se fallisce, i suoni comunque provano a partire con la
    // modalità audio di default del sistema.
  }
}

function playSound(name: SoundName): void {
  ensureAudioMode().then(async () => {
    const player = getPlayer(name);
    await player.seekTo(0);
    player.play();
  });
}

export function playTodoCompleteFeedback(): void {
  playSound("todoComplete");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function playTodoUncompleteFeedback(): void {
  playSound("todoUncomplete");
  Haptics.selectionAsync().catch(() => {});
}

export function playCreateFeedback(): void {
  playSound("create");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function playDeleteFeedback(): void {
  playSound("delete");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
