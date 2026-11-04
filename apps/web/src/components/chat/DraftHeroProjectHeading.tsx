import type { ReactNode } from "react";

export function DraftHeroProjectHeading({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      <h1 className="flex w-full items-center justify-center text-center text-base font-normal text-foreground">
        <span className="min-w-0 max-w-full">{children}</span>
      </h1>
    </div>
  );
}
