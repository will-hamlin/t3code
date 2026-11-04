import {
  collectProviderUsageLimits,
  limitsNotice,
  remainingPercent,
} from "@t3tools/shared/usageLimits";
import { useEnvironments, useEnvironmentProviders } from "../../state/environments";
import { useNowMinute } from "../../hooks/useNowMinute";
import { sidebarUsageWindow } from "./SidebarUsage.logic";

export function SidebarUsage() {
  const { environments } = useEnvironments();
  const providersByEnvironment = useEnvironmentProviders();
  const minute = useNowMinute();
  const now = Date.parse(`${minute}:00Z`);
  return (
    <section
      aria-label="Provider usage limits"
      className="space-y-3 rounded-xl border border-sidebar-border px-3 py-3"
    >
      <h2 className="text-2xs uppercase tracking-widest text-muted-foreground">Usage remaining</h2>
      {(["codex", "claudeAgent"] as const).map((driver) => {
        const entries = environments.flatMap((environment) => {
          const config = environment.serverConfig;
          const providers = providersByEnvironment.get(environment.environmentId) ?? [];
          return providers
            .filter((provider) => provider.enabled && provider.driver === driver)
            .map((provider) => ({ environment, provider, config, providers }));
        });
        return (
          <div key={driver}>
            <h3 className="text-xs font-medium">
              {driver === "codex" ? "Codex · weekly" : "Claude · lowest remaining"}
            </h3>
            {!entries.length ? (
              <p className="mt-1 text-2xs text-muted-foreground">Not connected</p>
            ) : (
              entries.map(({ environment, provider, config, providers }) => {
                const report = collectProviderUsageLimits(
                  provider.instanceId,
                  providers,
                  config?.usageLimitSources ?? [],
                  now,
                );
                const limits =
                  report?.accounts.find((account) => account.instanceId === provider.instanceId)
                    ?.limits ?? provider.usageLimits;
                const window =
                  limits && !limitsNotice(limits)
                    ? sidebarUsageWindow(driver, limits.windows, now)
                    : null;
                const remaining = window ? remainingPercent(window) : null;
                const stale = limits ? now - Date.parse(limits.checkedAt) > 10 * 60_000 : false;
                return (
                  <div
                    key={`${environment.environmentId}:${provider.instanceId}`}
                    className="mt-1 text-2xs"
                    aria-label={
                      limits ? `Last reported ${limits.checkedAt}` : "No usage data reported"
                    }
                  >
                    {entries.length > 1 ? (
                      <p className="truncate text-muted-foreground">
                        {provider.displayName ?? provider.instanceId} · {environment.environmentId}
                      </p>
                    ) : null}
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        {window?.label ?? "Usage unavailable"}
                      </span>
                      <span>
                        {remaining === null ? ":" : `${remaining}%`}
                        {stale ? " · stale" : ""}
                      </span>
                    </div>
                    {remaining !== null ? (
                      <meter
                        aria-label={`${driver === "codex" ? "Codex weekly" : "Claude"} remaining`}
                        min={0}
                        max={100}
                        value={remaining}
                        className="mt-1 h-2 w-full"
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </section>
  );
}
