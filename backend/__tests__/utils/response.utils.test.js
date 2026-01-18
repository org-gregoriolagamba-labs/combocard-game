/**
 * Response Utils Tests
 * 
 * Unit tests for standardized API response utilities.
 */

import { jest } from '@jest/globals';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../src/utils/response.utils.js';

describe('Response Utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    test('should send success response with data', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success',
        data: { id: 1, name: 'Test' },
      });
    });

    test('should send success response with custom message', () => {
      const data = { id: 1 };
      sendSuccess(mockRes, data, 'Created successfully');
      
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Created successfully',
        data: { id: 1 },
      });
    });

    test('should send success response with custom status code', () => {
      const data = { id: 1 };
      sendSuccess(mockRes, data, 'Created', 201);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('should handle null data', () => {
      sendSuccess(mockRes, null);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success',
      });
    });

    test('should handle array data', () => {
      sendSuccess(mockRes, [1, 2, 3]);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [1, 2, 3],
        })
      );
    });
  });

  describe('sendCreated', () => {
    test('should send 201 created response', () => {
      const data = { id: 1, name: 'New Item' };
      sendCreated(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Created successfully',
        data,
      });
    });

    test('should send created response with custom message', () => {
      const data = { id: 1 };
      sendCreated(mockRes, data, 'Player created');
      
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Player created',
        data,
      });
    });
  });

  describe('sendNoContent', () => {
    test('should send 204 no content response', () => {
      sendNoContent(mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('sendPaginated', () => {
    test('should send paginated response', () => {
      const data = [1, 2, 3];
      sendPaginated(mockRes, { data, page: 1, limit: 10, total: 25 });
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
      });
    });

    test('should calculate pages correctly', () => {
      sendPaginated(mockRes, { data: [], page: 1, limit: 10, total: 100 });
      
      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.totalPages).toBe(10);
    });

    test('should handle last page correctly', () => {
      sendPaginated(mockRes, { data: [], page: 3, limit: 10, total: 25 });
      
      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.hasNextPage).toBe(false);
      expect(call.pagination.hasPrevPage).toBe(true);
    });

    test('should handle empty results', () => {
      sendPaginated(mockRes, { data: [], page: 1, limit: 10, total: 0 });
      
      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.totalPages).toBe(0);
      expect(call.data).toEqual([]);
    });
  });
});