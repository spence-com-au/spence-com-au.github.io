// Build the site into Vite's `build.outDir`, or the `--outDir` given as `vite build` takes it: Vite bundles the page's
// assets, then React prerenders the cards into it from the `repos.json` that `pnpm fetch:repos` writes, or from the
// file named on the command line, such as the tests' fixture.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { build } from 'vite';

import type { Project } from '../src/project.ts';
import { readFavicon, renderIcon, SITE_ICONS } from './icons.ts';

const SSR_OUT = '.ssr';
const PLACEHOLDER = '<!--app-->';

const { positionals, values } = parseArgs({ allowPositionals: true, options: { outDir: { type: 'string' } } });

// Read before building, so that a missing `repos.json` fails at once rather than after a build that cannot finish.
const projects = JSON.parse(await readFile(positionals[0] ?? 'repos.json', 'utf8')) as Project[];

// Taken from the build, which resolves it from `--outDir` or else `vite.config.ts`, rather than copying the config's.
let outDir = '';

await build({
  build: { outDir: values.outDir },
  plugins: [
    {
      name: 'out-dir',
      configResolved(config) {
        outDir = config.build.outDir;
      },
    },
  ],
});

await build({ build: { ssr: 'src/server.tsx', outDir: SSR_OUT } });

const { render } = (await import(pathToFileURL(`${SSR_OUT}/server.js`).href)) as typeof import('../src/server.tsx');
const page = await readFile(`${outDir}/index.html`, 'utf8');

if (!page.includes(PLACEHOLDER)) {
  throw new Error(`index.html is missing the ${PLACEHOLDER} placeholder`);
}

const app = await render(projects);

// A replacer function, since a replacement string would expand any `$&`, `` $` `` or `$'` in a description.
await writeFile(
  `${outDir}/index.html`,
  page.replace(PLACEHOLDER, () => app),
);

await rm(SSR_OUT, { recursive: true });
console.log(`Rendered ${projects.length} repos`);

const favicon = await readFavicon();

for (const icon of SITE_ICONS) {
  await writeFile(`${outDir}/${icon.file}`, renderIcon(favicon, icon));
}

console.log(`Rendered ${SITE_ICONS.length} icons`);
