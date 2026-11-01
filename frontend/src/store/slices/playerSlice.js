/**
 * Player Slice
 * 
 * Redux slice for player state management.
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as authService from "../../services/authService";
import * as playerService from "../../services/playerService";

// Async thunks
export const registerAccount = createAsyncThunk(
  "player/register",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      return await authService.register(username, password);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const login = createAsyncThunk(
  "player/login",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      return await authService.login(username, password);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Called at page load: the refresh cookie brings back the session, if there is one
export const restoreSession = createAsyncThunk(
  "player/restoreSession",
  async () => authService.restoreSession()
);

export const logout = createAsyncThunk(
  "player/logout",
  async () => authService.logout()
);

export const fetchPlayer = createAsyncThunk(
  "player/fetch",
  async (playerId, { rejectWithValue }) => {
    try {
      const player = await playerService.getPlayer(playerId);
      return player;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const buyCredits = createAsyncThunk(
  "player/buyCredits",
  async ({ playerId, amount }, { rejectWithValue }) => {
    try {
      const result = await playerService.buyCredits(playerId, amount);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  id: null,
  name: "",
  credits: 0,
  currentGameId: null,
  isLoading: false,
  error: null,
  // False until the first check for an existing session has finished
  sessionChecked: false,
};

const applyPlayer = (state, player) => {
  state.id = player.id;
  state.name = player.name;
  state.credits = player.credits;
  state.currentGameId = player.currentGameId;
};

const noSession = { ...initialState, sessionChecked: true };

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setPlayer: (state, action) => {
      return { ...state, ...action.payload };
    },
    updateCredits: (state, action) => {
      state.credits = action.payload;
    },
    setCurrentGameId: (state, action) => {
      state.currentGameId = action.payload;
    },
    clearPlayer: () => noSession,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register and login
      .addCase(registerAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        applyPlayer(state, action.payload.player);
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        applyPlayer(state, action.payload.player);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Restore session
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.sessionChecked = true;
        if (action.payload) {
          applyPlayer(state, action.payload);
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.sessionChecked = true;
      })
      // Logout: even if the server cannot be reached, this device forgets the player
      .addCase(logout.fulfilled, () => noSession)
      .addCase(logout.rejected, () => noSession)
      // Fetch player
      .addCase(fetchPlayer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPlayer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.id = action.payload.id;
        state.name = action.payload.name;
        state.credits = action.payload.credits;
        state.currentGameId = action.payload.currentGameId;
      })
      .addCase(fetchPlayer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Buy credits
      .addCase(buyCredits.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(buyCredits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.credits = action.payload.credits;
      })
      .addCase(buyCredits.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setPlayer, updateCredits, setCurrentGameId, clearPlayer, clearError } = playerSlice.actions;
export default playerSlice.reducer;
