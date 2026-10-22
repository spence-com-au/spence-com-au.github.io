import { expect, test } from '@playwright/test';

import projects from '../../fixtures/repos.json' with { type: 'json' };

// With scripts off, whatever the page shows is what the build prerendered rather than anything rendered in the browser.
test.use({ javaScriptEnabled: false });

test('prerenders a card for every repo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('listitem')).toHaveCount(projects.length);

  for (const project of projects) {
    const card = page.getByRole('link', { name: project.title, exact: true });

    await expect(card).toHaveAttribute('href', project.href);
    await expect(card.locator('img')).toHaveCount(project.icon ? 1 : 0);

    if (project.icon) {
      await expect(card.locator('img')).toHaveAttribute('src', project.icon);
    }

    if (project.description) {
      await expect(card).toHaveAttribute('title', project.description);
    } else {
      await expect(card).not.toHaveAttribute('title');
    }
  }
});

test('styles the page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 239, 230)');
});

test('ships no JavaScript', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('script')).toHaveCount(0);
});
