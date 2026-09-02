"use client";

import { useMemo, useState } from "react";
import { Armchair, Check, Keyboard, Monitor, Mouse, Search, Star, Table } from "lucide-react";
import {
  CATALOG,
  CATEGORY_LABEL,
  imageSrc,
  money,
  rating,
  reviewCount,
} from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";
import type { Category, Product } from "@/lib/types";

type Sort = "featured" | "price-asc" | "price-desc" | "rating";

const CATEGORY_ICON: Record<Category, typeof Monitor> = {
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  desk: Table,
  chair: Armchair,
};

/** Each category gets its own tint so a photo-free grid still reads as a shelf. */
const CATEGORY_TINT: Record<Category, string> = {
  monitor: "oklch(0.955 0.012 250)",
  keyboard: "oklch(0.955 0.012 160)",
  mouse: "oklch(0.955 0.014 60)",
  desk: "oklch(0.955 0.013 30)",
  chair: "oklch(0.955 0.012 310)",
};

/**
 * Product art. A real photo when /public/products/<id>.jpg exists, otherwise a
 * category-tinted panel carrying the category icon. The fallback is a designed
 * state, not a placeholder: nothing on this page ever renders as a grey rectangle.
 */
export function Thumb({
  product,
  className = "",
  iconSize = "size-10",
}: {
  product: Product;
  className?: string;
  iconSize?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageSrc(product);
  const Icon = CATEGORY_ICON[product.category];

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ background: CATEGORY_TINT[product.category] }}
        aria-hidden
      >
        <Icon className={`${iconSize} text-[var(--color-fg)] opacity-35`} strokeWidth={1.25} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={product.name}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export function Stars({ product, compact = false }: { product: Product; compact?: boolean }) {
  const r = rating(product);
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
      <span className="flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={
              i < Math.round(r)
                ? "size-3 fill-[var(--color-sale)] text-[var(--color-sale)]"
                : "size-3 text-[var(--color-border-strong)]"
            }
          />
        ))}
      </span>
      <span className="tabular-nums">{r.toFixed(1)}</span>
      {!compact && <span className="tabular-nums">({reviewCount(product)})</span>}
      <span className="sr-only">
        {r.toFixed(1)} out of 5, {reviewCount(product)} reviews
      </span>
    </span>
  );
}

export function Catalog({
  category,
  query,
  onQuickView,
}: {
  category: Category | "all";
  query: string;
  onQuickView: (id: string) => void;
}) {
  const state = useStore();
  const [sort, setSort] = useState<Sort>("featured");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = CATALOG.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...hits];
    if (sort === "price-asc") sorted.sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "price-desc") sorted.sort((a, b) => b.priceCents - a.priceCents);
    if (sort === "rating") sorted.sort((a, b) => rating(b) - rating(a));
    return sorted;
  }, [category, query, sort]);

  return (
    <section aria-labelledby="shelf-heading" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 id="shelf-heading" className="text-xl font-semibold tracking-[-0.02em]">
            {category === "all" ? "Everything on the shelf" : CATEGORY_LABEL[category]}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {query
              ? `${shown.length} ${shown.length === 1 ? "match" : "matches"} for "${query}".`
              : "Desk gear, priced honestly, described by the seller. Your agent reads the same shelf you do."}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-border-strong)]"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="rating">Rating</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] px-6 py-16 text-center">
          <Search className="size-6 text-[var(--color-muted)]" aria-hidden />
          <p className="mt-3 text-base font-medium">Nothing on the shelf matches that</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
            Try a broader word, or clear the search and browse a category. There are 40
            products in total.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              inCart={state.lines.find((l) => l.productId === p.id)?.qty ?? 0}
              alreadyOwned={state.constraints.have.includes(p.category)}
              onQuickView={onQuickView}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProductCard({
  product: p,
  index,
  inCart,
  alreadyOwned,
  onQuickView,
}: {
  product: Product;
  index: number;
  inCart: number;
  alreadyOwned: boolean;
  onQuickView: (id: string) => void;
}) {
  return (
    <li
      className="card-in group flex flex-col"
      style={{ animationDelay: `${Math.min(index, 7) * 30}ms` }}
    >
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => onQuickView(p.id)}
          className="block w-full"
          aria-label={`View ${p.name}`}
        >
          <Thumb
            product={p}
            className="aspect-[4/5] w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            iconSize="size-14"
          />
        </button>

        {p.badge && (
          <span
            className={[
              "pointer-events-none absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide",
              p.badge === "Sale"
                ? "bg-[var(--color-sale)] text-white"
                : p.badge === "Low stock"
                  ? "bg-[var(--color-surface)] text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]"
                  : "bg-[var(--color-ink)] text-[var(--color-ink-fg)]",
            ].join(" ")}
          >
            {p.badge}
          </span>
        )}

        {inCart > 0 && (
          <span className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[var(--color-ok)] px-2.5 py-1 text-[10px] font-medium text-white">
            <Check className="size-3" aria-hidden />
            {inCart} in cart
          </span>
        )}

        {/* Quick view rides in on hover, and is reachable by keyboard through the
            image button above, so hiding it costs nothing. */}
        <button
          type="button"
          onClick={() => onQuickView(p.id)}
          tabIndex={-1}
          aria-hidden
          className="absolute inset-x-2.5 bottom-2.5 translate-y-2 rounded-full bg-[var(--color-surface)]/95 py-2 text-xs font-medium opacity-0 shadow-sm backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
        >
          Quick view
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <h2 className="text-sm font-medium leading-snug">
          <button type="button" onClick={() => onQuickView(p.id)} className="text-left hover:underline">
            {p.name}
          </button>
        </h2>
        <div className="mt-1">
          <Stars product={p} />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums">
            {money(p.priceCents)}
          </span>
          {p.compareAtCents && (
            <span className="text-xs tabular-nums text-[var(--color-muted)] line-through">
              {money(p.compareAtCents)}
            </span>
          )}
        </div>

        {alreadyOwned && (
          <p className="mt-1.5 text-xs text-[var(--color-danger)]">
            You told the agent you already have a {p.category}
          </p>
        )}

        <button
          type="button"
          onClick={() => store.addToCart(p.id)}
          className="mt-3 w-full rounded-full border border-[var(--color-ink)] py-2 text-xs font-medium transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-ink-fg)]"
        >
          {inCart > 0 ? "Add another" : "Add to cart"}
        </button>
      </div>
    </li>
  );
}
