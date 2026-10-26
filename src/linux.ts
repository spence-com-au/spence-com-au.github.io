// Linux in [v86](https://github.com/copy/v86), an x86 emulator compiled to WebAssembly, on a terminal drawn by xterm.js.
// Only `src/shell.ts` imports it, once the Terminal card is opened, so the page itself ships none of it.
import '@xterm/xterm/css/xterm.css';

import { Terminal } from '@xterm/xterm';
import { V86 } from 'v86';
import wasm from 'v86/build/v86.wasm?url';

/**
 * Wires a terminal in `screen`, in the font and colours it is styled in, to the serial port of an emulator booting the
 * images `scripts/v86.ts` fetches, and resolves once they have loaded. Left to the caller to start, as the dialog the
 * terminal is in may have closed by then.
 */
export function boot(screen: HTMLElement): Promise<{ emulator: V86; terminal: Terminal }> {
  const style = getComputedStyle(screen);
  const terminal = new Terminal({
    fontFamily: style.fontFamily,
    fontSize: parseFloat(style.fontSize),
    theme: { background: style.backgroundColor, foreground: style.color, cursor: style.getPropertyValue('--signal') },
  });

  const emulator = new V86({
    wasm_path: wasm,
    bios: { url: '/v86/seabios.bin' },
    vga_bios: { url: '/v86/vgabios.bin' },
    bzimage: { url: '/v86/buildroot-bzimage68.bin' },
    cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
    filesystem: {},
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
  });

  const encoder = new TextEncoder();

  emulator.add_listener('serial0-output-byte', (byte) => terminal.write(Uint8Array.of(byte)));
  terminal.onData((data) => emulator.serial_send_bytes(0, encoder.encode(data)));

  // Megabytes, so the wait shows on the screen it is for, on one line rewritten as it counts up.
  emulator.add_listener('download-progress', ({ file_name, loaded }) => {
    terminal.write(`\r\x1b[KFetching ${file_name.split('/').pop()}: ${(loaded / 1e6).toFixed(1)} MB`);
  });

  terminal.open(screen);

  return new Promise((resolve) => {
    emulator.add_listener('emulator-loaded', () => {
      terminal.write('\r\x1b[K');
      resolve({ emulator, terminal });
    });
  });
}
