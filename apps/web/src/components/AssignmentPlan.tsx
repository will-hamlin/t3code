import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { useAtomValue } from "@effect/atom-react";
import { serverEnvironment } from "../state/server";
import { useEnvironmentThread } from "../state/threads";
import { useQuietThreadProjection } from "../state/entities";
import { displayText } from "../lib/displayText";
import { useAssignmentCompletion } from "../hooks/useAssignmentCompletion";
import type { Assignment } from "../hooks/useAssignments";
import {
  deriveLatestContextWindowSnapshot,
  latestProviderTurnTokenUsage,
} from "../lib/contextWindow";
import { SidebarContextReporter } from "./sidebar/SidebarContextBar";
import { MarshalIcon } from "./MarshalIcon";
import { Button } from "./ui/button";
import { MarshalBriefing, MarshalConversation } from "./MarshalConversation";
import { deriveAssignmentProgress } from "./AssignmentPlan.logic";
export function AssignmentPlan({
  assignment,
  thread,
  cwd,
}: {
  assignment: Assignment;
  thread: EnvironmentThreadShell;
  cwd: string;
}) {
  useEnvironmentThread(thread.environmentId, thread.id);
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const projection = useQuietThreadProjection(threadRef)?.projection ?? null;
  const progress = deriveAssignmentProgress(projection, thread);
  const completed =
    assignment.status === "completed" ||
    (progress.percent === 100 && thread.latestRun?.status === "completed");
  const providerThread = projection?.providerThreads.find(
    (entry) => entry.id === projection.thread.activeProviderThreadId,
  );
  const context = deriveLatestContextWindowSnapshot(
    projection?.visibleTurnItems ?? [],
    latestProviderTurnTokenUsage(projection?.providerTurns ?? [], projection, providerThread),
    providerThread,
  );
  const finishAssignment = useAssignmentCompletion();
  const canManage = useAtomValue(
    serverEnvironment.updateSettings.permissionAtom(thread.environmentId),
  );
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const running = ["preparing", "starting", "queued", "running", "waiting"].includes(
    thread.latestRun?.status ?? "",
  );
  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <SidebarContextReporter threadRef={threadRef} percent={context?.usedPercentage ?? null} />
      <div className="flex items-center gap-4">
        <MarshalIcon name={assignment.marshalAgent} className="size-20" />
        <div className="min-w-0">
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            Marshal {assignment.marshalAgent}
          </p>
          <h3 className="text-xl">
            <Link
              data-project-card-open=""
              to="/$environmentId/$threadId"
              params={{ environmentId: thread.environmentId, threadId: thread.id }}
              className="hover:text-(--oc-project-link) focus-visible:outline-ring"
            >
              {displayText(assignment.title)}
            </Link>
          </h3>
          <p className="mt-2 font-mono text-2xs text-muted-foreground">
            {assignment.status === "completed"
              ? "Assignment complete · Marshal available"
              : "Marshal reserved for this assignment"}
          </p>
        </div>
      </div>
      <ol
        aria-label="Assignment progress"
        className="my-6 flex gap-3 border-y border-border py-4 text-xs"
      >
        {["Request received", "Marshal working", "Report back"].map((label, index) => (
          <li
            key={label}
            className={
              index === (completed ? 2 : 1)
                ? "flex-1 text-(--oc-ginkgo)"
                : "flex-1 text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <p className="mb-5 text-sm text-muted-foreground">{displayText(assignment.brief)}</p>
      <section aria-label={completed ? "Final report" : "Work in progress"}>
        {completed ? (
          <MarshalBriefing thread={thread} cwd={cwd} />
        ) : (
          <>
            <div className="flex justify-between gap-3 text-xs">
              <span>{progress.label}</span>
              <span className="font-mono text-muted-foreground">
                {progress.percent === null ? "Awaiting milestone updates" : `${progress.percent}%`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${assignment.title} execution progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent ?? undefined}
              aria-valuetext={progress.label}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-(--oc-ginkgo) transition-[width] motion-reduce:transition-none"
                style={{ width: `${progress.percent ?? 0}%` }}
              />
            </div>
            {progress.steps.length ? (
              <ol aria-label="Execution milestones" className="mt-5">
                {progress.steps.map((step) => (
                  <li
                    key={step.id}
                    className="relative flex gap-3 border-l border-border pb-4 pl-4 text-sm last:pb-0"
                  >
                    <span
                      aria-hidden
                      className={`absolute -left-[3px] top-1.5 size-1.5 rounded-full ${step.status === "completed" ? "bg-(--oc-ginkgo)" : step.status === "running" ? "bg-(--oc-file-relevant)" : "bg-muted-foreground/50"}`}
                    />
                    <span className="min-w-0 flex-1">{displayText(step.text)}</span>
                    <span className="font-mono text-2xs text-muted-foreground">
                      {step.status === "completed"
                        ? "Done"
                        : step.status === "running"
                          ? "Now"
                          : "Next"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                The Marshal will publish milestones when execution begins.
              </p>
            )}
          </>
        )}
      </section>
      <MarshalConversation
        thread={thread}
        marshal={assignment.marshalAgent}
        cwd={cwd}
        running={running}
      />
      {assignment.brief ? (
        <div className="mt-5 flex justify-end">
          <Button
            size="xs"
            variant="outline"
            disabled={!canManage || running || busy}
            onClick={() => {
              if (inFlight.current) return;
              inFlight.current = true;
              setBusy(true);
              void finishAssignment(
                { environmentId: thread.environmentId, projectId: thread.projectId },
                thread.id,
                assignment.status !== "completed",
              )
                .catch((cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : "Could not update assignment."),
                )
                .finally(() => {
                  inFlight.current = false;
                  setBusy(false);
                });
            }}
          >
            {assignment.status === "completed" ? "Reopen assignment" : "End assignment"}
          </Button>
        </div>
      ) : null}
      {thread.runtime?.lastError ? (
        <p className="mt-3 text-sm text-error">{displayText(thread.runtime.lastError)}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {displayText(error)}
        </p>
      ) : null}
    </article>
  );
}
