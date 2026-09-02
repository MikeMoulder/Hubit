"use client";

import { Search, ShoppingBag, ShieldCheck } from "lucide-react";
import { CATEGORY_LABEL, countByCategory, money } from "@/lib/catalog";
import * as store from "@/lib/store";
import { useStore, useRuntime } from "@/lib/useHubit";
import type { Category } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

/**
 * Store chrome. Everything here is ink, never accent: the accent belongs to the
 * agent layer and loses its meaning the moment it decorates a nav bar.
 */

export function AnnouncementBar() {
  const runtime = useRuntime();
  const line =
    runtime === "webmcp"
      ? "An agent is connected to this tab. It can browse and fill your cart, and it cannot check out without you."
      : "Set your rules, then let your agent do the shopping. It fills the cart, you approve the basket.";

  return (
    <div className="bg-[var(--color-ink)] text-[var(--color-ink-fg)]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-6 py-2 text-xs">
        <ShieldCheck className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <p className="truncate">{line}</p>
      </div>
    </div>
  );
}

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

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-semibold tracking-[-0.02em]">Hubit</p>
          <p className="mt-2 max-w-xs text-sm text-[var(--color-muted)]">
            A shop built so an agent can use it. You set the rules, it does the browsing,
            and the checkout tool only exists once you say so.
          </p>
        </div>

        <FooterCol
          title="Shop"
          items={CATEGORIES.map((c) => `${CATEGORY_LABEL[c]} (${countByCategory(c)})`)}
        />
        <FooterCol
          title="How this works"
          items={[
            "Set a budget and what you own",
            "Ask your agent to build a setup",
            "Approve the basket it lands on",
            "Withdraw approval at any point",
          ]}
        />
        <FooterCol
          title="For agents"
          items={[
            "11 tools on document.modelContext",
            "Reads are marked read only",
            "Seller copy is marked untrusted",
            "checkout is registered, never argued",
          ]}
        />
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[var(--color-muted)]">
          <p>Hubit is a demonstration shop. Nothing here ships and no card is charged.</p>
          <p>Built for the WebMCP Challenge</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
