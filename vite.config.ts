import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

import { fetchImages } from './scripts/v86.ts';

export default defineConfig({
  build: {
    outDir: '_site',

    // The page preloads only what the Terminal card imports once opened, and every current browser preloads a module
    // itself, so a polyfill would be bytes shipped for none.
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

    // Into the public directory, which the dev server serves from and the build copies into the site. Not for Vitest,
    // whose server would otherwise fetch megabytes for unit tests that boot nothing.
    {
      name: 'v86-images',
      apply: (_, { mode }) => mode !== 'test',
      buildStart: () => fetchImages(`${import.meta.dirname}/public/v86`),
    },
  ],
  test: {
    exclude: [...configDefaults.exclude, '.claude/worktrees/**', 'tests/e2e/**'],
  },
});
