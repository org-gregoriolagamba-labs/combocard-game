/**
 * Redux Store Configuration
 * 
 * Configures the Redux store with slices and middleware.
 */

/* global process */

import { configureStore } from "@reduxjs/toolkit";
import playerReducer from "./slices/playerSlice";
import gameReducer from "./slices/gameSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    player: playerReducer,
    game: gameReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["game/setGame"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export default store;
