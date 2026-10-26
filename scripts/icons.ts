// Every PNG of the mark is the SVG favicon drawn at another size, so each is rendered from it rather than kept beside
// it.
import { readFile } from 'node:fs/promises';

import { Resvg } from '@resvg/resvg-js';

/**
 * `plate` fills behind the favicon, whose rounded corners are otherwise transparent: a square for an icon that must be
 * full bleed, since iOS paints transparent pixels black and a launcher's mask can show any margin `inset` leaves, or a
 * circle for an avatar, outside which it stays transparent. `inset` shrinks the artwork into the circle that Android
 * keeps whatever shape it crops a maskable icon to, whose radius is 40% of the icon's width.
 */
export interface Icon {
  file: string;
  size: number;
  plate?: 'square' | 'circle';
  inset?: boolean;
}

// The site's icons, which the build renders into `_site/`.
export const SITE_ICONS: Icon[] = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180, plate: 'square' },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, plate: 'square', inset: true },
];

// The avatars for use away from the site, which `pnpm render:logos` renders into `logos/`.
export const AVATARS: Icon[] = [
  { file: 'avatar-github-500.png', size: 500 },
  { file: 'avatar-round-500.png', size: 500, plate: 'circle', inset: true },
];

// Brings the artwork's farthest corner from 44% of the width out from the centre to 37%, within the 40% safe zone.
const INSET_SCALE = 0.84;

export async function readFavicon() {
  const favicon = await readFile('public/favicon.svg', 'utf8');
  const plate = /<rect [^>]*fill="(#[0-9a-f]+)"/.exec(favicon)?.[1];

  if (!plate) {
    throw new Error('favicon.svg has no plate for a full-bleed icon to fill its corners with');
  }

  return { favicon, plate };
}

/**
 * Draws the favicon inside a 32-unit frame of its own, which a nested `<svg>` fills whatever the favicon's `viewBox`,
 * so that the plate and the inset need no edit to the favicon's markup.
 */
export function renderIcon({ favicon, plate }: Awaited<ReturnType<typeof readFavicon>>, icon: Icon) {
  const scale = icon.inset ? INSET_SCALE : 1;
  const art = `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${favicon}</g>`;
  const fill = icon.plate ? `<rect width="32" height="32" fill="${plate}"/>` : '';
  const clip = icon.plate === 'circle' ? '<clipPath id="plate"><circle cx="16" cy="16" r="16"/></clipPath>' : '';
  const body = `${clip}<g${clip && ' clip-path="url(#plate)"'}>${fill}${art}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`;

  return new Resvg(svg, { fitTo: { mode: 'width', value: icon.size } }).render().asPng();
}
