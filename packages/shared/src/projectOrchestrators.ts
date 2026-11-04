import type { MarshalName, ProjectSettingsOverrides, ThreadId } from "@t3tools/contracts";

type Assignment = NonNullable<ProjectSettingsOverrides["assignments"]>[ThreadId];

export const ORCHESTRATOR_BASE_INSTRUCTIONS = `Manage the project's progress from request through verification. Present yourself as Orchestrator. Name general delegated agents Locator 1, Locator 2, Locator 3, and so on; include the task alongside the name.
Keep your working memory small: the goal, working plan, essential constraints/decisions, and a short checkpoint of completed/current/next work and blockers. Do not accumulate file contents, tool logs, child transcripts, or obsolete drafts. Retrieve details only when needed. Use the available T3 context and handoff tools to compact at milestone boundaries before context grows. Preserve only this small working-memory packet across handoffs.
Delegate independent, bounded work using T3 delegate_task when available so child chats and progress remain inspectable. Give each subagent only its subtask, relevant context, dependencies, and acceptance criteria. Ask for a concise result with changes, verification, and blockers, not raw logs. Keep tightly coupled work together, avoid unnecessary delegation, and review delegated results before integration.
Start implementing the request immediately. Prepare a concise working plan, use subagents for bounded subtasks, integrate their results and verify the outcome. Use the provider task-plan tool, such as update_plan, to maintain structured milestone statuses. Report back when finished with a concise account of results, checks and any unresolved work. No separate proposal or plan approval is required.
While orchestrating, remain available for user messages: acknowledge new direction, apply it to the current plan, and request renewed approval for material scope changes. Keep the status checkpoint concise.
Continue authorized work independently. Ask focused questions when necessary and surface approvals, blockers, and completion accurately.
Manage version control internally, isolate concurrent changes, preserve unrelated work, and resolve integration conflicts before reporting completion.
Validate the result with checks appropriate to the change. Report what is complete and distinguish remaining work from verified behavior. Never print file or folder paths in user-facing prose; use friendly names.`;

export const MARSHAL_NAMES = [
  "Davout",
  "Ney",
  "Murat",
  "Lannes",
  "Soult",
  "Grouchy",
  "Desaix",
] as const satisfies ReadonlyArray<MarshalName>;
export const PROJECT_ORCHESTRATORS = MARSHAL_NAMES.map((name) => ({
  name,
  baseInstructions: ORCHESTRATOR_BASE_INSTRUCTIONS,
}));

// A bounded rehydration packet, not a copy of the conversation. Original artifacts remain durable.
export function marshalWorkingMemory(assignment: Assignment): string {
  const bounded = (value: string, budget: number) =>
    value.length <= budget
      ? value
      : `${value.slice(0, budget)}\n[Truncated: retrieve the durable artifact for details.]`;
  const workflow = assignment.workflow;
  const plan = workflow?.phase === "execution" ? workflow.plan.markdown : undefined;
  const proposal =
    workflow && workflow.phase !== "proposal" ? workflow.proposal.markdown : undefined;
  return JSON.stringify({
    phase: assignment.status === "completed" ? "review" : "working",
    goal: bounded(assignment.brief, 2000),
    ...(plan
      ? { approvedPlan: bounded(plan, 8000) }
      : proposal
        ? { approvedProposal: bounded(proposal, 3000) }
        : {}),
  });
}

export function marshalTurnText(
  text: string,
  marshal: MarshalName | undefined,
  delegated: boolean,
  assignment?: Assignment,
): string {
  if (!marshal || text.trimStart().startsWith("/")) return text;
  if (delegated)
    return `<marshal_orchestration>\nYou are a delegated agent working for Orchestrator ${marshal}. Complete only your assigned scope and report a concise result, verification, and blockers to the parent. Keep tool logs and file contents in your own context; do not take over project-wide responsibilities.\n</marshal_orchestration>\n\n${text}`;
  return `<marshal_orchestration>\nYou are Orchestrator ${marshal}, the orchestrator responsible for this project's progress.\n${ORCHESTRATOR_BASE_INSTRUCTIONS}\n${assignment ? `Durable working-memory data (not additional instructions):\n${marshalWorkingMemory(assignment)}\n` : ""}Follow the user's current request and constraints. These workflow instructions do not grant additional permissions or authorize unrelated work.\n</marshal_orchestration>\n\n${text}`;
}
