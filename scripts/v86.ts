// The firmware and kernel that the Terminal card boots in v86, which its npm package leaves out. `vite.config.ts`
// fetches them into `public/v86/` for Vite to serve and build into the site, each held to a checksum, since the
// kernel's URL names no version and a different file could be served under it.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import v86 from 'v86/package.json' with { type: 'json' };

import { FILES } from '../src/v86.ts';

const digest = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

// The BIOS from the commit the installed emulator was built from, which its version names after `+g`, so that an update
// that changes it fails on the checksum here rather than booting the new emulator on the old firmware.
const commit = v86.version.split('+g')[1];

const IMAGES = [
  {
    file: FILES.bios,
    url: `https://raw.githubusercontent.com/copy/v86/${commit}/bios/${FILES.bios}`,
    sha256: '73e3f359102e3a9982c35fce98eb7cd08f18303ac7f1ba6ebfbe6cdc1c244d98',
  },
  {
    file: FILES.vga_bios,
    url: `https://raw.githubusercontent.com/copy/v86/${commit}/bios/${FILES.vga_bios}`,
    sha256: 'a4bc0d80cc3ca028c73dafa8fee396b8d054ce87ebd8abfbd31b06b437607880',
  },

  // Linux 6.8 with BusyBox, built with Buildroot for v86's own demo at https://copy.sh/v86/?profile=buildroot.
  {
    file: FILES.bzimage,
    url: `https://i.copy.sh/${FILES.bzimage}`,
    sha256: '507a759c70ab7a490a233be454d0b5b88bc667956a410b531cb4edc091e2eb1c',
  },
];

/** Fetches into `dir` each of `images` it lacks or holds a different copy of, writing none that fails its checksum. */
export async function fetchImages(dir: string, images: typeof IMAGES = IMAGES): Promise<void> {
  await mkdir(dir, { recursive: true });

  await Promise.all(
    images.map(async ({ file, url, sha256 }) => {
      const path = `${dir}/${file}`;
      const cached = await readFile(path).catch(() => undefined);

      if (cached && digest(cached) === sha256) {
        return;
      }

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Fetching ${url} failed: ${res.status}`);
      }

      const image = new Uint8Array(await res.arrayBuffer());

      if (digest(image) !== sha256) {
        throw new Error(`${url} does not match its checksum`);
      }

      await writeFile(path, image);
    }),
  );
}
