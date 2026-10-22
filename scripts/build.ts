// Build the site into `_site/`: Vite bundles the page's assets, then React prerenders the cards into it from the
// `repos.json` that `pnpm fetch:repos` writes, or from the file named on the command line, such as the tests' fixture.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { build } from 'vite';

import type { Project } from '../src/project.ts';

const SSR_OUT = '.ssr';
const PLACEHOLDER = '<!--app-->';

// Read before building, so that a missing `repos.json` fails at once rather than after a build that cannot finish.
const projects = JSON.parse(await readFile(process.argv[2] ?? 'repos.json', 'utf8')) as Project[];

await build();
await build({ build: { ssr: 'src/server.tsx', outDir: SSR_OUT } });

const { render } = (await import(pathToFileURL(`${SSR_OUT}/server.js`).href)) as typeof import('../src/server.tsx');
const page = await readFile('_site/index.html', 'utf8');

if (!page.includes(PLACEHOLDER)) {
  throw new Error(`index.html is missing the ${PLACEHOLDER} placeholder`);
}

await writeFile('_site/index.html', page.replace(PLACEHOLDER, await render(projects)));
await rm(SSR_OUT, { recursive: true });
console.log(`Rendered ${projects.length} repos`);
