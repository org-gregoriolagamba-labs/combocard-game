/**
 * App Content Component
 *
 * Restores the session at page load and handles screen navigation based on Redux state.
 */

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "./hooks";
import { setSessionExpiredHandler } from "./services/api";
import { enterGameOrHall } from "./store/sessionThunks";
import { clearGame } from "./store/slices/gameSlice";
import { clearPlayer, restoreSession } from "./store/slices/playerSlice";
import { addToast, setScreen } from "./store/slices/uiSlice";

// Pages
import { HomePage } from "./pages";

// Game screens
import { HallScreen, LobbyScreen, GameScreen, RegoleScreen } from "./components/game";
import { LoadingSpinner } from "./components/common";

function AppContent() {
  const dispatch = useDispatch();
  const currentScreen = useSelector((state) => state.ui.currentScreen);
  const sessionChecked = useSelector((state) => state.player.sessionChecked);
  const playerId = useSelector((state) => state.player.id);
  const regoleAccettateIl = useSelector((state) => state.player.regoleAccettateIl);

  // Initialize socket connection
  useSocket();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      dispatch(clearPlayer());
      dispatch(clearGame());
      dispatch(setScreen("home"));
      dispatch(addToast({ message: "Sessione scaduta, accedi di nuovo", type: "warning" }));
    });

    const restore = async () => {
      const player = await dispatch(restoreSession()).unwrap().catch(() => null);
      if (player) {
        await dispatch(enterGameOrHall(player));
      }
    };
    restore();

    return () => setSessionExpiredHandler(null);
  }, [dispatch]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center tavolo">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  // A player who never confirmed the rules reads them before anything else
  if (playerId && regoleAccettateIl === null) {
    return <RegoleScreen />;
  }

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
