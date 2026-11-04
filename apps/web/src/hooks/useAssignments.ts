import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type {
  ModelSelection,
  MarshalName,
  ScopedProjectRef,
  ProjectSettingsOverrides,
  ThreadId,
} from "@t3tools/contracts";
import { projectThreadStatus } from "../components/ProjectDashboard.logic";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { useEnvironments } from "../state/environments";
import { useProjects, useQuietThreadShells } from "../state/entities";
import { serverEnvironment } from "../state/server";
import { threadEnvironment } from "../state/threads";
import { useAtomCommand } from "../state/use-atom-command";
import { useOrchestrationCommand } from "../state/use-orchestration-command";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { newThreadId, newMessageId } from "../lib/utils";
import { resolveProjectDefaultProviderModelSelection } from "../providerInstances";
import { useComposerDraftStore } from "../composerDraftStore";

export type Assignment = NonNullable<ProjectSettingsOverrides["assignments"]>[ThreadId];

export function useAssignments() {
  const projects = useProjects();
  const threads = useQuietThreadShells();
  const { environments } = useEnvironments();
  return threads
    .filter((thread) => thread.archivedAt === null && !thread.lineage.parentThreadId)
    .flatMap((thread) => {
      const project = projects.find(
        (entry) =>
          entry.environmentId === thread.environmentId &&
          entry.id === thread.projectId &&
          entry.archivedAt === null,
      );
      if (!project) return [];
      const overrides = environments.find((entry) => entry.environmentId === thread.environmentId)
        ?.serverConfig?.settings.projectSettingsOverrides[project.id];
      const assignment =
        overrides?.assignments?.[thread.id] ??
        (overrides?.marshalAgent
          ? {
              title: thread.title,
              brief: "",
              marshalAgent: overrides.marshalAgent,
              status:
                projectThreadStatus(thread) === "complete" && !thread.hasActionableProposedPlan
                  ? ("completed" as const)
                  : ("active" as const),
            }
          : null);
      return assignment ? [{ ...assignment, project, thread }] : [];
    });
}

export function useCreateAssignment() {
  const create = useOrchestrationCommand(threadEnvironment.create, { reportFailure: false });
  const start = useOrchestrationCommand(threadEnvironment.startTurn, { reportFailure: false });
  const update = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: false });
  const projects = useProjects();
  const { environments } = useEnvironments();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const pending = useRef<{ key: string; threadId: ThreadId } | null>(null);
  const remove = useOrchestrationCommand(threadEnvironment.delete, { reportFailure: false });
  const [error, setError] = useState<string | null>(null);
  const assignments = useAssignments();
  const submit = async (
    projectRef: ScopedProjectRef,
    marshal: MarshalName,
    brief: string,
    modelSelection?: ModelSelection,
  ) => {
    if (inFlight.current || !brief.trim()) return false;
    if (
      assignments.some((entry) => entry.marshalAgent === marshal && entry.status !== "completed") &&
      !pending.current
    ) {
      setError(
        "This Marshal already has an active assignment. Choose another or finish that assignment first.",
      );
      return false;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const project = projects.find(
        (entry) =>
          entry.environmentId === projectRef.environmentId && entry.id === projectRef.projectId,
      );
      const config = environments.find(
        (entry) => entry.environmentId === projectRef.environmentId,
      )?.serverConfig;
      if (!config || !project) throw new Error("Connect to the project machine first.");
      const settings = resolveProjectSettings(config.settings, project.id, project).settings;
      const selection =
        modelSelection ??
        settings.defaultModelSelection ??
        resolveProjectDefaultProviderModelSelection(
          appAtomRegistry.get(serverEnvironment.providersValueAtom(projectRef.environmentId)) ?? [],
          config.settings,
          project.id,
        );
      if (!selection)
        throw new Error("Connect a model provider in Settings before drafting a plan.");
      const key = JSON.stringify([
        projectRef.environmentId,
        projectRef.projectId,
        marshal,
        brief.trim(),
      ]);
      const existing = pending.current?.key === key ? pending.current : null;
      const threadId = existing?.threadId ?? newThreadId();
      const createdAt = new Date().toISOString();
      const title = brief.trim().split("\n")[0]!.slice(0, 100);
      if (!existing) {
        const created = await create({
          environmentId: projectRef.environmentId,
          input: {
            threadId,
            projectId: project.id,
            title,
            modelSelection: selection,
            runtimeMode: settings.defaultRuntimeMode,
            interactionMode: "default",
            branch: null,
            worktreePath: null,
            createdAt,
          },
        });
        if (created._tag === "Failure") throw squashAtomCommandFailure(created);
        const current =
          appAtomRegistry.get(serverEnvironment.settingsValueAtom(projectRef.environmentId))
            ?.projectSettingsOverrides[project.id] ?? {};
        const saved = await update({
          environmentId: projectRef.environmentId,
          input: {
            patch: {
              projectSettingsOverrides: {
                [project.id]: {
                  ...current,
                  assignments: {
                    ...current.assignments,
                    [threadId]: {
                      title,
                      brief: brief.trim(),
                      marshalAgent: marshal,
                      status: "active",
                    },
                  },
                },
              },
            },
          },
        });
        if (saved._tag === "Failure") {
          await remove({ environmentId: projectRef.environmentId, input: { threadId } });
          throw squashAtomCommandFailure(saved);
        }
        pending.current = { key, threadId };
      }
      const started = await start({
        environmentId: projectRef.environmentId,
        input: {
          threadId,
          message: {
            messageId: newMessageId(),
            role: "user",
            text: `You are Marshal ${marshal}, responsible for this assignment in project ${project.title}.\n\n${brief.trim()}\n\nBegin implementation now. Make a concise working plan, delegate bounded subtasks to subagents, integrate and verify their results, and report back when finished. Publish and maintain structured progress using the task-plan tool. Keep only the goal, plan, essential decisions and a short status checkpoint in your context. Ask only when genuinely blocked; no proposal or plan approval is required.`,
            attachments: [],
          },
          modelSelection: selection,
          titleSeed: title,
          runtimeMode: settings.defaultRuntimeMode,
          interactionMode: "default",
          createdAt,
        },
      });
      if (started._tag === "Failure") throw squashAtomCommandFailure(started);
      useComposerDraftStore
        .getState()
        .setInteractionMode(scopeThreadRef(projectRef.environmentId, threadId), "default");
      pending.current = null;
      await navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: projectRef.environmentId, threadId },
      });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not initialize the assignment.");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { submit, busy, error };
}
