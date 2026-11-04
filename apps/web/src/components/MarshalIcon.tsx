import { BotIcon } from "lucide-react";

// Symbolic interpretations, not historical coats of arms: iron shield, bravery,
// plumed crown, bridge, Austerlitz sun, cavalry spur, and Egyptian campaign.
const EMBLEMS: Record<string, string> = {
  Davout: "M12 3 20 6v6c0 5-8 9-8 9S4 17 4 12V6Z M9 8h6M12 8v8M9 16h6",
  Ney: "m5 3 14 14-2 2L3 5V3h2ZM14 16l5-5M16 18l4 3M3 20l6-6M5 16l3 3",
  Murat: "m3 12 4 3 5-6 5 6 4-3-2 8H5ZM12 9V5c0-3 5-4 7-2-4 0-4 3-7 4M7 17h10",
  Lannes: "M3 19V9h4v10M17 19V9h4v10M7 12h10M7 19a5 5 0 0 1 10 0M2 20h20M3 6h4M17 6h4",
  Soult: "M3 18h18M5 18a7 7 0 0 1 14 0M12 3v4M3 8l3 3M21 8l-3 3M2 14h3M19 14h3M12 11v7",
  Grouchy: "M5 3v9c0 3 2 5 5 5h4M5 8h6v4h5M17 12v10M12 17h10M13 13l8 8M13 21l8-8",
  Desaix: "m3 20 9-15 9 15ZM12 5v15M12 5l4 15M3 20h18M4 6h4M6 4v4",
};

export function MarshalIcon({
  name,
  className = "size-4",
}: {
  name?: string | undefined;
  className?: string;
}) {
  const path = name ? EMBLEMS[name] : undefined;
  return path ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={name}
    >
      <path d={path} />
    </svg>
  ) : (
    <BotIcon className={className} aria-label="Marshal agent" />
  );
}
