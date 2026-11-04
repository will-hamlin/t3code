import { randomUUID } from "../lib/utils";
import { useDiscoveredPortsState } from "../portDiscoveryState";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "@effect/atom-react";
import { ActivityIcon, GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { ProjectSettingsOverrides } from "@t3tools/contracts";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { SidebarProjectSnapshot } from "../sidebarProjectGrouping";
import { useAssignments } from "../hooks/useAssignments";
import { useConnectedEnvironmentIds, useEnvironments } from "../state/environments";
import { serverEnvironment } from "../state/server";
import { useAtomCommand } from "../state/use-atom-command";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";
import { ThreadServersPanel } from "./chat/ThreadServersPanel";

type Deployment = NonNullable<ProjectSettingsOverrides["operations"]>["deployments"][number];
const STATES = ["unknown", "healthy", "deploying", "failed", "paused"] as const;

export function ProjectOperations({ group }: { group: SidebarProjectSnapshot }) {
  const project = group.memberProjects[0]!;
  const connected = useConnectedEnvironmentIds().includes(project.environmentId);
  const { environments } = useEnvironments();
  const config = environments.find(
    (entry) => entry.environmentId === project.environmentId,
  )?.serverConfig;
  const deployments =
    config?.settings.projectSettingsOverrides[project.id]?.operations?.deployments ?? [];
  const assignments = useAssignments().filter((assignment) =>
    group.memberProjects.some(
      (member) =>
        member.environmentId === assignment.project.environmentId &&
        member.id === assignment.project.id,
    ),
  );
  const ports = useDiscoveredPortsState(connected ? project.environmentId : null).servers;
  const runningServices = ports.filter((port) =>
    assignments.some(
      ({ thread }) => port.agent?.threadId === thread.id || port.terminal?.threadId === thread.id,
    ),
  );
  const update = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: false });
  const canManage = useAtomValue(
    serverEnvironment.updateSettings.permissionAtom(project.environmentId),
  );
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (next: readonly Deployment[]) => {
    if (saving) return false;
    setSaving(true);
    setError(null);
    try {
      const current =
        appAtomRegistry.get(serverEnvironment.settingsValueAtom(project.environmentId))
          ?.projectSettingsOverrides[project.id] ?? {};
      const result = await update({
        environmentId: project.environmentId,
        input: {
          patch: {
            projectSettingsOverrides: {
              [project.id]: { ...current, operations: { deployments: next } },
            },
          },
        },
      });
      if (result._tag === "Failure") throw squashAtomCommandFailure(result);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save deployment.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      aria-label={`${group.displayName} operations`}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <ActivityIcon className="size-5 text-muted-foreground" />
          <div>
            <Link
              to="/project/$projectKey"
              params={{ projectKey: group.projectKey }}
              className="text-xl hover:text-(--oc-project-link)"
            >
              {group.displayName}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {connected ? "Machine connected" : "Machine offline"}
            </p>
          </div>
        </div>
        <Link
          to="/settings/projects"
          search={{ project: group.projectKey }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Manage project
        </Link>
      </header>
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <h3 className="mb-4 font-mono text-xs text-muted-foreground">Services</h3>
          {runningServices.length ? (
            assignments.map(({ thread }) => (
              <ThreadServersPanel
                key={`${thread.environmentId}:${thread.id}`}
                environmentId={thread.environmentId}
                threadId={thread.id}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No services reported.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Running services appear here when started by an assignment. Open a preview or stop a
            service from its controls.
          </p>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-mono text-xs text-muted-foreground">Deployments</h3>
            <Button
              size="xs"
              variant="outline"
              disabled={!connected || !canManage || saving}
              onClick={() => setAdding(!adding)}
            >
              <PlusIcon />
              Add deployment
            </Button>
          </div>
          {!deployments.length && !adding ? (
            <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              No deployments configured. Add an environment and its deployment address to track its
              status.
            </p>
          ) : null}
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background p-4"
              >
                <GlobeIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{deployment.label}</p>
                  <a
                    href={/^https?:\/\//.test(deployment.url) ? deployment.url : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs text-(--oc-project-link)"
                  >
                    Open deployment ↗
                  </a>
                </div>
                <div className="w-36">
                  <Select
                    value={deployment.status}
                    disabled={!canManage || !connected || saving}
                    onValueChange={(value) => {
                      if (value)
                        void save(
                          deployments.map((entry) =>
                            entry.id === deployment.id
                              ? { ...entry, status: value, updatedAt: new Date().toISOString() }
                              : entry,
                          ),
                        );
                    }}
                  >
                    <SelectTrigger size="sm" aria-label={`Reported status for ${deployment.label}`}>
                      <SelectValue>
                        {deployment.status === "unknown" ? "Not reported" : deployment.status}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state === "unknown" ? "Not reported" : state}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove deployment ${deployment.label}`}
                  disabled={!canManage || saving}
                  onClick={() =>
                    void save(deployments.filter((entry) => entry.id !== deployment.id))
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
          {adding ? (
            <form
              className="mt-4 space-y-3 rounded-lg border border-border p-4"
              onSubmit={(event) => {
                event.preventDefault();
                let address: URL;
                try {
                  address = new URL(url);
                  if (
                    !["https:", "http:"].includes(address.protocol) ||
                    address.username ||
                    address.password
                  )
                    throw new Error();
                } catch {
                  setError("Enter a valid HTTP or HTTPS deployment address.");
                  return;
                }
                void save([
                  ...deployments,
                  {
                    id: randomUUID(),
                    label: label.trim(),
                    url: address.href,
                    status: "unknown",
                    updatedAt: new Date().toISOString(),
                  },
                ]).then((success) => {
                  if (success) {
                    setAdding(false);
                    setLabel("");
                    setUrl("");
                  }
                });
              }}
            >
              <Input
                aria-label={`Deployment name for ${group.displayName}`}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Environment name, e.g. Production"
                required
                disabled={saving}
              />
              <Input
                aria-label={`Deployment address for ${group.displayName}`}
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://your-app.example"
                required
                disabled={saving}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={saving || !label.trim() || !url.trim()}>
                  Save deployment
                </Button>
              </div>
            </form>
          ) : null}
          <p className="mt-4 text-2xs text-muted-foreground">
            Deployment status is reported manually. Opening a deployment does not change it.
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="px-6 pb-5 text-sm text-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
