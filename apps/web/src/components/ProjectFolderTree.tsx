import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react";
import type { EnvironmentId } from "@t3tools/contracts";
import { useDirectoryEntries } from "./files/useDirectoryEntries";
import { Button } from "./ui/button";

export function ProjectFolderTree({
  environmentId,
  cwd,
}: {
  environmentId: EnvironmentId;
  cwd: string;
}) {
  const directory = useDirectoryEntries(environmentId, cwd);
  const [expanded, setExpanded] = useState(new Set<string>());
  const branch = (parent: string) => (
    <ul className="space-y-1 pl-4">
      {directory.entries
        .filter((entry) => entry.path.slice(0, Math.max(0, entry.path.lastIndexOf("/"))) === parent)
        .toSorted(
          (a, b) =>
            Number(b.kind === "directory") - Number(a.kind === "directory") ||
            a.path.localeCompare(b.path),
        )
        .map((entry) => (
          <li key={entry.path}>
            {entry.kind === "directory" ? (
              <>
                <button
                  type="button"
                  aria-expanded={expanded.has(entry.path)}
                  className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    const next = new Set(expanded);
                    if (next.has(entry.path)) next.delete(entry.path);
                    else {
                      next.add(entry.path);
                      void directory.load(entry.path);
                    }
                    setExpanded(next);
                  }}
                >
                  {expanded.has(entry.path) ? (
                    <ChevronDownIcon className="size-3 shrink-0" />
                  ) : (
                    <ChevronRightIcon className="size-3 shrink-0" />
                  )}{" "}
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground" />{" "}
                  <span className="truncate">{entry.path.split("/").at(-1)}</span>
                </button>
                {expanded.has(entry.path) ? branch(entry.path) : null}
              </>
            ) : (
              <span className="flex items-center gap-2 py-1 pl-6 pr-1 text-sm text-muted-foreground">
                <FileIcon className="size-4 shrink-0" />
                <span className="truncate">{entry.path.split("/").at(-1)}</span>
              </span>
            )}
          </li>
        ))}
    </ul>
  );
  return (
    <section
      aria-label="Project file tree"
      className="max-h-72 overflow-auto border-b border-border p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm">Project files</h2>
        <Button size="xs" variant="ghost" onClick={directory.refresh}>
          Refresh
        </Button>
      </div>
      {directory.error ? <p role="alert">{directory.error}</p> : null}
      {directory.isPending ? <p className="text-xs text-muted-foreground">Loading files…</p> : null}
      {branch("")}
      {directory.ready && !directory.entries.length ? (
        <p className="text-xs text-muted-foreground">This folder is empty.</p>
      ) : null}
    </section>
  );
}
