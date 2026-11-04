import { useId } from "react";
import styles from "./DotMatrix.module.css";

export function DotMatrix({
  moving = false,
  fade = false,
  breathing = false,
}: {
  moving?: boolean;
  fade?: boolean;
  breathing?: boolean;
}) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full overflow-hidden text-muted-foreground ${breathing ? styles.breathing : "opacity-20"}`}
      data-dot-matrix=""
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="currentColor" />
        </pattern>
        <linearGradient id={`${id}-fade`} x2="0" y2="1">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mask`} style={{ maskType: "alpha" }}>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={fade ? `url(#${id}-mask)` : undefined}>
        <rect
          x="-16"
          y="-16"
          width="110%"
          height="110%"
          fill={`url(#${id}-dots)`}
          className={moving ? styles.moving : undefined}
        />
      </g>
    </svg>
  );
}
