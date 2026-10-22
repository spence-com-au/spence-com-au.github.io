import { parse, wcagContrast } from 'culori';

/** The page's background, which `index.css` paints and the end-to-end test holds it to. */
export const BACKGROUND = '#f4efe6';

/**
 * The colour a card's edge takes from its site's theme, or nothing for the neutral edge. WCAG asks 3:1 of a
 * component's boundary against what surrounds it, and a theme colour picked for a browser's toolbar often falls short.
 */
export function tint(themeColor: string | null): string | undefined {
  if (!themeColor) {
    return undefined;
  }

  const color = parse(themeColor);
  return color && wcagContrast(color, BACKGROUND) >= 3 ? themeColor : undefined;
}
