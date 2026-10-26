// Switches the page between its light and dark schemes, overriding the system's, and remembers the choice for the
// inline script in `index.html` to restore before the next visit paints.
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');

function isDark(): boolean {
  return root.dataset.scheme ? root.dataset.scheme === 'dark' : systemDark.matches;
}

/** Shows the switch and answers it. Called here on the built page, and by `src/dev.tsx` once React has rendered it. */
export function connect(button: HTMLButtonElement): void {
  // Once a scheme is chosen, the browser's toolbar takes the page's background, read back from it; until then the
  // `theme-color` metas in `index.html` apply.
  function sync(): void {
    button.setAttribute('aria-pressed', String(isDark()));

    if (root.dataset.scheme) {
      const background = getComputedStyle(document.body).backgroundColor;

      for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
        meta.setAttribute('content', background);
      }
    }
  }

  button.hidden = false;
  button.addEventListener('click', () => {
    root.dataset.scheme = isDark() ? 'light' : 'dark';

    try {
      localStorage.setItem('scheme', root.dataset.scheme);
    } catch {
      // Unsaved, the choice lasts until the page is left.
    }

    sync();
  });

  systemDark.addEventListener('change', sync);
  sync();
}

const button = document.querySelector<HTMLButtonElement>('.scheme');

if (button) {
  connect(button);
}
