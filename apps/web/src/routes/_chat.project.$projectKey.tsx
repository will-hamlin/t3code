import { createFileRoute } from "@tanstack/react-router";
import { ProjectOverview } from "../components/ProjectOverview";

export const Route = createFileRoute("/_chat/project/$projectKey")({
  component: ProjectOverviewRoute,
});

function ProjectOverviewRoute() {
  const { projectKey } = Route.useParams();
  return <ProjectOverview projectKey={projectKey} />;
}
