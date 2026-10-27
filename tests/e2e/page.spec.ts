import { devices, expect, test, type Page } from '@playwright/test';
import { formatRgb } from 'culori';
import { parse } from 'node-html-parser';

import projects from '../../fixtures/repos.json' with { type: 'json' };
import { BACKGROUNDS, tint } from '../../src/theme.ts';

type Project = (typeof projects)[number];

const cardOf = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });

// Throws, so a fixture missing the repo fails saying why rather than as a lookup that matches every card.
function find<T extends Project>(what: string, predicate: (project: Project) => project is T): T {
  const project = projects.find(predicate);

  if (!project) {
    throw new Error(`fixtures/repos.json has no repo ${what}`);
  }

  return project;
}

const app = () => find('with an APK', (p): p is Project & { apk: NonNullable<Project['apk']> } => p.apk !== null);

// With scripts off, whatever the page shows is what the build prerendered rather than anything rendered in the browser.
test.use({ javaScriptEnabled: false });

// The fixture's icons are the live sites', which a hermetic run does not fetch.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/');
});

test('prerenders a card for every repo', async ({ page }) => {
  await expect(page.getByRole('listitem')).toHaveCount(projects.length);

  for (const project of projects) {
    const card = cardOf(page, project.title);
    const open = card.getByRole('heading').getByRole('link');
    const source = card.getByRole('link', { name: `Source code for ${project.title} on GitHub` });

    // A card opens its site, else its app's release, else its code, and only the first two need a source link too.
    const [href, name] = project.site
      ? [project.site, project.title]
      : project.apk
        ? [project.apk.release, `${project.title} ${project.apk.version} release on GitHub`]
        : [project.repo, `${project.title} on GitHub`];

    await expect(open).toHaveAttribute('href', href);
    await expect(open).toHaveAccessibleName(name);
    await expect(source).toHaveCount(href === project.repo ? 0 : 1);

    if (href !== project.repo) {
      await expect(source).toHaveAttribute('href', project.repo);
    }

    if (project.icon) {
      await expect(card.locator('img')).toHaveAttribute('src', project.icon);
    } else {
      await expect(card.locator('.tile')).toHaveText(project.title[0] ?? '');
    }

    if (project.description) {
      await expect(card.getByText(project.description)).toBeVisible();
    }
  }
});

// `scripts/build.ts` splices the cards into the page with `String.replace`, which reads a `$&`, `` $` `` or `$'` in a
// replacement string as a pattern for part of the page.
test('shows the replacement patterns in a description as written', async ({ page }) => {
  const { title, description } = find('with a `$&` in its description', (p): p is Project =>
    p.description.includes('$&'),
  );

  await expect(cardOf(page, title)).toContainText(description);
});

test('orders the cards by title', async ({ page }) => {
  const titles = projects.map((project) => project.title).toSorted((a, b) => a.localeCompare(b, 'en'));

  await expect(page.getByRole('listitem').getByRole('heading')).toHaveText(titles);
});

test('shows which release an app download installs', async ({ page }) => {
  const { apk, title } = app();

  await expect(cardOf(page, title).locator('.version')).toHaveText(apk.version);
});

for (const [colorScheme, background] of Object.entries(BACKGROUNDS) as ['light' | 'dark', string][]) {
  test.describe(`in the ${colorScheme} colour scheme`, () => {
    test.use({ colorScheme });

    test("edges each card in its site's colour, or the neutral one where it has none", async ({ page }) => {
      // Resolved through an element, since the property itself holds both schemes' colours in a `light-dark()`.
      const neutral = await page.evaluate(() => {
        const probe = document.body.appendChild(document.createElement('div'));
        probe.style.color = 'var(--edge)';

        return getComputedStyle(probe).color;
      });

      for (const project of projects) {
        const card = cardOf(page, project.title);
        const edge = tint(project.themeColor, background);

        await expect(card).toHaveCSS('border-top-color', edge ? (formatRgb(edge) ?? '') : neutral);
      }
    });

    test('paints the background the tints are checked against', async ({ page }) => {
      await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(background) ?? '');
    });

    test("gives the browser's toolbar the background before a scheme is chosen", async ({ page }) => {
      const meta = page.locator(`meta[name="theme-color"][media="(prefers-color-scheme: ${colorScheme})"]`);

      await expect(meta).toHaveAttribute('content', background);
    });
  });
}

// A manifest names one colour of each, so an installed app opens on the light scheme's background.
test('gives an installed app the light background', async ({ page }) => {
  const manifest = await page.request.get((await page.locator('link[rel="manifest"]').getAttribute('href')) ?? '');

  expect(await manifest.json()).toMatchObject({ background_color: BACKGROUNDS.light, theme_color: BACKGROUNDS.light });
});

// The mark is the same in either scheme: the light background's colour lettered on a plate of the dark one's.
test('draws the favicon in the two backgrounds', async ({ page }) => {
  const href = (await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href')) ?? '';
  const favicon = parse(await (await page.request.get(href)).text());

  expect(favicon.querySelector('rect')?.getAttribute('fill')).toBe(BACKGROUNDS.dark);
  expect(favicon.querySelector('path')?.getAttribute('fill')).toBe(BACKGROUNDS.light);
});

test('opens a site from anywhere on its card, but its source from the source link', async ({ page }) => {
  const project = find('with a site and a description', (p): p is Project & { site: string; description: string } =>
    Boolean(p.site && p.description),
  );
  const card = cardOf(page, project.title);

  // A trial click fails if anything else would take the click, such as the title link's overlay covering this one.
  await card.getByRole('link', { name: /^Source code/ }).click({ trial: true });

  // Forced, because the overlay taking the click is the point: it clicks wherever the text is, as a tap would.
  await card.getByText(project.description).click({ force: true });
  await expect(page).toHaveURL(project.site);
});

// A preload whose path Vite failed to resolve would 404 and quietly bring back the swap from the fallback font.
test('preloads the font the stylesheet draws the page in', async ({ page }) => {
  const font = (await page.locator('link[rel="preload"][as="font"]').getAttribute('href')) ?? '';
  const stylesheet = (await page.locator('link[rel="stylesheet"]').getAttribute('href')) ?? '';

  expect((await page.request.get(font)).headers()['content-type']).toBe('font/woff2');
  expect(await (await page.request.get(stylesheet)).text()).toContain(font);
});

// React rendered the page at build time, so what ships is the inline restore of a chosen scheme and one module, which
// Vite bundles from the scheme switch, the script that points Android at its downloads and the Terminal card's, which
// imports the emulator only once the card is opened.
test('ships no script but the scheme switch, the Terminal card and the Android downloads', async ({ page }) => {
  await expect(page.locator('script')).toHaveCount(2);
  await expect(page.locator('script:not([src])')).toHaveCount(1);
  await expect(page.locator('script[type="module"][src]')).toHaveCount(1);
});

test('hides the scheme switch from a browser running no script, which it could not answer', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Dark scheme', includeHidden: true })).toBeHidden();
});

test('hides the Terminal card from a browser running no script, which could boot nothing', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Terminal', exact: true, includeHidden: true })).toBeHidden();
});

// The PNG icons exist only once the build renders them, so a link to one it missed would 404 without failing anything.
test('serves every icon the page and its manifest name, at the size they name', async ({ page }) => {
  const links = await page
    .locator('link[rel~="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((els) => els.map((el) => ({ src: el.getAttribute('href'), sizes: el.getAttribute('sizes') })));

  const manifest = await page.request.get((await page.locator('link[rel="manifest"]').getAttribute('href')) ?? '');
  const { icons } = (await manifest.json()) as { icons: { src: string; sizes: string }[] };

  for (const { src, sizes } of [...links, ...icons]) {
    const response = await page.request.get(src ?? '');

    // By type rather than status, since the preview server answers a path it lacks with the page and a 200.
    expect(response.headers()['content-type'], src ?? '').toMatch(/^image\//);

    if (sizes) {
      // A PNG's width and height are the two 32-bit integers at the start of its `IHDR` chunk.
      const png = await response.body();

      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, src ?? '').toBe(sizes);
    }
  }
});

// The page sends the system scheme's `change` event as it renders a frame, so wait until two have passed after it sees
// the new scheme: two changes back to back could otherwise end where they began and send none.
async function emulateSystemScheme(page: Page, colorScheme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme });
  await page.waitForFunction(
    (dark) => matchMedia('(prefers-color-scheme: dark)').matches === dark,
    colorScheme === 'dark',
  );
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.describe('with scripts on', () => {
  test.use({ javaScriptEnabled: true });

  test.describe('in the light colour scheme', () => {
    test.use({ colorScheme: 'light' });

    test('switches to the dark scheme and remembers it', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Dark scheme' });
      const dark = formatRgb(BACKGROUNDS.dark) ?? '';

      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('body')).toHaveCSS('background-color', dark);

      // Every meta, since `sync` rewrites them all and one it skipped would still show the browser the old colour.
      const metas = page.locator('meta[name="theme-color"]');

      await expect(metas).toHaveCount(2);

      for (const meta of await metas.all()) {
        await expect(meta).toHaveAttribute('content', dark);
      }

      await page.reload();
      await expect(page.locator('body')).toHaveCSS('background-color', dark);
      await expect(button).toHaveAttribute('aria-pressed', 'true');

      await button.click();
      await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUNDS.light) ?? '');
    });

    test('follows the system scheme until one is chosen, then ignores it', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Dark scheme' });

      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(button).toHaveAttribute('aria-pressed', 'true');

      // Chosen against the system, so a listener that went on following it would turn the page dark again below.
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'false');

      await emulateSystemScheme(page, 'light');
      await emulateSystemScheme(page, 'dark');

      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUNDS.light) ?? '');
    });

    // A `localStorage` that throws on any access, as in some private windows or with site data blocked.
    test.describe('with storage unavailable', () => {
      const errors: Error[] = [];

      test.beforeEach(async ({ page }) => {
        errors.length = 0;
        page.on('pageerror', (error) => errors.push(error));

        await page.addInitScript(() => {
          Object.defineProperty(window, 'localStorage', {
            get() {
              throw new DOMException('Denied', 'SecurityError');
            },
          });
        });
        await page.reload();
      });

      // Uncaught, the inline script's error would end only that script and leave the module scripts to carry on, so
      // the page's behaviour cannot show that the error was caught; the error itself does.
      test('switches the scheme for the visit and follows the system on the next', async ({ page }) => {
        const button = page.getByRole('button', { name: 'Dark scheme' });

        await expect(button).toHaveAttribute('aria-pressed', 'false');
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUNDS.dark) ?? '');

        await page.reload();
        await expect(button).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUNDS.light) ?? '');
        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUNDS.dark) ?? '');

        expect(errors).toEqual([]);
      });
    });
  });

  test.describe('in the dark colour scheme', () => {
    test.use({ colorScheme: 'dark' });

    test('shows the dark scheme as the one in force', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Dark scheme' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  const open = (page: Page) => cardOf(page, app().title).getByRole('heading').getByRole('link');

  test.describe('on Android', () => {
    test.use({ userAgent: devices['Pixel 7'].userAgent });

    test('downloads an app from its card', async ({ page }) => {
      const { apk, title } = app();

      await expect(open(page)).toHaveAttribute('href', apk.href);
      await expect(open(page)).toHaveAccessibleName(`Download ${title} ${apk.version} for Android`);
    });
  });

  // Chromium reports its platform in `userAgentData`, whatever the `User-Agent` string says, so a desktop string here
  // reaches only that branch.
  test.describe('on Android by its client hints alone', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgentData', { value: { platform: 'Android' } });
      });
      await page.reload();
    });

    test('downloads an app from its card', async ({ page }) => {
      await expect(open(page)).toHaveAttribute('href', app().apk.href);
    });
  });

  test("opens an app's release page anywhere else", async ({ page }) => {
    await expect(open(page)).toHaveAttribute('href', app().apk.release);
  });

  // The fixture holds a repo titled after it, so that this fails for a Terminal card put last rather than in its place.
  test('orders the Terminal card among the others by title', async ({ page }) => {
    const titles = [...projects.map((project) => project.title), 'Terminal'].toSorted((a, b) =>
      a.localeCompare(b, 'en'),
    );

    expect(titles.at(-1)).not.toBe('Terminal');
    await expect(page.getByRole('listitem').getByRole('heading')).toHaveText(titles);
  });

  // A file missing, as after a deploy that lacks it, the emulator's WebAssembly answered with a page, as the preview
  // server answers a path it lacks, or a module v86 fails to start, each of which would otherwise leave the terminal
  // waiting for ever. Unhandled, the rejection would surface only as a page error.
  for (const { name, glob, answer, says } of [
    {
      name: 'a missing kernel',
      glob: '**/v86/buildroot-bzimage68.bin',
      answer: { status: 404 },
      says: /Fetching buildroot-bzimage68\.bin failed: 404/,
    },
    {
      name: 'a missing emulator',
      glob: '**/v86-*.wasm',
      answer: { status: 404 },
      says: /Fetching v86-\S+\.wasm failed: 404/,
    },
    {
      name: 'a WebAssembly module other than the emulator',
      glob: '**/v86-*.wasm',
      answer: { body: Buffer.from('\0asm\x01\0\0\0'), contentType: 'application/wasm' },
      says: /rust_init/,
    },
    {
      name: 'a page in place of the emulator',
      glob: '**/v86-*.wasm',
      answer: { body: '<!doctype html>', contentType: 'text/html' },
      says: /WebAssembly/,
    },
  ]) {
    test(`says why the Terminal could not boot from ${name}, and tries again when opened again`, async ({ page }) => {
      test.setTimeout(60_000);

      const errors: Error[] = [];
      const dialog = page.getByRole('dialog', { name: 'Terminal' });

      page.on('pageerror', (error) => errors.push(error));
      await page.route(glob, (route) => route.fulfill(answer));
      await page.getByRole('button', { name: 'Terminal', exact: true }).click();
      await expect(dialog).toContainText(says);
      await expect(dialog).toContainText('Close and open it to try again.');
      await dialog.getByRole('button', { name: 'Close terminal' }).click();

      await page.unroute(glob);
      await page.getByRole('button', { name: 'Terminal', exact: true }).click();
      await expect(dialog.locator('.xterm-rows')).toContainText('~% ', { timeout: 30_000 });
      await expect(dialog).not.toContainText('try again');
      expect(errors).toEqual([]);
    });
  }

  test('opens and closes the Terminal on a backtick, which the shell never receives', async ({ page }) => {
    test.setTimeout(60_000);

    const dialog = page.getByRole('dialog', { name: 'Terminal' });
    const screen = dialog.locator('.xterm-rows');

    await expect(page.getByRole('button', { name: 'Terminal', exact: true })).toHaveAttribute('aria-keyshortcuts', '`');
    await page.keyboard.press('`');
    await expect(screen).toContainText('~% ', { timeout: 30_000 });

    // Closed from inside the shell, half way through a command, which carries on without the backtick once reopened.
    await page.keyboard.type('echo ok');
    await page.keyboard.press('`');
    await expect(dialog).toBeHidden();

    // Held this time, so that the key repeats once the terminal has focus again. It repeats once, an odd number of times,
    // so that a repeat which toggled would leave the dialog closed.
    await page.keyboard.down('`');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.xterm-helper-textarea')).toBeFocused();
    await page.keyboard.down('`');
    await page.keyboard.up('`');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(screen.getByText('ok', { exact: true })).toBeVisible();
    await expect(screen).not.toContainText('`');
  });

  // Dispatched rather than typed, since Playwright types as a US layout does, and other layouts' keys are what these are.
  for (const { name, init, opens } of [
    {
      name: 'a backtick typed with AltGr',
      init: { key: '`', ctrlKey: true, altKey: true, modifierAltGraph: true },
      opens: true,
    },
    { name: 'a dead key, even the one marked with a backtick', init: { key: 'Dead', code: 'Backquote' }, opens: false },
    { name: 'Ctrl and a backtick', init: { key: '`', ctrlKey: true }, opens: false },
  ]) {
    test(`${opens ? 'opens' : 'leaves closed'} the Terminal on ${name}`, async ({ page }) => {
      await page.evaluate(
        (init) => dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })),
        init,
      );

      await expect(page.getByRole('dialog', { name: 'Terminal' })).toBeVisible({ visible: opens });
    });
  }

  // Linux takes seconds to boot in an emulator, more on a slow runner.
  test('boots a shell in the Terminal card, which carries on where it left off when opened again', async ({ page }) => {
    test.setTimeout(60_000);

    const dialog = page.getByRole('dialog', { name: 'Terminal' });
    const screen = dialog.locator('.xterm-rows');

    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    await expect(screen).toContainText('~% ', { timeout: 30_000 });

    // Dark on the light page, as a terminal is, in the colours xterm.js was given from the stylesheet.
    await expect(dialog.locator('.xterm-scrollable-element')).toHaveCSS(
      'background-color',
      formatRgb(BACKGROUNDS.dark) ?? '',
    );

    // Across every card and down the page but the same margin at either end, with the terminal grown to fill it one way
    // or the other.
    const window = (await dialog.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
    const cards = (await page.getByRole('list').boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const fill = await dialog.locator('.screen').evaluate((screen) => {
      const drawn = screen.querySelector('.xterm-screen') as HTMLElement;

      return Math.max(drawn.offsetWidth / screen.clientWidth, drawn.offsetHeight / screen.clientHeight);
    });

    expect(window.x).toBeLessThanOrEqual(cards.x);
    expect(window.x + window.width).toBeGreaterThanOrEqual(cards.x + cards.width);
    expect(window.y + window.height).toBe(viewport.height - window.y);
    expect(fill).toBeGreaterThan(0.9);

    await page.keyboard.type('busybox | head -1\n');
    await expect(screen).toContainText('BusyBox v1.');

    await dialog.getByRole('button', { name: 'Close terminal' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Terminal', exact: true }).click();
    await page.keyboard.type('uname -s\n');
    await expect(screen).toContainText('BusyBox v1.');
    await expect(screen.getByText('Linux', { exact: true })).toBeVisible();
  });
});
