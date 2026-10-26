// Build the site into `_site/`: Vite bundles the page's assets, then React prerenders the cards into it from the
// `repos.json` that `pnpm fetch:repos` writes, or from the file named on the command line, such as the tests' fixture.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
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

const app = await render(projects);

// A replacer function, since a replacement string would expand any `$&`, `` $` `` or `$'` in a description.
await writeFile(
  '_site/index.html',
  page.replace(PLACEHOLDER, () => app),
);

await rm(SSR_OUT, { recursive: true });
console.log(`Rendered ${projects.length} repos`);

// Every PNG icon is the SVG favicon drawn at another size, so they are rendered from it rather than kept beside it.
const favicon = await readFile('public/favicon.svg', 'utf8');
const plate = /<rect [^>]*fill="(#[0-9a-f]+)"/.exec(favicon)?.[1];

if (!plate) {
  throw new Error('favicon.svg has no plate for the full-bleed icons to fill their corners with');
}

// A full-bleed icon fills the corners the favicon leaves transparent, since iOS paints them black.
const icons = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180, fullBleed: true },
  { file: 'icon-512.png', size: 512 },
];

for (const { file, size, fullBleed } of icons) {
  const png = new Resvg(favicon, { fitTo: { mode: 'width', value: size }, background: fullBleed ? plate : undefined });

  await writeFile(`_site/${file}`, png.render().asPng());
}

console.log(`Rendered ${icons.length} icons`);
