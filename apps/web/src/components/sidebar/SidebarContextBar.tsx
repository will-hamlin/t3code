import type { ScopedThreadRef } from "@t3tools/contracts";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarContextState {
  values: Record<string, number>;
  report: (key: string, percent: number) => void;
}

const useSidebarContext = create<SidebarContextState>()(
  persist(
    (set) => ({
      values: {},
      report: (key, percent) =>
        set((state) =>
          state.values[key] === percent
            ? state
            : {
                values: Object.fromEntries([
                  ...Object.entries(state.values)
                    .filter(([entry]) => entry !== key)
                    .slice(-499),
                  [key, percent],
                ]),
              },
        ),
    }),
    { name: "t3code:sidebar-context:v1", partialize: (state) => ({ values: state.values }) },
  ),
);

export function SidebarContextReporter({
  threadRef,
  percent,
}: {
  threadRef: ScopedThreadRef;
  percent: number | null;
}) {
  const key = scopedThreadKey(threadRef);
  const rounded =
    percent === null ? null : Math.round(Math.max(0, Math.min(100, percent)) * 10) / 10;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- caches reported usage so sidebar rows do not open a detail stream for every conversation
  useEffect(() => {
    if (rounded !== null) useSidebarContext.getState().report(key, rounded);
  }, [key, rounded]);
  return null;
}

export function SidebarContextBar({ threadRef }: { threadRef: ScopedThreadRef }) {
  const key = scopedThreadKey(threadRef);
  const percent = useSidebarContext((state) => state.values[key] ?? null);
  return (
    <div
      role="meter"
      aria-label={percent === null ? "Context usage not reported" : "Context usage"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={percent === null ? "Not reported" : `${percent}% used`}
      className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted-foreground/15"
    >
      {percent !== null ? (
        <div
          className={percent >= 90 ? "h-full bg-error" : "h-full bg-muted-foreground/60"}
          style={{ width: `${percent}%` }}
        />
      ) : null}
    </div>
  );
}
