import { prerender } from 'react-dom/static';

import App from './App.tsx';
import type { Project } from './project.ts';

// `prerender` rather than `renderToStaticMarkup`, whose output a browser cannot hydrate: the page ships no React to the
// browser today, but this keeps the markup ready for the first part of it that does.
export async function render(projects: Project[]): Promise<string> {
  const { prelude } = await prerender(<App projects={projects} />);
  return new Response(prelude).text();
}
