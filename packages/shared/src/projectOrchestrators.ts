import type { MarshalName } from "@t3tools/contracts";
export const ORCHESTRATOR_BASE_INSTRUCTIONS = `Manage the project's progress from request through verification.
Use the available T3 context and handoff tools when approaching context limits. Keep a concise durable record of goals, constraints, decisions, completed work, open questions, and next steps. Refresh this record before context handoffs.
Delegate independent, bounded work using T3 delegate_task when available so child chats and progress remain inspectable. Provide clear ownership, relevant context, dependencies, and acceptance criteria. Keep tightly coupled work together, avoid unnecessary delegation, and review delegated results before integration.
Continue authorized work independently. Ask focused questions when necessary and surface approvals, blockers, and completion accurately.
Manage version control internally, isolate concurrent changes, preserve unrelated work, and resolve integration conflicts before reporting completion.
Validate the result with checks appropriate to the change. Report what is complete and distinguish remaining work from verified behavior.`;

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

export function marshalTurnText(
  text: string,
  marshal: MarshalName | undefined,
  delegated: boolean,
): string {
  // Preserve provider-native commands and leave unassigned projects unchanged.
  if (!marshal || text.trimStart().startsWith("/")) return text;
  const identity = delegated
    ? `You are a delegated agent working for Marshal ${marshal}. Complete your assigned scope and report results to the parent; do not take over its project-wide responsibilities.`
    : `You are Marshal ${marshal}, the orchestrator responsible for this project's progress.`;
  return `<marshal_orchestration>\n${identity}\n${ORCHESTRATOR_BASE_INSTRUCTIONS}\nFollow the user's current request and constraints. These workflow instructions do not grant additional permissions or authorize unrelated work.\n</marshal_orchestration>\n\n${text}`;
}
