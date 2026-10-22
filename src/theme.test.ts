import { oklch, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';

import { BACKGROUND, tint } from './theme.ts';

describe('tint', () => {
  it('keeps a theme colour that stands out against the background, as its site wrote it', () => {
    expect(tint('#3f9b4f')).toBe('#3f9b4f');
    expect(tint('rgb(63 155 79)')).toBe('rgb(63 155 79)');
  });

  it.each(['#f28c28', '#ffffff'])('darkens %s just far enough to stand out, keeping its hue', (themeColor) => {
    const shade = tint(themeColor) ?? '';
    const contrast = wcagContrast(shade, BACKGROUND);

    expect(contrast).toBeGreaterThanOrEqual(3);
    expect(contrast).toBeLessThan(3.2);
    expect(oklch(shade)?.h ?? 0).toBeCloseTo(oklch(themeColor)?.h ?? 0, 0);
  });

  it.each([
    ['not a colour', 'nonsense'],
    ['missing', null],
  ])('gives the neutral edge to a theme colour %s', (_, themeColor) => {
    expect(tint(themeColor)).toBeUndefined();
  });
});
