/**
 * Response Utils Tests
 * 
 * Unit tests for standardized API response utilities.
 */

import { jest } from '@jest/globals';
import { successResponse, errorResponse, paginatedResponse } from '../../src/utils/response.utils.js';

describe('Response Utils', () => {
  describe('successResponse', () => {
    test('should format success response with data', () => {
      const response = successResponse({ id: 1, name: 'Test' });
      
      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      });
    });

    test('should format success response with message', () => {
      const response = successResponse({ id: 1 }, 'Created successfully');
      
      expect(response).toEqual({
        success: true,
        data: { id: 1 },
        message: 'Created successfully',
      });
    });

    test('should handle null data', () => {
      const response = successResponse(null);
      
      expect(response).toEqual({
        success: true,
        data: null,
      });
    });

    test('should handle array data', () => {
      const response = successResponse([1, 2, 3]);
      
      expect(response).toEqual({
        success: true,
        data: [1, 2, 3],
      });
    });
  });

  describe('errorResponse', () => {
    test('should format error response with message', () => {
      const response = errorResponse('Something went wrong');
      
      expect(response).toEqual({
        success: false,
        error: 'Something went wrong',
      });
    });

    test('should format error response with details', () => {
      const response = errorResponse('Validation failed', { field: 'email' });
      
      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        details: { field: 'email' },
      });
    });
  });

  describe('paginatedResponse', () => {
    test('should format paginated response', () => {
      const response = paginatedResponse([1, 2, 3], 1, 10, 25);
      
      expect(response).toEqual({
        success: true,
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });
    });

    test('should calculate pages correctly', () => {
      const response = paginatedResponse([], 1, 10, 100);
      
      expect(response.pagination.pages).toBe(10);
    });

    test('should handle empty results', () => {
      const response = paginatedResponse([], 1, 10, 0);
      
      expect(response.pagination.pages).toBe(0);
      expect(response.data).toEqual([]);
    });
  });
});
