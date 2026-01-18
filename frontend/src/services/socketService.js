/**
 * WebSocket Service
 * 
 * Manages Socket.IO connection for real-time game features.
 */

import { io } from "socket.io-client";

// Socket.IO server URL
const getSocketUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (backendUrl) {
    return backendUrl.replace(/\/api\/?$/, "");
  }
  
  const defaultPort = 3001;
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  
  return `${protocol}//${host}:${defaultPort}`;
};

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = getSocketUrl();
    
    this.socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Get the socket instance
   * @returns {Socket} Socket.IO instance
   */
  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected. Cannot emit:", event);
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);

      return () => {
        this.socket?.off(event, callback);
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      };
    }
    return () => {};
  }

  /**
   * Remove a specific listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Join a game room
   * @param {string} gameId - Game ID
   */
  joinGame(gameId) {
    this.emit("joinGame", gameId);
  }

  /**
   * Leave a game room
   * @param {string} gameId - Game ID
   */
  leaveGame(gameId) {
    this.emit("leaveGame", gameId);
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
