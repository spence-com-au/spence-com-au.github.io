import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  build: { outDir: '_site' },
  plugins: [
    react(),

    // The built page ships no JavaScript, `scripts/build.ts` having rendered it already, so only the dev server loads a
    // script, and that one renders the page in the browser from the fixture.
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
