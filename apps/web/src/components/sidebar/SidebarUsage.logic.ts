import type { ServerProviderUsageWindow } from "@t3tools/contracts";

export function sidebarUsageWindow(
  driver: string,
  windows: readonly ServerProviderUsageWindow[],
  now: number,
) {
  return (
    windows
      .filter(
        (window) =>
          (driver !== "codex" || window.kind === "weekly") &&
          (window.resetsAt === undefined || Date.parse(window.resetsAt) > now),
      )
      .toSorted((a, b) => b.usedPercent - a.usedPercent)[0] ?? null
  );
}
