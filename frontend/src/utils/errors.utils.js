/**
 * Server errors in the language of the game
 *
 * The server answers in English. The API client translates every message here,
 * once, so no screen has to: a message that is not known never reaches the
 * player in English, it becomes a generic one that says to try again.
 */

const GENERIC = "Qualcosa non ha funzionato: riprova tra poco";
const NETWORK = "Impossibile contattare il server: controlla la connessione e riprova";
const INVALID_DATA = "I dati inseriti non sono validi";

const EXACT = {
  "Invalid username or password": "Nome utente o password non corretti",
  "Username already taken": "Questo nome utente è già in uso",
  "Username can contain only letters, numbers, spaces and _ . -":
    "Il nome utente può contenere solo lettere, numeri, spazi e i simboli _ . -",
  "Authentication required": "Accedi per continuare",
  "Session expired, please log in again": "Sessione scaduta: accedi di nuovo",
  "You can only access your own player": "Puoi usare solo il tuo account",
  "Player not found": "Giocatore non trovato",
  "Player name is required": "Inserisci un nome utente",
  "Invalid amount": "Inserisci un importo valido",
  "Insufficient credits": "Non hai crediti sufficienti",
  "Game not found": "Partita non trovata: controlla il codice",
  "Game already started": "La partita è già iniziata",
  "The game is already finished": "La partita è già finita",
  "Game not in playing state": "La partita non è in corso",
  "Already in game": "Sei già in questa partita",
  "Cannot rename a player who is in a game": "Il giocatore è in una partita: il nome si può cambiare dopo",
  "Cannot remove the last admin": "Non si può togliere il ruolo all'ultimo admin",
  "The player does not have enough credits": "Il giocatore non ha abbastanza crediti",
  "User not found": "Utente non trovato",
  "This account is suspended": "Questo account è sospeso: rivolgiti all'amministrazione",
  "You cannot suspend yourself": "Non puoi sospendere te stesso",
  "Cannot suspend the last admin": "Non si può sospendere l'ultimo admin",
  "You must change your password first": "Scegli prima una nuova password",
  "Current password is incorrect": "La password attuale non è corretta",
  "The new password must be different": "La nuova password deve essere diversa da quella attuale",
  "You cannot reset your own password": "Non puoi reimpostare la tua password: usa il cambio password",
  "You do not have permission to do this": "Non hai i permessi per farlo",
  "You are already in another game": "Sei già in un'altra partita: lasciala prima",
  "A player does not have enough credits to start": "Un giocatore non ha più abbastanza crediti: la partita non può iniziare",
  "You are not part of this game": "Non fai parte di questa partita",
  "Only the game creator can start the game": "Solo chi ha creato la partita può avviarla",
  "Only the game creator can draw cards": "Solo chi ha creato la partita può estrarre le carte",
  "Deck exhausted": "Le carte sono finite",
  "Collection not complete": "La collezione non è ancora completa",
  "Collection already won": "Questa collezione è già stata vinta",
  "Collection type not specified": "Scegli una collezione",
  "Jolly already used": "Hai già usato il Jolly",
  "A player is choosing the jolly: wait a few seconds":
    "Un giocatore sta scegliendo il Jolly: aspetta qualche secondo",
  "Another player is choosing the jolly":
    "Un altro giocatore sta scegliendo il Jolly: aspetta qualche secondo",
  "Too many jolly declarations in this game":
    "Hai già dichiarato il Jolly troppe volte in questa partita",
  "Waiting for all players to confirm they read the rules":
    "Aspetta che tutti i giocatori confermino di aver letto le regole",
  "Jolly cannot complete this collection or card already exists in grid":
    "Il Jolly non può completare questa collezione con quella carta. Scegli un'altra carta o un'altra collezione.",
  "Too many failed login attempts, please try again later.": "Troppi tentativi falliti: riprova tra poco",
  "Too many requests, please try again later.": "Troppe richieste: riprova tra poco",
  "Too many requests from this IP, please try again later.": "Troppe richieste: riprova tra poco",
  "Could not renew the session": "Non riesco a rinnovare la sessione: riprova tra poco",
};

// Messages that carry a number
const PATTERNS = [
  [/^Game full \(max (\d+) players\)$/, (m) => `La partita è al completo: massimo ${m[1]} giocatori`],
  [/^At least (\d+) players required$/, (m) => `Servono almeno ${m[1]} giocatori per iniziare`],
  [/^Maximum purchasable amount is (\d+) credits$/, (m) => `Puoi aggiungere al massimo ${m[1]} crediti per volta`],
  [/"username" length must be at least (\d+)/, (m) => `Il nome utente deve avere almeno ${m[1]} caratteri`],
  [/"password" length must be at least (\d+)/, (m) => `La password deve avere almeno ${m[1]} caratteri`],
  [/"amount" must be/, () => "Inserisci un importo valido"],
];

const NETWORK_FAILURE = /failed to fetch|load failed|networkerror|network request failed/i;

/**
 * Translate a message sent by the server, or by the browser when it cannot reach it
 * @param {string} [message] - Message in English
 * @returns {string} Message in Italian
 */
export function translateServerError(message) {
  if (typeof message !== "string" || message === "") {
    return GENERIC;
  }

  if (Object.hasOwn(EXACT, message)) {
    return EXACT[message];
  }

  for (const [pattern, translate] of PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return translate(match);
    }
  }

  if (NETWORK_FAILURE.test(message)) {
    return NETWORK;
  }

  // The remaining validation messages name a field of the request: "maxPlayers" must be ...
  if (message.includes('"') && message.includes(" must ")) {
    return INVALID_DATA;
  }

  return GENERIC;
}
