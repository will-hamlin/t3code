import { useSidebarWorkspace } from "./SidebarWorkspace";
import type { ScopedProjectRef } from "@t3tools/contracts";

import { FolderIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HouseIcon, SearchIcon, SquarePenIcon, XIcon } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { SidebarInput, SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export interface SidebarThreadHeaderProps {
  hasProjects: boolean;
  projectName?: string | undefined;
  projectKey?: string | undefined;
  projectRef?: ScopedProjectRef | null | undefined;
  projectScope: ReactNode;
  projectFolderAction?: ReactNode;
  onNewProject: () => void;
  onNewThread: (event: ReactMouseEvent) => void;
  newThreadDisabled: boolean;
  newThreadShortcutLabel: string | null | undefined;
  newThreadInProjectShortcutLabel: string | null | undefined;
  showNewThreadInProjectHint: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  isSearching: boolean;
  searchResultCount: number;
  activeSearchResultIndex: number;
  onClearSearch: () => void;
}

export function SidebarHomeNavigation() {
  const slots = useSidebarWorkspace();
  return (
    <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-2 px-3 pb-3">
      <Link
        to="/"
        activeOptions={{ exact: true }}
        activeProps={{
          className: "bg-sidebar-row-active text-sidebar-foreground font-medium",
          "aria-current": "page",
        }}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-row-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <HouseIcon className="size-4" /> Home
      </Link>
      <div ref={slots?.setControls} className="shrink-0" />
    </nav>
  );
}

export function SidebarThreadHeader({
  hasProjects,
  projectName,
  projectKey,
  projectScope,
  projectFolderAction,
  onNewThread,
  newThreadDisabled,
  newThreadShortcutLabel,
  newThreadInProjectShortcutLabel,
  showNewThreadInProjectHint,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  isSearching,
  searchResultCount,
  activeSearchResultIndex,
  onClearSearch,
}: SidebarThreadHeaderProps) {
  const resultsVisible = isSearching && searchResultCount > 0;
  // Shrinking results can remove the active option; never leave aria-activedescendant pointing at it.
  const activeResultExists = resultsVisible && activeSearchResultIndex < searchResultCount;
  const newThreadLabel = newThreadShortcutLabel
    ? `New thread (${newThreadShortcutLabel})`
    : "New thread";

  return (
    <div className="flex flex-col gap-3">
      {projectName && projectKey ? (
        <Link
          to="/project/$projectKey"
          params={{ projectKey }}
          activeOptions={{ exact: true }}
          activeProps={{
            className: "ring-1 ring-inset ring-sidebar-border font-medium",
            "aria-current": "page",
          }}
          aria-label={`Open project: ${projectName}`}
          className="flex min-w-0 items-center gap-2 rounded-md bg-(--oc-collar) px-3 py-2.5 text-sm text-foreground focus-visible:outline-ring"
        >
          <FolderIcon className="size-4 text-muted-foreground" />
          <span className="truncate">{projectName}</span>
        </Link>
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="flex shrink-0 items-center gap-1">
          <h2 className="min-w-0 flex-1 px-2 text-xs font-medium text-muted-foreground">Threads</h2>
          {hasProjects ? (
            <>
              {projectScope}
              {projectFolderAction}
            </>
          ) : null}
          <SidebarHeaderIconButton
            label="New thread"
            showLabel
            tooltip={
              showNewThreadInProjectHint ? (
                <span className="flex flex-col gap-0.5">
                  <span>{newThreadLabel}</span>
                  <span className="text-muted-foreground">
                    New thread in current project: Shift+click
                    {newThreadInProjectShortcutLabel ? ` (${newThreadInProjectShortcutLabel})` : ""}
                  </span>
                </span>
              ) : (
                newThreadLabel
              )
            }
            disabled={newThreadDisabled}
            onClick={onNewThread}
          >
            <SquarePenIcon />
          </SidebarHeaderIconButton>
        </div>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-within:bg-sidebar-row-hover focus-within:text-sidebar-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
          <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
          <SidebarInput
            ref={searchInputRef}
            nativeInput
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search threads"
            aria-label="Search threads"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={resultsVisible}
            aria-controls={resultsVisible ? "sidebar-thread-search-results" : undefined}
            aria-activedescendant={
              activeResultExists
                ? `sidebar-thread-search-result-${activeSearchResultIndex}`
                : undefined
            }
            className="min-w-0 flex-1"
          />
          {isSearching ? (
            <Button
              type="button"
              size="icon-micro"
              variant="ghost-muted"
              className="shrink-0"
              aria-label="Clear thread search"
              onClick={() => {
                onClearSearch();
                searchInputRef.current?.focus();
              }}
            >
              <XIcon className="size-3" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SidebarHeaderIconButton({
  label,
  tooltip = label,
  className,
  children,
  showLabel = false,
  ...rest
}: {
  label: string;
  tooltip?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
  showLabel?: boolean;
} & Omit<
  ComponentProps<typeof SidebarMenuButton>,
  "children" | "className" | "tooltip" | "isActive" | "aria-label"
>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            size={showLabel ? "default" : "icon"}
            type="button"
            aria-label={label}
            {...rest}
            className={cn("relative shrink-0", showLabel ? "w-auto" : "size-7", className)}
          />
        }
      >
        {children}
        {showLabel ? <span>{label}</span> : null}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </TooltipTrigger>
      <TooltipPopup side="top">{tooltip}</TooltipPopup>
    </Tooltip>
  );
}
