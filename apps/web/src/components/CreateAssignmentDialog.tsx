import { useState } from "react";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { MarshalName, ScopedProjectRef } from "@t3tools/contracts";
import { useEnvironmentProviders } from "../state/environments";
import { useProjects } from "../state/entities";
import { useAssignments, useCreateAssignment } from "../hooks/useAssignments";
import { PROJECT_ORCHESTRATORS } from "../lib/projectOrchestrators";
import { MarshalIcon } from "./MarshalIcon";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "./ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "./ui/select";
import { Textarea } from "./ui/textarea";

export function CreateAssignmentDialog({
  open,
  onOpenChange,
  projectRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRef?: ScopedProjectRef | undefined;
}) {
  const projects = useProjects().filter((entry) => entry.archivedAt === null);
  const [selected, setSelected] = useState(
    projectRef ? `${projectRef.environmentId}:${projectRef.projectId}` : "",
  );
  const [marshal, setMarshal] = useState<MarshalName>("Davout");
  const [brief, setBrief] = useState("");
  const assignments = useAssignments();
  const occupied = new Set(
    assignments.filter((entry) => entry.status !== "completed").map((entry) => entry.marshalAgent),
  );
  const selectedMarshal = !occupied.has(marshal)
    ? marshal
    : PROJECT_ORCHESTRATORS.find(({ name }) => !occupied.has(name))?.name;
  const { submit, busy, error } = useCreateAssignment();
  const [model, setModel] = useState("");
  const providersByEnvironment = useEnvironmentProviders();
  const project = projects.find((entry) => `${entry.environmentId}:${entry.id}` === selected);
  const providers = project ? (providersByEnvironment.get(project.environmentId) ?? []) : [];
  const models = providers
    .filter((provider) => provider.enabled)
    .flatMap((provider) =>
      provider.models.map((entry) => ({
        key: `${provider.instanceId}:${entry.slug}`,
        label: `${provider.displayName ?? provider.driver} · ${entry.name ?? entry.slug}`,
        selection: { instanceId: provider.instanceId, model: entry.slug },
      })),
    );
  const selectedModel = models.find((entry) => entry.key === model);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogPopup>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (project && selectedMarshal)
              void submit(
                scopeProjectRef(project.environmentId, project.id),
                selectedMarshal,
                brief,
                selectedModel?.selection,
              ).then((success) => {
                if (success) {
                  setBrief("");
                  onOpenChange(false);
                }
              });
          }}
        >
          <DialogHeader>
            <DialogTitle>New assignment</DialogTitle>
            <DialogDescription>
              Describe what you want implemented. Choose a project and orchestrator, and they’ll
              take it from here.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="assignment-project" className="text-sm">
                  Project
                </label>
                <Select
                  value={selected}
                  onValueChange={(value) => {
                    if (value) setSelected(value);
                  }}
                  disabled={busy}
                >
                  <SelectTrigger id="assignment-project" aria-label="Project">
                    <SelectValue>{project?.title ?? "Select a project"}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    {projects.map((entry) => (
                      <SelectItem
                        key={`${entry.environmentId}:${entry.id}`}
                        value={`${entry.environmentId}:${entry.id}`}
                      >
                        {entry.title}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-marshal" className="text-sm">
                  Orchestrator
                </label>
                <Select
                  value={selectedMarshal ?? ""}
                  onValueChange={(value) => {
                    if (value) {
                      const candidate = PROJECT_ORCHESTRATORS.find(({ name }) => name === value);
                      if (candidate) setMarshal(candidate.name);
                    }
                  }}
                  disabled={busy}
                >
                  <SelectTrigger id="assignment-marshal" aria-label="Orchestrator">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <MarshalIcon name={selectedMarshal} className="size-6" />
                        {selectedMarshal
                          ? `Orchestrator ${PROJECT_ORCHESTRATORS.findIndex((entry) => entry.name === selectedMarshal) + 1}`
                          : "All orchestrators are assigned"}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    {PROJECT_ORCHESTRATORS.map(({ name }) => (
                      <SelectItem key={name} value={name} disabled={occupied.has(name)}>
                        <span className="flex items-center gap-2">
                          <MarshalIcon name={name} className="size-6" />
                          Orchestrator{" "}
                          {PROJECT_ORCHESTRATORS.findIndex((entry) => entry.name === name) + 1}
                          {occupied.has(name) ? " · Assigned" : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-brief" className="text-sm">
                  What should this assignment accomplish?
                </label>
                <Textarea
                  id="assignment-brief"
                  value={brief}
                  disabled={busy}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Describe the outcome, constraints, and what success looks like…"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-model" className="text-sm">
                  Model
                </label>
                <Select
                  value={selectedModel?.key ?? "default"}
                  onValueChange={(value) => setModel(value ?? "")}
                  disabled={busy || !project}
                >
                  <SelectTrigger id="assignment-model" aria-label="Model">
                    <SelectValue>{selectedModel?.label ?? "Project default"}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="default">Project default</SelectItem>
                    {models.map((entry) => (
                      <SelectItem key={entry.key} value={entry.key}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !project || !selectedMarshal || !brief.trim()}>
              {busy ? "Initializing…" : "Start assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
