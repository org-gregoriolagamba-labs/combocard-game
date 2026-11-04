# COMBOCARD - Game Design Document

## 🎮 Game Overview

ComboCard is a multiplayer Italian card game where players compete to complete card collections and win prizes from a shared pot.
Key gameplay features include private games, configurable max players with auto-start, Jolly conversion, draw cooldown, and end-of-game prize splitting.

## 🃏 Italian Deck

The game uses a 40-card Italian deck with:

### Illustrations
The cards and the suit symbols of the game are those of a historical Neapolitan deck printed in Naples in 1875 by Luigi Pignalosa, from the collection of the British Museum. The last drawn card is shown as the whole card (`frontend/public/carte/`, 40 files named `<seme>-<valore>.webp`), and the player's grid uses the suit cut from a numbered card (`frontend/public/semi/`). Sources, processing and the note on rights are in `frontend/public/carte/CREDITI.md`. The emoji below are only the fallback if an image cannot be loaded.

### Suits (Semi)
| Suit | Italian | Emoji | Color |
|------|---------|-------|-------|
| Spade | Spade | ⚔️ | Gray |
| Coppe | Cups | 🏆 | Red |
| Denari | Coins | 💰 | Yellow |
| Bastoni | Clubs | 🪵 | Brown |

### Values (Valori)
| Value | Number | Points |
|-------|--------|--------|
| Asso | 1 | High |
| Due | 2 | - |
| Tre | 3 | - |
| Quattro | 4 | - |
| Cinque | 5 | - |
| Sei | 6 | - |
| Sette | 7 | - |
| Fante | 8 | - |
| Cavallo | 9 | - |
| Re | 10 | High |

## 🏆 Collections

Players can claim the following collections:

| Collection | Requirements | Prize | Description |
|------------|--------------|-------|-------------|
| **Tris** | 3 same value | 10% of the pot | Three of a kind (a row of the sheet) |
| **Sequenza** | 4 consecutive values, any suits | 15% of the pot | No wrap from Re to Asso |
| **Scopa** | 5 same suit | 20% of the pot | Flush (a column of the sheet) |
| **Napola** | 3 of one value + 2 of another | 25% of the pot | Full house |
| **Combocard Reale** | 4 consecutive values, same suit | 30% of the pot | Royal flush: **ends the game** |

The shares are the defaults of `config/index.js` and can be changed with `PRIZE_TRIS`, `PRIZE_SEQUENZA`, `PRIZE_SCOPA`, `PRIZE_NAPOLA` and `PRIZE_COMBOCARD_REALE`. The pot is the sum of the entry credits paid when the game starts.

A collection is won once per game, by the first player (or players) who complete it on a draw. If several complete it on the same draw, the prize is divided equally between them. The server awards it by itself right after every draw and every jolly.

## 🃏 Jolly System

Each player has one Jolly per game. It is not a card on the sheet: it is an action.

- The player chooses a collection and then **one card of the sheet that is not covered yet**.
- The Jolly turns that card into the card that completes the collection, and covers it at once. The collection is then won automatically.
- It works only when the collection is **exactly one card away**:

| Collection | What the Jolly does to the chosen card | When it can work |
|------------|----------------------------------------|------------------|
| Tris | changes the value, keeps the suit | two covered cards of one value |
| Sequenza | changes the value, keeps the suit | three of four consecutive values covered |
| Napola | changes the value, keeps the suit | two pairs (one becomes a tris), or a tris and a single (the single becomes a pair) |
| Scopa | changes the suit, keeps the value | four covered cards of one suit |
| Combocard Reale | changes value and suit | three of four consecutive values of one suit covered |

- The chosen card can never become a card that is already in the sheet.
- A collection that has already been won cannot be aimed at.
- The screen works this out in the browser (`frontend/src/utils/jolly.utils.js`, a mirror of `backend/src/services/jolly.service.js`) to offer the Jolly only where it can work, to enable only the cards it can turn, and to say which card becomes which before the player confirms. The server stays the judge.
- After use, the card shows "USATO".

### Draws pause while the Jolly is chosen

Choosing the card takes time, and a card drawn meanwhile could change what the Jolly can do. So the draws wait.

- Tapping "Jolly" on a collection **declares** it (`POST /api/games/:gameId/jolly/start`): the server stops the draws for everybody, the creator included, for **at most 30 seconds**. A draw during the pause is refused with a 409.
- The pause ends when the player **uses** the Jolly, **gives it up** ("Annulla", `POST /api/games/:gameId/jolly/cancel`), **leaves** the game, or the **time runs out**. If the player's screen goes away the time simply runs out: nobody can hold the game still.
- One player at a time. Another player who tries to declare meanwhile is refused, and each player can declare **at most 3 times per game**, so a pause cannot be renewed forever.
- **What the screens show.** Everybody sees "Bruno sta scegliendo il Jolly" with the seconds left; the creator's draw button reads "Estrazione in pausa" and waits; the Jolly buttons of the others are off and say who is choosing. The player who chooses sees "Le estrazioni sono ferme: hai ancora N s per scegliere". When the time runs out the screen closes the mode and tells the player, who may declare again.
- **Reloading the page** during the player's own pause brings the mode back, with the time that is left.
- The pause is not saved with the game: a restart of the server never leaves a game paused. Events: `jollyInCorso` (a player declared), `jollyAnnullato` (the pause ended without the Jolly being used), `jollyUsato` (it was used).
- For compatibility the server still accepts a Jolly that was never declared, when nobody else is choosing.

## 🧾 The sheet (cartella)

The server gives each player 25 different cards in a 5x5 array. **The position in that array never matters:** every collection looks only at the values and suits of the covered cards.

The screen therefore lays the sheet out like a tombola sheet: the deck as a table of ten rows (values, Asso to Re) and four columns (suits: Denari, Coppe, Spade, Bastoni). The player's 25 cards are printed in their place, each as a small print of the real card with the number of its row (so a place is read on its own, without looking back at the row label), the other 15 places stay empty, and a dot marks a card that has been drawn but is not in the sheet. On this table a tris is a row, a sequenza is neighbouring rows, a scopa is a column, a napola is three places in a row and two in another, and a combocard reale is neighbouring rows of one column. A drawn card is covered with a bean (`frontend/src/utils/mazzo.utils.js`). The progress of the figures is on the sheet itself: a tris under the row name, a scopa over the column, and sequenza, napola and combocard reale in the corner above the row names (`SEQ`, `NAPOLA`, `REALE`, as `n/total`), while at most two cards are missing and nobody has won them. The counts are the ones of the collections panel (`calcolaProgresso`).

## 🎲 Game Flow

### 1. Registration
- Player enters their name
- Starts with 0 credits (credits are taken with **Prendi crediti** (play money))

### 1b. The rules
- The first time a player uses the game, a screen shows the full rules ("Prima di giocare: le regole"). The player must scroll to the end, tick "Ho letto e compreso le regole e le meccaniche del gioco" and continue. The date is saved with the player (`players.rules_accepted_at`) and the question is not asked again. Existing accounts confirm at their next access.
- **A game does not start until every player in it has confirmed.** The creator cannot start it (409), a full game waits instead of starting by itself, and the lobby tells everyone who the game is waiting for ("In attesa che Bruno confermi di aver letto le regole"). When the last player confirms, a full game starts by itself.

### 2. Hall (Game List)
- View available public games waiting for players
- Create a new game (choose required credits, max players, and public/private)
- Join a public game or use a **private code** to join a private game. A player is in **one game at a time** (the entry fee is checked when joining and charged at the start, so with two games the same credits would be promised twice): joining or creating a game while in another one, still waiting or in progress, is refused until the player leaves it or it finishes. A game accepts new players **only while it is waiting**: once it has started, the entry fees are charged and the prizes fixed, so nobody can join late (and a player who leaves a game in progress cannot come back). Someone already in the game who repeats the request gets the same answer, so a retry after the automatic start is harmless. The entry fee is charged only if every player still has it: otherwise the start is refused (the creator is told) or, for a full game that starts by itself, postponed, and nobody is charged. A balance never goes below zero
- Take credits with **Prendi crediti** (preset cuts + reset, max purchase 10,000)

### 3. Lobby (Pre-game)
- Wait for other players (2–10 players per game)
- Creator can start game when ready
- **Auto-start** triggers when the max player limit is reached

### 4. Game
- Each player gets a sheet of 25 random, different cards (a 5x5 grid on the server, shown as a tombola sheet, see above)
- One shared deck is drawn from by the game creator
- When a card is drawn, all players who have it in their grid get it "covered"
- **Draw cooldown**: 8 seconds between draws
- Players race to complete collections

### Real-time Multiplayer (Functional Notes)
- Game state is synchronized in real time via WebSockets (Socket.IO).
- If players are on the same LAN and open the game via an IP address (e.g. `http://192.168.1.42:3000`),
  the backend must allow that origin in its CORS configuration; otherwise, the UI may load but live updates
  (draws, covers, token changes) may not propagate correctly.

### 5. Winning and the end
- Collections are won automatically, as soon as they are complete (see above)
- The game ends when someone completes the **Combocard Reale**
- At the end, the prizes of the collections nobody won are split equally among all players
- Credits won are credited to the player when the game ends; a player who leaves a game in progress loses the entry credits

## 📁 Project Structure

### Backend Architecture
```
backend/src/
├── config/              # Environment & game constants
├── controllers/         # HTTP request handlers
├── middleware/          # Express middleware (auth, validation, logging)
├── routes/              # API route definitions
├── services/            # Business logic (game, jolly, player)
├── sockets/             # Socket.IO real-time handlers
├── utils/               # Utilities (errors, responses, cards)
└── server.js            # Entry point
```

### Frontend Architecture
```
frontend/src/
├── components/          
│   ├── common/         # Reusable UI (Button, Modal, Toast)
│   └── game/           # Game screens (Hall, Lobby, Game)
├── config/             # API & app configuration
├── hooks/              # Custom hooks (useSocket, useToast)
├── pages/              # Page components
├── services/           # API abstraction layer
├── store/              
│   └── slices/         # Redux slices (player, game, ui)
├── styles/             # CSS styles
├── utils/              # Utility functions
└── App.jsx             # Main app with Redux Provider
```

## 🔧 Future Enhancements

- [ ] Add database for persistence (MongoDB/PostgreSQL)
- [ ] Implement user authentication (JWT)
- [ ] Add in-game chat
- [ ] Player statistics and history
- [ ] Global leaderboards
- [ ] Tournament mode
- [ ] Mobile app (React Native)
