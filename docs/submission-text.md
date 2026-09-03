# Hubit — submission text

*The four required parts of the Devpost text description. This file is the source of
truth; the same words go in the submission form.*

***

**Hubit is a storefront where you can hand an agent the shopping without handing it your wallet.**

**Live:** https://hubit-store.vercel.app — open it in ChatGPT's in-app browser, or in Chrome with `chrome://flags/#enable-webmcp-testing` enabled and restarted. Those are the only two browsers that expose `document.modelContext`; anywhere else the store still works by hand, but the agent tool surface is empty.

**Code:** https://github.com/MikeMoulder/Hubit

`checkout` is not refused by a server. It is not in the agent's toolbox at all until you approve the basket.

## Why our use case is a strong fit for WebMCP

**People will happily let an agent research a purchase. Almost nobody lets one finish it.**

The reason is not that agents shop badly. It is that "it can look but it cannot buy" has never been a mechanism, only a promise. Every guardrail on offer today is a server saying no, somewhere behind an API. A refusal is a message, a message is an input, and a model can be argued into retrying an input.

WebMCP has one property that no server-side guardrail can imitate: **the tool surface is a live, mutable property of the tab.** `registerTool` takes an `AbortSignal`, so a capability can be absent, then appear mid-conversation because a human decided something, then disappear again when they change their mind. Hubit registers `checkout` only while a gate is open. When that gate is closed the agent cannot call `checkout`, cannot retry it, and cannot argue with it, because there is nothing there. `getTools()` does not list it, and a stale handle captured before the abort is rejected at browser level.

To be exact about what we are claiming: **this is not a security boundary, and we have never presented it as one. It is a consent boundary, and it operates one layer earlier than a server check.** A server refusal is a runtime "no" that a model retries, reasons around and argues with. A capability that is absent from the surface means the planner never forms the intent, so there is no retry loop to lose. In production both exist — the server check is the security boundary, and this is what stops an agent from ever reaching it without you. WebMCP is what makes that earlier layer possible at all, because tools are registered per session in the page and can be revoked mid-conversation.

## How it creates a better user experience

**The tedious half of a purchase gets delegated. The half that needs judgment does not.**

The agent searches, compares specs side by side, finds cheaper alternatives, fills the cart, and types your delivery details — name, email, address, postcode, country, delivery speed, courier notes. It writes to the same store your keyboard writes to. There is no separate agent path, and that is exactly what makes the provenance honest: every field the agent typed is outlined in the accent colour and tagged `agent`, and you can overwrite any of them. That one screen carries the whole thesis — **the agent can type your address and still cannot spend your money.**

You also watch it work instead of reading a transcript of it. Two tools move your screen — `filter_catalog` changes the shelf you are looking at, `focus_product` opens a quick view — and every call streams into a rail on the right with its real arguments. The rail renders from the tool host's own registry rather than from a hardcoded list, so if a tool ever failed to register it shows that instead of claiming it is live.

And the store always tells you *why* checkout is withheld: over budget, no delivery address, or this basket is not approved. The agent's only remaining move is to ask you. `propose_constraint_change` queues a proposal and changes nothing by itself.

## What people and agents can do together that was difficult or impossible before

**Grant a capability mid-conversation — and take it back.**

Approve the basket and `checkout` appears live, in the same tab, with no reload. Then change the cart, move the budget, edit the delivery address, switch to express delivery, or click "Withdraw approval", and it leaves the surface again. Consent is **per basket, not per session**: you approved a particular cart going to a particular place, so any change to either withdraws it. Emptying a required delivery field withholds `checkout`, and restoring that field does *not* silently re-open it, because the approval left with the change.

The surface does not merely shrink, it **swaps**. Placing an order removes `checkout` and adds `get_order` in one state change — the two conditional tools are conditional in opposite directions.

None of that is expressible against a static tool manifest, and it is not what the field is doing. Every public WebMCP storefront demo we could find, including the ones in `GoogleChromeLabs/webmcp-tools/demos`, registers `checkout` unconditionally alongside `search_products`. The agent can always complete the purchase. Not one of them models the human as an authority the agent has to come back to.

## How we implemented WebMCP

**Seventeen tools. Fifteen always registered, two conditional in opposite directions.**

**One seam.** `src/lib/webmcp.ts` is the only file in the project that touches `document.modelContext`. Everything else talks to a `ToolHost` interface, so the runtime's quirks are contained in one reviewable place. Registration is the literal call, with an `AbortController` per tool:

```js
document.modelContext.registerTool({
  name: def.name,
  description: def.description,
  inputSchema: def.inputSchema,
  execute: async (input) => def.execute(input),
}, { signal: controller.signal });
```

**The tool surface is derived state.** One effect rebuilds the *entire* surface as a function of the gate boolean, rather than registering the base tools once and toggling `checkout` in a second effect. We built that version first and it was subtly wrong: `checkout` ended up callable-but-rejecting in the window between the two effects. The UI subscribes to the host registry through `useSyncExternalStore` rather than reading it during render, because registration happens *after* the render caused by the state change that opened the gate.

**We probed the runtime in both browsers instead of trusting the documentation.** Six findings are written down with dates in `docs/webmcp-findings.md`, each cited from the code that depends on it. Three changed the build: `toolchange` is not usable, because `modelContext` is not an `EventTarget` in ChatGPT's in-app browser at all, so we keep our own registry and never render from it. `inputSchema` does not validate, so all seventeen tools hand-validate — missing arguments, wrong types, out-of-range values, unknown ids, string coercion. And **a tool must not unregister itself synchronously inside its own call**: `checkout` places the order, which closes the gate, which aborts `checkout`, while `checkout` is still executing. That one state change is deferred 350 ms behind a `placing` flag so a second call cannot double-order; revocation for every other reason stays immediate.

Both headers WebMCP asks for are set in `next.config.ts` and are live on the deployment: `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.

**Evidence.** A 105-assertion capability audit drives the real `document.modelContext.executeTool` path in flagged Chrome 152 — not unit tests, and not a mocked tool host. Screen-moving tools are asserted against the DOM rather than against their own return value, and the gate is opened by clicking the actual approve button. **105 passed, 0 failed**, both locally and against the deployed URL. A separate run through ChatGPT's in-app browser confirmed the same tools register and execute there, with the gate working in both directions. Both of those drove the tools from a script — the demo video is where a model chooses them itself.

No backend, no database, no API routes. Next.js 16, React 19, Tailwind v4, TypeScript, deployed on Vercel.
