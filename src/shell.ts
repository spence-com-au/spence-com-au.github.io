// The Terminal card, which opens a shell on Linux in a dialog. The emulator and the images it boots come to megabytes, so
// they load only once the card is first opened, and the emulator runs only while the dialog is open.
import type { boot } from './linux.ts';

/** Shows the card and answers it. Called here on the built page, and by `src/dev.tsx` once React has rendered it. */
export function connect(card: HTMLElement): void {
  const dialog = card.querySelector('dialog') as HTMLDialogElement;
  let linux: ReturnType<typeof boot> | undefined;

  card.hidden = false;
  card.querySelector('.open')?.addEventListener('click', async () => {
    dialog.showModal();
    linux ??= import('./linux.ts').then((module) => module.boot(dialog.querySelector('.screen') as HTMLElement));

    const { emulator, terminal } = await linux;

    // Unless it was closed again while the images loaded.
    if (dialog.open) {
      await emulator.run();
      terminal.focus();
    }
  });

  // Paused rather than left running behind the page, to carry on where it left off when opened again.
  dialog.addEventListener('close', async () => {
    await (await linux)?.emulator.stop();
  });
}

const card = document.querySelector<HTMLElement>('.shell');

if (card) {
  connect(card);
}
