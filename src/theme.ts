import { clampChroma, formatHex, oklch, wcagContrast } from 'culori';

/** The page's background, which `index.css` paints and the end-to-end test holds it to. */
export const BACKGROUND = '#f4efe6';

/**
 * The colour a card's edge takes from its site's theme, or nothing for the neutral edge when there is none to take.
 * WCAG asks 3:1 of a component's boundary against what surrounds it, and a theme colour picked for a browser's toolbar
 * often falls short, so one that does is darkened until it reaches it. Lightness alone changes, in OKLCH, so the shade
 * keeps the hue a child knows the game by.
 */
export function tint(themeColor: string | null): string | undefined {
  const color = themeColor && oklch(themeColor);

  if (!themeColor || !color) {
    return undefined;
  }

  let shade = color;

  while (wcagContrast(shade, BACKGROUND) < 3) {
    shade = clampChroma({ ...shade, l: shade.l - 0.01 }, 'oklch');
  }

  return shade === color ? themeColor : formatHex(shade);
}
