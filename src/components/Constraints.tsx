"use client";

import { money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";

const CATEGORIES = ["monitor", "keyboard", "mouse", "desk", "chair"] as const;

export function Constraints() {
  const state = useStore();
  const v = store.violations(state);
  const total = store.cartTotalCents(state);
  const over = v.find((x) => x.field === "budgetCents")?.overByCents ?? 0;
  const live = store.checkoutLive(state);

  return (
    <section
      aria-label="Your rules"
      className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Your rules</h2>
        <p className="text-xs text-[var(--color-muted)]">
          The agent shops against these. It cannot change them on its own.
        </p>
      </div>

      <div>
        <label htmlFor="budget" className="mb-1 block text-xs font-medium">
          Budget
        </label>
        <div className="flex items-center gap-3">
          <input
            id="budget"
            type="range"
            min={50000}
            max={250000}
            step={1000}
            value={state.constraints.budgetCents}
            onChange={(e) => store.setBudget(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded bg-[var(--color-surface-2)] accent-[var(--color-accent)]"
          />
          <span className="w-20 text-right font-mono text-sm font-semibold tabular-nums">
            {money(state.constraints.budgetCents)}
          </span>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium">I already have</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const on = state.constraints.have.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => store.toggleHave(c)}
                aria-pressed={on}
                className={[
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]",
                ].join(" ")}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium">Prioritise</legend>
        <div className="flex gap-1.5">
          {(["quality", "price"] as const).map((p) => {
            const on = state.constraints.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => store.setPriority(p)}
                aria-pressed={on}
                className={[
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]",
                ].join(" ")}
              >
                {p}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Status. This is the panel that flips red at 0:25. */}
      <div
        className={[
          "rounded-md border px-3 py-2.5",
          v.length
            ? "border-[var(--color-danger)] bg-[var(--color-danger-soft)]"
            : "border-[var(--color-ok)] bg-[var(--color-ok-soft)]",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium">
            {v.length ? "Rules not met" : "All rules met"}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {money(total)}
          </span>
        </div>
        {v.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-danger)]">
            {v.map((x, i) => (
              <li key={i}>
                {x.message}
                {x.overByCents ? ` by ${money(x.overByCents)}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {live
              ? "Checkout is available to the agent."
              : "Approve this basket to let the agent check out."}
          </p>
        )}
      </div>

      {/* The proposal. The click that opens the gate. */}
      {state.pending && (
        <div className="rail-in rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-3">
          <p className="text-xs font-medium">The agent is asking to change a rule</p>
          <p className="mt-1 font-mono text-sm">
            Budget {state.pending.from} → {money(Number(state.pending.to))}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{state.pending.reason}</p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={store.approveProposal}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
            >
              Approve the change
            </button>
            <button
              type="button"
              onClick={store.rejectProposal}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-muted)]"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {!state.pending && v.length === 0 && !state.approved && state.lines.length > 0 && (
        <button
          type="button"
          onClick={store.approveAsIs}
          className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
        >
          Approve this basket
        </button>
      )}

      {state.approved && !state.order && (
        <button
          type="button"
          onClick={store.revokeApproval}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
        >
          Withdraw approval
        </button>
      )}
    </section>
  );
}
