/**
 * Health Controller Tests
 * 
 * Unit tests for health check endpoint.
 */

import { jest } from '@jest/globals';
import { healthCheck } from '../../src/controllers/health.controller.js';

describe('Health Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('healthCheck', () => {
    test('should return 200 with ok status', () => {
      healthCheck(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
        })
      );
    });

    test('should include timestamp in response', () => {
      healthCheck(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    test('should include uptime in response', () => {
      healthCheck(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          uptime: expect.any(Number),
        })
      );
    });
  });
});
