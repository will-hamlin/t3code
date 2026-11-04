import type { EnvironmentId, ProjectEntry } from "@t3tools/contracts";
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FolderIcon,
  FolderTreeIcon,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipPopup } from "../ui/tooltip";
import { useDirectoryEntries } from "../files/useDirectoryEntries";
import { useWorkspaceMutationRefresh } from "../../hooks/useWorkspaceMutationRefresh";
import { observeResize } from "../../lib/observeResize";
import { cn } from "../../lib/utils";
import styles from "./WorkspaceFileTree.module.css";

function FileBranches({
  entries,
  parent,
  relevant,
  load,
  onOpenFile,
}: {
  entries: readonly ProjectEntry[];
  parent: string;
  relevant: ReadonlySet<string>;
  load: (path: string) => Promise<void>;
  onOpenFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlyMap<string, boolean>>(new Map());
  const children = entries
    .filter((entry) => entry.path.slice(0, Math.max(0, entry.path.lastIndexOf("/"))) === parent)
    .toSorted(
      (a, b) =>
        Number(b.kind === "directory") - Number(a.kind === "directory") ||
        a.path.localeCompare(b.path),
    );
  if (children.length === 0) return null;
  return (
    <ul aria-label={parent ? `${parent} contents` : "Project contents"}>
      {children.map((entry) => {
        const folder = entry.kind === "directory";
        const active =
          relevant.has(entry.path) ||
          (folder && [...relevant].some((path) => path.startsWith(`${entry.path}/`)));
        const open = expanded.get(entry.path) ?? false;
        return (
          <li key={entry.path}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={entry.path.split("/").at(-1)}
                    aria-expanded={folder ? open : undefined}
                    className={cn(
                      "relative flex min-h-16 w-20 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-2 py-3 text-center text-muted-foreground hover:border-foreground/50 focus-visible:outline-ring",
                      active && "border-(--oc-file-relevant)/70 text-(--oc-file-relevant)",
                    )}
                    onClick={() => {
                      if (!folder) {
                        onOpenFile(entry.path);
                        return;
                      }
                      setExpanded(new Map(expanded).set(entry.path, !open));
                      if (!open) void load(entry.path);
                    }}
                  />
                }
              >
                {folder ? (
                  <FolderIcon className="size-5 shrink-0" />
                ) : (
                  <FileIcon className="size-5 shrink-0" />
                )}
                <span className="line-clamp-2 w-full break-all font-mono text-2xs">
                  {entry.path.split("/").at(-1)}
                </span>
                {folder ? (
                  <ChevronDownIcon
                    className={cn("absolute top-1 right-1 size-2.5", !open && "-rotate-90")}
                  />
                ) : null}
                {relevant.has(entry.path) ? (
                  <span
                    className="absolute top-1.5 left-1.5 size-1 rounded-full bg-(--oc-file-relevant)"
                    aria-label="Relevant to this thread"
                  />
                ) : null}
              </TooltipTrigger>
              <TooltipPopup side="top">{entry.path.split("/").at(-1)}</TooltipPopup>
            </Tooltip>
            {folder && open ? (
              <FileBranches
                entries={entries}
                parent={entry.path}
                relevant={relevant}
                load={load}
                onOpenFile={onOpenFile}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function WorkspaceFileTree({
  environmentId,
  cwd,
  relevantPaths,
  mutationId,
  onOpenFile,
}: {
  environmentId: EnvironmentId;
  cwd: string;
  relevantPaths: readonly string[];
  mutationId: string | null;
  onOpenFile: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const canvasId = useId();
  const directory = useDirectoryEntries(environmentId, cwd);
  useWorkspaceMutationRefresh({
    resourceKey: `${environmentId}:${cwd}`,
    mutationId,
    refresh: directory.refresh,
  });
  const relevant = new Set(relevantPaths.map((path) => path.replaceAll("\\", "/")));
  const byPath = new Map(directory.entries.map((entry) => [entry.path, entry]));
  for (const path of relevant) {
    const parts = path.split("/");
    for (let index = 1; index <= parts.length; index++) {
      const ancestor = parts.slice(0, index).join("/");
      if (!byPath.has(ancestor))
        byPath.set(ancestor, {
          path: ancestor,
          kind: index === parts.length ? "file" : "directory",
        });
    }
  }
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [graph, setGraph] = useState<HTMLUListElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0, viewport: 0 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const pendingScroll = useRef<{ left: number; top: number; zoom: number } | null>(null);
  const panStart = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const viewInteracted = useRef(false);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- measures the diagram and scroll viewport for pointer-anchored zoom
  useLayoutEffect(() => {
    if (!viewport || !graph) return;
    const measure = () => {
      const next = {
        width: graph.offsetWidth,
        height: graph.offsetHeight,
        viewport: viewport.clientWidth,
      };
      setSize((previous) =>
        previous.width === next.width &&
        previous.height === next.height &&
        previous.viewport === next.viewport
          ? previous
          : next,
      );
    };
    measure();
    return observeResize([viewport, graph], measure);
  }, [viewport, graph]);
  const canvasWidth = Math.max(size.viewport, size.width * zoom + 24);
  const zoomAt = (nextZoom: number, x: number, y: number) => {
    if (!viewport) return;
    const next = Math.max(0.1, Math.min(2.5, nextZoom));
    const oldOffset = (canvasWidth - size.width * zoom) / 2;
    const nextWidth = Math.max(size.viewport, size.width * next + 24);
    const nextOffset = (nextWidth - size.width * next) / 2;
    pendingScroll.current = {
      zoom: next,
      left: nextOffset + ((viewport.scrollLeft + x - oldOffset) / zoom) * next - x,
      top: ((viewport.scrollTop + y - 16) / zoom) * next + 16 - y,
    };
    viewInteracted.current = true;
    setZoom(next);
  };
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- applies the scroll position after React commits the zoomed diagram dimensions
  useLayoutEffect(() => {
    if (!viewport || size.width === 0) return;
    if (pendingScroll.current?.zoom === zoom) {
      const { left, top } = pendingScroll.current;
      viewport.scrollTo({ left, top });
      pendingScroll.current = null;
    } else if (!viewInteracted.current) {
      viewport.scrollTo({ left: Math.max(0, (canvasWidth - size.viewport) / 2) });
    }
  }, [viewport, canvasWidth, size.viewport, size.width, zoom]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- installs a non-passive wheel listener so zooming the diagram does not scroll the surrounding chat
  useEffect(() => {
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        viewInteracted.current = true;
        viewport.scrollBy({ left: (event.deltaX || event.deltaY) * unit });
        return;
      }
      const bounds = viewport.getBoundingClientRect();
      zoomAt(
        zoom * Math.exp(-event.deltaY * unit * 0.002),
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  }, [viewport, zoom, zoomAt]);
  return (
    <section
      aria-label="Project file tree"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-lg",
        collapsed ? "shrink-0" : "flex-1",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 px-4 py-3",
          !collapsed && "border-b border-border",
        )}
      >
        <FolderTreeIcon className="size-3.5 text-muted-foreground" />
        <h2 className="font-mono text-xs text-muted-foreground">Files</h2>
        <div className="ml-auto flex items-center gap-2">
          {relevant.size > 0 ? (
            <span className="font-mono text-2xs text-(--oc-file-relevant)">
              {relevant.size} relevant
            </span>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={collapsed ? "Show file tree" : "Hide file tree"}
                  aria-expanded={!collapsed}
                  aria-controls={canvasId}
                  onClick={() => {
                    if (!collapsed && viewport)
                      pendingScroll.current = {
                        left: viewport.scrollLeft,
                        top: viewport.scrollTop,
                        zoom,
                      };
                    setCollapsed(!collapsed);
                  }}
                />
              }
            >
              {collapsed ? <EyeIcon /> : <EyeOffIcon />}
            </TooltipTrigger>
            <TooltipPopup side="left">
              {collapsed ? "Show file tree" : "Hide file tree"}
            </TooltipPopup>
          </Tooltip>
        </div>
      </header>
      <div
        ref={setViewport}
        id={canvasId}
        hidden={collapsed}
        role="region"
        aria-label="File tree canvas"
        aria-description="Scroll to zoom. Drag with the left mouse button to pan. Use plus and minus to zoom or arrow keys to pan when focused."
        tabIndex={0}
        data-file-tree-zoom={zoom}
        className={cn(
          "min-h-0 flex-1 cursor-grab overflow-auto overscroll-contain touch-none focus-visible:outline-ring",
          panning && "cursor-grabbing select-none",
        )}
        onPointerDown={(event) => {
          if (event.button !== 0 && event.button !== 1) return;
          suppressClick.current = false;
          if (event.button === 1) event.preventDefault();
          panStart.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const start = panStart.current;
          if (!start) return;
          if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
            start.moved = true;
            viewInteracted.current = true;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPanning(true);
          }
          if (start.moved)
            event.currentTarget.scrollTo({
              left: start.left + start.x - event.clientX,
              top: start.top + start.y - event.clientY,
            });
        }}
        onPointerUp={(event) => {
          if (panStart.current) {
            panStart.current = null;
            setPanning(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          panStart.current = null;
          setPanning(false);
        }}
        onLostPointerCapture={() => {
          panStart.current = null;
          setPanning(false);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onAuxClick={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "+" || event.key === "=" || event.key === "-") {
            event.preventDefault();
            zoomAt(
              zoom * (event.key === "-" ? 1 / 1.15 : 1.15),
              event.currentTarget.clientWidth / 2,
              event.currentTarget.clientHeight / 2,
            );
          } else if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            event.currentTarget.scrollBy({
              left: event.key === "ArrowLeft" ? -48 : event.key === "ArrowRight" ? 48 : 0,
              top: event.key === "ArrowUp" ? -48 : event.key === "ArrowDown" ? 48 : 0,
            });
          }
        }}
      >
        {directory.error ? (
          <p role="status" className="p-3 text-xs text-muted-foreground">
            {directory.error}
          </p>
        ) : null}
        {!directory.ready && directory.isPending ? (
          <p className="p-3 text-xs text-muted-foreground">Loading files…</p>
        ) : null}
        {directory.ready && byPath.size === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No files in this project yet.</p>
        ) : null}
        <div className="relative" style={{ width: canvasWidth, height: size.height * zoom + 32 }}>
          <ul
            ref={setGraph}
            className={cn(styles.tree, "absolute top-4 left-1/2 origin-top")}
            style={{ transform: `translateX(-50%) scale(${zoom})` }}
          >
            <li>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div
                      tabIndex={0}
                      className="flex min-h-16 w-36 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-center"
                    />
                  }
                >
                  <FolderIcon className="size-5" />
                  <span className="line-clamp-2 w-full break-all font-mono text-2xs">
                    {cwd.replaceAll("\\", "/").split("/").filter(Boolean).at(-1)}
                  </span>
                </TooltipTrigger>
                <TooltipPopup side="top">Workspace</TooltipPopup>
              </Tooltip>
              <FileBranches
                entries={[...byPath.values()]}
                parent=""
                relevant={relevant}
                load={directory.load}
                onOpenFile={onOpenFile}
              />
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
