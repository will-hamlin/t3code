import { useAssignProjectMarshal } from "../hooks/useProjectMarshal";
import { MarshalIcon } from "./MarshalIcon";
import "../styles/overcast-dashboard.css";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  scopedThreadKey,
  scopeProjectRef,
  scopeThreadRef,
} from "@t3tools/client-runtime/environment";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { openCommandPalette } from "../commandPaletteBus";
import { isElectron } from "../env";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { workspaceAreaProps } from "../lib/workspaceFocus";
import {
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useQuietThreadShells,
  useHiddenThreadKeys,
} from "../state/entities";
import { useConnectedEnvironmentIds, useEnvironments } from "../state/environments";
import {
  PROJECT_STATUS,
  projectThreadPriority,
  projectThreadStatus,
} from "./ProjectDashboard.logic";
import { Button } from "./ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuTrigger,
} from "./ui/menu";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

import { PROJECT_ORCHESTRATORS } from "../lib/projectOrchestrators";

export function ProjectDashboard() {
  const assignMarshal = useAssignProjectMarshal();
  const [assigning, setAssigning] = useState<string | null>(null);
  const projects = useProjects().filter((project) => project.archivedAt === null);
  const threads = useQuietThreadShells();
  const hiddenThreads = useHiddenThreadKeys();
  const bootstrapped = useAllEnvironmentShellsBootstrapped();
  const connected = useConnectedEnvironmentIds();
  const { environments } = useEnvironments();
  const handleNewThread = useNewThreadHandler();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const threadsByProject = new Map<string, EnvironmentThreadShell[]>();
  for (const thread of threads) {
    if (
      thread.archivedAt !== null ||
      hiddenThreads.has(scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id)))
    )
      continue;
    const key = `${thread.environmentId}:${thread.projectId}`;
    const group = threadsByProject.get(key);
    if (group) group.push(thread);
    else threadsByProject.set(key, [thread]);
  }
  const cards = projects
    .map((project) => {
      const projectThreads = (
        threadsByProject.get(`${project.environmentId}:${project.id}`) ?? []
      ).toSorted(projectThreadPriority);
      const thread = projectThreads[0];
      const online = connected.includes(project.environmentId);
      const status = !online ? "offline" : thread ? projectThreadStatus(thread) : "ready";
      const environment = environments.find((item) => item.environmentId === project.environmentId);
      const machine =
        environment?.serverConfig?.environment.label ?? environment?.label ?? "Unknown machine";
      const orchestrator =
        environment?.serverConfig?.settings.projectSettingsOverrides[project.id]?.marshalAgent ??
        "No agent yet";
      return {
        project,
        thread,
        status,
        orchestrator,
        machine,
        key: `${project.environmentId}:${project.id}`,
      } as const;
    })
    .sort(
      (a, b) =>
        PROJECT_STATUS[a.status].priority - PROJECT_STATUS[b.status].priority ||
        a.project.title.localeCompare(b.project.title),
    );
  const attention = cards.filter(({ status }) =>
    ["approval", "input", "request", "failed", "limited"].includes(status),
  ).length;
  const working = cards.filter(({ status }) => status === "working").length;

  return (
    <main
      data-overcast-dashboard=""
      {...workspaceAreaProps("home", 1, "Projects")}
      role="main"
      className="relative flex w-full min-w-0 flex-1 flex-col h-dvh min-h-0 overflow-y-auto bg-background text-foreground scrollbar-gutter-both"
    >
      <WorkspacePageHeader electron={isElectron}>
        <span className="font-mono text-xs font-medium tracking-(--oc-tracking-label)">
          T3 Code
        </span>
        <div className="ml-auto [-webkit-app-region:no-drag]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => void navigate({ to: "/settings/general" })}
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      </WorkspacePageHeader>
      <div className="mx-auto w-full max-w-[1120px] px-6 py-8 sm:px-8 sm:py-16">
        <h1 className="relative font-(family-name:--oc-font-display) text-4xl font-light leading-none tracking-(--oc-tracking-display) before:absolute before:top-1 before:-left-5 before:h-8 before:w-[3px] before:bg-(--oc-ginkgo) sm:text-5xl">
          Projects
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-y border-border py-4 text-sm text-muted-foreground">
          <div>
            <Menu>
              <MenuTrigger render={<Button variant="text-muted" />}>
                <PlusIcon className="size-4 text-foreground" /> Add project
              </MenuTrigger>
              <MenuPopup align="end" variant="flat" data-overcast-dashboard="">
                <MenuGroup>
                  <MenuGroupLabel>Assign Marshal agent</MenuGroupLabel>
                  <MenuRadioGroup value={selectedAgent}>
                    {PROJECT_ORCHESTRATORS.map(({ name: agent }) => (
                      <MenuRadioItem
                        key={agent}
                        value={agent}
                        disabled={cards.some((card) => card.orchestrator === agent)}
                        closeOnClick
                        onClick={() => {
                          setSelectedAgent(agent);
                          openCommandPalette({ open: "add-project", marshalAgent: agent });
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <MarshalIcon name={agent} />
                          {agent}
                        </span>
                        <MenuRadioItemIndicator />
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
              </MenuPopup>
            </Menu>
          </div>
          <span>
            <strong className="font-mono font-normal text-foreground">{cards.length}</strong>{" "}
            projects
          </span>
          <span>
            <strong className="font-mono font-normal text-(--oc-ginkgo)">{working}</strong> working
          </span>
          <span>
            <strong className="font-mono font-normal text-foreground">{attention}</strong> need your
            attention
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ project, thread, status, orchestrator, machine, key }) => (
            <div
              key={key}
              className={`flex min-w-0 flex-col rounded-xs border bg-background ${PROJECT_STATUS[status].border}`}
            >
              <button
                type="button"
                disabled={opening !== null}
                aria-label={`Open ${project.title}: ${PROJECT_STATUS[status].label}`}
                className={`group flex min-h-44 min-w-0 cursor-pointer flex-col rounded-xs bg-background px-4 py-6 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60 motion-reduce:transition-none`}
                onClick={() => {
                  setError(null);
                  if (thread) {
                    void navigate({
                      to: "/$environmentId/$threadId",
                      params: { environmentId: thread.environmentId, threadId: thread.id },
                    });
                    return;
                  }
                  setOpening(key);
                  void handleNewThread(scopeProjectRef(project.environmentId, project.id))
                    .then((result) => {
                      if (result === null)
                        setError("Couldn’t open this project. Please try again.");
                    })
                    .catch(() => setError("Couldn’t open this project. Please try again."))
                    .finally(() => setOpening(null));
                }}
              >
                <h2 className="w-full truncate font-(family-name:--oc-font-display) text-xl font-normal tracking-(--oc-tracking-title) group-hover:text-foreground">
                  {project.title}
                </h2>
                <div className="mt-2 flex w-full items-center gap-2 text-sm text-muted-foreground">
                  <MarshalIcon name={orchestrator} className="size-4 shrink-0" />
                  <span className="line-clamp-2 break-words">{orchestrator}</span>
                </div>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p>
                    Current task:{" "}
                    {thread?.title && thread.title !== "New thread"
                      ? thread.title
                      : "Awaiting your first task"}
                  </p>
                  <p>
                    Progress:{" "}
                    {status === "ready" ? "No work started yet" : PROJECT_STATUS[status].label}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className={`size-1.5 ${PROJECT_STATUS[status].color}`} />
                  <span>{opening === key ? "Opening…" : PROJECT_STATUS[status].label}</span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Running on {machine}</div>
              </button>
              <div className="border-t border-border px-4 py-2">
                <Menu>
                  <MenuTrigger
                    render={<Button variant="text-muted" disabled={assigning !== null} />}
                  >
                    {assigning === key ? "Assigning…" : "Assign Marshal agent"}
                  </MenuTrigger>
                  <MenuPopup align="start" variant="flat">
                    <MenuRadioGroup value={orchestrator}>
                      {PROJECT_ORCHESTRATORS.map(({ name }) => (
                        <MenuRadioItem
                          key={name}
                          value={name}
                          closeOnClick
                          disabled={cards.some(
                            (card) => card.key !== key && card.orchestrator === name,
                          )}
                          onClick={() => {
                            setError(null);
                            setAssigning(key);
                            void assignMarshal(
                              scopeProjectRef(project.environmentId, project.id),
                              name,
                            )
                              .catch((cause: unknown) =>
                                setError(
                                  cause instanceof Error
                                    ? cause.message
                                    : "Could not assign Marshal.",
                                ),
                              )
                              .finally(() => setAssigning(null));
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <MarshalIcon name={name} />
                            {name}
                          </span>
                          <MenuRadioItemIndicator />
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                  </MenuPopup>
                </Menu>
              </div>
            </div>
          ))}
        </div>
        {cards.length === 0 ? (
          <div className="rounded-xs border-y border-border px-6 py-16 text-center">
            <h2 className="text-lg font-medium">
              {bootstrapped ? "A home for your next idea" : "Loading your projects…"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {bootstrapped
                ? "Add your first project to get started."
                : "Connecting to your workspace."}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
