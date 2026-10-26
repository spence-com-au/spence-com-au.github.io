import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { fetchImages } from './v86.ts';

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
