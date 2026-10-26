import { defineConfig, devices } from '@playwright/test';

const url = 'http://localhost:4173/';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: url,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
  webServer: {
    command: `pnpm build fixtures/repos.json && pnpm preview --port ${new URL(url).port} --strictPort`,
    url,
  },
});
