import { useState } from "react";
import { FolderPlusIcon } from "lucide-react";
import { AuthFilesystemWriteScope, type ScopedProjectRef } from "@t3tools/contracts";
import { useProject } from "../../state/entities";
import { useEnvironmentScope } from "../../state/session";
import { projectEnvironment } from "../../state/projects";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogPanel,
  DialogFooter,
} from "../ui/dialog";
import { SidebarHeaderIconButton } from "./SidebarThreadHeader";

export function CreateProjectFolderButton({ projectRef }: { projectRef: ScopedProjectRef }) {
  const project = useProject(projectRef);
  const canWrite = useEnvironmentScope(projectRef.environmentId, AuthFilesystemWriteScope);
  const createDirectory = useAtomCommand(projectEnvironment.createDirectory, {
    reportFailure: false,
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <SidebarHeaderIconButton
        label="New folder in this project"
        disabled={!project || !canWrite}
        onClick={() => {
          setName("");
          setError(null);
          setOpen(true);
        }}
      >
        <FolderPlusIcon />
      </SidebarHeaderIconButton>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogPopup>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!project || !canWrite || busy) return;
              const folder = name.trim();
              if (!folder || folder === "." || folder === ".." || /[\\/:]/.test(folder)) {
                setError("Enter a folder name without path separators.");
                return;
              }
              setBusy(true);
              setError(null);
              void createDirectory({
                environmentId: projectRef.environmentId,
                input: { cwd: project.workspaceRoot, relativePath: folder },
              })
                .then((result) => {
                  if (result._tag === "Success") setOpen(false);
                  else
                    setError(
                      "Could not create this folder. Check the name and whether it already exists.",
                    );
                })
                .finally(() => setBusy(false));
            }}
          >
            <DialogHeader>
              <DialogTitle>New folder in {project?.title}</DialogTitle>
            </DialogHeader>
            <DialogPanel>
              <Input
                aria-label="Folder name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
              {error ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </DialogPanel>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}
