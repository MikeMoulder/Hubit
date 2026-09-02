"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as store from "./store";
import { BASE_TOOLS, CHECKOUT_TOOL } from "./tools";
import { attachToolChangeProbe, getHost, onSeamError } from "./webmcp";
import type { ToolRow } from "./types";

export function useStore(): store.State {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/**
 * Registers the tool surface and drives the gate.
 *
 * Order matters: base tools register FIRST, before anything optional runs. An
 * unguarded call ahead of registration once produced a page with zero tools and no
 * visible error (probe/FINDINGS.md finding 6).
 */
export function useToolSurface() {
  const state = useStore();
  const live = store.checkoutLive(state);

  // 1. THE WHOLE SURFACE, rebuilt as a function of the gate. Registering checkout
  //    through a second, separate effect left it callable-but-rejecting; registering
  //    the entire surface the same way every time is both simpler and correct:
  //    the tool surface IS derived state.
  useEffect(() => {
    const host = getHost();
    const surface = live ? [...BASE_TOOLS, CHECKOUT_TOOL] : BASE_TOOLS;
    const offs = surface.map((t) => host.register(t));
    return () => offs.forEach((off) => off());
  }, [live]);

  // 2. optional wiring, only after registration
  useEffect(() => {
    onSeamError(store.recordSeamError);
    const onError = (ev: ErrorEvent) => store.recordSeamError(ev.message);
    window.addEventListener("error", onError);
    // Chrome-only cross-check. Throws in ChatGPT's in-app browser, so it is guarded
    // inside the seam and nothing renders from it.
    const detach = attachToolChangeProbe(() => {});
    return () => {
      window.removeEventListener("error", onError);
      detach();
    };
  }, []);


}

/**
 * Subscribes to the host registry itself, not just to the app store.
 *
 * Registration happens inside useToolSurface's effect, which runs AFTER the render
 * caused by the store change that opened the gate. Reading getHost().list() during
 * render without subscribing therefore showed the registry as it was one update ago:
 * approving the basket flipped the rules bar to "checkout is open" while the rail
 * still said NOT REGISTERED, until some later store change happened to repaint it.
 * That is the 0:40 beat, so it has to be exact.
 *
 * The snapshot is a joined string so React can compare it by value. Returning a fresh
 * Set or array here would be a new reference every call and would never settle.
 */
function useLiveToolNames(): string {
  return useSyncExternalStore(
    (cb) => getHost().onChange(cb),
    () => getHost().list().map((t) => t.name).sort().join(","),
    () => ""
  );
}

export function useToolRows(): ToolRow[] {
  const state = useStore();

  const counts = new Map<string, { n: number; last?: string }>();
  for (const c of state.calls) {
    const prev = counts.get(c.name);
    counts.set(c.name, { n: (prev?.n ?? 0) + 1, last: c.args });
  }

  // Render from the host's ACTUAL registry, not from the BASE_TOOLS array. If a tool
  // ever fails to register, the rail must show that rather than claim it is live.
  const liveNames = new Set(useLiveToolNames().split(",").filter(Boolean));

  const rows: ToolRow[] = BASE_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    readOnly: !!t.annotations?.readOnlyHint,
    untrusted: !!t.annotations?.untrustedContentHint,
    registered: liveNames.has(t.name),
    callCount: counts.get(t.name)?.n ?? 0,
    lastArgs: counts.get(t.name)?.last,
  }));

  // The gated slot is always rendered. Its absence must be as visible as its presence.
  rows.push({
    name: CHECKOUT_TOOL.name,
    description: CHECKOUT_TOOL.description,
    readOnly: false,
    untrusted: false,
    registered: liveNames.has(CHECKOUT_TOOL.name),
    gated: true,
    callCount: counts.get("checkout")?.n ?? 0,
    lastArgs: counts.get("checkout")?.last,
  });

  return rows;
}

export function useRuntime() {
  return useSyncExternalStore(
    () => () => {},
    () => getHost().runtime,
    () => "local" as const
  );
}
