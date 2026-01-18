/**
 * AppError Tests
 * 
 * Unit tests for custom error class.
 */

import { jest } from '@jest/globals';
import AppError from '../../src/utils/AppError.js';

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

  test('should default to 500 if no status code provided', () => {
    const error = new AppError('Unknown error');
    
    expect(error.statusCode).toBe(500);
  });
});
