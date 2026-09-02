"use client";

import { Catalog, Cart } from "@/components/Catalog";
import { Constraints } from "@/components/Constraints";
import { ToolRail } from "@/components/ToolRail";
import { useToolSurface, useRuntime } from "@/lib/useHubit";

export default function Page() {
  useToolSurface();
  const runtime = useRuntime();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Hubit</h1>
            <span className="text-sm text-[var(--color-muted)]">Tech &amp; Gadget Store</span>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            You set the rules. Your agent does the shopping. It cannot check out until you
            approve.
          </p>
        </div>
        {runtime === "local" && (
          <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-muted)]">
            No agent connected. Everything here works by hand, and the tool surface is
            still live.
          </p>
        )}
      </header>

      {/* hero: rules, cart and the tool rail all visible without scrolling */}
      <main className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Constraints />
          <Cart />
        </div>
        <Catalog />
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <ToolRail />
        </div>
      </main>
    </div>
  );
}
