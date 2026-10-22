import type { CSSProperties } from 'react';

import type { Project } from './project.ts';
import { tint } from './theme.ts';

/**
 * GitHub's mark, from [Octicons](https://primer.style/octicons/icon/mark-github-16/) (MIT). Hidden from assistive
 * technology, so the link around it says where it goes in its own label.
 */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
      />
    </svg>
  );
}

function Card({ project: { title, description, site, repo, icon, themeColor } }: { project: Project }) {
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
        <a className="open" href={site ?? repo} aria-label={site ? undefined : `${title} on GitHub`}>
          {/*
           * A repo without a site carries GitHub's mark, bound to the title's last word so that a title that wraps
           * takes it along rather than leaving it alone on a line. A no-break space cannot, since a line may break
           * beside an `<svg>` whatever is next to it.
           */}
          {site ? (
            title
          ) : (
            <>
              {title.slice(0, title.lastIndexOf(' ') + 1)}
              <span className="nowrap">
                {title.slice(title.lastIndexOf(' ') + 1)}
                <GitHubMark />
              </span>
            </>
          )}
        </a>
      </h2>
      {description && <p>{description}</p>}
      {site && (
        <a className="source" href={repo} aria-label={`Source code for ${title} on GitHub`}>
          <GitHubMark />
          Source
        </a>
      )}
    </li>
  );
}

export default function App({ projects }: { projects: Project[] }) {
  return (
    <main>
      <h1>spence.com.au</h1>
      <ul className="cards">
        {projects.map((project) => (
          <Card key={project.repo} project={project} />
        ))}
      </ul>
    </main>
  );
}
