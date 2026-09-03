# Technical decisions

Five decisions where a real alternative was considered and rejected. Each one is
invisible in the code by construction: you cannot see the option that was not taken.

## 1. Withhold the tool, do not refuse the call

**Context.** An agent should not be able to spend the shopper's money until the shopper
says so. Something has to enforce that.

**Alternatives considered.**
- Register `checkout` always, and have it return an error while unapproved. This is what
  every other WebMCP storefront demo does.
- Register `checkout` always, and put the approval behind a server-side check.

**Chosen.** `checkout` is not registered at all unless the gate is open
(`src/lib/useHubit.ts:20`). It is absent from the agent's toolbox, not present and
refusing.

**Tradeoff.** A refusal is easier to explain to a model — it gets a message telling it
what to fix. Absence gives it nothing to read. We accepted that because a refused tool is
still a tool the agent can retry, log, or argue with, and because the security property
is then only as good as the check inside the handler. Absence is enforced by the runtime:
after `AbortController.abort()`, a stale tool handle captured beforehand is rejected on
call (measured, `docs/webmcp-findings.md` finding 3). That measurement is the reason this
is a real capability boundary rather than a UI flag.

## 2. No backend, and it is an argument rather than a shortcut

**Context.** A storefront that takes orders normally has a server.

**Alternatives considered.** A small API route holding the gate server-side, which is the
conventional and more defensible-sounding design.

**Chosen.** Static export. No backend, no database, no API routes. Nothing survives a
reload.

**Tradeoff.** We give up persistence, real orders and anything resembling production
integrity. We took it because the claim being demonstrated is about the *tool surface a
page offers an agent*, and a server-side check would move the interesting part off the
page and out of the browser where WebMCP lives. If the gate lived on a server, the demo
would prove that servers can reject requests, which nobody doubts.

## 3. Keep our own registry, and never render from `toolchange`

**Context.** The tool rail on screen has to show what is actually registered, live.

**Alternatives considered.** Listen for `toolchange` on `document.modelContext`, which is
the obvious design and works correctly in Chrome 152.

**Chosen.** Maintain our own registry and our own change signal inside the seam
(`src/lib/webmcp.ts:51`). `toolchange` is attached best-effort, in a try/catch, purely as
a Chrome-only cross-check, and nothing renders from it.

**Tradeoff.** We duplicate state the browser already holds, and it can in principle drift
from the browser's own registry. We took it because `document.modelContext` is **not an
EventTarget in ChatGPT's in-app browser** — `addEventListener` throws `TypeError` and
zero events fire for an entire run (`docs/webmcp-findings.md`). Any design that repaints
on `toolchange` renders a permanently frozen rail on one of the two runtimes this is
judged in.

## 4. The tool surface is derived state, rebuilt whole

**Context.** Two tools are conditional in opposite directions: `checkout` exists only
while the gate is open, `get_order` only once an order exists.

**Alternatives considered.** Register the base tools once, then add and remove the two
conditional tools through their own separate effects — fewer registration calls and less
churn.

**Chosen.** One effect rebuilds the entire surface as a function of the gate
(`src/lib/useHubit.ts:20`).

**Tradeoff.** Every gate change re-registers all seventeen tools rather than one. That is
wasteful, and we accepted it because the separate-effect version shipped a bug where
`checkout` was callable-but-rejecting: the two effects disagreed about the current state.
Treating the surface as derived state makes that class of bug unrepresentable, and the
waste is invisible at seventeen tools.

## 5. Defer the state change that unregisters the running tool

**Context.** `checkout` places the order. Placing the order closes the gate, which
unregisters `checkout` — while `checkout` is still executing.

**Alternatives considered.**
- Let it happen. Simplest, and the order really is placed.
- Defer by `0ms`, the usual way to get out of the current task.

**Chosen.** Defer the state change by 350ms (`src/lib/tools.ts:586`).

**Tradeoff.** A magic number, and 350ms of window in which `checkout` is still callable —
guarded by a `placing` flag so a second call cannot double-order. We took it because
aborting a call that is still in flight *rejects it*, so the agent sees an error on an
order that actually succeeded. `0ms` was measured to be insufficient: it fires in the gap
before the result crosses the WebMCP boundary. Revocation for every other reason — budget
change, withdrawn approval, edited address — stays immediate, which is the behaviour the
demo depends on.
