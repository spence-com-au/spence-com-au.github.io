// The paths the Terminal card's firmware and kernel are served at, apart from `scripts/v86.ts`, which fetches them
// there, because `src/linux.ts` loads them in the browser and so cannot import the Node built-ins that script does.

/** The directory they are served from, both under the site's root and in the public directory that Vite serves. */
export const DIR = 'v86';

/** Each image's file, by the option v86 takes it in. */
export const FILES = {
  bios: 'seabios.bin',
  vga_bios: 'vgabios.bin',
  bzimage: 'buildroot-bzimage68.bin',
};
