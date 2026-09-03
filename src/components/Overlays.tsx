"use client";

import { useEffect } from "react";
import { Lock, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { byId, money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";
import { Stars, Thumb } from "./Catalog";

/** Escape closes, and the page behind stops scrolling. Both are expected of a drawer. */
function useOverlay(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore();
  useOverlay(open, onClose);

  if (!open) return null;

  const total = store.cartTotalCents(state);
  const delivery = store.shippingCostCents(state);
  const v = store.violations(state);
  const live = store.checkoutLive(state);
  const missing = store.shippingMissing(state);
  const budget = state.constraints.budgetCents;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close the cart"
        onClick={onClose}
        className="scrim-in absolute inset-0 bg-black/35"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="drawer-in relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            data-audit="close-cart"
            className="rounded-full p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
          {state.lines.length === 0 ? (
            <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] px-5 py-14 text-center">
              <ShoppingBag className="size-6 text-[var(--color-muted)]" aria-hidden />
              <p className="mt-3 text-base font-medium">Nothing in the cart yet</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--color-muted)]">
                Set your budget in the bar above, then ask your agent to build the setup.
                You can add things by hand too.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full border border-[var(--color-ink)] px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-ink-fg)]"
              >
                Browse the shelf
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {state.lines.map((l) => {
                const p = byId(l.productId);
                if (!p) return null;
                return (
                  <li key={l.id} className="flex gap-3">
                    <Thumb
                      product={p}
                      className="size-20 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)]"
                      iconSize="size-6"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{p.name}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {money(p.priceCents * l.qty)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {money(p.priceCents)} each
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-full border border-[var(--color-border)]">
                          <Stepper
                            label={`One fewer ${p.name}`}
                            onClick={() => store.updateQuantity(p.id, l.qty - 1)}
                          >
                            <Minus className="size-3.5" aria-hidden />
                          </Stepper>
                          <span className="w-7 text-center font-mono text-xs tabular-nums">
                            {l.qty}
                          </span>
                          <Stepper
                            label={`One more ${p.name}`}
                            onClick={() => store.updateQuantity(p.id, Math.min(10, l.qty + 1))}
                          >
                            <Plus className="size-3.5" aria-hidden />
                          </Stepper>
                        </div>
                        <button
                          type="button"
                          onClick={() => store.removeFromCart(p.id)}
                          className="rounded-full p-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-danger)]"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          <span className="sr-only">Remove {p.name}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {state.lines.length > 0 && <ShippingForm />}
        </div>

        <footer className="border-t border-[var(--color-border)] px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm">Subtotal</span>
            <span className="text-sm font-medium tabular-nums">{money(total)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-xs text-[var(--color-muted)]">
            <span>Delivery {delivery ? "(express)" : "(standard)"}</span>
            <span className="tabular-nums">{delivery ? money(delivery) : "Free"}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-semibold tabular-nums">{money(total + delivery)}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Against a budget of <span className="font-medium tabular-nums">{money(budget)}</span>.
          </p>

          {v.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {v.map((x, i) => (
                <li key={i}>
                  {x.message}
                  {x.overByCents ? ` by ${money(x.overByCents)}` : ""}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3">
            {live ? (
              <p className="flex items-center gap-2 rounded-full border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-3 py-2 text-xs text-[var(--color-ok)]">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                Approved. The agent has a checkout tool for this exact basket.
              </p>
            ) : v.length === 0 && state.lines.length > 0 && missing.length === 0 ? (
              <button
                type="button"
                data-audit="approve-basket-drawer"
                onClick={store.approveAsIs}
                className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] transition-opacity hover:opacity-90"
              >
                Approve this basket
              </button>
            ) : (
              <p className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
                <Lock className="size-4 shrink-0" aria-hidden />
                {state.lines.length === 0
                  ? "Add something before you can approve a basket."
                  : v.length > 0
                    ? "Bring the cart inside your rules, then approve it."
                    : `Delivery needs ${missing.join(", ")} before you can approve.`}
              </p>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}

function Stepper({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function QuickView({ id, onClose }: { id: string | null; onClose: () => void }) {
  useOverlay(!!id, onClose);
  const state = useStore();
  const p = id ? byId(id) : undefined;
  if (!p) return null;

  const inCart = state.lines.find((l) => l.productId === p.id)?.qty ?? 0;
  const owned = state.constraints.have.includes(p.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="scrim-in absolute inset-0 bg-black/35"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qv-title"
        className="modal-in relative grid max-h-[86vh] w-full max-w-3xl grid-cols-1 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] sm:grid-cols-2"
      >
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="absolute right-3 top-3 z-10 rounded-full bg-[var(--color-surface)]/90 p-1.5 text-[var(--color-muted)] backdrop-blur transition-colors hover:text-[var(--color-fg)]"
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">Close</span>
        </button>

        <Thumb product={p} className="h-56 w-full sm:h-full" iconSize="size-16" />

        <div className="thin-scroll overflow-y-auto p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            {p.category}
          </p>
          <h2 id="qv-title" className="mt-1 text-xl font-semibold tracking-[-0.02em]">
            {p.name}
          </h2>
          <div className="mt-2">
            <Stars product={p} />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {money(p.priceCents)}
            </span>
            {p.compareAtCents && (
              <span className="text-sm tabular-nums text-[var(--color-muted)] line-through">
                {money(p.compareAtCents)}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed">{p.description}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Written by the seller, so your agent is told to read it as a claim rather than
            an instruction.
          </p>

          <dl className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] text-sm">
            {Object.entries(p.specs).map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="capitalize text-[var(--color-muted)]">{k}</dt>
                <dd className="text-right font-medium">{val}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">id: {p.id}</p>

          {owned && (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger)]">
              Your rules say you already have a {p.category}. Adding this puts the cart
              outside them.
            </p>
          )}

          <button
            type="button"
            onClick={() => store.addToCart(p.id)}
            className="mt-5 w-full rounded-full bg-[var(--color-ink)] py-2.5 text-sm font-medium text-[var(--color-ink-fg)] transition-opacity hover:opacity-90"
          >
            {inCart > 0 ? `Add another (${inCart} in cart)` : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The delivery form. A shop element, so it is ink and neutral like the rest of the
 * shelf — with one exception: a field the AGENT typed carries an accent marker, because
 * that is the only place on the page where the two of you are writing into the same
 * box. Accent still means machine authority and nothing else.
 *
 * Every input is a real input. The agent's set_shipping_details writes to the same
 * store the keyboard does; there is no separate agent path to fake.
 */
function Field({
  name,
  label,
  value,
  placeholder,
  required,
  type = "text",
}: {
  name: keyof store.State["shipping"];
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  const byAgent = useStore().shippingBy[name] === "agent";
  const empty = required && !value.trim();
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
        {label}
        {required && <span className="text-[var(--color-danger)]">*</span>}
        {byAgent && (
          <span className="rounded-full border border-[var(--color-accent)] px-1.5 py-px text-[10px] font-medium leading-tight text-[var(--color-accent)]">
            agent
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        data-audit={`ship-${name}`}
        placeholder={placeholder}
        onChange={(e) => store.setShipping({ [name]: e.target.value })}
        className={[
          "mt-1 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface-2)] px-2.5 py-1.5 text-sm transition-colors",
          "placeholder:text-[var(--color-muted)] focus:bg-[var(--color-surface)]",
          byAgent
            ? "border-[var(--color-accent)]"
            : empty
              ? "border-dashed border-[var(--color-border-strong)]"
              : "border-[var(--color-border)]",
        ].join(" ")}
      />
    </label>
  );
}

function ShippingForm() {
  const state = useStore();
  const sh = state.shipping;
  const missing = store.shippingMissing(state);
  const agentFields = Object.keys(state.shippingBy).length;

  return (
    <section aria-labelledby="delivery-heading" className="mt-6 border-t border-[var(--color-border)] pt-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id="delivery-heading" className="text-sm font-semibold tracking-[-0.02em]">
            Delivery details
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {agentFields > 0
              ? `Your agent filled ${agentFields} of these. Change anything you like.`
              : "Type these in, or ask your agent to. Nothing here is stored or sent anywhere."}
          </p>
        </div>
        {missing.length === 0 && (
          <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ok)]">
            <ShieldCheck className="size-3" aria-hidden />
            complete
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <Field name="fullName" label="Full name" value={sh.fullName} placeholder="Ada Lovelace" required />
        <div className="grid grid-cols-2 gap-3">
          <Field name="email" label="Email" value={sh.email} placeholder="ada@example.com" required type="email" />
          <Field name="phone" label="Phone" value={sh.phone} placeholder="Optional" />
        </div>
        <Field name="line1" label="Address" value={sh.line1} placeholder="12 Marconi Road" required />
        <Field name="line2" label="Flat, unit, building" value={sh.line2} placeholder="Optional" />
        <div className="grid grid-cols-3 gap-3">
          <Field name="city" label="City" value={sh.city} placeholder="Lagos" required />
          <Field name="postcode" label="Postcode" value={sh.postcode} placeholder="101233" required />
          <Field name="country" label="Country" value={sh.country} placeholder="Nigeria" required />
        </div>
        <Field name="notes" label="Delivery notes" value={sh.notes} placeholder="Optional. Leave with the concierge." />

        <fieldset>
          <legend className="text-xs font-medium text-[var(--color-muted)]">Delivery speed</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {(["standard", "express"] as const).map((sp) => {
              const on = sh.speed === sp;
              const byAgent = state.shippingBy.speed === "agent";
              return (
                <button
                  key={sp}
                  type="button"
                  data-audit={`ship-speed-${sp}`}
                  onClick={() => store.setShipping({ speed: sp })}
                  className={[
                    "rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors",
                    on
                      ? byAgent
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-ink)] bg-[var(--color-surface-2)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                  ].join(" ")}
                >
                  <span className="block text-sm font-medium capitalize">{sp}</span>
                  <span className="block text-xs text-[var(--color-muted)] tabular-nums">
                    {sp === "standard" ? "Free, 3-5 days" : `${money(store.EXPRESS_CENTS)}, next day`}
                  </span>
                </button>
              );
            })}
          </div>
          {sh.speed === "express" && (
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              Express counts against your budget like anything else in the cart.
            </p>
          )}
        </fieldset>
      </div>
    </section>
  );
}
