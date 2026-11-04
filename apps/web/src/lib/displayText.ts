import type { Root, RootContent } from "hast";

export function entryName(value: string): string {
  return (
    value
      .replace(/[\\/]+$/, "")
      .split(/[\\/]/)
      .at(-1) || "Workspace"
  );
}

export function displayText(value: string): string {
  return value
    .split(/(\b[a-z][a-z\d+.-]*:\/\/[^\s<>"`]+)/gi)
    .map((part) => {
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(part)) {
        if (!part.startsWith("file://")) return part;
        try {
          return entryName(decodeURIComponent(new URL(part).pathname));
        } catch {
          return "File";
        }
      }
      return part.replace(
        /(?:[A-Za-z]:[\\/]|~[\\/]|\.{1,2}[\\/]|(?<![\w:])\/(?!\/)|\b[A-Za-z_.@-][\w@.-]*[\\/])[^\s<>"'`|()[\]{}]+/g,
        (path) => {
          if (/^[A-Za-z]\/[A-Za-z]$/.test(path)) return path;
          const punctuation = /[.,;!?]+$/.exec(path)?.[0] ?? "";
          return entryName(punctuation ? path.slice(0, -punctuation.length) : path) + punctuation;
        },
      );
    })
    .join("");
}

export function rehypeDisplayNames() {
  return (tree: Root) => {
    const visit = (node: Root | RootContent) => {
      if (node.type === "element" && node.tagName === "code") return;
      if (node.type === "text") node.value = displayText(node.value);
      else if ("children" in node) node.children.forEach(visit);
    };
    visit(tree);
  };
}
