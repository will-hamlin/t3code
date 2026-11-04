import "../styles/overcast-dashboard.css";
import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { EllipsisIcon, PlusIcon, SettingsIcon, FolderIcon, ArrowUpRightIcon } from "lucide-react";
import { useAssignments } from "../hooks/useAssignments";
import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useConnectedEnvironmentIds } from "../state/environments";
import { openCommandPalette } from "../commandPaletteBus";
import { isElectron } from "../env";
import { PROJECT_STATUS, projectThreadStatus } from "./ProjectDashboard.logic";
import { MarshalIcon } from "./MarshalIcon";
import { T3AppIcon } from "./T3AppIcon";
import { ProjectOperations } from "./ProjectOperations";
import { displayText } from "../lib/displayText";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { Button } from "./ui/button";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "./ui/menu";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

export function ProjectDashboard() {
  const [tab, setTab] = useState<"assignments" | "projects" | "ops">("assignments");
  const [createOpen, setCreateOpen] = useState(false);
  const assignments = useAssignments();
  const groups = useSidebarProjectGroups();
  const connected = useConnectedEnvironmentIds();
  const navigate = useNavigate();
  const working = assignments.filter(
    ({ thread }) => projectThreadStatus(thread) === "working",
  ).length;
  const attention = assignments.filter(({ thread }) =>
    ["approval", "request", "input", "failed", "limited"].includes(projectThreadStatus(thread)),
  ).length;
  const groupFor = (environmentId: string, projectId: string) =>
    groups.find((group) =>
      group.memberProjects.some(
        (project) => project.environmentId === environmentId && project.id === projectId,
      ),
    );
  return (
    <main
      data-overcast-dashboard=""
      className="relative flex h-dvh min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto bg-background text-foreground scrollbar-gutter-both"
    >
      <WorkspacePageHeader electron={isElectron}>
        <span className="mr-6 inline-flex items-center gap-2 font-mono text-xs tracking-widest">
          <T3AppIcon className="size-6" />
          efficio
        </span>
        <nav
          role="tablist"
          aria-label="Workspace views"
          className="flex h-full items-center gap-1 [-webkit-app-region:no-drag]"
        >
          {(["assignments", "projects", "ops"] as const).map((name) => (
            <button
              key={name}
              id={`tab-${name}`}
              role="tab"
              type="button"
              aria-selected={tab === name}
              aria-controls="workspace-tab-panel"
              className={`relative px-4 py-3 text-xs capitalize transition-colors focus-visible:outline-ring ${tab === name ? "text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-(--oc-ginkgo)" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="ml-auto [-webkit-app-region:no-drag]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => void navigate({ to: "/settings/general" })}
          >
            <SettingsIcon />
          </Button>
        </div>
      </WorkspacePageHeader>
      <div
        id="workspace-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto w-full max-w-[1180px] px-6 py-10 sm:px-10 sm:py-14"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 font-mono text-2xs uppercase tracking-widest text-(--oc-ginkgo)">
              {tab === "assignments"
                ? "Marshal command"
                : tab === "projects"
                  ? "Your working areas"
                  : "Operations"}
            </p>
            <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
              {tab === "assignments" ? "Assignments" : tab === "projects" ? "Projects" : "Ops"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {tab === "assignments"
                ? "Make a request. Your Marshal gets it done."
                : tab === "projects"
                  ? "Workspaces and shared context for your assignments."
                  : "Services, deployments, and operational status for each project."}
            </p>
          </div>
          <Button
            onClick={() =>
              tab !== "assignments"
                ? openCommandPalette({ open: "add-project" })
                : setCreateOpen(true)
            }
          >
            <PlusIcon />
            {tab === "assignments" ? "New assignment" : "Add project"}
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4 font-mono text-xs text-muted-foreground">
          {tab === "ops" ? (
            <>
              <span>{groups.length} projects</span>
              <span>{connected.length} machines connected</span>
              <span>Deployment status &amp; services</span>
            </>
          ) : (
            <>
              <span>
                <strong className="font-normal text-foreground">{assignments.length}</strong>{" "}
                assignments
              </span>
              <span>
                <strong className="font-normal text-foreground">{groups.length}</strong> projects
              </span>
              <span>
                <strong className="font-normal text-(--oc-ginkgo)">{working}</strong> working
              </span>
              <span>
                <strong className="font-normal text-(--oc-file-relevant)">{attention}</strong> need
                attention
              </span>
            </>
          )}
        </div>
        {tab === "assignments" ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const { thread, project, marshalAgent } = assignment;
              const status = projectThreadStatus(thread);
              const group = groupFor(project.environmentId, project.id);
              return (
                <article
                  key={`${thread.environmentId}:${thread.id}`}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-(--oc-collar)"
                >
                  <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center">
                        <MarshalIcon name={marshalAgent} className="size-9" />
                      </span>
                      <div>
                        <p className="font-mono text-xs">{marshalAgent}</p>
                        <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground">
                          {project.title}
                        </p>
                      </div>
                    </div>
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Manage assignment: ${displayText(assignment.title)}`}
                          />
                        }
                      >
                        <EllipsisIcon />
                      </MenuTrigger>
                      <MenuPopup align="end">
                        <MenuItem
                          onClick={() => {
                            if (group)
                              void navigate({
                                to: "/project/$projectKey",
                                params: { projectKey: group.projectKey },
                              });
                          }}
                        >
                          Project overview
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            if (group)
                              void navigate({
                                to: "/settings/projects",
                                search: { project: group.projectKey },
                              });
                          }}
                        >
                          Manage project
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </div>
                  <Link
                    to="/$environmentId/$threadId"
                    params={{ environmentId: thread.environmentId, threadId: thread.id }}
                    data-project-card-open=""
                    className="flex flex-1 flex-col px-5 pb-5 pt-5 focus-visible:outline-ring"
                  >
                    <h2 className="line-clamp-2 text-xl leading-snug group-hover:text-(--oc-project-link)">
                      {displayText(assignment.title)}
                    </h2>
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                      {displayText(assignment.brief) ||
                        "Continue the conversation and review your Marshal’s work."}
                    </p>
                    <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 font-mono text-2xs text-muted-foreground">
                      <span
                        className={`size-1.5 rounded-full ${thread.interactionMode === "plan" && thread.hasActionableProposedPlan ? "bg-(--oc-ginkgo)" : PROJECT_STATUS[status].color}`}
                      />
                      <span>
                        {assignment.status === "completed"
                          ? "Complete"
                          : thread.interactionMode === "plan" && thread.hasActionableProposedPlan
                            ? "Plan ready for review"
                            : status === "complete"
                              ? "Ready to close"
                              : PROJECT_STATUS[status].label}
                      </span>
                      <ArrowUpRightIcon className="ml-auto size-3.5" />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}
        {tab === "projects" ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const count = assignments.filter((assignment) =>
                group.memberProjects.some(
                  (project) =>
                    project.environmentId === assignment.project.environmentId &&
                    project.id === assignment.project.id,
                ),
              ).length;
              return (
                <Link
                  key={group.projectKey}
                  to="/project/$projectKey"
                  params={{ projectKey: group.projectKey }}
                  className="group min-w-0 rounded-xl border border-border bg-card p-6 hover:border-(--oc-collar) focus-visible:outline-ring"
                >
                  <FolderIcon className="mb-6 size-6 text-muted-foreground" />
                  <h2 className="text-xl group-hover:text-(--oc-project-link)">
                    {group.displayName}
                  </h2>
                  <p className="mt-3 line-clamp-2 break-all font-mono text-2xs leading-relaxed text-muted-foreground">
                    Shared workspace context
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 font-mono text-2xs text-muted-foreground">
                    <span>
                      {count} {count === 1 ? "assignment" : "assignments"}
                    </span>
                    <ArrowUpRightIcon className="size-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
        {tab === "ops" ? (
          <div className="mt-8 space-y-6">
            {groups.map((group) => (
              <ProjectOperations key={group.projectKey} group={group} />
            ))}
          </div>
        ) : null}
        {tab === "assignments" && !assignments.length ? (
          <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
            <h2 className="text-xl">Give your next task a Marshal</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Choose a project and describe the outcome. Review a plan before work begins.
            </p>
          </div>
        ) : null}
        {tab === "projects" && !groups.length ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Add a project to set up your working area.
          </p>
        ) : null}
        {tab === "ops" ? (
          <p className="mt-6 font-mono text-2xs text-muted-foreground">
            {connected.length} machines connected
          </p>
        ) : null}
      </div>
      <CreateAssignmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
