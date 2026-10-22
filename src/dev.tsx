import { createRoot } from 'react-dom/client';

import projects from '../fixtures/repos.json' with { type: 'json' };
import App from './App.tsx';

createRoot(document.getElementById('root') as HTMLElement).render(<App projects={projects} />);
