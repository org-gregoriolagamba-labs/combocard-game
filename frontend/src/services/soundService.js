/**
 * Sound Service
 *
 * The sounds of the game, made with the Web Audio API: short tones, no file to load and no
 * licence. A sound plays only if the game has sounds (the creator's choice) and the player has
 * not muted them (a choice kept in this browser). Browsers keep the audio locked until the
 * player touches the page, so the context is created and resumed at the first gesture.
 * Every sound goes with something that is also seen on the screen: sound never carries
 * information alone.
 */

const CHIAVE_MUTO = "combocard.audio-muto";
const VOLUME = 0.12;

// One tone per suit, so a card drawn can be told by ear
const NOTA_SEME = { Denari: 523.25, Coppe: 440, Spade: 392, Bastoni: 329.63 };

// [frequency in Hz, start in seconds, length in seconds, wave]
const MELODIE = {
  miaCarta: [[659.25, 0, 0.12, "sine"], [880, 0.1, 0.18, "sine"]],
  collezioneMia: [[523.25, 0, 0.14, "triangle"], [659.25, 0.12, 0.14, "triangle"], [783.99, 0.24, 0.14, "triangle"], [1046.5, 0.36, 0.4, "triangle"]],
  collezioneAltrui: [[392, 0, 0.22, "triangle"]],
  jollyDichiarato: [[600, 0, 0.14, "square"], [450, 0.14, 0.2, "square"]],
  jollyUsato: [[784, 0, 0.1, "sine"], [988, 0.09, 0.1, "sine"], [1319, 0.18, 0.3, "sine"]],
  // The whistle: two short high tones
  ammonizione: [[1400, 0, 0.12, "square"], [1400, 0.16, 0.22, "square"]],
  fine: [[523.25, 0, 0.2, "triangle"], [659.25, 0.2, 0.2, "triangle"], [783.99, 0.4, 0.2, "triangle"], [1046.5, 0.6, 0.7, "triangle"]],
};

export const NOMI_SUONI = ["estratta", ...Object.keys(MELODIE)];

let contesto = null;
let partitaConSuoni = true;

const nuovoContesto = () => {
  const Contesto = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
  if (!Contesto) return null;
  try {
    return new Contesto();
  } catch {
    return null;
  }
};

const ottieniContesto = () => {
  if (!contesto) contesto = nuovoContesto();
  return contesto;
};

/** Whether the player muted the sounds (kept in this browser) */
export function isMuto() {
  try {
    return window.localStorage.getItem(CHIAVE_MUTO) === "1";
  } catch {
    return false;
  }
}

export function setMuto(muto) {
  try {
    if (muto) window.localStorage.setItem(CHIAVE_MUTO, "1");
    else window.localStorage.removeItem(CHIAVE_MUTO);
  } catch {
    // The choice is not kept, but it holds until the page is closed
  }
  mutoInSessione = muto;
}

let mutoInSessione = null;
const èMuto = () => (mutoInSessione === null ? isMuto() : mutoInSessione);

/** The game the player is in has sounds (true) or not (false) */
export function setPartitaConSuoni(abilitati) {
  partitaConSuoni = abilitati !== false;
}

/** To call from a gesture of the player: it creates the context and wakes it if the browser kept it asleep */
export function sbloccaAudio() {
  const c = ottieniContesto();
  if (c && c.state === "suspended" && typeof c.resume === "function") {
    c.resume().catch(() => {});
  }
}

function nota(c, frequenza, inizio, durata, onda) {
  const oscillatore = c.createOscillator();
  const guadagno = c.createGain();
  const t = c.currentTime + inizio;
  oscillatore.type = onda;
  oscillatore.frequency.setValueAtTime(frequenza, t);
  // A quick rise and a slow fall: no click at the start or at the end
  guadagno.gain.setValueAtTime(0.0001, t);
  guadagno.gain.linearRampToValueAtTime(VOLUME, t + 0.015);
  guadagno.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  oscillatore.connect(guadagno);
  guadagno.connect(c.destination);
  oscillatore.start(t);
  oscillatore.stop(t + durata + 0.02);
}

/**
 * Play a sound by name. `estratta` takes the suit of the card drawn; `ritardo` (seconds) puts it off.
 * It never throws: a sound that cannot play is not worth breaking the game.
 */
export function suona(nome, { seme, ritardo = 0 } = {}) {
  if (!partitaConSuoni || èMuto()) return;
  if (!NOMI_SUONI.includes(nome)) return;

  try {
    const c = ottieniContesto();
    if (!c) return;
    if (c.state === "suspended" && typeof c.resume === "function") c.resume().catch(() => {});

    if (nome === "estratta") {
      nota(c, NOTA_SEME[seme] ?? 440, ritardo, 0.16, "sine");
    } else {
      MELODIE[nome].forEach(([frequenza, inizio, durata, onda]) => nota(c, frequenza, inizio + ritardo, durata, onda));
    }
  } catch {
    // Silent
  }
}

/** For the tests: forget the context and the choices of the session */
export function _reset() {
  contesto = null;
  partitaConSuoni = true;
  mutoInSessione = null;
}
