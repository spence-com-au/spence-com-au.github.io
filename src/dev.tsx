import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import projects from '../fixtures/repos.json' with { type: 'json' };
import { switchToDownloads } from './android.ts';
import App from './App.tsx';
import { connect } from './scheme.ts';
import { connect as connectShell } from './shell.ts';

// Rendered synchronously, since the switch and the cards only exist once React has drawn them, after `src/scheme.ts`,
// `src/shell.ts` and `src/android.ts` looked for them.
flushSync(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(<App projects={projects} />);
});

connect(document.querySelector<HTMLButtonElement>('.scheme') as HTMLButtonElement);
connectShell(document.querySelector<HTMLElement>('.shell') as HTMLElement);
switchToDownloads();
