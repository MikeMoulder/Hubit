/**
 * THE SEAM. The only file in this project that touches `document.modelContext`.
 *
 * Every fact encoded here was measured on 2026-09-02, see ../../probe/FINDINGS.md:
 *
 *  1. Late registration works. A tool registered seconds after load lands in the
 *     registry and executes, in Chrome 152 AND in ChatGPT's in-app browser.
 *  2. AbortSignal teardown is SOUND. After abort() the tool is unfindable and a stale
 *     handle captured beforehand is REJECTED on call. That is Hubit's whole thesis.
 *  3. `toolchange` is NOT USABLE. It fires on document.modelContext in Chrome, but
 *     modelContext is not an EventTarget in ChatGPT's in-app browser at all
 *     (addEventListener throws TypeError). We therefore keep our OWN registry and
 *     our OWN change signal, and never render from `toolchange`.
 *  4. `inputSchema` does NOT validate. Every tool validates its own arguments.
 *  5. `executeTool(tool, args)` wants a RegisteredTool object and a JSON STRING, and
 *     returns a JSON STRING. That is the agent's real path, and the path the
 *     capability audit drives. There is no simulated path in this build.
 *  6. Registration must happen BEFORE any optional code. An unguarded call ahead of
 *     it once produced a page with zero tools and no visible error.
 */

import type { RegisteredToolInfo, ToolDef, ToolHost } from "./types";

type Entry = { def: ToolDef; controller: AbortController };

/** Minimal shape of the WebMCP API we rely on. Deliberately narrow. */
type ModelContextLike = {
  // Chrome 152 returns a promise here. It is not documented as such and it is not
  // awaited anywhere: the only thing that matters is that it REJECTS on abort, which
  // has to be caught. See the call site in register().
  registerTool: (
    tool: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) => unknown;
};

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as PromiseLike<unknown>).then === "function"
  );
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === "undefined") return null;
  const mc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  return mc && typeof mc.registerTool === "function" ? mc : null;
}

class Host implements ToolHost {
  readonly available: boolean;
  readonly runtime: "webmcp" | "local";
  private mc: ModelContextLike | null;
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();

  constructor() {
    this.mc = getModelContext();
    this.available = this.mc !== null;
    this.runtime = this.available ? "webmcp" : "local";
  }

  private emit() {
    for (const cb of this.listeners) cb();
  }

  register(def: ToolDef): () => void {
    // Replace rather than duplicate if the same name is registered twice.
    this.entries.get(def.name)?.controller.abort();

    const controller = new AbortController();
    this.entries.set(def.name, { def, controller });

    if (this.mc) {
      try {
        const pending = this.mc.registerTool(
          {
            name: def.name,
            description: def.description,
            inputSchema: def.inputSchema,
            ...(def.annotations ? { annotations: def.annotations } : {}),
            // The agent calls this directly. inputSchema does not validate, so the
            // tool's own execute is responsible for rejecting bad arguments.
            execute: async (input: unknown) => def.execute(input),
          },
          { signal: controller.signal }
        );

        // Chrome 152 returns a promise that REJECTS with AbortError the moment the
        // signal fires. That rejection IS the revocation working, not a failure, so
        // it must be swallowed: left unhandled it prints one red unhandledRejection
        // per tool on every single gate change, which is exactly the beat the demo
        // is recording. A rejection that arrives while the signal is NOT aborted is
        // a real registration failure and still has to be visible. Finding 6.
        if (isThenable(pending)) {
          Promise.resolve(pending).catch((err: unknown) => {
            if (controller.signal.aborted) return;
            reportError(`registerTool(${def.name}) rejected`, err);
          });
        }
      } catch (err) {
        // Never let a registration failure be invisible. Finding 6.
        reportError(`registerTool(${def.name}) failed`, err);
      }
    }

    this.emit();

    let done = false;
    return () => {
      if (done) return;
      done = true;
      controller.abort(); // finding 2: this is the real revocation, not a UI flag
      this.entries.delete(def.name);
      this.emit();
    };
  }

  list(): RegisteredToolInfo[] {
    return [...this.entries.values()].map(({ def }) => ({
      name: def.name,
      description: def.description,
    }));
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

let singleton: Host | null = null;

export function getHost(): ToolHost {
  if (!singleton) singleton = new Host();
  return singleton;
}

/** Surfaced in the UI, never only in a console nobody opens. Finding 6. */
type ErrorSink = (message: string) => void;
let sink: ErrorSink | null = null;
export function onSeamError(cb: ErrorSink) {
  sink = cb;
}
function reportError(context: string, err: unknown) {
  const message = `${context}: ${err instanceof Error ? err.message : String(err)}`;
  if (sink) sink(message);
  if (typeof console !== "undefined") console.error(message);
}

/**
 * Best-effort only, and a Chrome-only cross-check. Finding 3: this throws in
 * ChatGPT's in-app browser. Nothing may render from it.
 */
export function attachToolChangeProbe(cb: () => void): () => void {
  const mc = getModelContext() as unknown as EventTarget | null;
  if (!mc || typeof (mc as EventTarget).addEventListener !== "function") return () => {};
  try {
    mc.addEventListener("toolchange", cb);
    return () => mc.removeEventListener("toolchange", cb);
  } catch {
    return () => {};
  }
}
