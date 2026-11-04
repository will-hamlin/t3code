import type { PlanId } from "@t3tools/contracts";
import type { Assignment } from "../hooks/useAssignments";
import type { EnvironmentThreadShell, ThreadStructure } from "@t3tools/client-runtime/state/shell";
import { findLatestProposedPlan } from "../session-logic";

export function deriveAssignmentProgress(
  projection: ThreadStructure | null,
  thread: Pick<EnvironmentThreadShell, "interactionMode" | "latestRun" | "runtime">,
  approvedPlanId?: PlanId,
) {
  const artifact = approvedPlanId
    ? projection?.plans.find(
        (entry) => entry.id === approvedPlanId && entry.kind === "proposed_plan",
      )
    : undefined;
  const plan =
    artifact?.kind === "proposed_plan"
      ? { id: artifact.id, status: artifact.status, planMarkdown: artifact.markdown }
      : findLatestProposedPlan(projection, null);
  const implementation = plan
    ? projection?.runs.find((run) => run.sourcePlanRef?.planId === plan.id)
    : undefined;
  const approved =
    thread.interactionMode === "default" ||
    implementation !== undefined ||
    plan?.status === "completed";
  const executionRunIds = new Set(
    implementation
      ? projection?.runs.filter((run) => run.ordinal >= implementation.ordinal).map((run) => run.id)
      : [],
  );
  const todos = projection?.plans
    .filter(
      (entry) =>
        entry.kind === "todo_list" &&
        entry.status !== "superseded" &&
        entry.runId !== null &&
        (thread.interactionMode === "default" || executionRunIds.has(entry.runId)),
    )
    .at(-1);
  const todoItem = todos
    ? projection?.turnItems.findLast(
        (item) => item.type === "todo_list" && item.planId === todos.id,
      )
    : undefined;
  const reportedSteps =
    todoItem?.type === "todo_list"
      ? todoItem.steps
      : todos?.kind === "todo_list"
        ? todos.steps
        : [];
  const proposedSteps = (
    plan?.planMarkdown.split(/\r?\n/).flatMap((line, index) => {
      const match = /^\s*\d+[.)]\s+(.+)/.exec(line);
      return match
        ? [
            {
              id: `proposed-${index}`,
              text: match[1]!.replaceAll("**", "").replaceAll("`", ""),
              status: "pending" as const,
            },
          ]
        : [];
    }) ?? []
  ).slice(0, 12);
  const steps = reportedSteps.length ? reportedSteps : proposedSteps;
  const completed = steps.filter((step) => step.status === "completed").length;
  const percent = reportedSteps.length
    ? Math.round((completed / reportedSteps.length) * 100)
    : null;
  const running = ["preparing", "starting", "queued", "running", "waiting"].includes(
    thread.runtime?.status ?? "",
  );
  const label = approved
    ? percent === 100
      ? "Work verified"
      : running
        ? "Orchestrator working"
        : implementation?.status === "completed"
          ? "Execution finished"
          : "Implementation paused"
    : plan?.status === "active" && !running
      ? "Plan ready for review"
      : running
        ? "Orchestrator working"
        : "Waiting for progress updates";
  return { steps, percent, label, stage: approved ? 3 : plan ? 2 : 1 };
}

export function deriveAssignmentPhases(
  assignment: Assignment,
  projection: ThreadStructure | null,
  thread: Pick<EnvironmentThreadShell, "interactionMode" | "latestRun" | "runtime">,
) {
  const workflow = assignment.workflow;
  const progress = deriveAssignmentProgress(
    projection,
    thread,
    workflow?.phase === "execution" ? workflow.plan.planId : undefined,
  );
  const latestPlan = findLatestProposedPlan(projection, null);
  const executing = workflow ? workflow.phase === "execution" : progress.stage === 3;
  const active =
    projection?.runs.some((run) =>
      ["preparing", "starting", "queued", "running", "waiting"].includes(run.status),
    ) ?? false;
  const pending =
    projection?.subagents.some((agent) =>
      ["idle", "pending", "running", "waiting"].includes(agent.status),
    ) ?? false;
  const blocked =
    projection?.runtimeRequests.some((request) => request.status === "pending") ?? false;
  const finished =
    executing &&
    progress.percent === 100 &&
    !active &&
    !pending &&
    !blocked &&
    !thread.runtime?.lastError &&
    thread.latestRun?.status !== "failed";
  const unlocked = finished
    ? 3
    : executing
      ? 2
      : workflow?.phase === "plan" || (!workflow && latestPlan)
        ? 1
        : 0;
  const phase = executing ? 2 : workflow?.phase === "plan" || !workflow ? 1 : 0;
  const draft =
    phase === 1 && workflow?.phase === "plan" && latestPlan?.id === workflow.proposal.planId
      ? null
      : latestPlan;
  return { progress, unlocked, phase, draft, finished };
}
