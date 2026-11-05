# CLAUDE.md

- **Serve a branch for its screenshots with `pnpm fetch:repos`, `pnpm build` and `pnpm preview`, in that order.** The
  first lists the live repos into `repos.json`, which the build reads before anything else and fails without. `master`
  is served at https://spence.com.au, where its screenshots come from.
