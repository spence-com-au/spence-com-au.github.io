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
    vi.fn(async (url: string, init?: RequestInit) => {
      const route = routes[init?.method === 'HEAD' ? `HEAD ${url}` : url];
      return route ? route() : new Response('Not Found', { status: 404 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const repos = (page: number, body: object[]) => ({ [`${API}&page=${page}`]: () => Response.json(body) });
const site = (name: string, html: string) => ({ [`https://${DOMAIN}/${name}/`]: () => new Response(html) });
const icon = (name: string) => ({ [`HEAD https://${DOMAIN}/${name}/icon.svg`]: () => new Response(null) });

describe('listProjects', () => {
  it('links a repo without a site to GitHub, titled from its name', async () => {
    routes = repos(1, [repo('car-racer', { description: 'Race cars' })]);

    expect(await listProjects(DOMAIN)).toEqual([
      { href: 'https://github.com/spence-com-au/car-racer', title: 'Car Racer', description: 'Race cars', icon: null },
    ]);
  });

  it("links a repo with a site to it, titled from the site's decoded <title> and showing its icon", async () => {
    routes = {
      ...repos(1, [repo('dino-park', { has_pages: true })]),
      ...site('dino-park', '<html><title> Dino &amp; Pok&#233;mon Park &#x1F995; </title></html>'),
      ...icon('dino-park'),
    };

    expect(await listProjects(DOMAIN)).toEqual([
      { href: '/dino-park/', title: 'Dino & Pokémon Park 🦕', description: null, icon: '/dino-park/icon.svg' },
    ]);
  });

  it('derives the title of a site without one, and leaves out an icon it does not serve', async () => {
    routes = {
      ...repos(1, [repo('electronics_kit', { has_pages: true })]),
      ...site('electronics_kit', '<html><title> </title></html>'),
    };

    expect(await listProjects(DOMAIN)).toEqual([
      { href: '/electronics_kit/', title: 'Electronics Kit', description: null, icon: null },
    ]);
  });

  it('derives the title of a site that cannot be reached', async () => {
    routes = {
      ...repos(1, [repo('dino-park', { has_pages: true })]),
      [`https://${DOMAIN}/dino-park/`]: () => {
        throw new TypeError('fetch failed');
      },
    };

    expect(await listProjects(DOMAIN)).toMatchObject([{ title: 'Dino Park' }]);
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
