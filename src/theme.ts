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
 * until it reaches it. Lightness alone changes, in OKLCH, so the shade keeps the hue a site is known by. It comes back
 * as hex even when unchanged, since culori accepts strings CSS does not, such as a bare `3f9b4f`, and it is that hex
 * whose contrast is checked, as rounding a shade to 8 bits a channel can take it back below 3:1. A colour outside sRGB,
 * which hex cannot hold, is brought inside it first by lowering its chroma, which keeps the hue that clipping it
 * channel by channel would shift.
 */
export function tint(themeColor: string | null, background: string): string | undefined {
  const color = themeColor && oklch(themeColor);

  if (!themeColor || !color) {
    return undefined;
  }

  const step = (oklch(background)?.l ?? 1) < 0.5 ? 0.01 : -0.01;
  let shade = clampChroma(color, 'oklch');

  // culori leaves the lightness out of `oklch(none 0.1 180)`, and makes it `NaN` where a conversion overflows, as for
  // `rgb(1e300 0 0)` or a manifest's `{"l": 1e103}`. No step moves either, and `formatHex` draws both as black, which
  // would never reach 3:1 against the dark background, so each takes the neutral edge.
  while (Number.isFinite(shade.l)) {
    const hex = formatHex(shade);

    if (wcagContrast(hex, background) >= 3) {
      return hex;
    }

    shade = clampChroma({ ...shade, l: shade.l + step }, 'oklch');
  }

  return undefined;
}
