import { expect, test } from '@playwright/test';
import { formatRgb } from 'culori';

import projects from '../../fixtures/repos.json' with { type: 'json' };
import { BACKGROUND, tint } from '../../src/theme.ts';

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

    // A card opens its site, else its app to install, else its code, and only the first two need a source link too.
    const [href, name] = project.site
      ? [project.site, project.title]
      : project.apk
        ? [project.apk.href, `Download ${project.title} ${project.apk.version} for Android`]
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

test('shows which release an app download installs', async ({ page }) => {
  const project = projects.find((p) => p.apk);

  // Without an app in the fixture, the card that downloads one would go untested rather than fail.
  expect(project, 'fixtures/repos.json has no repo with an APK').toBeDefined();

  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project?.title }) });
  await expect(card.locator('.version')).toHaveText(project?.apk?.version ?? '');
});

test("edges each card in its site's colour, or the neutral one where it has none", async ({ page }) => {
  const neutral = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--edge').trim(),
  );

  for (const project of projects) {
    const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project.title }) });

    await expect(card).toHaveCSS('border-top-color', formatRgb(tint(project.themeColor) ?? neutral) ?? '');
  }
});

test('opens a site from anywhere on its card, but its source from the source link', async ({ page }) => {
  const project = projects.find((p) => p.site && p.description);
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: project?.title }) });

  // A trial click fails if anything else would take the click, such as the title link's overlay covering this one.
  await card.getByRole('link', { name: /^Source code/ }).click({ trial: true });

  // Forced, because the overlay taking the click is the point: it clicks wherever the text is, as a tap would.
  await card.getByText(project?.description ?? '').click({ force: true });
  await expect(page).toHaveURL(project?.site ?? '');
});

test('paints the background the tints are checked against', async ({ page }) => {
  await expect(page.locator('body')).toHaveCSS('background-color', formatRgb(BACKGROUND) ?? '');
});

test('ships no JavaScript', async ({ page }) => {
  await expect(page.locator('script')).toHaveCount(0);
});
