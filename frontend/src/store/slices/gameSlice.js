/**
 * Game Slice
 * 
 * Redux slice for game state management.
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as gameService from "../../services/gameService";

// Async thunks
export const fetchLobby = createAsyncThunk(
  "game/fetchLobby",
  async (_, { rejectWithValue }) => {
    try {
      const lobbies = await gameService.getLobby();
      return lobbies;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createGame = createAsyncThunk(
  "game/create",
  async (options, { rejectWithValue }) => {
    try {
      const result = await gameService.createGame(options);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const joinGame = createAsyncThunk(
  "game/join",
  async ({ gameId }, { rejectWithValue }) => {
    try {
      const result = await gameService.joinGame(gameId);
      return { ...result, gameId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const startGame = createAsyncThunk(
  "game/start",
  async ({ gameId }, { rejectWithValue }) => {
    try {
      const result = await gameService.startGame(gameId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const drawCard = createAsyncThunk(
  "game/draw",
  async ({ gameId }, { rejectWithValue }) => {
    try {
      const result = await gameService.drawCard(gameId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const playJolly = createAsyncThunk(
  "game/useJolly",
  async ({ gameId, row, col, tipo }, { rejectWithValue }) => {
    try {
      const result = await gameService.useJolly(gameId, { row, col, tipo });
      return { ...result, row, col };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Declaring the jolly pauses the draws for everybody while the player chooses the card
export const declareJolly = createAsyncThunk(
  "game/declareJolly",
  async ({ gameId, tipo }, { rejectWithValue }) => {
    try {
      return await gameService.startJollyChoice(gameId, tipo);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const releaseJolly = createAsyncThunk(
  "game/releaseJolly",
  async ({ gameId }, { rejectWithValue }) => {
    try {
      return await gameService.cancelJollyChoice(gameId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const leaveGame = createAsyncThunk(
  "game/leave",
  async ({ gameId }, { rejectWithValue }) => {
    try {
      const result = await gameService.leaveGame(gameId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Current game
  currentGameId: null,
  game: null,
  currentPlayer: null,
  
  // Card state
  ultimaCartaEstratta: null,
  
  // Jolly state
  jollyMode: null,
  
  // Lobby
  lobbies: [],
  
  // Loading/Error
  isLoading: false,
  error: null,
  
  // Draw cooldown
  drawCooldown: 0,
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setGame: (state, action) => {
      state.game = action.payload;
    },
    setCurrentPlayer: (state, action) => {
      state.currentPlayer = action.payload;
    },
    resumeGame: (state, action) => {
      const { game, currentPlayer } = action.payload;
      state.currentGameId = game.id;
      state.game = game;
      state.currentPlayer = currentPlayer;
    },
    setUltimaCartaEstratta: (state, action) => {
      state.ultimaCartaEstratta = action.payload;
    },
    setJollyMode: (state, action) => {
      state.jollyMode = action.payload;
    },
    // Who is choosing the jolly card now, or null. The server sends it with the game too.
    setJollyInCorso: (state, action) => {
      if (state.game) {
        state.game.jollyInCorso = action.payload;
      }
    },
    // The pause ends. With a player, only if it is that player's pause: an old message
    // must not end the pause of someone else.
    clearJollyInCorso: (state, action) => {
      const playerId = action.payload;
      if (state.game && (!playerId || state.game.jollyInCorso?.playerId === playerId)) {
        state.game.jollyInCorso = null;
      }
    },
    setDrawCooldown: (state, action) => {
      state.drawCooldown = action.payload;
    },
    decrementDrawCooldown: (state) => {
      if (state.drawCooldown > 0) {
        state.drawCooldown -= 1;
      }
    },
    updatePlayerCards: (state, action) => {
      const { row, col, covered } = action.payload;
      if (state.currentPlayer && state.currentPlayer.coperte) {
        state.currentPlayer.coperte[row][col] = covered;
      }
    },
    updatePlayerGettoni: (state, action) => {
      if (state.currentPlayer) {
        state.currentPlayer.gettoni = action.payload;
      }
    },
    clearGame: (state) => {
      state.currentGameId = null;
      state.game = null;
      state.currentPlayer = null;
      state.ultimaCartaEstratta = null;
      state.jollyMode = null;
      state.drawCooldown = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch lobby
      .addCase(fetchLobby.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLobby.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lobbies = action.payload;
      })
      .addCase(fetchLobby.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create game
      .addCase(createGame.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createGame.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGameId = action.payload.gameId;
        state.game = action.payload.game;
      })
      .addCase(createGame.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Join game
      .addCase(joinGame.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(joinGame.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGameId = action.payload.gameId;
        state.currentPlayer = action.payload.player;
      })
      .addCase(joinGame.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Start game
      .addCase(startGame.fulfilled, (state, action) => {
        state.game = action.payload.game;
      })
      // Draw card
      .addCase(drawCard.fulfilled, (state, action) => {
        state.ultimaCartaEstratta = action.payload.carta;
        state.drawCooldown = 8;
      })
      // Declare the jolly: the answer carries the pause that has started
      .addCase(declareJolly.fulfilled, (state, action) => {
        if (state.game && action.payload?.jollyInCorso) {
          state.game.jollyInCorso = action.payload.jollyInCorso;
        }
      })
      // The jolly is used: the pause is over
      .addCase(playJolly.fulfilled, (state) => {
        if (state.game) {
          state.game.jollyInCorso = null;
        }
      })
      // Leave game
      .addCase(leaveGame.fulfilled, (state) => {
        state.currentGameId = null;
        state.game = null;
        state.currentPlayer = null;
        state.ultimaCartaEstratta = null;
        state.jollyMode = null;
      });
  },
});

export const {
  setGame,
  setCurrentPlayer,
  resumeGame,
  setUltimaCartaEstratta,
  setJollyMode,
  setJollyInCorso,
  clearJollyInCorso,
  setDrawCooldown,
  decrementDrawCooldown,
  updatePlayerCards,
  updatePlayerGettoni,
  clearGame,
  clearError,
} = gameSlice.actions;

export default gameSlice.reducer;
