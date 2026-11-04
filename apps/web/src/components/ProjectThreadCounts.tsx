import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { threadCounts } from "./ProjectDashboard.logic";

export function ProjectThreadCounts({ threads }: { threads: readonly EnvironmentThreadShell[] }) {
  const counts = threadCounts(threads);
  return (
    <div
      className="grid grid-cols-3 gap-x-2 gap-y-1 text-2xs text-muted-foreground"
      aria-label="Loaded, unarchived threads. Away means paused; attention is separate."
    >
      {Object.entries(counts).map(([label, count]) => (
        <span key={label} className="flex items-baseline gap-1">
          <span className="tabular-nums text-sidebar-foreground">{count}</span>
          <span>{label === "total" ? "loaded" : label}</span>
        </span>
      ))}
    </div>
  );
}
