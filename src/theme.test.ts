import { describe, expect, it } from 'vitest';

import { tint } from './theme.ts';

describe('tint', () => {
  it('keeps a theme colour that stands out against the background, as its site wrote it', () => {
    expect(tint('#3f9b4f')).toBe('#3f9b4f');
    expect(tint('rgb(63 155 79)')).toBe('rgb(63 155 79)');
  });

  it.each([
    ['too pale to see', '#ffffff'],
    ['short of 3:1', '#f28c28'],
    ['not a colour', 'nonsense'],
    ['missing', null],
  ])('gives the neutral edge to a theme colour %s', (_, themeColor) => {
    expect(tint(themeColor)).toBeUndefined();
  });
});
