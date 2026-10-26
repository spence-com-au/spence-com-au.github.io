/** A card on the landing page, as `pnpm fetch:repos` writes it to `repos.json` for `pnpm build` to render. */
export interface Project {
  title: string;
  description: string | null;

  /** The path of the repo's GitHub Pages site under this domain, or nothing when it publishes none. */
  site: string | null;

  /**
   * The Android app in the repo's newest release that has one, for a repo without a site: the APK itself, which only
   * an Android device downloads, and the page of the release it came in, which any other device opens instead.
   */
  apk: { href: string; release: string; version: string } | null;

  /** The repo's page on GitHub. */
  repo: string;
  icon: string | null;

  /** The site manifest's `theme_color` as written there, which `tint` darkens or lightens where it would not
   * show against the background. */
  themeColor: string | null;
}
