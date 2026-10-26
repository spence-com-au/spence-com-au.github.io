import type { CSSProperties } from 'react';

import type { Project } from './project.ts';
import { tint } from './theme.ts';

/** GitHub's mark, from [Octicons](https://primer.style/octicons/icon/mark-github-16/) (MIT). */
const GITHUB = {
  viewBox: '0 0 16 16',
  path: 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z',
};

/**
 * Android's robot, from [Material Design Icons](https://pictogrammers.com/library/mdi/icon/android/) (Apache 2.0),
 * its box cropped to the robot so it sits on the line beside the title rather than below it.
 */
const ANDROID = {
  viewBox: '2 6 20 12',
  path: 'M16.61 15.15C16.15 15.15 15.77 14.78 15.77 14.32S16.15 13.5 16.61 13.5H16.61C17.07 13.5 17.45 13.86 17.45 14.32C17.45 14.78 17.07 15.15 16.61 15.15M7.41 15.15C6.95 15.15 6.57 14.78 6.57 14.32C6.57 13.86 6.95 13.5 7.41 13.5H7.41C7.87 13.5 8.24 13.86 8.24 14.32C8.24 14.78 7.87 15.15 7.41 15.15M16.91 10.14L18.58 7.26C18.67 7.09 18.61 6.88 18.45 6.79C18.28 6.69 18.07 6.75 18 6.92L16.29 9.83C14.95 9.22 13.5 8.9 12 8.91C10.47 8.91 9 9.24 7.73 9.82L6.04 6.91C5.95 6.74 5.74 6.68 5.57 6.78C5.4 6.87 5.35 7.08 5.44 7.25L7.1 10.13C4.25 11.69 2.29 14.58 2 18H22C21.72 14.59 19.77 11.7 16.91 10.14H16.91Z',
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
  mark?: typeof GITHUB;

  /** Where the card opens instead on Android, which `src/android.ts` switches it to, since only Android installs an APK. */
  android?: { href: string; label: string };
}

/** Where a card opens — its site, else its app's release, else its code — and what says so beside its title. */
function destination({ title, site, apk, repo }: Project): Destination {
  if (site) {
    return { href: site };
  }

  if (apk) {
    return {
      href: apk.release,
      label: `${title} ${apk.version} release on GitHub`,
      mark: ANDROID,
      android: { href: apk.href, label: `Download ${title} ${apk.version} for Android` },
    };
  }

  return { href: repo, label: `${title} on GitHub`, mark: GITHUB };
}

function Card({ project }: { project: Project }) {
  const { title, description, apk, repo, icon, themeColor } = project;
  const { href, label, mark, android } = destination(project);

  return (
    <li className="card" style={{ '--tint': tint(themeColor) } as CSSProperties}>
      {icon ? (
        <img className="tile" src={icon} alt="" />
      ) : (
        <span className="tile" aria-hidden="true">
          {title[0]}
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
          {/*
           * A mark is bound to the title's last word so that a title that wraps takes it along rather than leaving it
           * alone on a line. A no-break space cannot, since a line may break beside an `<svg>` whatever is next to it.
           */}
          {mark ? (
            <>
              {title.slice(0, title.lastIndexOf(' ') + 1)}
              <span className="nowrap">
                {title.slice(title.lastIndexOf(' ') + 1)}
                <Mark icon={mark} />
              </span>
            </>
          ) : (
            title
          )}
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

export default function App({ projects }: { projects: Project[] }) {
  // By the title the card shows, rather than the repo name GitHub lists them by, which can differ.
  const sorted = projects.toSorted((a, b) => a.title.localeCompare(b.title, 'en'));

  return (
    <main>
      <h1>spence.com.au</h1>
      <ul className="cards">
        {sorted.map((project) => (
          <Card key={project.repo} project={project} />
        ))}
      </ul>
    </main>
  );
}
