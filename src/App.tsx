import type { Project } from './project.ts';

export default function App({ projects }: { projects: Project[] }) {
  return (
    <main>
      <h1 hidden>spence.com.au</h1>
      <ul>
        {projects.map((project) => (
          <li key={project.href}>
            <a href={project.href} title={project.description ?? undefined}>
              {project.icon && <img src={project.icon} alt="" />}
              {project.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
