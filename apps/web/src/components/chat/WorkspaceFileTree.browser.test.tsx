import "../../index.css";
import { EnvironmentId, type ProjectEntry } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
import { WorkspaceFileTree } from "./WorkspaceFileTree";

const directory = {
  entries: [
    { path: "src", kind: "directory" },
    { path: "README.md", kind: "file" },
  ] satisfies readonly ProjectEntry[],
  load: () => Promise.resolve(),
  refresh: () => {},
  ready: true,
  error: null,
  isPending: false,
};
vi.mock("../files/useDirectoryEntries", () => ({ useDirectoryEntries: () => directory }));
vi.mock("../../hooks/useWorkspaceMutationRefresh", () => ({
  useWorkspaceMutationRefresh: () => {},
}));

it("opens relevant descendants, preserves collapse, and supports wheel zoom and left-button panning", async () => {
  await using screen = await render(
    <div className="flex h-96 w-80">
      <WorkspaceFileTree
        environmentId={EnvironmentId.make("file-tree-test")}
        cwd="/repo"
        relevantPaths={["src\\app.ts"]}
        mutationId={null}
        onOpenFile={() => {}}
      />
    </div>,
  );
  const folder = page.getByRole("button", { name: "src", exact: true });
  const file = page.getByRole("button", { name: "app.ts", exact: true });
  await expect.element(folder).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(folder);
  await expect.element(file).toBeVisible();
  await userEvent.click(folder);
  await expect.element(file).not.toBeInTheDocument();
  await screen.rerender(
    <div className="flex h-96 w-80">
      <WorkspaceFileTree
        environmentId={EnvironmentId.make("file-tree-test")}
        cwd="/repo"
        relevantPaths={["src/app.ts"]}
        mutationId={null}
        onOpenFile={() => {}}
      />
    </div>,
  );
  await expect.element(folder).toHaveAttribute("aria-expanded", "false");
  const canvas = screen.container.querySelector<HTMLElement>("[data-file-tree-zoom]")!;
  const bounds = canvas.getBoundingClientRect();
  await act(() => {
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -350,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + 40,
      }),
    );
  });
  await vi.waitFor(() => expect(Number(canvas.dataset.fileTreeZoom)).toBeGreaterThan(1));
  const before = canvas.scrollLeft;
  using _capture = vi.spyOn(canvas, "setPointerCapture").mockImplementation(() => {});
  await act(() => {
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        buttons: 1,
        pointerId: 7,
        clientX: 100,
        clientY: 100,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        buttons: 1,
        pointerId: 7,
        clientX: 80,
        clientY: 100,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        pointerId: 7,
        clientX: 80,
        clientY: 100,
      }),
    );
  });
  await vi.waitFor(() => expect(canvas.scrollLeft).toBeGreaterThan(before));
  const zoomBeforeHide = canvas.dataset.fileTreeZoom;
  await userEvent.click(page.getByRole("button", { name: "Hide file tree", exact: true }));
  await expect
    .element(page.getByRole("button", { name: "Show file tree", exact: true }))
    .toHaveAttribute("aria-expanded", "false");
  expect(canvas.hidden).toBe(true);
  await userEvent.click(page.getByRole("button", { name: "Show file tree", exact: true }));
  await expect
    .element(page.getByRole("region", { name: "File tree canvas", exact: true }))
    .toBeVisible();
  expect(canvas.dataset.fileTreeZoom).toBe(zoomBeforeHide);
  await expect.element(folder).toHaveAttribute("aria-expanded", "false");
  await expect
    .element(page.getByRole("button", { name: "Fit file tree", exact: true }))
    .not.toBeInTheDocument();
});
