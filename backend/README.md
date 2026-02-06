# ComboCard Backend 🎴

Node.js backend using Express and Socket.IO for the ComboCard game.

## Architecture

```
src/
├── config/              # Environment configuration and constants
│   ├── index.js        # Environment variables
│   └── constants.js    # Game constants (suits, values, prizes)
├── controllers/         # Request handlers
│   ├── game.controller.js
│   ├── player.controller.js
│   └── health.controller.js
├── middleware/          # Express middleware
│   ├── errorHandler.js
│   ├── requestLogger.js
│   ├── rateLimiter.middleware.js
│   └── validation.middleware.js
├── routes/              # API route definitions
│   ├── game.routes.js
│   ├── player.routes.js
│   ├── health.routes.js
│   └── index.js
├── services/            # Business logic
│   ├── game.service.js  # Collection verification, auto-claim
│   ├── jolly.service.js # Jolly card conversion logic
│   └── player.service.js
├── sockets/             # Socket.IO handlers
│   └── index.js
├── utils/               # Utility functions
│   ├── AppError.js     # Custom error class
│   ├── asyncHandler.js # Async route wrapper
│   ├── cors.utils.js    # CORS origin handler (supports wildcard patterns)
│   ├── response.utils.js # Standardized responses
│   └── card.utils.js   # Card generation utilities
└── server.js            # Entry point
```

## Tech Stack

- **Express.js 4.19** - Web framework
- **Socket.IO 4.7** - Real-time communication
- **Helmet** - Security headers
- **Morgan** - Request logging
- **Joi** - Request validation
- **Compression** - Response compression
- **Express Rate Limit** - Rate limiting

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### Notes about tests (ESM)
This project uses ESM (`"type": "module"`). The backend `npm test` script already runs Jest with
`node --experimental-vm-modules ...` so you normally don't need to pass flags manually.

## API Endpoints

### Players
- `POST /api/players/register` - Register a new player
- `GET /api/players/:id` - Get player details
- `POST /api/players/:id/buy-credits` - Buy credits

### Games
- `GET /api/games/lobby` - Get available games
- `POST /api/games` - Create a new game
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/join` - Join a game
- `POST /api/games/:id/start` - Start the game
- `POST /api/games/:id/draw` - Draw a card
- `POST /api/games/:id/claim` - Claim a collection
- `POST /api/games/:id/jolly` - Use Jolly card
- `POST /api/games/:id/leave` - Leave the game

### Health
- `GET /api/health` - Health check

## Socket Events

### Client → Server
- `joinGame` - Join a game room
- `leaveGame` - Leave a game room

### Server → Client
- `playerJoined` - Player joined game
- `playerLeft` - Player left game
- `gameStarted` - Game started
- `cardDrawn` - Card was drawn
- `cardCovered` - Card covered on a player grid
- `collezioneVinta` - Collection won
- `gettoniAggiornati` - Tokens updated
- `premiRimanentiDivisi` - Remaining prizes split
- `jollyUsato` - Jolly used
- `gameFinished` - Game ended

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=3001
NODE_ENV=development
# CORS allowlist (comma-separated). Supports wildcard patterns using '*'.
# Examples:
# - Local dev only:
#   CORS_ORIGIN=http://localhost:3000,http://localhost:3001
# - Local dev + any device in 192.168.1.x subnet:
#   CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000
```

### CORS implementation details
- The origin handler is built in `src/utils/cors.utils.js` and used by both Express CORS middleware and Socket.IO.
- Requests without an `Origin` header are allowed (useful for server-to-server calls and local `curl`).

## Game Logic

### Collections
| Type | Description | Cards Required |
|------|-------------|----------------|
| Tris | Same value | 3 |
| Sequenza | Consecutive values | 4 |
| Scopa | Same suit | 5 |
| Napola | Tris + Pair | 5 |
| Combocard Reale | Consecutive same suit | 4 |

### Jolly System
Each player has one Jolly card that can be converted to complete any collection.
