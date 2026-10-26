import { clampChroma, formatHex, oklch, wcagContrast } from 'culori';

/**
 * The page's background in each colour scheme, which the end-to-end test holds `index.css`, the `theme-color` metas in
 * `index.html`, the manifest and the favicon's plate and letter to.
 */
export const BACKGROUNDS = { light: '#f4efe6', dark: '#1d1b19' };

/**
 * The colour a card's edge takes from its site's theme against `background`, or nothing for the neutral edge when there
 * is none to take. WCAG asks 3:1 of a component's boundary against what surrounds it, and a theme colour picked for a
 * browser's toolbar often falls short, so one that does is darkened on a light background, or lightened on a dark one,
 * until it reaches it. Lightness alone changes, in OKLCH, so the shade keeps the hue a site is known by.
 */
export function tint(themeColor: string | null, background: string): string | undefined {
  const color = themeColor && oklch(themeColor);

  if (!themeColor || !color) {
    return undefined;
  }

  const step = (oklch(background)?.l ?? 1) < 0.5 ? 0.01 : -0.01;
  let shade = color;

  while (wcagContrast(shade, background) < 3) {
    shade = clampChroma({ ...shade, l: shade.l + step }, 'oklch');
  }

  return shade === color ? themeColor : formatHex(shade);
}
