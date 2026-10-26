import { oklch, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';

import { BACKGROUNDS, tint } from './theme.ts';

describe.each(Object.entries(BACKGROUNDS))('tint against the %s background', (scheme, background) => {
  it('keeps a theme colour that stands out against the background, as CSS hex', () => {
    expect(tint('#3f9b4f', background)).toBe('#3f9b4f');
    expect(tint('rgb(63 155 79)', background)).toBe('#3f9b4f');
    expect(tint('3f9b4f', background)).toBe('#3f9b4f');
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

  it.each([
    ['not a colour', 'nonsense'],
    ['missing', null],
  ])('gives the neutral edge to a theme colour %s', (_, themeColor) => {
    expect(tint(themeColor, background)).toBeUndefined();
  });
});
