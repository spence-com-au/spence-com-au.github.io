import { defineConfig, devices } from '@playwright/test';

const url = 'http://localhost:4173/';

// A directory of its own, since a build empties the one it writes to: sharing the live site's would swap the fixture
// into what `pnpm preview` serves, and sharing `lint:html`'s would let a lint empty this one while a run serves it.
const OUT_DIR = 'dist/e2e';

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
