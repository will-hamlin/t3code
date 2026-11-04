import { describe, expect, it } from "vite-plus/test";
import {
  MARSHAL_NAMES,
  ORCHESTRATOR_BASE_INSTRUCTIONS,
  marshalTurnText,
  marshalWorkingMemory,
} from "./projectOrchestrators.ts";

describe("Marshal prompt delivery", () => {
  it("gives all seven Marshals the same workflow policy and preserves the request", () => {
    for (const name of MARSHAL_NAMES) {
      const text = marshalTurnText("Build a calculator. Do not publish it.", name, false);
      expect(text).toContain(`You are Orchestrator ${name}`);
      expect(text).toContain(ORCHESTRATOR_BASE_INSTRUCTIONS);
      expect(text.endsWith("Build a calculator. Do not publish it.")).toBe(true);
    }
  });
  it("keeps delegated agents in their assigned scope", () => {
    const text = marshalTurnText("Review accessibility", "Davout", true);
    expect(text).toContain("delegated agent working for Orchestrator Davout");
    expect(text).not.toContain("You are Orchestrator Davout");
  });
  it("bounds rehydrated memory and isolates child context", () => {
    const assignment = {
      title: "Task",
      brief: "g".repeat(20_000),
      marshalAgent: "Ney" as const,
      workflow: {
        phase: "execution" as const,
        proposal: { planId: "proposal" as never, markdown: "OLD DRAFT" },
        plan: { planId: "plan" as never, markdown: "p".repeat(40_000) },
      },
    };
    const packet = marshalWorkingMemory(assignment);
    expect(packet.length).toBeLessThan(10_500);
    expect(packet).toContain("approvedPlan");
    expect(packet).not.toContain("OLD DRAFT");
    expect(marshalTurnText("Review accessibility", "Ney", true, assignment)).not.toContain(
      "approvedPlan",
    );
    expect(marshalTurnText("Status?", "Ney", false, assignment)).toContain(packet);
  });
  it("preserves native commands and unassigned projects", () => {
    expect(marshalTurnText("/compact", "Ney", false)).toBe("/compact");
    expect(marshalTurnText("hello", undefined, false)).toBe("hello");
  });
});
