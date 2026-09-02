"use client";

import { useToolRows, useRuntime, useStore } from "@/lib/useHubit";

/**
 * The money shot. Deliberately dark inside a light page: a pale rail loses the 0:30
 * beat on a projector.
 *
 * Rendered entirely from OUR registry via useToolRows. Never from `toolchange`,
 * which does not exist in ChatGPT's in-app browser (probe/FINDINGS.md finding 3).
 */
export function ToolRail() {
  const rows = useToolRows();
  const runtime = useRuntime();
  const { calls, seamErrors } = useStore();
  const liveCount = rows.filter((r) => r.registered).length;

  return (
    <section
      aria-label="Live tool surface"
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius)] bg-[var(--color-rail)] text-[var(--color-rail-fg)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-rail-border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Agent tool surface</h2>
          <p className="text-xs text-[var(--color-rail-muted)]">
            What the agent is allowed to do, right now
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-rail-border)] px-2 py-0.5 font-mono text-xs text-[var(--color-rail-muted)]">
          {liveCount} live · {runtime}
        </span>
      </header>

      <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {rows.map((r) => (
          <li
            key={r.name}
            className={[
              "rail-in rounded-md border px-3 py-2 transition-colors",
              r.registered
                ? "border-[var(--color-rail-border)] bg-[var(--color-rail-2)]"
                : "border-dashed border-[var(--color-rail-border)] bg-transparent opacity-55",
              r.gated && r.registered ? "gate-open border-[var(--color-ok)]" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={[
                  "font-mono text-sm",
                  r.registered ? "font-semibold" : "line-through decoration-1",
                ].join(" ")}
              >
                {r.name}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {r.readOnly && <Tag>read only</Tag>}
                {r.untrusted && <Tag tone="warn">untrusted output</Tag>}
                {r.callCount > 0 && <Tag tone="ok">{r.callCount}x</Tag>}
              </span>
            </div>

            {r.gated && (
              <p
                className={[
                  "mt-1 font-mono text-xs",
                  r.registered ? "text-[var(--color-ok)]" : "text-[var(--color-rail-muted)]",
                ].join(" ")}
              >
                {r.registered
                  ? "REGISTERED, the shopper approved this basket"
                  : "NOT REGISTERED, nothing for the agent to call"}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-[var(--color-rail-border)] px-3 py-2">
        <h3 className="px-1 pb-1 text-xs font-medium text-[var(--color-rail-muted)]">
          Calls
        </h3>
        <ol className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-xs">
          {calls.length === 0 && (
            <li className="px-1 py-1 text-[var(--color-rail-muted)]">
              No calls yet. Ask your agent to shop.
            </li>
          )}
          {calls.slice(-12).reverse().map((c) => (
            <li key={c.id} className="rail-in flex gap-2 px-1 py-0.5">
              <span className={c.ok ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}>
                {c.ok ? "✓" : "✗"}
              </span>
              <span className="truncate">
                {c.name}
                <span className="text-[var(--color-rail-muted)]"> {c.args}</span>
              </span>
            </li>
          ))}
        </ol>
        {seamErrors.length > 0 && (
          <p className="mt-2 rounded border border-[var(--color-danger)] px-2 py-1 font-mono text-xs text-[var(--color-danger)]">
            {seamErrors[seamErrors.length - 1]}
          </p>
        )}
      </div>
    </section>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "ok" | "warn" }) {
  const color =
    tone === "ok"
      ? "border-[var(--color-ok)] text-[var(--color-ok)]"
      : tone === "warn"
        ? "border-amber-400/60 text-amber-300"
        : "border-[var(--color-rail-border)] text-[var(--color-rail-muted)]";
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none ${color}`}>
      {children}
    </span>
  );
}
