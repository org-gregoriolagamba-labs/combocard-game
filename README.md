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
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.19
- **Real-time**: Socket.IO 4.7
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi
- **Logging**: Morgan
- **Development**: Nodemon, ESLint, Jest

### Frontend
- **Framework**: React 18
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Real-time**: Socket.IO Client
- **HTTP Client**: Fetch API (abstracted)

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

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

### Player Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/players/register` | Register a new player |
| GET | `/api/players/:id` | Get player details |
| POST | `/api/players/:id/credits` | Buy credits |

### Game Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/lobby` | Get all available games |
| POST | `/api/games` | Create a new game |
| GET | `/api/games/:id` | Get game details |
| POST | `/api/games/:id/join` | Join a game |
| POST | `/api/games/:id/start` | Start the game |
| POST | `/api/games/:id/draw` | Draw a card |
| POST | `/api/games/:id/claim` | Claim a collection |
| POST | `/api/games/:id/jolly` | Use Jolly card |
| POST | `/api/games/:id/leave` | Leave the game |

### Health Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## 🔌 Socket Events

### Client → Server
- `joinGame`: Join a game room
- `leaveGame`: Leave a game room
- `gameAction`: Perform a game action

### Server → Client
- `gameUpdate`: Game state update
- `playerJoined`: New player joined
- `playerLeft`: Player left
- `gameStarted`: Game started
- `cardDrawn`: Card was drawn
- `collectionClaimed`: Collection claimed
- `gameEnded`: Game ended

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## 🔧 Environment Variables

### Backend (.env)
```bash
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_ENV=development
```

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
