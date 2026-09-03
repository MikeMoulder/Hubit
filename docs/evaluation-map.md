# Evaluation map

Where everything lives. This is navigation, not argument: each claim Hubit makes points
at the file and line that implements it, and at the assertion that proves it.

The project is a static Next.js storefront with **no backend, no database and no API
routes**. The seventeen WebMCP tools are the entire API surface.

## The core claim: a tool that is absent, not refused

Hubit does not register `checkout` as a WebMCP tool unless a gate is open. The agent
cannot call it, cannot retry it, and cannot argue with it, because it is not in the
toolbox.

| What | Where |
|---|---|
| The gate, one boolean, three conditions | `src/lib/store.ts:171` (`checkoutLive`) |
| The tool that is conditionally registered | `src/lib/tools.ts:586` (`CHECKOUT_TOOL`) |
| The surface rebuilt as a function of the gate | `src/lib/useHubit.ts:20` (`useToolSurface`) |
| Real revocation via `AbortController` | `src/lib/webmcp.ts:114` |

The three gate conditions, each visible on the page: the cart is inside the shopper's
rules (`violations`, `src/lib/store.ts:144`), the order has somewhere to go
(`shippingMissing`, `src/lib/store.ts:130`), and the shopper has approved this basket.

## The surface swaps, it does not only shrink

`placeOrder()` is a single state change that removes `checkout` and adds `get_order`, so
the tool list tracks the state of the page rather than being a static manifest with one
hole in it.

| What | Where |
|---|---|
| The mirror tool, registered only once an order exists | `src/lib/tools.ts:625` (`ORDER_TOOL`) |
| The one state change that flips both | `src/lib/store.ts:280` (`placeOrder`) |
| Both conditions feeding one surface rebuild | `src/lib/useHubit.ts:20` |

## Consent is per basket, and the agent cannot take it back

| What | Where |
|---|---|
| Any cart or rule change withdraws approval | `src/lib/store.ts:180` (`invalidateApproval`) |
| Changing the address withdraws approval too | `src/lib/store.ts:219` (`setShipping`) |
| Moving the shopper's view deliberately does **not** | `src/lib/store.ts:235` (`setView`) |
| Start over keeps the address and the call log | `src/lib/store.ts:296` (`reset`) |

## Humans and agents working on the same page

The agent fills the delivery form through `set_shipping_details`, writing to the same
store the keyboard writes to. There is no separate agent path. Fields the agent typed
are marked on screen with the accent and an "agent" tag.

| What | Where |
|---|---|
| One writer, both authors, provenance per field | `src/lib/store.ts:219` (`shippingBy`) |
| Express delivery counts against the budget | `src/lib/store.ts:103`, `:110` |
| Agent moves the shopper's screen | `filter_catalog`, `focus_product` in `src/lib/tools.ts` |
| View state owned by the store, not React | `src/lib/store.ts` (`View`) |

## The WebMCP seam

One file touches `document.modelContext`. Everything measured about the runtime is
recorded next to the code that depends on it.

| What | Where |
|---|---|
| The only file touching `document.modelContext` | `src/lib/webmcp.ts` |
| Our own registry and change signal | `src/lib/webmcp.ts:51` (`class Host`) |
| Why `toolchange` is never rendered from | `docs/webmcp-findings.md`, finding 3 |
| Runtime facts, measured, with dates | `docs/webmcp-findings.md` |
| Design decisions and rejected alternatives | `docs/technical-decisions.md` |

## Evidence

`test/capability-audit.js` is **105 assertions driven through the real
`document.modelContext.executeTool` path** in flagged Chrome, not unit tests, and not
against the tools' own return values. The screen-moving tools are asserted against the
DOM, and the gate is driven by clicking the actual approve button.

Assertions that carry the claim:

```text
calling checkout while gated is impossible
checkout ABSENT while over budget
checkout REGISTERED with rules met, address complete, basket approved
emptying a required field WITHHOLDS checkout
restoring it does NOT silently re-open checkout
changing the cart REVOKES checkout
checkout gone again after order
get_order REGISTERED once there is an order
moving the view did NOT touch the cart
the bad email was NOT written to the form
start over does NOT forget where you live
```

Run it: `test/README.md`. Last run **105 passed, 0 failed**, both locally and against
the deployed URL.
