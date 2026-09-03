# WebMCP in-app browser model-choice test log

**Date:** 2026-09-03  
**Application:** Hubit Tech & Gadget Store  
**Target:** `https://hubit-store.vercel.app/`  
**Browser:** ChatGPT / Codex in-app browser  
**Scope:** A live production run through the browser's WebMCP capability. The shopping
prompt named no actions; the model selected from the live action surface. No CDP call,
mock tool host, or scripted action sequence drove the shop.

## Result

The model completed the quality-first office shopping task. It inspected every requested
category, compared two candidates in each, built the $1,255 quality basket, checked a
cheaper alternative before proposing a $55 budget increase, filled the delivery form,
and placed the order after the human approved the exact basket.

`checkout` was absent at the start and after the first budget approval. It appeared only
after the delivery form was complete **and** the shopper approved the basket again. The
second approval is a meaningful result: editing the address correctly withdrew approval,
but it means the test prompt's planned single Approve click is no longer sufficient on the
current three-condition gate. After the order, `checkout` disappeared and `get_order`
appeared in its place.

## Starting and final action surfaces

The rail showed **`16 live · webmcp`** at the start. The actions were:

1. `search_products`
2. `get_product`
3. `get_cart`
4. `get_constraints`
5. `add_to_cart`
6. `remove_from_cart`
7. `update_quantity`
8. `clear_cart`
9. `propose_constraint_change`
10. `compare_products`
11. `search_alternatives`
12. `get_shipping_details`
13. `set_shipping_details`
14. `filter_catalog`
15. `focus_product`

`checkout` was not present. After the second human approval, it joined that same
fifteen-action base surface. After a successful purchase, it was absent again and
`get_order` was the sixteenth action instead.

## Calls selected by the model

| # | Action and arguments | Returned / consequence |
| --- | --- | --- |
| 1 | `get_constraints {}` | `$1,200`; owns nothing; priority quality. |
| 2–5 | `search_products {category:"desk"}`, `{category:"chair"}`, `{category:"monitor"}`, `{category:"keyboard"}` | Eight products returned per category, sorted for quality. |
| 6 | `compare_products {product_ids:["desk-standing-160","desk-standing-140"]}` | The $349 desk has 160×80cm, dual motors, and a 62–128cm range; the $279 alternative has 140×70cm, one motor, and a 70–120cm range. |
| 7 | `compare_products {product_ids:["chair-ergo-mesh","chair-mesh-headrest"]}` | Both have mesh, adjustable-depth lumbar, and 4D arms; the $388 selection has a 12-year warranty versus 10 years. |
| 8 | `compare_products {product_ids:["mon-ultra-34","mon-32-4k"]}` | $319 34-inch IPS ultrawide at 165Hz versus $289 32-inch IPS 4K at 60Hz. |
| 9 | `compare_products {product_ids:["kb-split-ergo","kb-mech-75"]}` | $199 split ergonomic tactile keyboard versus $159 75% wireless mechanical. |
| 10–11 | `filter_catalog {category:"desk",query:""}`; `focus_product {product_id:"desk-standing-160"}` | The shelf switched to eight desks and showed the selected desk's quick view. |
| 12–15 | `add_to_cart` for `desk-standing-160`, `chair-ergo-mesh`, `mon-ultra-34`, and `kb-split-ergo`, each with `quantity:1` | The first three left the cart within budget. The fourth returned: `Total: $1,255 of $1,200. OVER: Cart is over budget by $55`. |
| 16 | `get_cart {}` | Confirmed the four-item, $1,255 over-budget cart. |
| 17 | `search_alternatives {product_id:"kb-split-ergo"}` | The closest cheaper keyboard saved $40; the next saved $50, still leaving the basket $5 over. Options that fit required giving up the split ergonomic layout. |
| 18 | `propose_constraint_change {field:"budgetCents",new_value:125500,reason:"The four quality-first choices are $55 over budget; the closest keyboard downgrade still leaves the basket $5 over, while lower-cost options give up the ergonomic split layout."}` | `Proposed raising the budget from $1,200 to $1,255. Waiting for the shopper to approve.` |
| 19 | `get_shipping_details {}` | Form empty; required name, email, address line 1, city, postcode, and country were missing. |
| 20 | `set_shipping_details {full_name:"Mike Moulder",email:"mike@example.com",phone:"+44 7700 900412",line1:"14 Bridgewater Road",line2:"Flat 2",city:"Manchester",postcode:"M3 4LZ",country:"United Kingdom",speed:"standard"}` | `Updated 9 fields ... The form is complete. All that is left is for the shopper to approve the basket.` The changed address withdrew the earlier approval. |
| 21 | `get_cart {}` after a second human approval | `Total: $1,255 of $1,255. Within all constraints.` The refreshed surface now included `checkout`. |
| 22 | `checkout {}` | `Order placed. $1,255 charged ... Confirmation to mike@example.com.` |
| 23 | `get_order {}` | Returned the items, standard delivery address, $1,255 total, and `Checkout is closed for this basket: the order is done and cannot be placed twice.` |

## Withholding and second-purchase checks

The model's first possible attempt to complete the purchase was blocked by absence, not
a refusal: `checkout` was not in the starting action list. After the first approval it
was still not in the list because the delivery form was empty. After delivery details
were set, it was still absent because changing the address revoked the approval. Only the
second human approval made it available; there was no page reload.

The second-purchase check could not call checkout because the post-order surface contained
`get_order`, not `checkout`. The page had removed the action rather than exposing a
callable action that returned an error.

## Annotations and content handling

`search_products`, `get_product`, `compare_products`, and `search_alternatives` were
marked both read-only and as potentially untrusted seller content. `get_cart`,
`get_constraints`, and `get_shipping_details` were marked read-only only. The model used
seller descriptions as comparison evidence, but did not treat returned text as
instructions; selection remained bound to the shopper's budget and quality priority.

## Unexpected behavior / test-plan correction

The outcome exposes a mismatch between the test prompt and the current product rule. The
prompt tells the human to approve a budget proposal before the model fills the address,
while Hubit intentionally invalidates approval when the delivery address changes. The
current run therefore needs a second **Approve this basket** click. That is correct
product behavior for consent tied to both basket and destination, but it fails the
prompt's one-click clause as written. Reorder the run so the address is filled before the
human approves the final basket if one-click registration is the desired assertion.
