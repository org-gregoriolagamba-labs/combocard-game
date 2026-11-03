# ComboCard Game 🎴

An Italian card game with real-time multiplayer support, built with modern web technologies.

## 🎮 Game Overview

ComboCard is a multiplayer card game using the Italian deck (40 cards with suits: Spade ⚔️, Coppe 🏆, Denari 💰, Bastoni 🪵). Players compete to complete collections and win prizes from the pot.

### Collections
| Collection | Description | Prize |
|------------|-------------|-------|
| **Tris** 🎯 | 3 cards of same value | 20% of pot |
| **Sequenza** 📊 | 4 consecutive cards | 20% of pot |
| **Scopa** 🎴 | 5 cards of same suit | 25% of pot |
| **Napola** 💎 | Tris + Pair (full house) | 25% of pot |
| **Combocard Reale** 👑 | 4 consecutive same suit | 100% - WIN! |

### Jolly System
Each player has one Jolly card that can be converted to any card needed to complete a collection. Use it strategically!

### Additional Gameplay Features
- **Private games** with join-by-code support
- **Max players** per game (2–10) with **auto-start** when the table is full
- **Draw cooldown**: 8-second delay between card draws
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
- **Routing**: React Router v6
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

# Install all dependencies (root, backend, frontend)
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
| POST | `/api/games/:gameId/draw` | Draw a card (creator only) |
| POST | `/api/games/:gameId/claim` | Claim a collection |
| POST | `/api/games/:gameId/jolly` | Use the jolly card |
| POST | `/api/games/:gameId/leave` | Leave a game |

### Health Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## 🔌 Socket Events

### Client → Server
- `joinGame`: Join a game room
- `leaveGame`: Leave a game room

### Server → Client
- `playerJoined`: New player joined
- `playerLeft`: Player left
- `gameStarted`: Game started, sent to each player with their own view of the game
- `cardDrawn`: Card was drawn
- `cardCovered`: Card was covered on the grid of the player who receives it
- `collezioneVinta`: Collection won
- `gettoniAggiornati`: Player tokens updated
- `premiRimanentiDivisi`: Remaining prizes split
- `jollyUsato`: Jolly used
- `gameFinished`: Game ended

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
