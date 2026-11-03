/**
 * Request Validation Schemas
 *
 * Joi schemas for the request bodies, applied by the validate middleware.
 * Numbers are strict: a string like "5" is rejected, not converted.
 */

import Joi from "joi";
import { COLLECTION_TYPES, GAME_DEFAULTS } from "../config/constants.js";

const integer = Joi.number().integer().strict();
const collectionType = Joi.string().valid(...Object.values(COLLECTION_TYPES));
const gridIndex = integer.min(0).max(GAME_DEFAULTS.GRID_SIZE - 1);

// Auth routes
export const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u)
    .required()
    .messages({
      "string.pattern.base": "Username can contain only letters, numbers, spaces and _ . -",
    }),
  password: Joi.string().min(8).max(128).required(),
});

// No length rules at login: they would only reveal the password policy
export const loginSchema = Joi.object({
  username: Joi.string().max(100).required(),
  password: Joi.string().max(128).required(),
});

// Player routes
export const buyCreditsSchema = Joi.object({
  amount: integer.min(1).required(),
});

// Game routes
export const createGameSchema = Joi.object({
  requiredCredits: integer.min(0),
  isPrivate: Joi.boolean().strict(),
  maxPlayers: integer.min(GAME_DEFAULTS.MIN_PLAYERS).max(GAME_DEFAULTS.MAX_PLAYERS),
});

export const claimCollectionSchema = Joi.object({
  tipo: collectionType.required(),
});

export const startJollySchema = Joi.object({
  tipo: collectionType.required(),
});

export const useJollySchema = Joi.object({
  tipo: collectionType.required(),
  row: gridIndex.required(),
  col: gridIndex.required(),
});
