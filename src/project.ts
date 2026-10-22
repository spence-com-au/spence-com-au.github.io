/** A card on the landing page, as `pnpm fetch:repos` writes it to `repos.json` for `pnpm build` to render. */
export interface Project {
  /** The repo's GitHub Pages site under this domain, or its page on GitHub when it publishes none. */
  href: string;
  title: string;
  description: string | null;
  icon: string | null;
}
