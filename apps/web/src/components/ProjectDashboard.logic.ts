import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { resolveSidebarThreadStatus } from "./Sidebar.logic";

export const PROJECT_STATUS = {
  approval: {
    label: "Needs approval",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 0,
  },
  input: {
    label: "Has a question",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 1,
  },
  request: {
    label: "Needs your reply",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 2,
  },
  failed: {
    label: "Needs attention",
    color: "bg-destructive",
    border: "border-destructive",
    priority: 3,
  },
  limited: {
    label: "Usage limit reached",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 4,
  },
  working: {
    label: "Working",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 5,
  },
  waiting: {
    label: "Waiting",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 6,
  },
  paused: {
    label: "Paused",
    color: "bg-muted-foreground",
    border: "border-muted-foreground",
    priority: 7,
  },
  complete: {
    label: "Complete",
    color: "bg-(--oc-signal)",
    border: "border-(--oc-signal)",
    priority: 7,
  },
  ready: {
    label: "Ready to start",
    color: "bg-muted-foreground",
    border: "border-muted-foreground",
    priority: 8,
  },
  offline: {
    label: "Offline",
    color: "bg-muted-foreground",
    border: "border-muted-foreground",
    priority: 9,
  },
} as const;

export function projectThreadStatus(thread: EnvironmentThreadShell) {
  const status = resolveSidebarThreadStatus(thread);
  if (status !== "ready" && !(status === "waiting" && thread.runtime?.status === "idle"))
    return status;
  switch (thread.latestRun?.status) {
    case "completed":
      return "complete";
    case "failed":
      return "failed";
    case "cancelled":
    case "rolled_back":
    case "interrupted":
      return "paused";
    case "preparing":
    case "queued":
    case "starting":
    case "running":
    case "waiting":
      return "working";
    default:
      return "ready";
  }
}

export function projectThreadPriority(a: EnvironmentThreadShell, b: EnvironmentThreadShell) {
  return (
    PROJECT_STATUS[projectThreadStatus(a)].priority -
      PROJECT_STATUS[projectThreadStatus(b)].priority || b.updatedAt.localeCompare(a.updatedAt)
  );
}
