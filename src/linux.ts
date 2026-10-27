// Linux in [v86](https://github.com/copy/v86), an x86 emulator compiled to WebAssembly, on a terminal drawn by xterm.js.
// Only `src/shell.ts` imports it, once the Terminal card is opened, so the page itself ships none of it.
import '@xterm/xterm/css/xterm.css';

import { Terminal } from '@xterm/xterm';
import { V86 } from 'v86';
import wasm from 'v86/build/v86.wasm?url';

/**
 * Wires a terminal in `screen`, in the font and colours it is styled in, to the serial port of an emulator booting the
 * images `scripts/v86.ts` fetches, and resolves once they have loaded. Left to the caller to start, as the dialog the
 * terminal is in may have closed by then. Rejects, taking the terminal away again, when the emulator or an image cannot
 * be fetched, or the emulator is not WebAssembly.
 */
export async function boot(screen: HTMLElement): Promise<{ emulator: V86; terminal: Terminal }> {
  const style = getComputedStyle(screen);
  const terminal = new Terminal({
    fontFamily: style.fontFamily,
    fontSize: parseFloat(style.fontSize),
    theme: { background: style.backgroundColor, foreground: style.color, cursor: style.getPropertyValue('--signal') },
  });

  terminal.open(screen);

  // A serial console tells the guest no size, so it takes the terminal to be 80 columns by 24 rows. Rather than more of
  // them, which it would not use, the font grows until those fill the screen, scaled from the size they are drawn at.
  const drawn = screen.querySelector('.xterm-screen') as HTMLElement;
  const least = terminal.options.fontSize ?? 0;
  const fit = new ResizeObserver(() => {
    if (drawn.offsetWidth) {
      const scale = Math.min(screen.clientWidth / drawn.offsetWidth, screen.clientHeight / drawn.offsetHeight);
      terminal.options.fontSize = Math.max(least, Math.floor((terminal.options.fontSize ?? least) * scale));
    }
  });

  fit.observe(screen);

  // The emulator and its images are fetched here rather than by v86, which only logs a missing file and retries a failed
  // one forever, so a failure could never surface. Megabytes, so the wait shows on the screen it is for, on one line
  // rewritten as it counts up.
  let loaded = 0;

  async function download(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);

    if (!res.ok || !res.body) {
      throw new Error(`Fetching ${url.split('/').pop()} failed: ${res.status}`);
    }

    const chunks: Uint8Array<ArrayBuffer>[] = [];
    const reader = res.body.getReader();

    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      chunks.push(chunk.value);
      loaded += chunk.value.length;
      terminal.write(`\r\x1b[KFetching Linux: ${(loaded / 1e6).toFixed(1)} MB`);
    }

    return new Blob(chunks).arrayBuffer();
  }

  async function load() {
    const image = async (file: string) => ({ buffer: await download(`/v86/${file}`) });
    const [code, bios, vga_bios, bzimage] = await Promise.all([
      download(wasm),
      image('seabios.bin'),
      image('vgabios.bin'),
      image('buildroot-bzimage68.bin'),
    ]);

    // Compiled here too, so that a file that is not WebAssembly fails here rather than inside v86.
    return { module: await WebAssembly.compile(code), bios, vga_bios, bzimage };
  }

  let files;

  try {
    files = await load();
  } catch (error) {
    fit.disconnect();
    terminal.dispose();
    throw error;
  }

  const { module, ...images } = files;
  const emulator = new V86({
    wasm_fn: async (imports) => (await WebAssembly.instantiate(module, imports)).exports,
    ...images,
    cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
    filesystem: {},
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
  });

  const encoder = new TextEncoder();

  emulator.add_listener('serial0-output-byte', (byte) => terminal.write(Uint8Array.of(byte)));
  terminal.onData((data) => emulator.serial_send_bytes(0, encoder.encode(data)));

  await new Promise((resolve) => emulator.add_listener('emulator-loaded', resolve));
  terminal.write('\r\x1b[K');

  return { emulator, terminal };
}
