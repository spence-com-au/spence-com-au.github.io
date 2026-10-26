import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import projects from '../fixtures/repos.json' with { type: 'json' };
import App from './App.tsx';
import { connect } from './scheme.ts';

// Rendered synchronously, since the switch only exists once React has drawn it, after `src/scheme.ts` looked for it.
flushSync(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(<App projects={projects} />);
});

connect(document.querySelector<HTMLButtonElement>('.scheme') as HTMLButtonElement);
