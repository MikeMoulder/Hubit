"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useToolRows, useRuntime, useStore } from "@/lib/useHubit";

/**
 * The money shot. Deliberately dark inside a light page: a pale rail loses the 0:30
 * beat on a projector.
 *
 * One row carries the whole argument, so one row gets the whole panel. `checkout` sits
 * alone at the top at full weight; the ten always-on tools collapse behind a
 * disclosure. Listing eleven identical boxes says "look how many tools we built",
 * which is not the pitch. One box that is not there says "the agent cannot do this",
 * which is.
 *
 * Rendered entirely from OUR registry via useToolRows. Never from `toolchange`,
 * which does not exist in ChatGPT's in-app browser (probe/FINDINGS.md finding 3).
 */
export function ToolRail() {
  const rows = useToolRows();
  const runtime = useRuntime();
  const { calls, seamErrors } = useStore();
  const [open, setOpen] = useState(false);

  const base = rows.filter((r) => !r.gated);
  const gate = rows.find((r) => r.gated);
  const baseLive = base.filter((r) => r.registered).length;

  return (
    <section
      aria-label="Live tool surface"
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--color-rail)] bg-[var(--color-rail)] text-[var(--color-rail-fg)]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-rail-border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Agent tool surface</h2>
          <p className="text-xs text-[var(--color-rail-muted)]">
            What the agent is allowed to do, right now
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-rail-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-rail-muted)]">
          {runtime}
        </span>
      </header>

      {/* The gated tool, alone, at full weight. Its absence is the product. */}
      {gate && (
        <div className="px-3 pt-3">
          <div
            className={[
              "rounded-[var(--radius)] border px-4 py-3.5 transition-colors",
              gate.registered
                ? "gate-open border-[var(--color-ok)] bg-[color-mix(in_oklch,var(--color-ok)_14%,transparent)]"
                : "border-dashed border-[var(--color-rail-border)] bg-transparent",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={[
                  "font-mono text-base",
                  gate.registered
                    ? "font-semibold"
                    : "text-[var(--color-rail-muted)] line-through decoration-1",
                ].join(" ")}
              >
                {gate.name}
              </span>
              {gate.callCount > 0 && (
                <span className="shrink-0 rounded border border-[var(--color-ok)] px-1.5 py-0.5 font-mono text-[10px] leading-none text-[var(--color-ok)]">
                  {gate.callCount}x
                </span>
              )}
            </div>
            <p
              className={[
                "mt-1.5 font-mono text-xs leading-relaxed",
                gate.registered ? "text-[var(--color-ok)]" : "text-[var(--color-rail-muted)]",
              ].join(" ")}
            >
              {gate.registered
                ? "REGISTERED, the shopper approved this basket"
                : "NOT REGISTERED, nothing for the agent to call"}
            </p>
          </div>
        </div>
      )}

      {/* Everything else is plumbing. Collapsed, but one click from a judge. */}
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--color-rail-2)]"
        >
          <ChevronDown
            className={`size-3.5 shrink-0 text-[var(--color-rail-muted)] transition-transform ${open ? "" : "-rotate-90"}`}
            aria-hidden
          />
          <span className="text-xs font-medium">{baseLive} other tools live</span>
          <span className="truncate text-xs text-[var(--color-rail-muted)]">
            browse, cart, propose
          </span>
        </button>
      </div>

      <ul
        className={[
          open ? "block" : "hidden",
          "thin-scroll max-h-64 shrink-0 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-2",
        ].join(" ")}
      >
        {base.map((r) => (
          <li
            key={r.name}
            className={[
              "rail-in rounded-md border px-3 py-2",
              r.registered
                ? "border-[var(--color-rail-border)] bg-[var(--color-rail-2)]"
                : "border-dashed border-[var(--color-rail-border)] bg-transparent opacity-55",
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
          </li>
        ))}
      </ul>

      {/* The call log is the proof of activity, and it stays open. */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[var(--color-rail-border)] px-3 py-2">
        <h3 className="px-1 pb-1 text-xs font-medium text-[var(--color-rail-muted)]">Calls</h3>
        <ol className="thin-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden font-mono text-xs">
          {calls.length === 0 && (
            <li className="px-1 py-1 text-[var(--color-rail-muted)]">
              No calls yet. Ask your agent to shop.
            </li>
          )}
          {calls
            .slice(-12)
            .reverse()
            .map((c) => (
              <li key={c.id} className="rail-in flex gap-2 px-1 py-0.5">
                <span
                  className={c.ok ? "text-[var(--color-ok)]" : "text-[var(--color-danger)]"}
                >
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
