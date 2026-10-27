// The Terminal card, which opens a shell on Linux in a dialog. The emulator and the images it boots come to megabytes, so
// they load only once the card is first opened, and the emulator runs only while the dialog is open.
import type { boot } from './linux.ts';

type Linux = Awaited<ReturnType<typeof boot>>;

/** Shows the card and answers it. Called here on the built page, and by `src/dev.tsx` once React has rendered it. */
export function connect(card: HTMLElement): void {
  const dialog = card.querySelector('dialog') as HTMLDialogElement;
  const screen = dialog.querySelector('.screen') as HTMLElement;
  let linux: Promise<Linux | undefined> | undefined;

  // A failure says why on the screen and is forgotten, so that opening the card again tries again, from a clear screen.
  function start(): Promise<Linux | undefined> {
    screen.replaceChildren();

    return import('./linux.ts')
      .then((module) => module.boot(screen))
      .catch((error: unknown) => {
        linux = undefined;
        screen.textContent = `${error instanceof Error ? error.message : String(error)}. Close and open it to try again.`;

        return undefined;
      });
  }

  async function open(): Promise<void> {
    dialog.showModal();
    linux ??= start();

    const booted = await linux;

    // Unless it failed, or was closed again while the images loaded.
    if (booted && dialog.open) {
      await booted.emulator.run();
      booted.terminal.focus();
    }
  }

  card.hidden = false;
  card.querySelector('.open')?.addEventListener('click', open);

  // A backtick opens or closes it from anywhere, as a game's console does. Caught before the terminal sees it, so that
  // closing from the shell works, at the cost of the shell never receiving one: `$(…)` substitutes a command instead.
  addEventListener(
    'keydown',
    (event) => {
      if (event.key !== '`' || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Swallowed but not toggled on, as the key repeats while held, so that holding it neither flickers the dialog nor
      // types a run of backticks into the shell it just opened.
      if (event.repeat) {
        return;
      }

      if (dialog.open) {
        dialog.close();
      } else {
        void open();
      }
    },
    { capture: true },
  );

  // Paused rather than left running behind the page, to carry on where it left off when opened again.
  dialog.addEventListener('close', async () => {
    await (await linux)?.emulator.stop();
  });
}

const card = document.querySelector<HTMLElement>('.shell');

if (card) {
  connect(card);
}
