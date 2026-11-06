import { expect, it } from 'vitest';

import { initials } from './project.ts';

it('takes the first letter of each word', () => {
  expect(initials('Claude Code Action')).toBe('CCA');
});

it('keeps an emoji that starts a word whole', () => {
  expect(initials('🦖 Park')).toBe('🦖P');
});
