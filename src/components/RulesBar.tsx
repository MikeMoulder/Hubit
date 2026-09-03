"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";

const CATEGORIES = ["monitor", "keyboard", "mouse", "desk", "chair"] as const;

const HAVE_LABEL: Record<(typeof CATEGORIES)[number], string> = {
  monitor: "Monitor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  desk: "Desk",
  chair: "Chair",
};

/**
 * The agent layer, pinned under the shop header so it never leaves the screen.
 *
 * Everything in here is accent, and nothing else on the page is. The spend meter is
 * the 0:25 beat: it fills as the agent shops and goes red at $1,284 against $1,200,
 * which is legible from the back of a room in a way a text line is not.
 *
 * The budget is a figure you type, not a slider. A slider reads as a prototype, and
 * there has to be a human-only path to write a rule: the agent can only ever call
 * `propose_constraint_change`, and that asymmetry is the whole point.
 *
 * "I already have" and the priority pair sit behind Edit rules, but they are ALWAYS
 * MOUNTED and merely hidden, never conditionally rendered. The capability audit drives
 * this bar by clicking real buttons, and a control that leaves the DOM is a control the
 * audit cannot reach.
 */
export function RulesBar() {
  const state = useStore();
  // Open by default. These are the shopper's rules, not an advanced setting, and a
  // judge landing cold should see what the agent is shopping against without hunting
  // for it. The collapse is there for anyone who wants the room back.
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<string | null>(null);

  const v = store.violations(state);
  const total = store.cartTotalCents(state);
  const live = store.checkoutLive(state);
  const budget = state.constraints.budgetCents;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const over = v.find((x) => x.field === "budgetCents");

  const have = state.constraints.have;
  const summary = have.length ? `You have a ${have.join(", a ")}` : "You have nothing yet";

  return (
    <section
      aria-label="Your rules"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-l-2 border-[var(--color-accent)] py-3 pl-4">
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="budget" className="text-xs font-medium">
              Budget
            </label>
            <div className="flex items-center rounded-full border border-[var(--color-border)] px-2.5 py-1 transition-colors focus-within:border-[var(--color-accent)] hover:border-[var(--color-border-strong)]">
              <span className="text-sm text-[var(--color-muted)]">$</span>
              <input
                id="budget"
                data-audit="budget"
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                value={draft ?? String(Math.round(budget / 100))}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDraft(raw);
                  const n = Number(raw);
                  // An empty field is a keystroke on the way somewhere, not a budget
                  // of zero. Hold the last real value until they finish typing.
                  if (raw !== "" && Number.isFinite(n) && n >= 0) {
                    store.setBudget(Math.round(n * 100));
                  }
                }}
                onBlur={() => setDraft(null)}
                className="w-[4.5rem] bg-transparent text-sm font-semibold tabular-nums outline-none"
              />
            </div>
          </div>

          <div className="flex min-w-[180px] flex-1 flex-col justify-center">
            <div
              className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Cart total against budget"
            >
              <div
                className={[
                  "h-full rounded-full transition-[width,background-color] duration-300 ease-out",
                  over ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]",
                ].join(" ")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-fg)]">{money(total)}</span> of{" "}
              {money(budget)}
              {over && (
                <span className="ml-2 whitespace-nowrap font-semibold text-[var(--color-danger)]">
                  over by {money(over.overByCents ?? 0)}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((x) => !x)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            <span>
              {summary} <span className="opacity-50">·</span> Prioritise{" "}
              {state.constraints.priority}
            </span>
            <ChevronDown
              className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
              aria-hidden
            />
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <GateStatus violations={v.length} approved={state.approved} live={live} />
            {!state.pending && v.length === 0 && !state.approved && state.lines.length > 0 && (
              <button
                type="button"
                data-audit="approve-basket"
                onClick={store.approveAsIs}
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
              >
                Approve this basket
              </button>
            )}
            {state.approved && !state.order && (
              <button
                type="button"
                data-audit="withdraw"
                onClick={store.revokeApproval}
                className="rounded-full border border-[var(--color-border)] px-3.5 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              >
                Withdraw approval
              </button>
            )}
          </div>
        </div>

        {/* Hidden, never unmounted. See the note at the top of this file. */}
        <div
          className={[
            open ? "flex" : "hidden",
            "ml-4 mb-3 flex-wrap items-center gap-x-6 gap-y-2 pl-4",
          ].join(" ")}
        >
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Things you already own</legend>
            <span className="text-xs font-medium">I already have</span>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-audit={`have-${c}`}
                  onClick={() => store.toggleHave(c)}
                  aria-pressed={have.includes(c)}
                  className={pill(have.includes(c))}
                >
                  {HAVE_LABEL[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">What to optimise for</legend>
            <span className="text-xs font-medium">Prioritise</span>
            <div className="flex gap-1">
              {(["quality", "price"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-audit={`priority-${p}`}
                  onClick={() => store.setPriority(p)}
                  aria-pressed={state.constraints.priority === p}
                  className={pill(state.constraints.priority === p)}
                >
                  {p === "quality" ? "Quality" : "Price"}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-xs text-[var(--color-muted)]">
            The agent reads these and shops against them. It cannot change them on its own.
          </p>
        </div>

        {/* Violations that are not the budget, spelled out rather than counted. */}
        {v.some((x) => x.field !== "budgetCents") && (
          <ul className="rail-in ml-4 mb-3 flex flex-wrap gap-2 border-l-2 border-[var(--color-danger)] pl-4 text-xs text-[var(--color-danger)]">
            {v
              .filter((x) => x.field !== "budgetCents")
              .map((x, i) => (
                <li key={i}>{x.message}</li>
              ))}
          </ul>
        )}

        {/* The proposal. The click that opens the gate. */}
        {state.pending && (
          <div className="rail-in mb-3 ml-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3">
            <Sparkles className="size-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                The agent is asking to raise your budget to{" "}
                <span className="font-semibold tabular-nums">
                  {money(Number(state.pending.to))}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{state.pending.reason}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                data-audit="approve-change"
                onClick={store.approveProposal}
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
              >
                Approve the change
              </button>
              <button
                type="button"
                data-audit="reject"
                onClick={store.rejectProposal}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:border-[var(--color-muted)]"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Order banner lives here, not in the drawer: the drawer can be closed. */}
        {state.order && (
          <div className="gate-open mb-3 ml-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius)] border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-4 py-3">
            <Check className="size-4 shrink-0 text-[var(--color-ok)]" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              Order placed for{" "}
              <span className="font-semibold tabular-nums">{money(state.order.total)}</span>. The
              agent checked out after you approved the basket, and the tool is gone again.
            </p>
            <button
              type="button"
              data-audit="start-over"
              onClick={store.reset}
              className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:border-[var(--color-muted)]"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function GateStatus({
  violations,
  approved,
  live,
}: {
  violations: number;
  approved: boolean;
  live: boolean;
}) {
  if (live) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-ok)]">
        <ShieldCheck className="size-3.5" aria-hidden />
        Checkout is open to the agent
      </span>
    );
  }
  return (
    <span
      className={[
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
        violations
          ? "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)]",
      ].join(" ")}
    >
      <Lock className="size-3.5" aria-hidden />
      {violations
        ? "Rules not met, checkout withheld"
        : approved
          ? "Approved"
          : "Checkout withheld until you approve"}
    </span>
  );
}

const pill = (on: boolean) =>
  [
    "rounded-full border px-2.5 py-1 text-xs transition-colors",
    on
      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]",
  ].join(" ");
