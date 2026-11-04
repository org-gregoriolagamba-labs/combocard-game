import { translateServerError } from '../../utils/errors.utils';

describe('translateServerError', () => {
  test.each([
    ['Invalid username or password', 'Nome utente o password non corretti'],
    ['Username already taken', 'Questo nome utente è già in uso'],
    ['Collection not complete', 'La collezione non è ancora completa'],
    ['Collection already won', 'Questa collezione è già stata vinta'],
    ['Game not found', 'Partita non trovata: controlla il codice'],
    ['Insufficient credits', 'Non hai crediti sufficienti'],
    ['Game already started', 'La partita è già iniziata'],
    ['Already in game', 'Sei già in questa partita'],
    ['You are already in another game', "Sei già in un'altra partita: lasciala prima"],
    ['A player does not have enough credits to start', 'Un giocatore non ha più abbastanza crediti: la partita non può iniziare'],
    ['Deck exhausted', 'Le carte sono finite'],
    ['Only the game creator can draw cards', 'Solo chi ha creato la partita può estrarre le carte'],
    ['Only the game creator can start the game', 'Solo chi ha creato la partita può avviarla'],
    ['You are not part of this game', 'Non fai parte di questa partita'],
    ['Session expired, please log in again', 'Sessione scaduta: accedi di nuovo'],
    ['Authentication required', 'Accedi per continuare'],
    ['Too many failed login attempts, please try again later.', 'Troppi tentativi falliti: riprova tra poco'],
    ['Too many requests, please try again later.', 'Troppe richieste: riprova tra poco'],
    ['Too many requests from this IP, please try again later.', 'Troppe richieste: riprova tra poco'],
    ['Jolly already used', 'Hai già usato il Jolly'],
    ['A player is choosing the jolly: wait a few seconds', 'Un giocatore sta scegliendo il Jolly: aspetta qualche secondo'],
    ['Another player is choosing the jolly', 'Un altro giocatore sta scegliendo il Jolly: aspetta qualche secondo'],
    ['Too many jolly declarations in this game', 'Hai già dichiarato il Jolly troppe volte in questa partita'],
    ['Invalid amount', 'Inserisci un importo valido'],
    ['Waiting for all players to confirm they read the rules', 'Aspetta che tutti i giocatori confermino di aver letto le regole'],
  ])('"%s" is shown as "%s"', (english, italian) => {
    expect(translateServerError(english)).toBe(italian);
  });

  test('keeps the numbers of the messages that carry them', () => {
    expect(translateServerError('Game full (max 4 players)')).toBe('La partita è al completo: massimo 4 giocatori');
    expect(translateServerError('At least 2 players required')).toBe('Servono almeno 2 giocatori per iniziare');
    expect(translateServerError('Maximum purchasable amount is 10000 credits'))
      .toBe('Puoi aggiungere al massimo 10000 crediti per volta');
  });

  test('explains how to recover from the jolly that cannot be used', () => {
    expect(translateServerError('Jolly cannot complete this collection or card already exists in grid'))
      .toBe("Il Jolly non può completare questa collezione con quella carta. Scegli un'altra carta o un'altra collezione.");
  });

  test('validation messages of the form fields', () => {
    expect(translateServerError('"username" length must be at least 3 characters long'))
      .toBe('Il nome utente deve avere almeno 3 caratteri');
    expect(translateServerError('"password" length must be at least 8 characters long'))
      .toBe('La password deve avere almeno 8 caratteri');
    expect(translateServerError('Username can contain only letters, numbers, spaces and _ . -'))
      .toBe('Il nome utente può contenere solo lettere, numeri, spazi e i simboli _ . -');
    expect(translateServerError('"amount" must be greater than or equal to 1')).toBe('Inserisci un importo valido');
  });

  test('any other validation message is shown as a generic one', () => {
    expect(translateServerError('"maxPlayers" must be less than or equal to 10')).toBe('I dati inseriti non sono validi');
  });

  test('a network failure says what to do', () => {
    for (const message of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
      expect(translateServerError(message)).toBe('Impossibile contattare il server: controlla la connessione e riprova');
    }
  });

  test('an unknown message never reaches the player in English', () => {
    expect(translateServerError('Something went wrong')).toBe('Qualcosa non ha funzionato: riprova tra poco');
    expect(translateServerError('Route /api/x not found')).toBe('Qualcosa non ha funzionato: riprova tra poco');
    expect(translateServerError(undefined)).toBe('Qualcosa non ha funzionato: riprova tra poco');
  });
});
