/**
 * Frontend Configuration
 * 
 * Centralized configuration for the frontend application.
 */

/* global process */

const REACT_APP_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const DEFAULT_BACKEND_PORT = 3001;
const detectedHost =
  typeof window !== "undefined" ? window.location.hostname : "localhost";
const backendHost =
  REACT_APP_BACKEND_URL ||
  `${window.location.protocol}//${detectedHost}:${DEFAULT_BACKEND_PORT}`;

export const BACKEND_URL = backendHost.replace(
  /:\/\/localhost:/,
  `://${detectedHost}:`
);

export const API_URL = `${BACKEND_URL}/api`;

export const SEMI_EMOJI = {
  Spade: "⚔️",
  Coppe: "🏆",
  Denari: "💰",
  Bastoni: "🪵",
};

export const SEMI_COLORS = {
  Spade: "from-gray-700 to-gray-900",
  Coppe: "from-red-600 to-red-800",
  Denari: "from-yellow-500 to-yellow-700",
  Bastoni: "from-amber-700 to-amber-900",
};

export default {
  BACKEND_URL,
  API_URL,
  SEMI_EMOJI,
  SEMI_COLORS,
};
