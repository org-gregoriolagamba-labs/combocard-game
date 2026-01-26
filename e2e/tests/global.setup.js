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

    // Check if API is healthy with retries
    console.log(`Checking API health at ${apiURL}/api/health...`);
    let apiHealthy = false;
    for (let i = 0; i < 10; i++) {
      try {
        const response = await page.request.get(`${apiURL}/api/health`, { timeout: 5000 });
        if (response.ok()) {
          console.log('✅ API is healthy');
          apiHealthy = true;
          break;
        }
      } catch (err) {
        console.log(`  Attempt ${i + 1}/10: API not ready yet...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!apiHealthy) {
      throw new Error('API health check failed - server not responding');
    }

    // Navigate to app to verify frontend is ready
    console.log(`Checking frontend at ${baseURL}...`);
    try {
      await page.goto(baseURL, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000); // Give React time to initialize
      
      // Check if page has expected elements loaded
      const pageTitle = await page.title().catch(() => 'No title');
      console.log(`  Page title: ${pageTitle}`);
      
      // Wait for body to have content
      await page.waitForSelector('body', { timeout: 5000 });
      const bodyText = await page.textContent('body');
      if (bodyText && bodyText.length > 0) {
        console.log('✅ Frontend is ready and has rendered content');
      } else {
        console.warn('⚠️ Frontend loaded but content may not be fully rendered');
      }
    } catch (err) {
      console.warn(`⚠️ Frontend check warning: ${err.message}`);
      console.log('  Continuing anyway - tests will retry if needed');
    }

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
