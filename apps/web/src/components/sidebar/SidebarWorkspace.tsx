import { SidebarUsage } from "./SidebarUsage";
import { createContext, use, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ThreadDetailsContext, type ThreadDetailsUsageInput } from "../chat/ThreadDetailsUsage";

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
      <SidebarUsage />
      <div ref={slots?.setUsage} />
    </div>
  );
}

export function SidebarThreadUsage({ usage }: { usage: ThreadDetailsUsageInput }) {
  const slots = useSidebarWorkspace();
  if (!slots?.usage) return null;
  return usage.contextWindow
    ? createPortal(<ThreadDetailsContext usage={usage.contextWindow} />, slots.usage)
    : null;
}
