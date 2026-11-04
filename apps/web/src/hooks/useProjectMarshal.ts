import type { MarshalName, ScopedProjectRef } from "@t3tools/contracts";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { serverEnvironment } from "../state/server";
import { useAtomCommand } from "../state/use-atom-command";
import { useEnvironments } from "../state/environments";

export function useProjectMarshal(ref: ScopedProjectRef | null) {
  const { environments } = useEnvironments();
  return ref
    ? environments.find((environment) => environment.environmentId === ref.environmentId)
        ?.serverConfig?.settings.projectSettingsOverrides[ref.projectId]?.marshalAgent
    : undefined;
}

export function useAssignProjectMarshal() {
  const update = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: false });
  return async (ref: ScopedProjectRef, marshal: MarshalName) => {
    const settings = appAtomRegistry.get(serverEnvironment.settingsValueAtom(ref.environmentId));
    if (!settings) throw new Error("Connect to the project machine before assigning a Marshal.");
    const current = settings.projectSettingsOverrides[ref.projectId] ?? {};
    const result = await update({
      environmentId: ref.environmentId,
      input: {
        patch: {
          projectSettingsOverrides: { [ref.projectId]: { ...current, marshalAgent: marshal } },
        },
      },
    });
    if (result._tag === "Failure") throw squashAtomCommandFailure(result);
  };
}
