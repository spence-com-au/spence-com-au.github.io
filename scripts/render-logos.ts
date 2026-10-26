// Render the avatars into `logos/`, which are committed rather than built since nothing deploys them.
import { writeFile } from 'node:fs/promises';

import { AVATARS, readFavicon, renderIcon } from './icons.ts';

const favicon = await readFavicon();

for (const avatar of AVATARS) {
  await writeFile(`logos/${avatar.file}`, renderIcon(favicon, avatar));
}

console.log(`Rendered ${AVATARS.length} avatars`);
