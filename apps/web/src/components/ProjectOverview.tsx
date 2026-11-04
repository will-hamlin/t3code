import type { EnvironmentId } from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { serverEnvironment } from "../state/server";
import { useEnvironments } from "../state/environments";
import { SidebarThreadUsage } from "./sidebar/SidebarWorkspace";
import { Link, useNavigate } from "@tanstack/react-router";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { FolderIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { displayText } from "../lib/displayText";
import { useState } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { AssignmentPlan } from "./AssignmentPlan";

import { useQuietThreadShells } from "../state/entities";
import { PROJECT_STATUS, projectThreadStatus } from "./ProjectDashboard.logic";

import { Button } from "./ui/button";
import { WorkspacePageHeader } from "./WorkspacePageHeader";
import { isElectron } from "../env";

export function ProjectOverview({ projectKey }: { projectKey: string }) {
  const groups = useSidebarProjectGroups();
  const group = groups.find((candidate) => candidate.projectKey === projectKey);
  const first = group?.memberProjects[0];
  const ref = first ? scopeProjectRef(first.environmentId, first.id) : null;
  const assignments = useAssignments().filter((assignment) =>
    group?.memberProjects.some(
      (project) =>
        project.environmentId === assignment.project.environmentId &&
        project.id === assignment.project.id,
    ),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const allThreads = useQuietThreadShells();
  const threads = allThreads
    .filter(
      (thread) =>
        thread.archivedAt === null &&
        group?.memberProjects.some(
          (project) =>
            project.environmentId === thread.environmentId && project.id === thread.projectId,
        ) &&
        !thread.lineage.parentThreadId,
    )
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const navigate = useNavigate();

  return (
    <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto bg-background scrollbar-gutter-both">
      {first ? <ProjectOverviewUsage environmentId={first.environmentId} /> : null}
      <WorkspacePageHeader electron={isElectron}>
        <span className="text-sm text-muted-foreground">Project overview</span>
      </WorkspacePageHeader>
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
        {!group ? (
          <>
            <h1 className="text-3xl">Project unavailable</h1>
            <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground underline">
              All assignments
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-light">{group.displayName}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void navigate({
                      to: "/settings/projects",
                      search: { project: group.projectKey },
                    })
                  }
                >
                  <SettingsIcon />
                  Manage project
                </Button>
                <Button
                  size="sm"
                  disabled={!ref}
                  onClick={() => {
                    setCreateOpen(true);
                  }}
                >
                  <PlusIcon />
                  New assignment
                </Button>
              </div>
            </div>
            <section
              aria-label="Project workspaces"
              className="mt-8 rounded-xl border border-border bg-card p-5"
            >
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Workspace
              </h2>
              {group.memberProjects.map((project) => (
                <div
                  key={`${project.environmentId}:${project.id}`}
                  className="flex items-start gap-2 py-1"
                >
                  <FolderIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {project.title}
                  </span>
                </div>
              ))}
            </section>
            <section aria-label="Assignment plans" className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg">Assignments &amp; progress</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {assignments.length}
                </span>
              </div>
              <div className="space-y-5">
                {assignments.map((assignment) => (
                  <AssignmentPlan
                    key={`${assignment.thread.environmentId}:${assignment.thread.id}`}
                    assignment={assignment}
                    thread={assignment.thread}
                    cwd={assignment.project.workspaceRoot}
                  />
                ))}
              </div>
              {!assignments.length ? (
                <div className="rounded-xl border border-dashed border-border p-6">
                  <h3 className="text-lg">What should we accomplish here?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create an assignment, choose its Marshal, and describe the outcome. The Marshal
                    will propose a plan for your review before starting.
                  </p>
                  <div className="mt-5">
                    <Button size="sm" disabled={!ref} onClick={() => setCreateOpen(true)}>
                      Create assignment
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
            <section aria-label="Project threads" className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg">Threads</h2>
                <span className="font-mono text-xs text-muted-foreground">{threads.length}</span>
              </div>
              {threads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Conversations for this project will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {threads.map((thread) => (
                    <li key={`${thread.environmentId}:${thread.id}`}>
                      <Link
                        to="/$environmentId/$threadId"
                        params={{ environmentId: thread.environmentId, threadId: thread.id }}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent focus-visible:outline-ring"
                      >
                        <span className="min-w-0 truncate text-sm">
                          {displayText(thread.title)}
                        </span>
                        <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                          {PROJECT_STATUS[projectThreadStatus(thread)].label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectRef={ref ?? undefined}
      />
    </main>
  );
}

function ProjectOverviewUsage({ environmentId }: { environmentId: EnvironmentId }) {
  const providers = useAtomValue(serverEnvironment.providersValueAtom(environmentId)) ?? [];
  const { environments } = useEnvironments();
  const config = environments.find(
    (environment) => environment.environmentId === environmentId,
  )?.serverConfig;
  return (
    <SidebarThreadUsage
      usage={{
        providerInstanceId:
          config?.settings.defaultModelSelection?.instanceId ?? providers[0]?.instanceId ?? null,
        providers,
        sources: config?.usageLimitSources ?? [],
        contextWindow: null,
      }}
    />
  );
}
