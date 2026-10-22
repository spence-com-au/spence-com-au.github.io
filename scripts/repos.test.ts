import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjects } from './repos.ts';

const DOMAIN = 'example.test';
const API = 'https://api.github.com/users/spence-com-au/repos?type=owner&sort=full_name&per_page=100';

/** A repo as GitHub's API returns it, holding only the fields `listProjects` reads. */
const repo = (name: string, overrides: object = {}) => ({
  name,
  private: false,
  has_pages: false,
  html_url: `https://github.com/spence-com-au/${name}`,
  description: null,
  ...overrides,
});

// Every URL `listProjects` may request, mapped to what answers it; anything else is a 404.
let routes: Record<string, () => Response>;

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => routes[String(url)]?.() ?? new Response('Not Found', { status: 404 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const repos = (page: number, body: object[]) => ({ [`${API}&page=${page}`]: () => Response.json(body) });

/** A site whose page links `manifest` from `manifest.webmanifest` beside it. */
const site = (name: string, manifest: object) => ({
  ...page(name, '<html><head><link rel="manifest" href="manifest.webmanifest"></head></html>'),
  [`https://${DOMAIN}/${name}/manifest.webmanifest`]: () => Response.json(manifest),
});

const page = (name: string, html: string) => ({ [`https://${DOMAIN}/${name}/`]: () => new Response(html) });

describe('listProjects', () => {
  it('links a repo without a site to GitHub, titled from its name', async () => {
    routes = repos(1, [repo('car-racer', { description: 'Race cars' })]);

    expect(await listProjects(DOMAIN)).toEqual([
      {
        title: 'Car Racer',
        description: 'Race cars',
        site: null,
        repo: 'https://github.com/spence-com-au/car-racer',
        icon: null,
        themeColor: null,
      },
    ]);
  });

  it('describes a site from its manifest, preferring an SVG icon to a larger bitmap', async () => {
    routes = {
      ...repos(1, [repo('dino-park', { has_pages: true, description: 'From GitHub' })]),
      ...site('dino-park', {
        name: 'Dino Park Deluxe',
        short_name: 'Dino Park',
        description: 'Look after the dinosaurs.',
        theme_color: '#3f9b4f',
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon.svg', sizes: 'any' },
        ],
      }),
    };

    expect(await listProjects(DOMAIN)).toEqual([
      {
        title: 'Dino Park',
        description: 'Look after the dinosaurs.',
        site: '/dino-park/',
        repo: 'https://github.com/spence-com-au/dino-park',
        icon: `https://${DOMAIN}/dino-park/icons/icon.svg`,
        themeColor: '#3f9b4f',
      },
    ]);
  });

  it('falls back to the manifest name, and to the widest bitmap that is not only maskable', async () => {
    routes = {
      ...repos(1, [repo('pogo-utils', { has_pages: true })]),
      ...site('pogo-utils', {
        name: 'Pokémon GO Utilities',
        icons: [
          { src: '192.png', sizes: '192x192' },
          { src: 'maskable-768.png', sizes: '768x768', purpose: 'maskable' },
          { src: '16-and-512.png', sizes: '16x16 512x512', purpose: 'any maskable' },
        ],
      }),
    };

    expect(await listProjects(DOMAIN)).toMatchObject([
      { title: 'Pokémon GO Utilities', icon: `https://${DOMAIN}/pogo-utils/16-and-512.png` },
    ]);
  });

  it('leaves out the icon of a manifest with none it can show', async () => {
    routes = {
      ...repos(1, [repo('pogo-utils', { has_pages: true })]),
      ...site('pogo-utils', { icons: [{ src: 'maskable.png', sizes: '512x512', purpose: 'maskable' }] }),
    };

    expect(await listProjects(DOMAIN)).toMatchObject([{ title: 'Pogo Utils', icon: null }]);
  });

  it.each([
    ['links no manifest', page('electronics-kit', '<html><title>Electronics Kit</title></html>')],
    ['is not served yet', {}],
  ])('describes a site from its repo when its page %s', async (_, sitePage) => {
    routes = { ...repos(1, [repo('electronics-kit', { has_pages: true, description: 'Circuits' })]), ...sitePage };

    expect(await listProjects(DOMAIN)).toEqual([
      {
        title: 'Electronics Kit',
        description: 'Circuits',
        site: '/electronics-kit/',
        repo: 'https://github.com/spence-com-au/electronics-kit',
        icon: null,
        themeColor: null,
      },
    ]);
  });

  it.each([
    [
      'its page cannot be reached',
      {
        [`https://${DOMAIN}/dino-park/`]: () => {
          throw new TypeError('fetch failed');
        },
      },
      `Fetching https://${DOMAIN}/dino-park/ failed`,
    ],
    [
      'its page fails',
      { [`https://${DOMAIN}/dino-park/`]: () => new Response('Bad Gateway', { status: 502 }) },
      `Fetching https://${DOMAIN}/dino-park/ failed: 502`,
    ],
    [
      'the manifest it links is missing',
      page('dino-park', '<link rel="manifest" href="/dino-park/missing.json">'),
      `Fetching https://${DOMAIN}/dino-park/missing.json failed: 404`,
    ],
  ])('fails rather than strip a card when %s', async (_, sitePage, message) => {
    routes = { ...repos(1, [repo('dino-park', { has_pages: true })]), ...sitePage };

    await expect(listProjects(DOMAIN)).rejects.toThrow(message);
  });

  it('leaves out private repos, dot-named repos and the site itself', async () => {
    routes = repos(1, [
      repo('.github'),
      repo('secret', { private: true }),
      repo('spence-com-au.github.io', { has_pages: true }),
      repo('car-racer'),
    ]);

    expect(await listProjects(DOMAIN)).toMatchObject([{ title: 'Car Racer' }]);
  });

  it('reads every page of repos', async () => {
    const full = Array.from({ length: 100 }, (_, i) => repo(`repo-${String(i).padStart(3, '0')}`));
    routes = { ...repos(1, full), ...repos(2, [repo('last')]) };

    const projects = await listProjects(DOMAIN);

    expect(projects).toHaveLength(101);
    expect(projects.at(-1)).toMatchObject({ title: 'Last' });
  });

  it('fails when GitHub cannot list the repos', async () => {
    routes = { [`${API}&page=1`]: () => new Response('rate limited', { status: 403 }) };

    await expect(listProjects(DOMAIN)).rejects.toThrow('Listing repos failed: 403 rate limited');
  });
});
