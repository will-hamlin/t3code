import * as DateTime from "effect/DateTime";
import { describe, it, expect } from "vite-plus/test";
import { NodeId, PlanId, RunId, MessageId } from "@t3tools/contracts";
import { makeThreadFixture, makeThreadProjectionFixture } from "../test-fixtures";
import { deriveAssignmentProgress, deriveAssignmentPhases } from "./AssignmentPlan.logic";

describe("assignment plan progress", () => {
  it("unlocks phases only after their predecessor, never merely by ending an assignment", () => {
    const projection = makeThreadProjectionFixture();
    const thread = makeThreadFixture({ interactionMode: "plan", runtime: null });
    const assignment = {
      title: "Task",
      brief: "Goal",
      marshalAgent: "Ney" as const,
      status: "completed" as const,
    };
    const snapshot = { planId: PlanId.make("accepted"), markdown: "Scope" };
    expect(
      deriveAssignmentPhases({ ...assignment, workflow: { phase: "proposal" } }, projection, thread)
        .unlocked,
    ).toBe(0);
    expect(
      deriveAssignmentPhases(
        { ...assignment, workflow: { phase: "plan", proposal: snapshot } },
        projection,
        thread,
      ).unlocked,
    ).toBe(1);
    expect(
      deriveAssignmentPhases(
        { ...assignment, workflow: { phase: "execution", proposal: snapshot, plan: snapshot } },
        projection,
        thread,
      ).unlocked,
    ).toBe(2);
  });
  it("holds reported milestones until the proposed plan is approved", () => {
    const projection = makeThreadProjectionFixture();
    const thread = makeThreadFixture({ interactionMode: "plan", runtime: null });
    const proposed = {
      id: PlanId.make("proposal"),
      threadId: projection.thread.id,
      runId: null,
      nodeId: NodeId.make("proposal-node"),
      status: "active",
      kind: "proposed_plan",
      markdown: "# Plan\n1. Build\n2. Verify",
    } as const;
    const todo = {
      id: PlanId.make("tasks"),
      threadId: projection.thread.id,
      runId: null,
      nodeId: NodeId.make("tasks-node"),
      status: "active",
      kind: "todo_list",
      steps: [
        { id: "build", text: "Build", status: "completed" },
        { id: "verify", text: "Verify", status: "pending" },
      ],
    } as const;
    const execution = {
      id: RunId.make("execute"),
      threadId: projection.thread.id,
      ordinal: 2,
      providerInstanceId: projection.thread.providerInstanceId,
      modelSelection: projection.thread.modelSelection,
      providerThreadId: null,
      userMessageId: MessageId.make("approval"),
      rootNodeId: null,
      activeAttemptId: null,
      status: "running",
      requestedAt: DateTime.makeUnsafe("2026-11-04T00:00:00Z"),
      startedAt: null,
      completedAt: null,
      checkpointId: null,
      contextHandoffId: null,
      sourcePlanRef: { threadId: projection.thread.id, planId: proposed.id },
    } as const;
    const unapproved = deriveAssignmentProgress({ ...projection, plans: [proposed, todo] }, thread);
    expect(unapproved).toMatchObject({ label: "Plan ready for review", stage: 2, percent: null });
    const approved = deriveAssignmentProgress(
      {
        ...projection,
        runs: [execution],
        plans: [
          { ...proposed, status: "completed" },
          { ...todo, runId: execution.id },
        ],
      },
      thread,
    );
    expect(approved).toMatchObject({ stage: 3, percent: 50 });
    expect(approved.steps).toHaveLength(2);
    expect(
      deriveAssignmentProgress(
        { ...projection, runs: [execution], plans: [{ ...proposed, status: "completed" }, todo] },
        thread,
      ).percent,
    ).toBeNull();
  });
  it("does not infer success from a completed conversation or invent a percentage", () => {
    const projection = makeThreadProjectionFixture();
    const plan = {
      id: PlanId.make("proposal"),
      threadId: projection.thread.id,
      runId: null,
      nodeId: NodeId.make("proposal-node"),
      status: "completed",
      kind: "proposed_plan",
      markdown: "# Plan",
    } as const;
    expect(
      deriveAssignmentProgress(
        { ...projection, plans: [plan] },
        makeThreadFixture({ runtime: null }),
      ),
    ).toMatchObject({ percent: null, label: "Implementation paused", stage: 3 });
  });
});
