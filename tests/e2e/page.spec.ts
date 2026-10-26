import { devices, expect, test } from '@playwright/test';
import { formatRgb } from 'culori';

import projects from '../../fixtures/repos.json' with { type: 'json' };
import { BACKGROUNDS, tint } from '../../src/theme.ts';

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
    const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project.title }) });
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

test('orders the cards by title', async ({ page }) => {
  const titles = projects.map((project) => project.title).toSorted((a, b) => a.localeCompare(b, 'en'));

  await expect(page.getByRole('listitem').getByRole('heading')).toHaveText(titles);
});

test('shows which release an app download installs', async ({ page }) => {
  const project = projects.find((p) => p.apk);

  // Without an app in the fixture, the card that downloads one would go untested rather than fail.
  expect(project, 'fixtures/repos.json has no repo with an APK').toBeDefined();

  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project?.title }) });
  await expect(card.locator('.version')).toHaveText(project?.apk?.version ?? '');
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
        const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project.title }) });
        const edge = tint(project.themeColor, background);

        await expect(card).toHaveCSS('border-top-color', edge ? (formatRgb(edge) ?? '') : neutral);
      }
    });

    test('paints the background the tints are checked against', async ({ page }) => {
      await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(background) ?? '');
    });
  });
}

test('opens a site from anywhere on its card, but its source from the source link', async ({ page }) => {
  const project = projects.find((p) => p.site && p.description);
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project?.title }) });

  // A trial click fails if anything else would take the click, such as the title link's overlay covering this one.
  await card.getByRole('link', { name: /^Source code/ }).click({ trial: true });

  // Forced, because the overlay taking the click is the point: it clicks wherever the text is, as a tap would.
  await card.getByText(project?.description ?? '').click({ force: true });
  await expect(page).toHaveURL(project?.site ?? '');
});

// A preload whose path Vite failed to resolve would 404 and quietly bring back the swap from the fallback font.
test('preloads the font the stylesheet draws the page in', async ({ page }) => {
  const font = (await page.locator('link[rel="preload"][as="font"]').getAttribute('href')) ?? '';
  const stylesheet = (await page.locator('link[rel="stylesheet"]').getAttribute('href')) ?? '';

  expect((await page.request.get(font)).headers()['content-type']).toBe('font/woff2');
  expect(await (await page.request.get(stylesheet)).text()).toContain(font);
});

test('ships no script but the one that points Android at its downloads', async ({ page }) => {
  await expect(page.locator('script')).toHaveCount(1);
  await expect(page.locator('script')).toHaveAttribute('type', 'module');
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

test.describe('with scripts on', () => {
  test.use({ javaScriptEnabled: true });

  const project = projects.find((p) => p.apk);
  const open = (page: import('@playwright/test').Page) =>
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: project?.title }) })
      .getByRole('heading')
      .getByRole('link');

  test.describe('on Android', () => {
    test.use({ userAgent: devices['Pixel 7'].userAgent });

    test('downloads an app from its card', async ({ page }) => {
      await expect(open(page)).toHaveAttribute('href', project?.apk?.href ?? '');
      await expect(open(page)).toHaveAccessibleName(`Download ${project?.title} ${project?.apk?.version} for Android`);
    });
  });

  test("opens an app's release page anywhere else", async ({ page }) => {
    await expect(open(page)).toHaveAttribute('href', project?.apk?.release ?? '');
  });
});
