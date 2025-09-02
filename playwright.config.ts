import os from 'node:os'
import { defineConfig, devices } from '@playwright/test'

const cpuCount = os.cpus().length
const totalMemoryGB = Math.floor(os.totalmem() / 1024 / 1024 / 1024)

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const workers = process.env.CI
  ? Math.min(4, cpuCount)
  : Math.min(Math.floor(cpuCount * 0.8), Math.floor(totalMemoryGB / 2))

export default defineConfig({
  testDir: './playwright',
  outputDir: './playwright/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: process.env.CI ? [['line']] : [['html', { outputFolder: './playwright/report' }]],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retry-with-trace',
    screenshot: 'off',
    video: 'retry-with-video',
    navigationTimeout: 15000,
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees,VizDisplayCompositor',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-background-networking',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
          ],
        },
      },
    },
  ],

  webServer: {
    command: 'npm run preview',
    port: 4173,
    timeout: 60000,
  },
})
