import { parse } from 'node-html-parser';

import type { Project } from '../src/project.ts';

const OWNER = 'spence-com-au';

/** The repo this site is built from, which GitHub Pages serves at the root of the domain rather than under its name. */
const SITE_REPO = `${OWNER}.github.io`;

/** Where a repo without a site commits the manifest that describes it, pointing at an icon wherever it keeps one. */
const COMMITTED_MANIFEST = '.github/manifest.webmanifest';

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

/** The fields of GitHub's content object, for a file, this reads. */
interface Content {
  content: string;
  download_url: string;
}

/** The fields of GitHub's release object this reads. */
interface Release {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function listRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];

  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&per_page=100&page=${page}`,
      { headers: githubHeaders() },
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
  return repos.filter((repo) => !repo.private && !repo.name.startsWith('.'));
}

/** Fetch `url`, naming it in the error when no server answers. */
async function get(url: URL): Promise<Response> {
  try {
    return await fetch(url);
  } catch (cause) {
    throw new Error(`Fetching ${url} failed`, { cause });
  }
}

/**
 * The manifest a site's page links, with the URL its own links resolve against, or nothing for a page that has none —
 * including one Pages does not serve yet, which answers 404. Any other failure fails the build, leaving the last good
 * deploy live, rather than deploying a card stripped of everything its manifest gave it until the next day's run.
 */
async function readSiteManifest(site: URL): Promise<{ manifest: Manifest; url: URL } | null> {
  const page = await get(site);

  if (page.status === 404) {
    return null;
  }

  if (!page.ok) {
    throw new Error(`Fetching ${site} failed: ${page.status}`);
  }

  const href = parse(await page.text())
    .querySelector('link[rel="manifest"]')
    ?.getAttribute('href');

  if (!href) {
    return null;
  }

  // The manifest's link and its icons resolve against the address that answered rather than the one asked, as a
  // browser's do, since Pages redirects a project with its own domain there.
  const res = await get(new URL(href, page.url));
  const url = new URL(res.url);

  if (!res.ok) {
    throw new Error(`Fetching ${url} failed: ${res.status}`);
  }

  return { manifest: parseManifest(await res.text(), url), url };
}

/**
 * The manifest a repo commits at `COMMITTED_MANIFEST` on its default branch, with the URL GitHub serves it from, which
 * its icons resolve against, or nothing for a repo that commits none.
 */
async function readCommittedManifest(repo: Repo): Promise<{ manifest: Manifest; url: URL } | null> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo.name}/contents/${COMMITTED_MANIFEST}`, {
    headers: githubHeaders(),
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Reading the manifest of ${repo.name} failed: ${res.status} ${await res.text()}`);
  }

  const { content, download_url } = (await res.json()) as Content;
  const url = new URL(download_url);

  // `TextDecoder` drops a leading byte order mark, as `res.text()` does for a site's manifest and a browser does for
  // either, where `Buffer#toString` keeps it for `JSON.parse` to reject.
  return { manifest: parseManifest(new TextDecoder().decode(Buffer.from(content, 'base64')), url), url };
}

function parseManifest(body: string, url: URL): Manifest {
  try {
    return JSON.parse(body) as Manifest;
  } catch (cause) {
    throw new Error(`${url} is not JSON`, { cause });
  }
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

/**
 * The APK in the newest published release that has one. A release can ship without it, as `car-racer`'s `v0.12.0` did,
 * and its name has carried the version before, so it is looked up rather than linked through `releases/latest`. GitHub
 * lists releases newest first, and the first page is as far back as anyone would want to install from.
 */
async function findApk(repo: Repo): Promise<Project['apk']> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo.name}/releases?per_page=100`, {
    headers: githubHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Listing releases of ${repo.name} failed: ${res.status} ${await res.text()}`);
  }

  for (const release of (await res.json()) as Release[]) {
    const apk = release.assets.find((asset) => /\.apk$/i.test(asset.name));

    if (apk && !release.draft && !release.prerelease) {
      return { href: apk.browser_download_url, release: release.html_url, version: release.tag_name };
    }
  }

  return null;
}

async function toProject(domain: string, repo: Repo, own: { manifest: Manifest; url: URL }): Promise<Project> {
  // Pages serves this site's own repo at the root, where its card would only reload the page it is on, so it opens on
  // GitHub like a repo without a site.
  const home = repo.name === SITE_REPO;
  const site = repo.has_pages && !home ? new URL(`/${repo.name}/`, `https://${domain}`) : null;
  const found = home ? own : await (site ? readSiteManifest(site) : readCommittedManifest(repo));
  const { manifest, url } = found ?? { manifest: {}, url: null };
  const icon = url && pickIcon(manifest.icons ?? []);

  // A repo with a site is opened there, so only one without needs a release to link instead.
  const apk = site ? null : await findApk(repo);

  return {
    // The short name is the label a manifest's author chose for a launcher's icon, which is what this page is.
    title:
      manifest.short_name || manifest.name || repo.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: manifest.description || repo.description,
    site: site?.pathname ?? null,
    apk,
    repo: repo.html_url,
    icon: icon && url ? new URL(icon.src, url).href : null,
    themeColor: manifest.theme_color ?? null,
  };
}

/**
 * Every public project repo in the account, as a card on the landing page at `domain`. The site's own card is described
 * by `manifest`, the one in the checkout being built, rather than by the deploy before it, which may be stale or down.
 */
export async function listProjects(domain: string, manifest: string): Promise<Project[]> {
  const url = new URL('/manifest.webmanifest', `https://${domain}`);
  const own = { manifest: parseManifest(manifest, url), url };

  return Promise.all((await listRepos()).map((repo) => toProject(domain, repo, own)));
}
