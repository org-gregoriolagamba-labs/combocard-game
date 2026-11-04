/**
 * Request Validation Schemas
 *
 * Joi schemas for the request bodies, applied by the validate middleware.
 * Numbers are strict: a string like "5" is rejected, not converted.
 */

import Joi from "joi";
import { ACCOUNT_ROLES, COLLECTION_TYPES, GAME_DEFAULTS } from "../config/constants.js";

const integer = Joi.number().integer().strict();
const collectionType = Joi.string().valid(...Object.values(COLLECTION_TYPES));
const gridIndex = integer.min(0).max(GAME_DEFAULTS.GRID_SIZE - 1);

const username = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u)
  .messages({
    "string.pattern.base": "Username can contain only letters, numbers, spaces and _ . -",
  });

// Auth routes
export const registerSchema = Joi.object({
  username: username.required(),
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

// Admin routes. A query string is text: numbers are read from it, not strict.
const pageQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

export const adminListUsersQuerySchema = Joi.object({
  q: Joi.string().trim().max(30).allow(""),
  role: Joi.string().valid(...ACCOUNT_ROLES),
  ...pageQuery,
});

// One change at a time: a rename and a role change that fails halfway would leave one of them done
export const adminUpdateUserSchema = Joi.object({
  username,
  role: Joi.string().valid(...ACCOUNT_ROLES),
}).xor("username", "role");

// Credits to add (positive) or take away (negative), with the reason that goes in the audit log
export const adminAdjustCreditsSchema = Joi.object({
  amount: integer.min(-1000000).max(1000000).invalid(0).required(),
  reason: Joi.string().trim().min(1).max(200).required(),
});

export const adminAuditQuerySchema = Joi.object({
  targetId: Joi.string().max(64),
  ...pageQuery,
});
