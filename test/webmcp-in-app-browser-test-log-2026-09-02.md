# WebMCP in-app browser integration test log

**Date:** 2026-09-02  
**Application:** Hubit Tech & Gadget Store  
**Target:** `http://127.0.0.1:3000/`  
**Browser:** Codex / ChatGPT in-app browser  
**Scope:** The live WebMCP browser surface, not a mocked tool host or direct unit-test import.

## Objective

Verify that the current implementation exposes the expected WebMCP tools to an
agent, invokes them successfully through the in-app browser's `webmcp` capability,
validates inputs, respects shopper approval, and revokes `checkout` when approval is
no longer valid.

## Implementation reviewed

The WebMCP seam is isolated in `src/lib/webmcp.ts`. Its `Host`:

- Detects `document.modelContext` and falls back to a local host when unavailable.
- Registers each tool with an `AbortSignal`.
- Revokes a tool by aborting its signal and removing its local registry entry.
- Keeps its own registry and change signal rather than relying on `toolchange`, which
  is not available as an event target in the in-app browser.

The application exposes ten initial tools:

1. `search_products`
2. `get_product`
3. `get_cart`
4. `get_constraints`
5. `add_to_cart`
6. `remove_from_cart`
7. `update_quantity`
8. `propose_constraint_change`
9. `compare_products`
10. `search_alternatives`

`checkout` is intentionally not in the initial surface. It is registered only when
the cart meets every constraint and the shopper has approved that exact basket.

## Environment and setup

- A production build was generated with `npm run build`.
- Port 3000 was already in use, so the browser connected to the existing local Hubit
  instance rather than starting a second server.
- The browser page identified itself as `Hubit Tech & Gadget Store` and displayed
  `10 live · webmcp` in the agent tool rail.
- The browser notification listed all ten initial tools with their schemas and
  annotations. Read-only lookup tools exposed `readOnlyHint`; product-description
  tools also exposed `untrustedContentHint`.

## In-app WebMCP execution results

All calls below were made through the in-app browser's WebMCP capability using the
live tool handles returned from `fetchTools()`.

| Area | Scenario | Result |
| --- | --- | --- |
| Surface | Initial tool surface lists ten tools and omits `checkout` | Passed (see matcher note below) |
| Constraints | `get_constraints` returns the initial $1,200 budget | Passed |
| Search | `search_products` filters monitors below $150 | Passed |
| Search validation | Invalid category is rejected | Passed |
| Product lookup | Valid `chair-ergo-mesh` lookup returns product details | Passed |
| Product validation | Missing product ID is rejected | Passed |
| Cart | Empty cart is reported as empty | Passed |
| Add validation | Quantity `0` is rejected | Passed |
| Add | A valid monitor is added | Passed |
| Quantity | Quantity update produces the expected $498 cart total | Passed |
| Remove | Item removal restores an empty cart | Passed |
| Compare | Two chairs are compared, including price spread | Passed |
| Compare validation | A one-product comparison is rejected | Passed |
| Alternatives | Cheaper alternative and trade-offs are returned | Passed |
| Proposal validation | Unsupported constraint field is rejected | Passed |
| Proposal | Valid budget proposal queues without changing the budget itself | Passed |
| Proposal approval boundary | Budget remains $1,200 while the proposal is pending | Passed |
| Proposal rejection | Rejecting the proposal leaves the budget unchanged | Passed |
| Approval gate | A valid basket can be approved through the UI | Passed |
| Dynamic registration | `checkout` appears only after shopper approval | Passed |
| Revocation | Adding an item revokes approval and removes `checkout` | Passed |

### Result summary

The scripted browser run recorded **21 passed checks and 1 matcher-only false
failure**. The failed predicate searched for `name:` in `tools.description()`, while
the browser correctly returns JSON using `"name":`. The returned description showed
all ten expected initial tools and no `checkout`; this is a test-harness assertion
format issue, not an application failure.

## Checkout execution boundary

`checkout` was deliberately not invoked. Its success path states that an order is
placed and a charge is made. Browser safety policy requires immediate confirmation
before a financial-action test, even when the broader test run was requested. Its
availability and its revocation were both verified.

## Static checks

### Production build

`npm run build` completed successfully:

- Next.js compilation succeeded.
- TypeScript checking succeeded.
- Static-page generation succeeded.

### Lint

`npm run lint` currently fails with one error and four warnings:

| Location | Finding |
| --- | --- |
| `test/run-audit.js:1` | `require()` style import is prohibited (`@typescript-eslint/no-require-imports`) — error |
| `src/components/Constraints.tsx:13` | `over` is assigned but unused — warning |
| `src/lib/useHubit.ts:54` | `live` is assigned but unused — warning |
| `test/capability-audit.js:30` | Unused expression — warning |
| `test/capability-audit.js:36` | `notThrew` is assigned but unused — warning |

## Review notes

- The production WebMCP path is functional in the ChatGPT in-app browser.
- Tool input validation is performed in the tool implementations instead of relying
  on `inputSchema`, which is the correct defensive behavior for this runtime.
- The checkout gate is a real capability boundary: it is absent when conditions are
  unmet rather than present and merely returning an error.
- A few comments in `src/lib/tools.ts` are stale: they refer to “nine tools” and
  “eight always-on tools,” while the implementation currently has ten initial tools.
- No source files were changed during this review.

## Recommended follow-up

1. Fix the lint error in `test/run-audit.js` so `npm run lint` is green.
2. Remove the unused variables and expression warnings.
3. Update the stale tool-count comments in `src/lib/tools.ts`.
4. If desired, run the final `checkout` call after explicitly confirming the simulated
   order/charge action.
