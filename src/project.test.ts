import { describe, expect, it } from 'vitest';

import { initials } from './project.ts';

describe('initials', () => {
  it.each([
    ['one word', 'Circuits', 'C'],
    ['two words', 'Car Racer', 'CR'],
    ['three words', 'Claude Code Action', 'CCA'],
    ['a word that starts in lower case', 'pogo utils', 'pu'],
    ['a digit', '2048 Game', '2G'],
  ])('takes the first letter of each word of %s as written', (_, title, expected) => {
    expect(initials(title)).toBe(expected);
  });

  it.each([
    ['an empty title', ''],
    ['a title of spaces', '   '],
  ])('gives nothing for %s', (_, title) => {
    expect(initials(title)).toBe('');
  });

  it.each([
    ['a double space', 'Car  Racer'],
    ['a leading space', ' Car Racer'],
    ['a trailing space', 'Car Racer '],
  ])('takes no letter from the empty word %s leaves', (_, title) => {
    expect(initials(title)).toBe('CR');
  });

  it('takes a whole character outside the Basic Multilingual Plane, not half of its surrogate pair', () => {
    expect(initials('🚗 Racer')).toBe('🚗R');
  });
});
