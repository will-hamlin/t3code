import type { ScopedThreadRef } from "@t3tools/contracts";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { ComposerHandleContext } from "../../composerHandleContext";
import type { SideChatParentPanel } from "../../lib/sideChatPane";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { useQuietThreadShells } from "../../state/entities";
import { threadFamilies } from "../../state/threads";
import ChatView from "../ChatView";
import { PROJECT_STATUS, projectThreadStatus } from "../ProjectDashboard.logic";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { BackgroundThreadContext } from "./backgroundThread";

function subagentNumeral(index: number): string {
  let remaining = index + 1;
  let result = "";
  for (const [value, symbol] of [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

export function SubagentInspector({
  threadRef,
  parentPanel,
}: {
  threadRef: ScopedThreadRef | null;
  parentPanel: SideChatParentPanel;
}) {
  const environmentId = threadRef?.environmentId;
  const threadId = threadRef?.threadId;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- holds the thread-family registry subscription until the inspector unmounts
  useEffect(() => {
    if (environmentId && threadId)
      return threadFamilies.mount(appAtomRegistry, environmentId, threadId);
  }, [environmentId, threadId]);
  const threads = useQuietThreadShells();
  const children = threads
    .filter(
      (thread) =>
        thread.environmentId === environmentId &&
        thread.lineage.parentThreadId === threadId &&
        thread.lineage.relationshipToParent === "subagent" &&
        thread.archivedAt === null,
    )
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = children.find((thread) => thread.id === selectedId);

  return (
    <aside
      aria-label="Subagents"
      className="pointer-events-auto relative flex h-[calc(50dvh-5rem)] min-h-36 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-lg"
    >
      <div className="relative shrink-0 border-b border-border p-4">
        <h2 className="relative font-mono text-xs text-muted-foreground">Subagents</h2>
      </div>
      <div className={cn("min-h-0 overflow-y-auto p-2", selected ? "max-h-24 shrink-0" : "flex-1")}>
        {children.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No subagents yet</p>
        ) : (
          <ol className="space-y-1">
            {children.map((thread, index) => {
              const status = PROJECT_STATUS[projectThreadStatus(thread)];
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    aria-pressed={selectedId === thread.id}
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-accent focus-visible:outline-ring aria-pressed:bg-accent"
                    onClick={() => setSelectedId(thread.id)}
                  >
                    <span className="w-8 shrink-0 font-mono text-sm text-secondary">
                      {subagentNumeral(index)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{thread.title}</span>
                    <span
                      className={`size-1.5 shrink-0 ${status.color}`}
                      aria-label={status.label}
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {selected ? (
        <div data-side-chat-pane className="flex min-h-0 flex-1 flex-col border-t border-border">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
            <h3 className="min-w-0 flex-1 truncate text-xs">{selected.title}</h3>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Close subagent chat"
              onClick={() => setSelectedId(null)}
            >
              <XIcon />
            </Button>
          </div>
          <BackgroundThreadContext value>
            <ComposerHandleContext value={null}>
              <ChatView
                key={selected.id}
                environmentId={selected.environmentId}
                threadId={selected.id}
                routeKind="server"
                embedded={parentPanel}
              />
            </ComposerHandleContext>
          </BackgroundThreadContext>
        </div>
      ) : null}
    </aside>
  );
}
