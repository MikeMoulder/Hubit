"use client";

import { ArrowUpRight, Search, ShoppingBag } from "lucide-react";
import { CATEGORY_LABEL, countByCategory, money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore } from "@/lib/useHubit";
import type { Category } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

/**
 * Store chrome. Everything here is ink, never accent: the accent belongs to the
 * agent layer and loses its meaning the moment it decorates a nav bar.
 */

export function SiteHeader({
  active,
  onCategory,
  onSearch,
  query,
  onOpenCart,
}: {
  active: Category | "all";
  onCategory: (c: Category | "all") => void;
  onSearch: (q: string) => void;
  query: string;
  onOpenCart: () => void;
}) {
  const state = useStore();
  const count = state.lines.reduce((n, l) => n + l.qty, 0);
  const total = store.cartTotalCents(state);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
        <button
          type="button"
          onClick={() => {
            onCategory("all");
            onSearch("");
          }}
          className="shrink-0 text-lg font-semibold tracking-[-0.02em]"
        >
          Hubit
          <span className="ml-2 hidden text-xs font-normal text-[var(--color-muted)] sm:inline">
            Desk &amp; gear
          </span>
        </button>

        <nav aria-label="Categories" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink on={active === "all"} onClick={() => onCategory("all")}>
                All
              </NavLink>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c}>
                <NavLink on={active === c} onClick={() => onCategory(c)}>
                  {CATEGORY_LABEL[c]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label className="relative hidden md:block">
            <span className="sr-only">Search the shelf</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search the shelf"
              className="w-52 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pl-8 pr-3 text-sm transition-colors placeholder:text-[var(--color-muted)] hover:border-[var(--color-border-strong)] focus:bg-[var(--color-surface)]"
            />
          </label>

          <button
            type="button"
            onClick={onOpenCart}
            data-audit="open-cart"
            className="flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink-fg)] transition-opacity hover:opacity-90"
          >
            <ShoppingBag className="size-4" aria-hidden />
            <span className="tabular-nums">{count}</span>
            {count > 0 && (
              <span className="border-l border-white/25 pl-2 text-xs tabular-nums">
                {money(total)}
              </span>
            )}
            <span className="sr-only">Open the cart</span>
          </button>
        </div>
      </div>

      {/* Categories collapse to a scroll strip below the logo on narrow screens. */}
      <nav aria-label="Categories, compact" className="lg:hidden">
        <ul className="thin-scroll flex gap-1 overflow-x-auto px-6 pb-2.5">
          <li>
            <NavLink on={active === "all"} onClick={() => onCategory("all")}>
              All
            </NavLink>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c}>
              <NavLink on={active === c} onClick={() => onCategory(c)}>
                {CATEGORY_LABEL[c]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function NavLink({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={[
        "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
        on
          ? "bg-[var(--color-surface-2)] font-medium text-[var(--color-fg)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function SiteFooter({
  onCategory,
}: {
  onCategory: (c: Category | "all") => void;
}) {
  const steps = [
    "Set a budget and say what you already own",
    "Ask your agent to build the setup",
    "Watch the cart fill against your rules",
    "Approve the basket, or withdraw at any point",
  ];

  return (
    <footer className="mt-14 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1.3fr]">
        <div>
          <p className="text-base font-semibold tracking-[-0.02em]">Hubit</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--color-muted)]">
            Desk gear for people who would rather their agent did the shopping. You set
            the budget, it does the browsing, and it cannot check out until you say so.
          </p>
        </div>

        {/* These looked like links and did nothing. Now they filter the shelf. */}
        <nav aria-label="Shop by category">
          <h2 className="text-sm font-semibold">Shop</h2>
          <ul className="mt-3 space-y-2">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    onCategory(c);
                    window.scrollTo({ top: 0 });
                  }}
                  className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)] hover:underline"
                >
                  {CATEGORY_LABEL[c]}{" "}
                  <span className="tabular-nums opacity-60">{countByCategory(c)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold">How this works</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-sm text-[var(--color-muted)]">
                <span className="shrink-0 tabular-nums opacity-50">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Open source</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            The whole shop is one static page. No backend, no database, no accounts, and
            nothing about you leaves the tab.
          </p>
          <a
            href="https://github.com/MikeMoulder/Hubit"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Read the source on GitHub
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
          <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
            Agent shopping needs Chrome with WebMCP enabled, or ChatGPT&rsquo;s in-app
            browser. Everything here works by hand without either.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[var(--color-muted)]">
          <p>Hubit is a demonstration shop. Nothing ships and no card is charged.</p>
          <p>Built for the WebMCP Challenge</p>
        </div>
      </div>
    </footer>
  );
}
