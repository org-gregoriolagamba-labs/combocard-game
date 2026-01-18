/**
 * App Content Component
 * 
 * Handles screen navigation based on Redux state.
 */

import React from "react";
import { useSelector } from "react-redux";
import { useSocket } from "./hooks";

// Pages
import { HomePage } from "./pages";

// Game screens
import { HallScreen, LobbyScreen, GameScreen } from "./components/game";

function AppContent() {
  const currentScreen = useSelector((state) => state.ui.currentScreen);
  
  // Initialize socket connection
  useSocket();

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomePage />;
      case "hall":
        return <HallScreen />;
      case "lobby":
        return <LobbyScreen />;
      case "game":
        return <GameScreen />;
      default:
        return <HomePage />;
    }
  };

  return renderScreen();
}

export default AppContent;
