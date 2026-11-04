import { Link } from "@tanstack/react-router";
import { FolderIcon, PlusIcon } from "lucide-react";
import { openCommandPalette } from "../../commandPaletteBus";
import { Button } from "../ui/button";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { useQuietThreadShells } from "../../state/entities";
import { ProjectThreadCounts } from "../ProjectThreadCounts";

export function SidebarProjects() {
  const groups = useSidebarProjectGroups();
  const threads = useQuietThreadShells().filter((thread) => thread.archivedAt === null);
  return (
    <nav aria-label="Project homes" className="shrink-0 border-y border-sidebar-border px-3 py-2">
      <div className="mb-1 flex items-center gap-2 px-2 text-xs">
        <h2 className="font-medium text-muted-foreground">Projects</h2>
        <span className="flex-1 tabular-nums text-muted-foreground">{groups.length}</span>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => openCommandPalette({ open: "add-project" })}
        >
          <PlusIcon className="size-3" /> Add project
        </Button>
      </div>
      <div id="sidebar-projects" className="max-h-[min(16rem,28dvh)] space-y-1 overflow-y-auto">
        {groups.map((group) => (
          <Link
            key={group.projectKey}
            to="/project/$projectKey"
            params={{ projectKey: group.projectKey }}
            aria-label={`Open project home: ${group.displayName}`}
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "bg-sidebar-row-active text-sidebar-foreground ring-1 ring-inset ring-sidebar-border font-medium",
              "aria-current": "page",
            }}
            className="block rounded-md px-2 py-2 hover:bg-sidebar-row-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="mb-1 flex min-w-0 items-center gap-2 text-sm">
              <FolderIcon className="size-4 shrink-0" />
              <span className="truncate">{group.displayName}</span>
            </span>
            <ProjectThreadCounts
              threads={threads.filter((thread) =>
                group.memberProjects.some(
                  (project) =>
                    project.environmentId === thread.environmentId &&
                    project.id === thread.projectId,
                ),
              )}
            />
          </Link>
        ))}
        {!groups.length ? (
          <p className="p-2 text-xs text-muted-foreground">No projects yet.</p>
        ) : null}
      </div>
    </nav>
  );
}
