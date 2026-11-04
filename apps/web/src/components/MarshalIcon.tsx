import type { ReactNode } from "react";
import { cn } from "../lib/utils";

const SHAPES: Record<string, { label: string; shape: ReactNode }> = {
  Davout: { label: "Circle", shape: <circle cx="16" cy="16" r="10" /> },
  Ney: { label: "Square", shape: <rect x="7" y="7" width="18" height="18" rx="1" /> },
  Murat: { label: "Triangle", shape: <polygon points="16,5 28,26 4,26" /> },
  Lannes: { label: "Diamond", shape: <polygon points="16,3 29,16 16,29 3,16" /> },
  Soult: { label: "Hexagon", shape: <polygon points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5" /> },
  Grouchy: {
    label: "Star",
    shape: (
      <polygon points="16,3 19.8,11.2 29,12.5 22.5,19 24,28 16,23.7 8,28 9.5,19 3,12.5 12.2,11.2" />
    ),
  },
  Desaix: { label: "Cross", shape: <path d="M12 4h8v8h8v8h-8v8h-8v-8H4v-8h8z" /> },
};

export function MarshalIcon({
  name,
  className = "size-4",
}: {
  name?: string | undefined;
  className?: string;
}) {
  const emblem = name ? SHAPES[name] : undefined;
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      role="img"
      aria-label={emblem ? `Orchestrator · ${emblem.label}` : "Orchestrator"}
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className={cn("shrink-0 text-(--oc-ginkgo)", className)}
    >
      {emblem?.shape ?? <rect x="7" y="7" width="18" height="18" rx="6" />}
    </svg>
  );
}
