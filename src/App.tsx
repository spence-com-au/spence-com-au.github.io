import type { CSSProperties } from 'react';

import { initials, type Project } from './project.ts';
import { BACKGROUNDS, tint } from './theme.ts';

/** GitHub's mark, from [Octicons](https://primer.style/octicons/icon/mark-github-16/) (MIT). */
const GITHUB = {
  viewBox: '0 0 16 16',
  path: 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z',
};

/** Half sun, half moon, from [Material Design Icons](https://pictogrammers.com/library/mdi/icon/theme-light-dark/). */
const SCHEME = {
  viewBox: '0 0 24 24',
  path: 'M7.5,2C5.71,3.15 4.5,5.18 4.5,7.5C4.5,9.82 5.71,11.85 7.53,13C4.46,13 2,10.54 2,7.5A5.5,5.5 0 0,1 7.5,2M19.07,3.5L20.5,4.93L4.93,20.5L3.5,19.07L19.07,3.5M12.89,5.93L11.41,5L9.97,6L10.39,4.3L9,3.24L10.75,3.12L11.33,1.47L12,3.1L13.73,3.13L12.38,4.26L12.89,5.93M9.59,9.54L8.43,8.81L7.31,9.59L7.65,8.27L6.56,7.44L7.92,7.35L8.37,6.06L8.88,7.33L10.24,7.36L9.19,8.23L9.59,9.54M19,13.5A5.5,5.5 0 0,1 13.5,19C12.28,19 11.15,18.6 10.24,17.93L17.93,10.24C18.6,11.15 19,12.28 19,13.5M14.6,20.08L17.37,18.93L17.13,22.28L14.6,20.08M18.93,17.38L20.08,14.61L22.28,17.15L18.93,17.38M20.08,12.42L18.94,9.64L22.28,9.88L20.08,12.42M9.63,18.93L12.4,20.08L9.87,22.27L9.63,18.93Z',
};

/** A cross, from [Material Design Icons](https://pictogrammers.com/library/mdi/icon/close/). */
const CLOSE = {
  viewBox: '0 0 24 24',
  path: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

/** Hidden from assistive technology, so the link around a mark says where it goes in its own label. */
function Mark({ icon }: { icon: typeof GITHUB }) {
  return (
    <svg viewBox={icon.viewBox} aria-hidden="true">
      <path fill="currentColor" d={icon.path} />
    </svg>
  );
}

interface Destination {
  href: string;
  label?: string;

  /**
   * Where the card opens instead on Android, which `src/android.ts` switches it to, since only Android installs an APK.
   */
  android?: { href: string; label: string };
}

/** Where a card opens: its site, else its app's release, else its code. */
function destination({ title, site, apk, repo }: Project): Destination {
  if (site) {
    return { href: site };
  }

  if (apk) {
    return {
      href: apk.release,
      label: `${title} ${apk.version} release on GitHub`,
      android: { href: apk.href, label: `Download ${title} ${apk.version} for Android` },
    };
  }

  return { href: repo, label: `${title} on GitHub` };
}

function Card({ project }: { project: Project }) {
  const { title, description, apk, repo, icon, themeColor } = project;
  const { href, label, android } = destination(project);
  const monogram = initials(title);
  const light = tint(themeColor, BACKGROUNDS.light);
  const dark = tint(themeColor, BACKGROUNDS.dark);
  const edge = light && dark && `light-dark(${light}, ${dark})`;

  return (
    <li className="card" style={{ '--tint': edge } as CSSProperties}>
      {icon ? (
        <img className="tile" src={icon} alt="" />
      ) : (
        <span className="tile" aria-hidden="true" style={{ '--letters': [...monogram].length } as CSSProperties}>
          {monogram}
        </span>
      )}
      <h2>
        <a
          className="open"
          href={href}
          aria-label={label}
          data-android-href={android?.href}
          data-android-label={android?.label}
        >
          {title}
        </a>
      </h2>
      {description && <p>{description}</p>}
      {href !== repo && (
        <div className="footer">
          <a className="source" href={repo} aria-label={`Source code for ${title} on GitHub`}>
            <Mark icon={GITHUB} />
            Source
          </a>
          {apk && <span className="version">{apk.version}</span>}
        </div>
      )}
    </li>
  );
}

const TERMINAL = 'Terminal';

/**
 * Opens a shell on Linux booted in the browser. Hidden until `src/shell.ts` shows it, since without a script it could
 * boot nothing.
 */
function Shell() {
  return (
    <li className="card shell" hidden>
      <span className="tile" aria-hidden="true">
        $
      </span>
      <h2>
        <button className="open" type="button" aria-keyshortcuts="`">
          {TERMINAL}
        </button>
      </h2>
      <p>A BusyBox shell on Linux, booted in your browser.</p>
      <dialog aria-label={TERMINAL}>
        <form method="dialog">
          <button className="close" type="submit" aria-label="Close terminal">
            <Mark icon={CLOSE} />
          </button>
        </form>
        <div className="screen" />
      </dialog>
    </li>
  );
}

export default function App({ projects }: { projects: Project[] }) {
  // By the title the card shows, rather than the repo name GitHub lists them by, which can differ, with the Terminal's
  // among them.
  const cards = [
    ...projects.map((project) => ({ title: project.title, card: <Card key={project.repo} project={project} /> })),
    { title: TERMINAL, card: <Shell key={TERMINAL} /> },
  ].toSorted((a, b) => a.title.localeCompare(b.title, 'en'));

  return (
    <main>
      <header>
        <h1>
          <span className="visually-hidden">spence.com.au</span>
          <span className="wordmark" aria-hidden="true">
            SPENCE
            <span className="cursor" />
          </span>
          <span className="domain" aria-hidden="true">
            ~/SPENCE.COM.AU
          </span>
        </h1>

        {/* Hidden until `src/scheme.ts` runs, since without a script it can switch nothing. */}
        <button className="scheme" type="button" aria-label="Dark scheme" aria-pressed="false" hidden>
          <Mark icon={SCHEME} />
        </button>
      </header>
      <ul className="cards">{cards.map(({ card }) => card)}</ul>
    </main>
  );
}
