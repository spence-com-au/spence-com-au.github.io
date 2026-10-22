import { parse } from 'node-html-parser';

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

/** The fields of a [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) this reads. */
interface Manifest {
  name?: string;
  short_name?: string;
  description?: string;
  theme_color?: string;
  icons?: ManifestIcon[];
}

interface ManifestIcon {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: string;
}

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

/**
 * Fetch `url`, failing unless a server answered it below a 5xx. A site that is down fails the build, leaving the last
 * good deploy live, rather than deploying a card stripped of everything its manifest gave it until the next day's run.
 */
async function get(url: URL): Promise<Response> {
  let res;

  try {
    res = await fetch(url);
  } catch (cause) {
    throw new Error(`Fetching ${url} failed`, { cause });
  }

  if (res.status >= 500) {
    throw new Error(`Fetching ${url} failed: ${res.status}`);
  }

  return res;
}

/**
 * The manifest a site's page links, with the URL its own links resolve against, or nothing for a page that has none —
 * including one Pages does not serve yet, which answers 404.
 */
async function readManifest(site: URL): Promise<{ manifest: Manifest; url: URL } | null> {
  const page = await get(site);
  const href =
    page.ok &&
    parse(await page.text())
      .querySelector('link[rel="manifest"]')
      ?.getAttribute('href');

  if (!href) {
    return null;
  }

  const url = new URL(href, site);
  const res = await get(url);

  if (!res.ok) {
    throw new Error(`Fetching ${url} failed: ${res.status}`);
  }

  return { manifest: (await res.json()) as Manifest, url };
}

/**
 * An SVG, which is sharp at any size, or else the widest bitmap. A `maskable` icon is drawn to be cropped by a launcher
 * and looks shrunken uncropped, so only one also meant for `any` use is a candidate.
 */
function pickIcon(icons: ManifestIcon[]): ManifestIcon | undefined {
  const candidates = icons.filter((icon) => (icon.purpose ?? 'any').split(/\s+/).includes('any'));

  // `sizes` lists one or more `<width>x<height>`, or `any` for a vector, which parses as no width at all.
  const width = (icon: ManifestIcon) =>
    Math.max(0, ...(icon.sizes ?? '').split(/\s+/).map((size) => parseInt(size) || 0));

  return (
    candidates.find((icon) => icon.type === 'image/svg+xml' || /\.svg(\?|$)/i.test(icon.src)) ??
    candidates.toSorted((a, b) => width(b) - width(a))[0]
  );
}

async function toProject(domain: string, repo: Repo): Promise<Project> {
  const site = repo.has_pages ? new URL(`https://${domain}/${repo.name}/`) : null;
  const { manifest, url } = (site && (await readManifest(site))) ?? { manifest: {}, url: null };
  const icon = url && pickIcon(manifest.icons ?? []);

  return {
    // The short name is the label a site's author chose for a launcher's icon, which is what this page is.
    title:
      manifest.short_name || manifest.name || repo.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: manifest.description || repo.description,
    site: site?.pathname ?? null,
    repo: repo.html_url,
    icon: icon && url ? new URL(icon.src, url).href : null,
    themeColor: manifest.theme_color ?? null,
  };
}

/** Every public project repo in the account, as a card on the landing page at `domain`. */
export async function listProjects(domain: string): Promise<Project[]> {
  return Promise.all((await listRepos()).map((repo) => toProject(domain, repo)));
}
