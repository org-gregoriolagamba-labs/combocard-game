/**
 * AppError Tests
 * 
 * Unit tests for custom error class.
 */

import { jest } from '@jest/globals';
import { AppError, createError } from '../../src/utils/AppError.js';

describe('AppError', () => {
  test('should create error with message and status code', () => {
    const error = new AppError('Not found', 404);
    
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });

  test('should set status to "error" for 5xx codes', () => {
    const error = new AppError('Server error', 500);
    
    expect(error.status).toBe('error');
  });

  test('should set status to "fail" for 4xx codes', () => {
    const error = new AppError('Bad request', 400);
    
    expect(error.status).toBe('fail');
  });

  test('should be instance of Error', () => {
    const error = new AppError('Test error', 400);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  test('should capture stack trace', () => {
    const error = new AppError('Test error', 400);
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });

  describe('createError helpers', () => {
    test('should create bad request error', () => {
      const error = createError.badRequest('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    test('should create unauthorized error', () => {
      const error = createError.unauthorized();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    test('should create forbidden error', () => {
      const error = createError.forbidden();
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    test('should create not found error', () => {
      const error = createError.notFound('Resource not found');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    test('should create conflict error', () => {
      const error = createError.conflict();
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });

    test('should create internal server error', () => {
      const error = createError.internal();
      
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal Server Error');
    });
  });
});