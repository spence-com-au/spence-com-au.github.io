import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { fetchImages } from './v86.ts';

// The real images are only reachable over the network, so the paths that succeed run on one of known contents instead.
const IMAGE = [
  {
    file: 'image.bin',
    url: 'https://example.test/image.bin',
    sha256: '6105d6cc76af400325e94d588ce511be5bfdbb73b437dc51eca43917d7a43e3d',
  },
];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'v86-'));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true });
});

// What Vite serves is whatever lands in the directory, so an image that fails its checksum must never land there.
it('writes no image that fails its checksum', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('not the image')),
  );

  await expect(fetchImages(dir)).rejects.toThrow('does not match its checksum');
  expect(await readdir(dir)).toEqual([]);
});

it('fails when an image cannot be fetched', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Not Found', { status: 404 })),
  );

  await expect(fetchImages(dir)).rejects.toThrow(/^Fetching https:\/\/\S+ failed: 404$/);
  expect(await readdir(dir)).toEqual([]);
});

it('writes an image that matches its checksum', async () => {
  const fetch = vi.fn(async () => new Response('image'));
  vi.stubGlobal('fetch', fetch);

  await fetchImages(dir, IMAGE);

  expect(fetch).toHaveBeenCalledOnce();
  expect(await readFile(join(dir, 'image.bin'), 'utf8')).toBe('image');
});

// This is what lets a site build offline once its images have been fetched.
it('does not fetch an image it already holds', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await writeFile(join(dir, 'image.bin'), 'image');

  await fetchImages(dir, IMAGE);

  expect(fetch).not.toHaveBeenCalled();
});

it('replaces a different copy of an image', async () => {
  const fetch = vi.fn(async () => new Response('image'));
  vi.stubGlobal('fetch', fetch);
  await writeFile(join(dir, 'image.bin'), 'another image');

  await fetchImages(dir, IMAGE);

  expect(fetch).toHaveBeenCalledOnce();
  expect(await readFile(join(dir, 'image.bin'), 'utf8')).toBe('image');
});
