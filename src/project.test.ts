import { describe, expect, it } from 'vitest';

import { graphemes, initials } from './project.ts';

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

  // A word's first character is the one a reader sees, which counts as one letter of the tile however many code points
  // draw it. The accent is escaped, since an editor that composed it into one code point would leave its case checking
  // nothing.
  it.each([
    ['an emoji', '🦖 Park', ['🦖', 'P']],
    ['a flag', '🇦🇺 Maps', ['🇦🇺', 'M']],
    ['an emoji with a skin tone', '👋🏽 Hello', ['👋🏽', 'H']],
    ['an emoji joined to another', '👩‍💻 Dev Tools', ['👩‍💻', 'D', 'T']],
    ['a keycap', '#️⃣ Tags', ['#️⃣', 'T']],
    ['a letter with a combining accent', 'E\u0301clair', ['E\u0301']],
  ])('keeps %s that starts a word whole', (_, title, expected) => {
    expect(graphemes(initials(title))).toEqual(expected);
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
});
