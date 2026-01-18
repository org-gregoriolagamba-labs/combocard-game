/**
 * UI Slice
 * 
 * Redux slice for UI state management (toasts, modals, etc).
 */

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Toast notifications
  toasts: [],
  
  // Screen navigation
  currentScreen: "home", // home, hall, lobby, game
  
  // Modals
  modals: {
    cassa: false,
    creaPartita: false,
    joinPrivate: false,
  },
  
  // Loading states
  isLoading: false,
};

let toastId = 0;

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    addToast: (state, action) => {
      const { message, type = "info", duration = 3000 } = action.payload;
      state.toasts.push({
        id: ++toastId,
        message,
        type,
        duration,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
    setScreen: (state, action) => {
      state.currentScreen = action.payload;
    },
    openModal: (state, action) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action) => {
      state.modals[action.payload] = false;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Helper action creators
export const showSuccess = (message) => addToast({ message, type: "success" });
export const showError = (message) => addToast({ message, type: "error" });
export const showInfo = (message) => addToast({ message, type: "info" });
export const showWarning = (message) => addToast({ message, type: "warning" });

export const {
  addToast,
  removeToast,
  clearToasts,
  setScreen,
  openModal,
  closeModal,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
