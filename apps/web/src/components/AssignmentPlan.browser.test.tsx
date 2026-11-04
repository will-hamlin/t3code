import "../index.css";
import { vi, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "../../test/render";
import { NodeId, PlanId } from "@t3tools/contracts";
import { makeThreadFixture, makeThreadProjectionFixture } from "../test-fixtures";
import { AssignmentPlan } from "./AssignmentPlan";

const commands = vi.hoisted(() => ({
  start: vi.fn(async (_input: unknown) => ({ _tag: "Success" })),
  mode: vi.fn(async (_input: unknown) => ({ _tag: "Success" })),
}));
vi.mock("@effect/atom-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@effect/atom-react")>()),
  useAtomValue: () => true,
}));
vi.mock("../state/server", () => ({
  serverEnvironment: { updateSettings: { permissionAtom: () => null } },
}));
vi.mock("../state/use-orchestration-command", () => ({
  useOrchestrationCommand: (command: string) =>
    command === "start" ? commands.start : commands.mode,
}));
vi.mock("../state/threads", () => ({
  useEnvironmentThread: () => {},
  threadEnvironment: { startTurn: "start", setInteractionMode: "mode" },
}));
vi.mock("../hooks/useAssignmentCompletion", () => ({
  useAssignmentCompletion: () => async () => {},
}));
vi.mock("../state/session", () => ({ useEnvironmentScope: () => true }));
vi.mock("./ChatMarkdown", () => ({ default: ({ text }: { text: string }) => <p>{text}</p> }));
const projection = makeThreadProjectionFixture();
const proposal = {
  id: PlanId.make("approval-test-plan"),
  threadId: projection.thread.id,
  runId: null,
  nodeId: NodeId.make("plan-node"),
  status: "active",
  kind: "proposed_plan",
  markdown: "# Build and verify",
} as const;
vi.mock("../state/entities", () => ({
  useQuietThreadProjection: () => ({ projection: { ...projection, plans: [proposal] } }),
  useThreadProjection: () => ({ projection }),
}));

it("shows work directly without approval gates and keeps the Marshal conversation available", async () => {
  await using _screen = await render(
    <AssignmentPlan
      assignment={{
        title: "A task",
        brief: "Build a thing",
        marshalAgent: "Ney",
        status: "active",
      }}
      thread={makeThreadFixture({ interactionMode: "default", runtime: null })}
      cwd="/repo"
    />,
  );
  await expect.element(page.getByRole("list", { name: "Assignment progress" })).toBeVisible();
  await expect.element(page.getByRole("region", { name: "Talk to Ney" })).toBeVisible();
  expect(await page.getByRole("tab").all()).toHaveLength(0);
  expect(commands.start).not.toHaveBeenCalled();
});
