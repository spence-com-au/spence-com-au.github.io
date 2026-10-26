import { readFile } from 'node:fs/promises';

import { expect, test } from 'vitest';

import { AVATARS, readFavicon, renderIcon } from './icons.ts';

// The avatars are committed rather than built, so this is what notices one left behind by a change to the favicon.
test.each(AVATARS)('logos/$file is the favicon as rendered now', async (avatar) => {
  const committed = await readFile(`logos/${avatar.file}`);

  expect(renderIcon(await readFavicon(), avatar).equals(committed), 'run `pnpm render:logos`').toBe(true);
});
