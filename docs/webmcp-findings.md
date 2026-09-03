# WebMCP runtime findings

What `document.modelContext` actually does, measured rather than assumed. The source
files cite these by number: a comment reading "finding 3" means item 3 below.

**Measured 2026-09-02** on Chrome 152.0.7977.65 headless with
`--enable-features=WebMCPTesting,WebMCPSupport,WebMCPAgent`, driven over CDP, and
separately in **ChatGPT's in-app browser** on the same day. Pages served with
`Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`; both headers are
confirmed to survive deployment to Vercel.

---

## 1. Late registration works

A tool registered 5 seconds after page load appears in `getTools()` and executes
correctly. One registered ~8 seconds after load behaves identically. Registering a tool
mid-session and invoking it in the same session, with no reload, works.

Confirmed in Chrome **and** in ChatGPT's in-app browser, where late registration is
accepted with no error and no flag needed.

This is what Hubit's central beat depends on: `checkout` appearing at the moment the
shopper approves, in a session that is already running.

## 2. `AbortSignal` teardown is sound — the property the whole project rests on

After `controller.abort()`:

```text
after revoke, findable: false
stale handle call => rejected (UnknownError)
```

The tool is gone from `getTools()`, is not findable by name, and **a tool handle captured
before the abort is rejected when called afterwards**. Revoking `checkout` revokes the
capability. It is not a UI-only illusion, which is the difference between this project
and a disabled button.

Implemented at `src/lib/webmcp.ts:114`.

## 3. `toolchange` is not usable, and nothing may render from it

In Chrome, `toolchange` fires on `document.modelContext` — **not** on `document`.
Measured: `document` fired 0 events, `modelContext` fired 2, one per registry mutation.
Listening on `document`, which is the intuitive guess, yields silence and a tool rail
that never updates.

In **ChatGPT's in-app browser, `document.modelContext` is not an EventTarget at all.**
`addEventListener('toolchange')` throws `TypeError`, and zero events fired from either
`modelContext` or `document` for the whole run.

Consequence, mandatory rather than advisory: **the tool rail is driven entirely from our
own registry** (`src/lib/webmcp.ts:51`). `toolchange` is attached best-effort inside a
try/catch as a Chrome-only cross-check. Any design that repaints on `toolchange` renders
a permanently frozen rail in one of the two runtimes this is judged in.

## 4. `inputSchema` does not validate

Declaring an `inputSchema` documents a tool's arguments to the model. It does **not**
enforce them: arguments arrive at `execute` exactly as the caller sent them, including
missing keys, wrong types and out-of-range numbers.

Every tool in `src/lib/tools.ts` therefore hand-validates and returns failures as content
with `isError`, rather than throwing — a thrown error reaches the agent as a generic
message it cannot act on. The capability audit asserts this on every tool: missing
arguments, wrong types, out-of-range values, unknown ids and string coercion.

## 5. `executeTool` has a fussy, undocumented argument shape

```text
executeTool(tool, args)
  tool  must be a RegisteredTool OBJECT from getTools(), not a name string
        → a string throws TypeError: The provided value is not of type 'RegisteredTool'
  args  must be a JSON STRING, not an object
        → an object throws UnknownError: Failed to parse input arguments
  returns a JSON STRING, which must be JSON.parse'd before use
```

The full API surface is exactly `ontoolchange, executeTool, getTools, registerTool`, and
`getTools()` returns an `origin` per tool.

This is the path an agent really uses, and it is the path `test/capability-audit.js`
drives. There is no simulated path anywhere in this build.

## 6. Register first, and never let a throw be invisible

An unguarded call placed *before* tool registration once produced a page with zero tools
and no visible error — which looked exactly like "this runtime does not support WebMCP".
It was our own bug, and we nearly recorded it as a finding.

Two rules came out of it, both still enforced:

- Registration happens before any optional wiring (`src/lib/useHubit.ts:20`).
- No uncaught throw may be invisible. Registration failures are surfaced in the UI, not
  only to a console nobody has open (`src/lib/webmcp.ts`, `reportError`).

A related case: `registerTool` returns a promise that **rejects with `AbortError` when
the signal fires**. That rejection is the revocation working, not a failure, so it is
swallowed when the signal is aborted and still reported when it is not. Left unhandled,
it printed one red unhandled rejection per tool on every gate change.

---

## A tool must not unregister itself synchronously inside its own call

`checkout` places the order, which closes the gate, which aborts `checkout` — while it is
still running. Aborting an in-flight call rejects it, so the agent sees an error on an
order that actually succeeded.

The state change is deferred by 350ms so the result returns first. A 0ms defer was
measured to be insufficient: it fires in the gap before the result crosses the WebMCP
boundary. Revocation for every other reason stays immediate. See
`docs/technical-decisions.md` §5.

## Verified end to end

Driven over CDP against a production build:

```text
1. tools at load, both conditional tools ABSENT
2. cart under budget, not approved      -> checkout ABSENT
3. human approves                       -> checkout REGISTERED
4. agent calls checkout                 -> "Order placed."
5. after order                          -> checkout ABSENT, get_order REGISTERED
6. quality build $1,284 of $1,200       -> checkout ABSENT (over budget)
7. agent proposes a rule change         -> queued, NOT applied
8. human approves the change            -> checkout REGISTERED
```

The full capability audit — **105 assertions, 105 passed, 0 failed** — has been run both
locally and against the deployed URL, through the real `document.modelContext.executeTool`
path. See `test/README.md`.

## Not tested, and stated as such

Whether ChatGPT's in-app browser **offers** a late-registered tool to the model for
invocation. Registration succeeding is not the same as the model being given the tool. We
confirmed `document.modelContext` is present there, that `originAgentCluster` is true and
that late registration is accepted without error, but the invocation path on that surface
was not measured on this account.

The demo is therefore recorded in flagged Chrome, which the challenge rules explicitly
permit. Everything above about invocation is Chrome evidence.
