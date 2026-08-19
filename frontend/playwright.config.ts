import { defineConfig } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.WORKBRAID_PLAYWRIGHT_OUTPUT_DIR ?? join(tmpdir(), 'workbraid-playwright-results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 4 * 60 * 1000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  use: {
    headless: true,
    trace: 'retain-on-failure',
  },
})
