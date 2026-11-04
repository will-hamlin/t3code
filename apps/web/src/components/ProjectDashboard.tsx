import "../styles/overcast-dashboard.css";
import { useEffect, useState } from "react";
import { FolderTreeIcon } from "lucide-react";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import type { DraftId } from "../composerDraftStore";
import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useStableCallback } from "../hooks/useStableCallback";
import { useProjects } from "../state/entities";
import { openCommandPalette } from "../commandPaletteBus";
import { isElectron } from "../env";
import { Button } from "./ui/button";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

import ChatView from "./ChatView";
import { ProjectFolderTree } from "./ProjectFolderTree";

export function ProjectDashboard({ projectKey }: { projectKey?: string }) {
  const groups = useSidebarProjectGroups();
  const group = groups.find((entry) => entry.projectKey === projectKey);
  const projects = useProjects().filter(
    (project) =>
      project.archivedAt === null &&
      (!projectKey ||
        group?.memberProjects.some(
          (member) => member.id === project.id && member.environmentId === project.environmentId,
        )),
  );
  const [selection, setSelection] = useState("");
  const project =
    projects.find((entry) => `${entry.environmentId}:${entry.id}` === selection) ?? projects[0];
  const key = project ? `${project.environmentId}:${project.id}` : "";
  const [draft, setDraft] = useState<{
    key: string;
    draftId: DraftId;
    threadId: ThreadId;
    environmentId: EnvironmentId;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState(false);
  const createDraft = useStableCallback(useNewThreadHandler());
  const environmentId = project?.environmentId;
  const projectId = project?.id;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- prepares the native draft store for the selected dashboard workspace and preserves drafts across project switches
  useEffect(() => {
    if (!environmentId || !projectId) return;
    let active = true;
    void createDraft(scopeProjectRef(environmentId, projectId), { navigate: false })
      .then((result) => {
        if (active && result) {
          setError(null);
          setDraft({ ...result, key, environmentId });
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Unable to open a chat draft.");
      });
    return () => {
      active = false;
    };
  }, [createDraft, environmentId, projectId, key]);
  return (
    <main
      data-overcast-dashboard=""
      className="scrollbar-gutter-both flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto bg-background"
    >
      <WorkspacePageHeader electron={isElectron} className="relative">
        <h1
          aria-current="page"
          className="absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate text-sm font-medium"
        >
          {projectKey ? (group?.displayName ?? "Project") : "Home"}
        </h1>
      </WorkspacePageHeader>
      {projectKey && project ? (
        <div className="flex shrink-0 justify-end border-b border-border px-4 py-2">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={files}
            aria-controls="project-files-panel"
            onClick={() => setFiles(!files)}
          >
            <FolderTreeIcon className="size-4" />
            {files ? "Hide files" : "Project files"}
          </Button>
        </div>
      ) : null}
      {projectKey && files && project ? (
        <div id="project-files-panel">
          <ProjectFolderTree
            key={key}
            environmentId={project.environmentId}
            cwd={project.workspaceRoot}
          />
        </div>
      ) : null}
      <div className="relative flex min-h-[480px] flex-1 flex-col [&>div]:!h-full [&>div]:min-h-[480px]">
        {draft?.key === key ? (
          <ChatView
            key={draft.draftId}
            routeKind="draft"
            environmentId={draft.environmentId}
            threadId={draft.threadId}
            draftId={draft.draftId}
            composerProjectSelector={
              <label className="flex max-w-full items-center gap-2 text-xs text-muted-foreground">
                In
                <select
                  aria-label="Chat project"
                  value={key}
                  onChange={(event) => setSelection(event.target.value)}
                  className="max-w-[min(15rem,60vw)] rounded-md border border-border bg-background px-3 py-2 text-foreground"
                >
                  {!projects.length ? <option value="">No project available</option> : null}
                  {projects.map((entry) => (
                    <option
                      key={`${entry.environmentId}:${entry.id}`}
                      value={`${entry.environmentId}:${entry.id}`}
                    >
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
            }
            forceExpandedMobileComposer
          />
        ) : (
          <div className="m-auto flex flex-col items-center gap-4 p-10 text-center">
            <p className="mt-3 text-sm text-muted-foreground">
              {error ??
                (project ? "Opening your composer…" : "Add a project to start a conversation.")}
            </p>
            {!project ? (
              <Button size="sm" onClick={() => openCommandPalette({ open: "add-project" })}>
                Add project
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
