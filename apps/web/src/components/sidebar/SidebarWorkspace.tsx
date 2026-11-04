import { createContext, use, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ThreadDetailsUsage,
  ThreadDetailsContext,
  type ThreadDetailsUsageInput,
} from "../chat/ThreadDetailsUsage";

const SidebarWorkspaceContext = createContext<{
  details: HTMLDivElement | null;
  usage: HTMLDivElement | null;
  controls: HTMLDivElement | null;
  setDetails: (element: HTMLDivElement | null) => void;
  setUsage: (element: HTMLDivElement | null) => void;
  setControls: (element: HTMLDivElement | null) => void;
} | null>(null);

export function SidebarWorkspaceProvider({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<HTMLDivElement | null>(null);
  const [usage, setUsage] = useState<HTMLDivElement | null>(null);
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  return (
    <SidebarWorkspaceContext
      value={{ details, usage, controls, setDetails, setUsage, setControls }}
    >
      {children}
    </SidebarWorkspaceContext>
  );
}

export function useSidebarWorkspace() {
  return use(SidebarWorkspaceContext);
}

export function SidebarWorkspaceSlots() {
  const slots = useSidebarWorkspace();
  return (
    <div className="flex shrink-0 flex-col gap-3 px-2 pb-2">
      <div ref={slots?.setDetails} className="max-h-[35dvh] overflow-y-auto empty:hidden" />
      <section
        aria-label="Usage rates"
        className="rounded-xl border border-sidebar-border bg-sidebar/90 px-2 py-3"
      >
        <h2 className="px-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
          Usage
        </h2>
        <div
          ref={slots?.setUsage}
          className="empty:after:mt-2 empty:after:block empty:after:px-2 empty:after:text-xs empty:after:text-muted-foreground empty:after:content-['Open_a_thread_to_see_usage']"
        />
      </section>
    </div>
  );
}

export function SidebarThreadUsage({ usage }: { usage: ThreadDetailsUsageInput }) {
  const slots = useSidebarWorkspace();
  if (!slots?.usage) return null;
  const providers = ["codex", "claudeAgent"].map((kind) =>
    usage.providers.find((entry) => entry.driver === kind && entry.enabled),
  );
  return createPortal(
    <>
      {providers.map((provider, index) => (
        <div key={index === 0 ? "codex" : "claudeAgent"} className="mt-3">
          <h3 className="px-2 font-mono text-2xs text-muted-foreground">
            {index === 0 ? "OpenAI" : "Claude"}
          </h3>
          {provider ? (
            <ThreadDetailsUsage {...usage} providerInstanceId={provider.instanceId} />
          ) : (
            <p className="px-2 pt-1 text-2xs text-muted-foreground">Not connected</p>
          )}
          {provider && !provider.usageLimits ? (
            <p className="px-2 pt-1 text-2xs text-muted-foreground">Usage unavailable</p>
          ) : null}
        </div>
      ))}
      {usage.contextWindow ? <ThreadDetailsContext usage={usage.contextWindow} /> : null}
      {!providers.some((provider) => provider?.usageLimits) && !usage.contextWindow ? (
        <p className="px-2 pt-2 text-xs text-muted-foreground">Usage has not been reported yet.</p>
      ) : null}
    </>,
    slots.usage,
  );
}
