import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import './index.css';

// App component
function App() {
  // Local state to show connection status in the UI if desired
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create the socket inside the effect so we control lifecycle and
    // avoid creating multiple connections during HMR / hot reload.
    const socket = io("http://localhost:3001", {
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
      setConnected(false);
    });

    // Example: listen for a server event
    socket.on("pong", (data) => {
      console.log("pong event:", data);
    });

    // Clean up: disconnect socket when component unmounts
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>React + Socket.IO</h1>
      <p>Socket status: {connected ? "connected" : "disconnected"}</p>
    </div>
  );
}

export default App;