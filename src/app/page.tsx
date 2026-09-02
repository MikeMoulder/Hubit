"use client";

import { useState } from "react";
import { Catalog } from "@/components/Catalog";
import { CartDrawer, QuickView } from "@/components/Overlays";
import { RulesBar } from "@/components/RulesBar";
import { SiteFooter, SiteHeader } from "@/components/Shell";
import { ToolRail } from "@/components/ToolRail";
import { useToolSurface, useRuntime } from "@/lib/useHubit";
import type { Category } from "@/lib/types";

export default function Page() {
  useToolSurface();
  const runtime = useRuntime();

  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState<string | null>(null);

  return (
    <>
      {/* Header and rules travel together, so the gate never scrolls off screen. */}
      <div className="sticky top-0 z-30">
        <SiteHeader
          active={category}
          onCategory={setCategory}
          query={query}
          onSearch={setQuery}
          onOpenCart={() => setCartOpen(true)}
        />
        <RulesBar />
      </div>

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Catalog category={category} query={query} onQuickView={setQuickView} />

        <aside className="lg:sticky lg:top-[8.5rem] lg:h-[calc(100vh-10rem)]">
          <ToolRail />
          {runtime === "local" && (
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
              No agent is connected to this tab. Everything on this page works by hand, and
              the tool surface above is the real one: it is registered right now and nothing
              on it is simulated.
            </p>
          )}
        </aside>
      </main>

      <SiteFooter onCategory={setCategory} />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <QuickView id={quickView} onClose={() => setQuickView(null)} />
    </>
  );
}
