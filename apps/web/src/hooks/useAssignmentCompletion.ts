import type { ScopedProjectRef, ThreadId } from "@t3tools/contracts";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { serverEnvironment } from "../state/server";
import { useAtomCommand } from "../state/use-atom-command";

export function useAssignmentCompletion() {
  const update = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: false });
  return async (ref: ScopedProjectRef, threadId: ThreadId, completed: boolean) => {
    const current = appAtomRegistry.get(serverEnvironment.settingsValueAtom(ref.environmentId))
      ?.projectSettingsOverrides[ref.projectId];
    const assignment = current?.assignments?.[threadId];
    if (!assignment) return;
    const result = await update({
      environmentId: ref.environmentId,
      input: {
        patch: {
          projectSettingsOverrides: {
            [ref.projectId]: {
              ...current,
              assignments: {
                ...current.assignments,
                [threadId]: { ...assignment, status: completed ? "completed" : "active" },
              },
            },
          },
        },
      },
    });
    if (result._tag === "Failure") throw squashAtomCommandFailure(result);
  };
}
