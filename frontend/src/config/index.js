/**
 * Frontend Configuration
 * 
 * Centralized configuration for the frontend application.
 */

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

export default {
  BACKEND_URL,
  API_URL,
  SEMI_EMOJI,
};
