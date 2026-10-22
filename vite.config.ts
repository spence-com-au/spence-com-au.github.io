import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: '_site',

    // The page's one script imports nothing, so there is no preload for a polyfill to make, only bytes to ship.
    modulePreload: { polyfill: false },
  },
  plugins: [
    react(),

    // The built page ships no React, `scripts/build.ts` having rendered it already, so only the dev server loads the
    // script that renders it in the browser from the fixture.
    {
      name: 'dev-entry',
      apply: 'serve',
      transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: '/src/dev.tsx' }, injectTo: 'body' }],
    },
  ],
  test: {
    exclude: [...configDefaults.exclude, '.claude/worktrees/**', 'tests/e2e/**'],
  },
});
