/**
 * Global Setup
 * 
 * Runs once before all tests. Use for:
 * - Verifying servers are ready
 * - Creating test data
 * - Setting up environment
 */

import { chromium } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables
config();

async function globalSetup() {
  console.log('🚀 Running global setup...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const apiURL = process.env.E2E_API_URL || 'http://localhost:3001';

    // Check if API is healthy
    console.log(`Checking API health at ${apiURL}/api/health...`);
    const response = await page.request.get(`${apiURL}/api/health`);
    
    if (!response.ok()) {
      throw new Error(`API health check failed with status ${response.status()}`);
    }
    console.log('✅ API is healthy');

    // Navigate to app to verify frontend is ready
    console.log(`Checking frontend at ${baseURL}...`);
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    console.log('✅ Frontend is ready');

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
