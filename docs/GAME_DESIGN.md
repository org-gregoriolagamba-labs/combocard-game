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
| **Tris** 🎯 | 3 same value | 20% pot | Three of a kind |
| **Sequenza** 📊 | 4 consecutive | 20% pot | Four in a row |
| **Scopa** 🎴 | 5 same suit | 25% pot | Flush |
| **Napola** 💎 | 3+2 same values | 25% pot | Full house |
| **Combocard Reale** 👑 | 4 consecutive same suit | 100% pot | Royal flush - INSTANT WIN! |

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

## 🧾 The sheet (cartella)

The server gives each player 25 different cards in a 5x5 array. **The position in that array never matters:** every collection looks only at the values and suits of the covered cards.

The screen therefore lays the sheet out like a tombola sheet: the deck as a table of ten rows (values, Asso to Re) and four columns (suits: Denari, Coppe, Spade, Bastoni). The player's 25 cards are printed in their place, the other 15 places stay empty, and a dot marks a card that has been drawn but is not in the sheet. On this table a tris is a row, a sequenza is neighbouring rows, a scopa is a column, a napola is three places in a row and two in another, and a combocard reale is neighbouring rows of one column. A drawn card is covered with a bean (`frontend/src/utils/mazzo.utils.js`).

## 🎲 Game Flow

### 1. Registration
- Player enters their name
- Starts with 0 credits (credits are bought via the **Cassa**)

### 2. Hall (Game List)
- View available public games waiting for players
- Create a new game (choose required credits, max players, and public/private)
- Join a public game or use a **private code** to join a private game
- Buy credits via **Cassa** (preset cuts + reset, max purchase 10,000)

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

### 5. Winning
- First to claim **Combocard Reale** wins the entire pot
- Otherwise, collections can be claimed individually for partial prizes
- **Remaining undistributed prizes** are split evenly among players at game end
- Game ends when pot is empty or deck is exhausted

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
