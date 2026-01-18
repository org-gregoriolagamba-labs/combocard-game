# COMBOCARD - Game Design Document

## 🎮 Game Overview

ComboCard is a multiplayer Italian card game where players compete to complete card collections and win prizes from a shared pot.

## 🃏 Italian Deck

The game uses a 40-card Italian deck with:

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

Each player receives one Jolly card at the start of the game:
- The Jolly is placed on a random covered card in the player's grid
- When activated, the Jolly converts that card to any value needed to complete a collection
- Each player can only use their Jolly once per game
- After use, the Jolly position shows "USED"

## 🎲 Game Flow

### 1. Registration
- Player enters their name
- Receives 100 starting credits

### 2. Hall (Game List)
- View available games waiting for players
- Create a new game (costs 10 credits)
- Join an existing game (costs 10 credits)

### 3. Lobby (Pre-game)
- Wait for other players (2-4 players per game)
- Creator can start game when ready

### 4. Game
- Each player gets a 5x5 grid of 25 random cards
- One shared deck is drawn from by the game creator
- When a card is drawn, all players who have it in their grid get it "covered"
- Players race to complete collections

### 5. Winning
- First to claim **Combocard Reale** wins the entire pot
- Otherwise, collections can be claimed individually for partial prizes
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
