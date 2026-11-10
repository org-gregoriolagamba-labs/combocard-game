# ComboCard Game 🎴

An Italian card game with real-time multiplayer support, built with modern web technologies.

## 🎮 Game Overview

ComboCard is a multiplayer card game using the Italian deck (40 cards with suits: Spade ⚔️, Coppe 🏆, Denari 💰, Bastoni 🪵). Players compete to complete collections and win prizes from the pot.

### Collections
| Collection | Description | Prize |
|------------|-------------|-------|
| **Tris** 🎯 | 3 cards of same value | 10% of pot |
| **Sequenza** 📊 | 4 consecutive cards | 15% of pot |
| **Scopa** 🎴 | 5 cards of same suit | 20% of pot |
| **Napola** 💎 | Tris + Pair (full house) | 25% of pot |
| **Combocard Reale** 👑 | 4 consecutive same suit | 30% of pot, ends the game |

The shares are the defaults and can be changed with the `PRIZE_*` variables (see `backend/.env.example`).

### Jolly System
Each player has one Jolly card that can be converted to any card needed to complete a collection, as long as that card is not already in the player's sheet. While a player chooses, the draws are paused. Use it strategically!

### Additional Gameplay Features
- **Private games** with join-by-code support
- **Max players** per game (2–10) with **auto-start** when the table is full
- **Drawing by turns**: the creator chooses who draws, every player in turn (default in the app) or only the creator. The player on turn has 60 seconds, with a countdown for everybody and beeps in the last five seconds; if the time runs out the card is drawn automatically and the player gets a yellow card, then a red card (no more draws until the end of the game)
- **Draw cooldown**: 8-second delay between card draws
- **Sounds**: the creator can switch the game sounds on or off, and each player can mute them
- **Zoom** of the cards of the sheet and of the drawn ones, and an **history and personal statistics** page for each player
- **Remaining prize distribution**: undistributed prizes are split evenly at game end
- **Cash register** with preset cuts and reset
- **Real-time player list** and live token updates

## 🏗️ Architecture

This project follows the **MVC architecture** with clear separation of concerns:

```
combocard-game/
├── backend/                    # Express.js server
│   ├── src/
│   │   ├── config/            # Environment configuration
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── sockets/           # Socket.IO handlers
│   │   ├── utils/             # Utility functions
│   │   └── server.js          # Entry point
│   └── package.json
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── common/        # Reusable UI components
│   │   │   └── game/          # Game-specific components
│   │   ├── config/            # Frontend configuration
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── store/             # Redux store & slices
│   │   ├── styles/            # CSS styles
│   │   └── utils/             # Utility functions
│   └── package.json
│
├── docs/                       # Documentation
└── package.json               # Root package.json
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.19+
- **Framework**: Express.js 5
- **Real-time**: Socket.IO 4.8
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi
- **Database**: PostgreSQL (`pg`), see [docs/DATABASE.md](docs/DATABASE.md)
- **Logging**: Morgan
- **Development**: Nodemon, ESLint, Jest

### Frontend
- **Framework**: React 19
- **State Management**: Redux Toolkit
- **Routing**: screens switched by the app state (no router library)
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Real-time**: Socket.IO Client
- **HTTP Client**: Fetch API (abstracted)

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19.0 or higher
- npm 9.0.0 or higher
- PostgreSQL 17 (optional): without `DATABASE_URL`, data stays in memory and is lost on restart

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd combocard-game

# Install all dependencies (root, backend, frontend, e2e)
npm run install:all
```

### Development

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on port 3001
npm run dev:frontend  # Frontend on port 3000
```

### Production

```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## 📡 API Endpoints

### Auth Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/refresh` | Get a new access token from the refresh cookie |
| POST | `/api/auth/logout` | End the session on this device |
| POST | `/api/auth/password` | Change your password (needed after an admin reset it) |
| DELETE | `/api/auth/account` | Delete your own account (asks for the password) |

All the routes below require `Authorization: Bearer <access token>`. The acting player always comes from the token. See [docs/AUTH.md](docs/AUTH.md).

### Player Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players/:playerId` | Get your own player |
| POST | `/api/players/:playerId/accept-rules` | Confirm that you read and understood the rules (once; a game does not start until all its players have) |
| POST | `/api/players/:playerId/buy-credits` | Buy credits for your own player |

### Game Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/lobby` | List public waiting games |
| POST | `/api/games` | Create a new game |
| GET | `/api/games/:gameId` | Get a game you created or joined |
| POST | `/api/games/:gameId/join` | Join a game |
| POST | `/api/games/:gameId/start` | Start the game (creator only) |
| POST | `/api/games/:gameId/draw` | Draw a card (the creator, or the player on turn when the game is played by turns) |
| POST | `/api/games/:gameId/claim` | Claim a collection |
| POST | `/api/games/:gameId/jolly/start` | Declare the jolly for a collection: draws are paused for up to 30 seconds while the player chooses the card |
| POST | `/api/games/:gameId/jolly/cancel` | Give the jolly choice up (only the player who is choosing) |
| POST | `/api/games/:gameId/jolly` | Use the jolly card (ends the pause) |
| POST | `/api/games/:gameId/leave` | Leave a game |

### Personal Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me/movements` | Your own history of credit movements (`page`, `limit`, `type`, `from`, `to`) |
| GET | `/api/me/stats` | Your own statistics (needs the database) |

### Admin Routes
Under `/api/admin`, for accounts with the admin role only: users (list, edit, adjust credits, suspend, close sessions, reset password, delete), games (list, cancel), status, statistics and the audit log. See [docs/AUTH.md](docs/AUTH.md).

### Health Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/detailed` | Health check with details |

## 🔌 Socket Events

### Client → Server
- `joinGame`: Join a game room
- `leaveGame`: Leave a game room

### Server → Client
- `playerJoined`: New player joined
- `playerLeft`: Player left
- `gameStarted`: Game started, sent to each player with their own view of the game
- `cardDrawn`: Card was drawn
- `turnoEstrazione`: A new turn to draw has started
- `ammonizione`: A player got a yellow or red card for not drawing in time
- `cardCovered`: Card was covered on the grid of the player who receives it
- `collezioneVinta`: Collection won
- `gettoniAggiornati`: Player tokens updated
- `premiRimanentiDivisi`: Remaining prizes split
- `jollyInCorso` / `jollyAnnullato` / `jollyUsato`: Jolly being chosen / given up / used
- `regoleConfermate`: A player confirmed the rules
- `gameFinished`: Game ended
- `gameCancelled`: Game cancelled by an admin
- `sessionEnded`: The session of the player was closed

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run E2E tests (Playwright)
npm run test:e2e

# Run the database integration tests too (they drop the tables: use a dedicated database)
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/combocard_test npm run test:backend
```

## 🔧 Environment Variables

### Backend (.env)
The complete list, with comments, is in `backend/.env.example` (database, `JWT_SECRET`, session lifetimes, rate limits, credits, draw cooldown and turn time, prize shares). The most common ones:
```bash
PORT=3001
NODE_ENV=development
# CORS allowlist (comma-separated). Supports wildcard patterns using '*'.
# Examples:
# - Allow local dev + any device in the 192.168.1.x subnet
# - Keep this strict in production (avoid broad wildcards on public networks)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000
```

### Frontend (.env)
```bash
# API base URL (optional). Defaults to /api via the Vite dev proxy
VITE_API_URL=/api
# Socket/Backend URL (used for Socket.IO)
VITE_BACKEND_URL=http://localhost:3001
```

### LAN / Multi-device note
If you open the frontend from another device on the same network (e.g. http://192.168.1.42:3000):
- Ensure the backend is reachable from the LAN (firewall/port forwarding as needed)
- Ensure `CORS_ORIGIN` includes the device origin. Wildcards help avoid enumerating every IP.
- Restart the backend after changing `.env`.

### LAN verification (local simulation)
You can simulate a LAN browser Origin from your machine:

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Origin: http://192.168.1.42:3000" \
  http://localhost:3001/api/health
```

Expected: `HTTP 200` if allowed; `HTTP 500` if blocked.

## 📝 Code Style

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Game Design](docs/GAME_DESIGN.md)
- [Authentication and admin area](docs/AUTH.md)
- [Database](docs/DATABASE.md)
- [Test suite](TEST_SUITE.md)
- [Contributing](CONTRIBUTING.md)

## 📄 License

**Proprietary-Use License – Personal & Educational Only**

Copyright (c) 2026 Gregorio La Gamba

This software is provided under a license that allows **personal, educational, or non-commercial use only**.  
You may:
- Use the Software on your own devices.
- Study, explore, or experiment with the Software.
- Fork or modify the Software for **personal or educational purposes only**.

You may **not**:
- Use the Software for commercial purposes, including selling or integrating
  it into a product or service that generates revenue.
- Redistribute, publish, or sublicense the Software without prior written
  permission from the copyright holder.
- Remove or alter the copyright notice or any other notices contained in the Software.

See [LICENSE](LICENSE) for full terms.
