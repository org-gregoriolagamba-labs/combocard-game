# ComboCard Frontend 🎴

React application for the ComboCard game.

## Architecture

```
src/
├── components/           # React components
│   ├── common/          # Reusable UI components (Button, Input, Modal, Toast, etc.)
│   └── game/            # Game-specific components (GameScreen, HallScreen, etc.)
├── config/              # Configuration (API URLs, constants)
├── hooks/               # Custom React hooks (useSocket, useToast)
├── pages/               # Page components (HomePage)
├── services/            # API service layer (api, socket, player, game services)
├── store/               # Redux store and slices
│   └── slices/          # Redux slices (playerSlice, gameSlice, uiSlice)
├── styles/              # CSS styles
├── utils/               # Utility functions
├── App.jsx              # Main app with Redux Provider
├── AppContent.jsx       # Screen navigation component
└── index.js             # Entry point
```

## Tech Stack

- **React 18** - UI framework
- **Redux Toolkit** - State management
- **Socket.IO Client** - Real-time communication
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## State Management

The app uses Redux Toolkit with the following slices:

- **playerSlice**: Player registration, credits, authentication
- **gameSlice**: Game state, current game, drawing cards, collections
- **uiSlice**: UI state (current screen, toasts, modals)

## Components

### Common Components
- `Button` - Styled button with variants
- `Input` - Form input with validation
- `Modal` - Modal dialog
- `Toast` - Toast notifications
- `LoadingSpinner` - Loading indicator

### Game Components
- `HallScreen` - Game lobby list and creation
- `LobbyScreen` - Pre-game waiting room
- `GameScreen` - Main game interface
- `Cartella` - Player's 5x5 card grid
- `CollezioniPanel` - Collections progress and claims
- `PlayersList` - List of players in game

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# API base URL (optional). Defaults to /api via CRA proxy
REACT_APP_API_URL=/api
# Socket/Backend URL (used for Socket.IO)
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_ENV=development
```

### LAN / Multi-device note
When opening the app from another device on the same network:

- The Socket.IO client can auto-resolve the backend using the current host (recommended). In that case,
	you can usually leave `REACT_APP_BACKEND_URL` empty.
- The backend must allow the frontend origin via `CORS_ORIGIN` (see backend docs). If you open the frontend
	via IP (e.g. `http://192.168.1.42:3000`), ensure that origin is allowed (wildcards like
	`http://192.168.1.*:3000` are supported).