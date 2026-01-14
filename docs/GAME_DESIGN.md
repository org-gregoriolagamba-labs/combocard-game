# COMBOCARD - Struttura del Progetto

## 📁 Struttura File Backend

```
backend/
├── server.js                    # Server principale
├── server/
│   ├── staticServing.js         # Gestione file statici
│   ├── playerRoutes.js          # API per gestione giocatori
│   ├── gameRoutes.js            # API partite (parte 1)
│   ├── gameRoutes2.js           # API partite (parte 2)
│   ├── socketHandlers.js        # Gestione Socket.IO
│   ├── constants.js             # Costanti (semi, valori)
│   ├── cardUtils.js             # Utility per carte
│   ├── gameLogic.js             # Logica collezioni
│   └── jollyLogic.js            # Logica jolly
└── package.json
```

## 📁 Struttura File Frontend

```
frontend/src/
├── App.js                       # Componente principale
├── config.js                    # Configurazione e costanti
├── components/
│   ├── HomeScreen.js            # Schermata iniziale
│   ├── HallScreen.js            # Hall con lobby
│   ├── LobbyScreen.js           # Lobby partita
│   ├── GameScreen.js            # Schermata gioco
│   ├── Cartella.js              # Componente cartella
│   ├── CollezioniPanel.js       # Pannello collezioni
│   └── Toast.js                 # Notifiche toast
├── hooks/
│   ├── useToast.js              # Hook per toast
│   └── useSocket.js             # Hook Socket.IO
├── utils/
│   └── progressoUtils.js        # Calcolo progresso
├── index.css
└── App.css
```
## 🔧 Personalizzazioni Possibili

- Aggiungere database per persistenza
- Implementare autenticazione
- Aggiungere chat in-game
- Statistiche giocatori
- Classifiche globali