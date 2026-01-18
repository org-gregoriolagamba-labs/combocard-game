/**
 * Main Application Component
 * 
 * Entry point that wraps the app with providers and handles routing.
 */

import React from "react";
import { Provider } from "react-redux";
import store from "./store";
import AppContent from "./AppContent";
import { Toast } from "./components/common";
import "./styles/index.css";

function App() {
  return (
    <Provider store={store}>
      <AppContent />
      <Toast />
    </Provider>
  );
}

export default App;
