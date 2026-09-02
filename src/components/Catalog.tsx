"use client";

import { useState } from "react";
import { CATALOG, CATEGORY_LABEL, byId, money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";
import type { Category, Product } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

/** Product image if one was supplied, otherwise an initials block that looks deliberate. */
function Thumb({ product, size = 40 }: { product: Product; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = product.image;
  const initials = product.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (!src || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-soft)] font-mono text-xs font-semibold text-[var(--color-accent)]"
      >
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={product.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function Catalog() {
  const state = useStore();
  const [filter, setFilter] = useState<Category | "all">("all");
  const shown = CATALOG.filter((p) => filter === "all" || p.category === filter);

  return (
    <section aria-label="Catalog" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={chip(filter === "all")}
        >
          Everything
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={chip(filter === c)}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((p) => {
          const inCart = state.lines.find((l) => l.productId === p.id);
          const alreadyOwned = state.constraints.have.includes(p.category);
          return (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <Thumb product={p} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-medium">{p.name}</h3>
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {money(p.priceCents)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">
                  {p.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => store.addToCart(p.id)}
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {inCart ? `In cart (${inCart.qty})` : "Add to cart"}
                  </button>
                  {alreadyOwned && (
                    <span className="text-xs text-[var(--color-danger)]">
                      You said you have one
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Cart() {
  const state = useStore();
  const total = store.cartTotalCents(state);

  if (state.order) {
    return (
      <section
        aria-label="Order"
        className="rounded-[var(--radius)] border border-[var(--color-ok)] bg-[var(--color-ok-soft)] p-4"
      >
        <h2 className="text-sm font-semibold">Order confirmed</h2>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
          {money(state.order.total)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          The agent placed this order after you approved the basket.
        </p>
        <button
          type="button"
          onClick={store.reset}
          className="mt-3 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-muted)]"
        >
          Start over
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Cart"
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <h2 className="text-sm font-semibold tracking-tight">Cart</h2>

      {state.lines.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-6 text-center">
          <p className="text-sm font-medium">Nothing in the cart yet</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Set your rules, then ask your agent to build the setup. Or add things yourself.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {state.lines.map((l) => {
            const p = byId(l.productId);
            if (!p) return null;
            return (
              <li key={l.id} className="flex items-center gap-2.5">
                <Thumb product={p} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={l.qty}
                  aria-label={`Quantity of ${p.name}`}
                  onChange={(e) => store.updateQuantity(p.id, Number(e.target.value))}
                  className="w-12 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-center font-mono text-xs tabular-nums"
                />
                <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums">
                  {money(p.priceCents * l.qty)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-2.5">
        <span className="text-sm font-medium">Total</span>
        <span className="font-mono text-xl font-semibold tabular-nums">{money(total)}</span>
      </div>
    </section>
  );
}

const chip = (on: boolean) =>
  [
    "rounded-full border px-2.5 py-1 text-xs transition-colors",
    on
      ? "border-[var(--color-fg)] bg-[var(--color-fg)] font-medium text-[var(--color-bg)]"
      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]",
  ].join(" ");
