import { ProjectDashboard } from "./ProjectDashboard";
export function ProjectOverview({ projectKey }: { projectKey: string }) {
  return <ProjectDashboard key={projectKey} projectKey={projectKey} />;
}
