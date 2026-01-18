/**
 * Player Slice
 * 
 * Redux slice for player state management.
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as playerService from "../../services/playerService";

// Async thunks
export const registerPlayer = createAsyncThunk(
  "player/register",
  async (playerName, { rejectWithValue }) => {
    try {
      const result = await playerService.registerPlayer(playerName);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
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
};

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
    clearPlayer: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register player
      .addCase(registerPlayer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerPlayer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.id = action.payload.playerId;
        state.name = action.payload.player.name;
        state.credits = action.payload.player.credits;
      })
      .addCase(registerPlayer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
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
