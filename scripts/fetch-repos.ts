// Write `repos.json`, the cards `pnpm build` renders, from the public repos in the spence-com-au account.
import { readFile, writeFile } from 'node:fs/promises';

import { listProjects } from './repos.ts';

const domain = (await readFile('public/CNAME', 'utf8')).trim();
const projects = await listProjects(domain);

await writeFile('repos.json', JSON.stringify(projects, null, 2) + '\n');
console.log(`Listed ${projects.length} repos`);
