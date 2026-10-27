import { defineConfig, devices } from '@playwright/test';

const url = 'http://localhost:4173/';

// A directory of its own, so that a run never swaps the fixture into the build of the live repos `pnpm preview` serves.
const OUT_DIR = '_fixture-site';

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
    command: [
      `pnpm build fixtures/repos.json --outDir ${OUT_DIR}`,
      `pnpm preview --outDir ${OUT_DIR} --port ${new URL(url).port} --strictPort`,
    ].join(' && '),
    url,
  },
});
