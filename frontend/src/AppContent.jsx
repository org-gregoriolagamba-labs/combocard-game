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
import { HallScreen, LobbyScreen, GameScreen, RegoleScreen, ChangePasswordScreen } from "./components/game";
import { AdminScreen } from "./components/admin";
import { LoadingSpinner } from "./components/common";

function AppContent() {
  const dispatch = useDispatch();
  const currentScreen = useSelector((state) => state.ui.currentScreen);
  const sessionChecked = useSelector((state) => state.player.sessionChecked);
  const playerId = useSelector((state) => state.player.id);
  const regoleAccettateIl = useSelector((state) => state.player.regoleAccettateIl);
  const role = useSelector((state) => state.player.role);
  const mustChangePassword = useSelector((state) => state.player.mustChangePassword);

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
      // With a temporary password the server refuses the game: the player chooses a password first
      if (player && !player.mustChangePassword) {
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

  // A temporary password comes before everything, the rules included
  if (playerId && mustChangePassword) {
    return <ChangePasswordScreen />;
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
      case "admin":
        // The way in is only offered to an admin, and the server refuses everybody else: anybody
        // else who ends up here is shown the hall
        return role === "admin" ? <AdminScreen /> : <HallScreen />;
      default:
        return <HomePage />;
    }
  };

  return renderScreen();
}

export default AppContent;
