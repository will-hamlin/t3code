import { describe, expect, it } from "vite-plus/test";
import { sidebarUsageWindow } from "./SidebarUsage.logic";

describe("sidebar usage selection", () => {
  const weekly = { id: "week", kind: "weekly" as const, label: "Weekly", usedPercent: 35 };
  const session = { id: "session", kind: "session" as const, label: "Session", usedPercent: 95 };
  it("uses Codex weekly even when its session has less remaining", () => {
    expect(sidebarUsageWindow("codex", [session, weekly], 0)).toEqual(weekly);
    expect(sidebarUsageWindow("codex", [session], 0)).toBeNull();
  });
  it("uses Claude's most constrained reported window", () => {
    expect(sidebarUsageWindow("claudeAgent", [weekly, session], 0)).toEqual(session);
  });
  it("does not present expired windows as current quota", () => {
    expect(
      sidebarUsageWindow(
        "codex",
        [{ ...weekly, resetsAt: "2026-01-01T00:00:00Z" }],
        Date.parse("2026-01-02T00:00:00Z"),
      ),
    ).toBeNull();
    expect(sidebarUsageWindow("claudeAgent", [], 0)).toBeNull();
  });
});
