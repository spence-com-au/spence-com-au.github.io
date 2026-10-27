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

  // Each passes 3:1 as written, and fails it once `formatHex` clips it into sRGB.
  it.each(scheme === 'light' ? ['oklch(0.55 0.3 180)'] : ['oklch(0.6 0.35 270)'])(
    'keeps %s, which sRGB cannot hold, standing out as the hex it returns',
    (themeColor) => {
      expect(wcagContrast(tint(themeColor, background) ?? '', background)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([
    ['not a colour', 'nonsense'],
    ['missing', null],
  ])('gives the neutral edge to a theme colour %s', (_, themeColor) => {
    expect(tint(themeColor, background)).toBeUndefined();
  });
});
