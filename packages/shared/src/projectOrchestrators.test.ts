import { describe, expect, it } from "vite-plus/test";
import {
  MARSHAL_NAMES,
  ORCHESTRATOR_BASE_INSTRUCTIONS,
  marshalTurnText,
} from "./projectOrchestrators.ts";

describe("Marshal prompt delivery", () => {
  it("gives all seven Marshals the same workflow policy and preserves the request", () => {
    for (const name of MARSHAL_NAMES) {
      const text = marshalTurnText("Build a calculator. Do not publish it.", name, false);
      expect(text).toContain(`You are Marshal ${name}`);
      expect(text).toContain(ORCHESTRATOR_BASE_INSTRUCTIONS);
      expect(text.endsWith("Build a calculator. Do not publish it.")).toBe(true);
    }
  });
  it("keeps delegated agents in their assigned scope", () => {
    const text = marshalTurnText("Review accessibility", "Davout", true);
    expect(text).toContain("delegated agent working for Marshal Davout");
    expect(text).not.toContain("You are Marshal Davout");
  });
  it("preserves native commands and unassigned projects", () => {
    expect(marshalTurnText("/compact", "Ney", false)).toBe("/compact");
    expect(marshalTurnText("hello", undefined, false)).toBe("hello");
  });
});
