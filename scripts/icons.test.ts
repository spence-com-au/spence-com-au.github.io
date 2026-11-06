import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { AVATARS, drawIcon, type Icon, readFavicon, renderIcon, SITE_ICONS } from './icons.ts';

const ICONS = [...SITE_ICONS, ...AVATARS];

// The avatars are committed rather than built, so this is what notices one left behind by a change to the favicon.
test.each(AVATARS)('logos/$file is the favicon as rendered now', async (avatar) => {
  const committed = await readFile(`logos/${avatar.file}`);

  expect(renderIcon(await readFavicon(), avatar).equals(committed), 'run `pnpm render:logos`').toBe(true);
});

// The committed avatars are rendered by `renderIcon`, so these pin what the `Icon` docs promise rather than what it
// happened to produce.
describe('drawIcon', () => {
  // `pixels` copies the whole bitmap on every read, so each test reads it once rather than once per pixel.
  const drawAlpha = async (icon: Icon) => drawIcon(await readFavicon(), icon).pixels.filter((_, i) => i % 4 === 3);

  test.each(ICONS.filter((icon) => icon.plate === 'square'))(
    '$file has no transparent pixel, which iOS would paint black',
    async (icon) => {
      expect((await drawAlpha(icon)).filter((alpha) => alpha < 255)).toHaveLength(0);
    },
  );

  test.each(ICONS.filter((icon) => icon.plate === 'circle'))(
    '$file is opaque from the centre to the middle of each edge and transparent in the corners',
    async (icon) => {
      const alpha = await drawAlpha(icon);
      const alphaAt = (x: number, y: number) => alpha[y * icon.size + x];
      const middle = icon.size / 2;
      const last = icon.size - 1;

      // The circle spans the full width, so a pixel in from the middle of an edge is on the plate whatever its colour.
      for (const [x, y] of [
        [middle, middle],
        [1, middle],
        [middle, 1],
        [last - 1, middle],
        [middle, last - 1],
      ] as const) {
        expect(alphaAt(x, y)).toBe(255);
      }

      for (const [x, y] of [
        [0, 0],
        [last, 0],
        [0, last],
        [last, last],
      ] as const) {
        expect(alphaAt(x, y)).toBe(0);
      }
    },
  );

  test.each(ICONS.filter((icon) => icon.inset))('$file keeps the artwork within the 40% safe zone', async (icon) => {
    const favicon = await readFavicon();
    const { pixels } = drawIcon(favicon, icon);
    const plate = Buffer.from(favicon.plate.slice(1), 'hex');
    const centre = (icon.size - 1) / 2;
    let farthest = 0;

    // The artwork is whatever is drawn opaque in a colour other than the plate's. The favicon's own background shares
    // that colour, so a launcher's mask may crop it anywhere.
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 255 && !pixels.subarray(i, i + 3).equals(plate)) {
        const pixel = i / 4;

        farthest = Math.max(farthest, Math.hypot((pixel % icon.size) - centre, Math.floor(pixel / icon.size) - centre));
      }
    }

    // The lower bound is a point under the 37% that `INSET_SCALE` aims for, so the artwork is not shrunk further than
    // it needs to be.
    expect(farthest / icon.size).toBeGreaterThanOrEqual(0.36);
    expect(farthest / icon.size).toBeLessThanOrEqual(0.4);
  });
});
