import { describe, expect, it } from "vite-plus/test";
import { RunId } from "@t3tools/contracts";
import type { ThreadRunSummary } from "@t3tools/client-runtime/state/models";
import { makeThreadFixture } from "../test-fixtures";
import { projectThreadPriority, projectThreadStatus, threadCounts } from "./ProjectDashboard.logic";

const run = (status: ThreadRunSummary["status"]): ThreadRunSummary => ({
  runId: RunId.make("dashboard-run"),
  status,
  requestedAt: "2026-01-01T00:00:00.000Z",
  startedAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
  assistantMessageId: null,
});

describe("project dashboard status", () => {
  it("keeps paused and blocked work distinct from completed work", () => {
    expect(
      threadCounts([
        makeThreadFixture({ latestRun: run("completed"), runtime: null }),
        makeThreadFixture({ latestRun: run("interrupted"), runtime: null }),
        makeThreadFixture({ latestRun: run("running"), runtime: null }),
        makeThreadFixture({ hasPendingApprovals: true }),
      ]),
    ).toEqual({ total: 4, completed: 1, away: 1, working: 1, attention: 1, ready: 0 });
  });
  it.each([
    ["completed", "complete"],
    ["failed", "failed"],
    ["interrupted", "paused"],
    ["cancelled", "paused"],
    ["running", "working"],
  ] as const)("reports %s without mistaking it for successful completion", (status, expected) => {
    expect(projectThreadStatus(makeThreadFixture({ latestRun: run(status), runtime: null }))).toBe(
      expected,
    );
  });

  it("opens the thread needing approval before a newer question or completed thread", () => {
    const complete = makeThreadFixture({
      latestRun: run("completed"),
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
    const question = makeThreadFixture({
      hasPendingUserInput: true,
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    const approval = makeThreadFixture({ hasPendingApprovals: true, latestRun: run("running") });
    expect([complete, question, approval].sort(projectThreadPriority)).toEqual([
      approval,
      question,
      complete,
    ]);
    expect(projectThreadStatus(question)).toBe("input");
    expect(projectThreadStatus(approval)).toBe("approval");
    expect(projectThreadStatus(makeThreadFixture())).toBe("ready");
  });
});
