// Build the site into _site/, filling index.html with a link to every public
// repo in the spence-com-au account.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const OWNER = 'spence-com-au';
const SITE_REPO = `${OWNER}.github.io`;
const DOMAIN = (await readFile('CNAME', 'utf8')).trim();
const OUT = '_site';

const escape = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const unescape = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[e]);

async function listRepos() {
  const headers = { Accept: 'application/vnd.github+json' };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos = [];

  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&per_page=100&page=${page}`,
      { headers },
    );

    if (!res.ok) {
      throw new Error(`Listing repos failed: ${res.status} ${await res.text()}`);
    }

    const batch = await res.json();
    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return repos.filter((repo) => !repo.private && repo.name !== SITE_REPO);
}

// Use the <title> of a repo's GitHub Pages site, falling back to a title
// derived from the repo name (e.g. "dino-park" -> "Dino Park").
async function title(repo) {
  if (repo.has_pages) {
    try {
      const res = await fetch(`https://${DOMAIN}/${repo.name}/`);
      const match = res.ok && (await res.text()).match(/<title[^>]*>([^<]*)<\/title>/i);

      if (match && match[1].trim()) {
        return unescape(match[1].trim());
      }
    } catch {
      // An unreachable site gets the derived title below, the same as one without a `<title>`.
    }
  }

  return repo.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function hasIcon(repo) {
  if (!repo.has_pages) {
    return false;
  }

  try {
    return (await fetch(`https://${DOMAIN}/${repo.name}/icon.svg`, { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

async function item(repo) {
  // Repos published with GitHub Pages are served under this domain; link
  // anything else to its page on GitHub.
  const href = repo.has_pages ? `/${repo.name}/` : repo.html_url;
  const attrs = `href="${escape(href)}"` + (repo.description ? ` title="${escape(repo.description)}"` : '');
  const img = (await hasIcon(repo)) ? `<img src="/${escape(repo.name)}/icon.svg" alt="" />` : '';
  return `<li>\n          <a ${attrs}>${img}${escape(await title(repo))}</a>\n        </li>`;
}

const template = await readFile('index.html', 'utf8');

if (!template.includes('<!-- repos -->')) {
  throw new Error('index.html is missing the <!-- repos --> placeholder');
}

const items = await Promise.all((await listRepos()).map(item));

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/index.html`, template.replace('<!-- repos -->', items.join('\n        ')));
await copyFile('CNAME', `${OUT}/CNAME`);
await copyFile('index.css', `${OUT}/index.css`);
console.log(`Linked ${items.length} repos`);
