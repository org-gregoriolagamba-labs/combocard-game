/**
 * Request Validation Schemas
 *
 * Joi schemas for the request bodies, applied by the validate middleware.
 * Numbers are strict: a string like "5" is rejected, not converted.
 */

import Joi from "joi";
import { COLLECTION_TYPES, GAME_DEFAULTS } from "../config/constants.js";

const playerId = Joi.string().max(64);
const integer = Joi.number().integer().strict();
const collectionType = Joi.string().valid(...Object.values(COLLECTION_TYPES));
const gridIndex = integer.min(0).max(GAME_DEFAULTS.GRID_SIZE - 1);

// Player routes
export const registerPlayerSchema = Joi.object({
  playerName: Joi.string().trim().min(1).max(50).required(),
});

export const buyCreditsSchema = Joi.object({
  amount: integer.min(1).required(),
});

// Game routes
export const createGameSchema = Joi.object({
  playerId: playerId.required(),
  requiredCredits: integer.min(0),
  isPrivate: Joi.boolean().strict(),
  maxPlayers: integer.min(GAME_DEFAULTS.MIN_PLAYERS).max(GAME_DEFAULTS.MAX_PLAYERS),
});

export const playerActionSchema = Joi.object({
  playerId: playerId.required(),
});

// The creator check is applied only when a player is given
export const optionalPlayerActionSchema = Joi.object({
  playerId: playerId.allow(null),
});

export const claimCollectionSchema = Joi.object({
  playerId: playerId.required(),
  tipo: collectionType.required(),
});

export const useJollySchema = Joi.object({
  playerId: playerId.required(),
  tipo: collectionType.required(),
  row: gridIndex.required(),
  col: gridIndex.required(),
});
