import type { Project } from '../src/project.ts';

const OWNER = 'spence-com-au';
const SITE_REPO = `${OWNER}.github.io`;

/** The fields of GitHub's repository object this reads. */
interface Repo {
  name: string;
  private: boolean;
  has_pages: boolean;
  html_url: string;
  description: string | null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const unescape = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e] ?? '');

async function listRepos(): Promise<Repo[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos: Repo[] = [];

  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&per_page=100&page=${page}`,
      { headers },
    );

    if (!res.ok) {
      throw new Error(`Listing repos failed: ${res.status} ${await res.text()}`);
    }

    const batch = (await res.json()) as Repo[];
    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  // A repo whose name starts with a dot, such as `.github`, configures the account rather than being a project.
  return repos.filter((repo) => !repo.private && repo.name !== SITE_REPO && !repo.name.startsWith('.'));
}

// Use the <title> of a repo's GitHub Pages site, falling back to a title
// derived from the repo name (e.g. "dino-park" -> "Dino Park").
async function title(domain: string, repo: Repo): Promise<string> {
  if (repo.has_pages) {
    try {
      const res = await fetch(`https://${domain}/${repo.name}/`);
      const match = res.ok && (await res.text()).match(/<title[^>]*>([^<]*)<\/title>/i);

      if (match && match[1]?.trim()) {
        return unescape(match[1].trim());
      }
    } catch {
      // An unreachable site gets the derived title below, the same as one without a `<title>`.
    }
  }

  return repo.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function hasIcon(domain: string, repo: Repo): Promise<boolean> {
  if (!repo.has_pages) {
    return false;
  }

  try {
    return (await fetch(`https://${domain}/${repo.name}/icon.svg`, { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

/** Every public project repo in the account, as a card on the landing page at `domain`. */
export async function listProjects(domain: string): Promise<Project[]> {
  return Promise.all(
    (await listRepos()).map(async (repo) => ({
      // Repos published with GitHub Pages are served under this domain; link
      // anything else to its page on GitHub.
      href: repo.has_pages ? `/${repo.name}/` : repo.html_url,
      title: await title(domain, repo),
      description: repo.description,
      icon: (await hasIcon(domain, repo)) ? `/${repo.name}/icon.svg` : null,
    })),
  );
}
