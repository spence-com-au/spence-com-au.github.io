import { oklch, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';

import { BACKGROUNDS, tint } from './theme.ts';

describe.each(Object.entries(BACKGROUNDS))('tint against the %s background', (scheme, background) => {
  it('keeps a theme colour that stands out against the background, as its site wrote it', () => {
    expect(tint('#3f9b4f', background)).toBe('#3f9b4f');
    expect(tint('rgb(63 155 79)', background)).toBe('rgb(63 155 79)');
  });

  it.each(scheme === 'light' ? ['#f28c28', '#ffffff'] : ['#3b1f8f', '#4a1c1c'])(
    `${scheme === 'light' ? 'darkens' : 'lightens'} %s just far enough to stand out, keeping its hue`,
    (themeColor) => {
      const shade = tint(themeColor, background) ?? '';
      const contrast = wcagContrast(shade, background);

      expect(contrast).toBeGreaterThanOrEqual(3);
      expect(contrast).toBeLessThan(3.2);
      expect(oklch(shade)?.h ?? 0).toBeCloseTo(oklch(themeColor)?.h ?? 0, 0);
    },
  );

  it.each(['rgb(63 155 79 / 0.2)', '#3f9b4f33', 'transparent'])(
    'paints %s opaque, as a browser draws the manifest `theme_color`',
    (themeColor) => {
      const shade = tint(themeColor, background) ?? '';

      expect(oklch(shade)?.alpha).toBeUndefined();
      expect(wcagContrast(shade, background)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([
    ['not a colour', 'nonsense'],
    ['missing', null],
  ])('gives the neutral edge to a theme colour %s', (_, themeColor) => {
    expect(tint(themeColor, background)).toBeUndefined();
  });
});
