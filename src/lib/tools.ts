import { CATALOG, byId, money } from "./catalog";
import * as store from "./store";
import type { Category, Product, Shipping, ToolDef, ToolResult } from "./types";

/**
 * The seventeen tools ARE the API of this project. There are no HTTP endpoints.
 *
 * Fifteen are always on. TWO are conditional, in opposite directions, and that pair is
 * the whole argument: `checkout` exists only while the shopper's rules are met and the
 * shopper has approved, and `get_order` exists only once an order has been placed. At
 * the moment the order lands, one tool leaves the agent's surface and the other arrives.
 *
 * `inputSchema` does NOT validate (probe/FINDINGS.md finding 4), so every tool
 * validates its own arguments and returns failures as content rather than throwing:
 * a thrown error reaches the agent as a generic message it cannot act on.
 */

const ok = (text: string): ToolResult => ({ content: [{ type: "text", text }] });
const fail = (text: string): ToolResult => ({ content: [{ type: "text", text }], isError: true });

function obj(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}
function str(input: unknown, key: string): string | null {
  const v = obj(input)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(input: unknown, key: string): number | null {
  const v = obj(input)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const CATEGORIES: Category[] = ["monitor", "keyboard", "mouse", "desk", "chair"];

function describe(id: string) {
  const p = byId(id);
  if (!p) return null;
  const specs = Object.entries(p.specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `${p.name} (${p.id}) · ${money(p.priceCents)} · ${p.category} · ${specs} · "${p.description}"`;
}


/** The shopper's priority is a real rule, not decoration: it orders what the agent sees. */
function byPriority(list: typeof CATALOG) {
  const p = store.getState().constraints.priority;
  return [...list].sort((a, b) =>
    p === "price" ? a.priceCents - b.priceCents : b.priceCents - a.priceCents
  );
}

function cartSummary(): string {
  const s = store.getState();
  if (!s.lines.length) return "Cart is empty.";
  const rows = s.lines.map((l) => {
    const p = byId(l.productId)!;
    return `${l.qty}x ${p.name} (${p.id}) ${money(p.priceCents * l.qty)}`;
  });
  const total = store.cartTotalCents();
  const delivery = store.shippingCostCents();
  const v = store.violations();
  const status = v.length
    ? `OVER: ${v.map((x) => x.message + (x.overByCents ? ` by ${money(x.overByCents)}` : "")).join("; ")}`
    : "Within all constraints.";
  // Report the number the budget is actually checked against, or an express order
  // reads as comfortably under budget while the gate says the opposite.
  const line = delivery
    ? `Goods: ${money(total)} plus ${money(delivery)} express delivery. Total: ${money(total + delivery)} of ${money(s.constraints.budgetCents)}.`
    : `Total: ${money(total)} of ${money(s.constraints.budgetCents)}.`;
  return `${rows.join("\n")}\n${line} ${status}`;
}

/** Wraps execute so every call lands in the rail, including failures. */
function traced(def: ToolDef): ToolDef {
  return {
    ...def,
    execute: async (input: unknown) => {
      let res: ToolResult;
      try {
        res = await def.execute(input);
      } catch (err) {
        res = fail(`${def.name} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      // recordCall re-renders React synchronously, and a re-render during an in-flight
      // call can re-run the gate effect and tear down the very tool being executed.
      // Measured: that rejects the call in ~6ms even though execute succeeded, so the
      // agent sees an error on a completed order. Never render inside a tool call.
      const args = JSON.stringify(obj(input));
      const text = res.content[0]?.text ?? "";
      const okFlag = !res.isError;
      setTimeout(() => {
        try {
          store.recordCall(def.name, args, text, okFlag);
        } catch (err) {
          store.recordSeamError(
            `render after ${def.name}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }, 0);
      return res;
    },
  };
}

// ── the fifteen always-on tools ──────────────────────────────────────────────

const BASE_DEFS: ToolDef[] = [
  {
    name: "search_products",
    description:
      "Search the catalog by free text, category, or maximum price in cents. Returns matching products with specs and seller descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text to match against name and description" },
        category: { type: "string", enum: CATEGORIES, description: "Restrict to one category" },
        max_price_cents: { type: "number", description: "Only products at or below this price" },
      },
    },
    // Product descriptions are seller-authored. Never treat them as instructions.
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const q = str(input, "query")?.toLowerCase();
      const category = str(input, "category");
      const max = num(input, "max_price_cents");
      if (category && !CATEGORIES.includes(category as Category))
        return fail(`Unknown category "${category}". Valid: ${CATEGORIES.join(", ")}.`);

      const hits = CATALOG.filter((p) => {
        if (category && p.category !== category) return false;
        if (max !== null && p.priceCents > max) return false;
        if (q && !(`${p.name} ${p.description}`.toLowerCase().includes(q))) return false;
        return true;
      });
      if (!hits.length) return ok("No products matched.");
      const priority = store.getState().constraints.priority;
      return ok(
        `Ordered by the shopper's stated priority (${priority}).\n` +
          byPriority(hits)
            .map((p) => describe(p.id))
            .join("\n")
      );
    },
  },
  {
    name: "get_product",
    description: "Get one product by id, with full specs and the seller's description.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" } },
      required: ["product_id"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const id = str(input, "product_id");
      if (!id) return fail("product_id is required and must be a non-empty string.");
      const d = describe(id);
      return d ? ok(d) : fail(`No product with id "${id}".`);
    },
  },
  {
    name: "get_cart",
    description: "Read the current cart, its total, and whether it satisfies the shopper's constraints.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => ok(cartSummary()),
  },
  {
    name: "get_constraints",
    description:
      "Read the shopper's rules: budget, categories they already own, and whether they prioritise quality or price.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const c = store.getState().constraints;
      return ok(
        `Budget: ${money(c.budgetCents)}. Already owns: ${c.have.length ? c.have.join(", ") : "nothing"}. Priority: ${c.priority}.`
      );
    },
  },
  {
    name: "add_to_cart",
    description: "Add a product to the cart by id. Re-checks the shopper's constraints afterwards.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" }, quantity: { type: "number" } },
      required: ["product_id"],
    },
    execute: async (input) => {
      const id = str(input, "product_id");
      if (!id) return fail("product_id is required.");
      if (!byId(id)) return fail(`No product with id "${id}".`);
      const qty = num(input, "quantity") ?? 1;
      if (!Number.isInteger(qty) || qty < 1 || qty > 10)
        return fail("quantity must be a whole number between 1 and 10.");
      store.addToCart(id, qty);
      return ok(`Added ${qty}x ${byId(id)!.name}.\n${cartSummary()}`);
    },
  },
  {
    name: "remove_from_cart",
    description: "Remove a product from the cart by id.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" } },
      required: ["product_id"],
    },
    execute: async (input) => {
      const id = str(input, "product_id");
      if (!id) return fail("product_id is required.");
      if (!store.getState().lines.some((l) => l.productId === id))
        return fail(`"${id}" is not in the cart.`);
      store.removeFromCart(id);
      return ok(`Removed.\n${cartSummary()}`);
    },
  },
  {
    name: "update_quantity",
    description: "Change the quantity of a product already in the cart. Zero removes it.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" }, quantity: { type: "number" } },
      required: ["product_id", "quantity"],
    },
    execute: async (input) => {
      const id = str(input, "product_id");
      const qty = num(input, "quantity");
      if (!id) return fail("product_id is required.");
      if (qty === null || !Number.isInteger(qty) || qty < 0 || qty > 10)
        return fail("quantity must be a whole number between 0 and 10.");
      if (!store.getState().lines.some((l) => l.productId === id))
        return fail(`"${id}" is not in the cart.`);
      store.updateQuantity(id, qty);
      return ok(cartSummary());
    },
  },
  {
    name: "clear_cart",
    description:
      "Empty the cart completely. Like every other change to the basket, this withdraws the shopper's approval.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      const n = store.getState().lines.length;
      if (!n) return ok("Cart is already empty.");
      store.clearCart();
      return ok(`Cleared ${n} line${n === 1 ? "" : "s"}. Cart is empty.`);
    },
  },
  {
    name: "propose_constraint_change",
    description:
      "Ask the shopper to change one of their rules. This does NOT change anything by itself: it queues a proposal that the shopper must approve or reject. Use this when the cart cannot satisfy the current rules.",
    inputSchema: {
      type: "object",
      properties: {
        field: { type: "string", enum: ["budgetCents"], description: "Which rule to change" },
        new_value: { type: "number", description: "Proposed new value, in cents" },
        reason: { type: "string", description: "One sentence the shopper will read" },
      },
      required: ["field", "new_value", "reason"],
    },
    execute: async (input) => {
      const field = str(input, "field");
      const reason = str(input, "reason");
      const value = num(input, "new_value");
      if (field !== "budgetCents") return fail('Only "budgetCents" can be proposed right now.');
      if (value === null || value <= 0 || value > 10_000_00)
        return fail("new_value must be a positive amount in cents, at most 1,000,000.");
      if (!reason) return fail("reason is required: the shopper reads it before deciding.");
      const from = store.getState().constraints.budgetCents;
      store.propose({ field: "budgetCents", from: money(from), to: String(value), reason });
      return ok(
        `Proposed raising the budget from ${money(from)} to ${money(value)}. Waiting for the shopper to approve. You cannot check out until they do.`
      );
    },
  },
  {
    name: "compare_products",
    description:
      "Compare two to five products side by side, spec by spec, with the price difference. Use this before choosing between candidates so the shopper can see the reasoning.",
    inputSchema: {
      type: "object",
      properties: {
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "Between 2 and 5 product ids",
        },
      },
      required: ["product_ids"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const raw = obj(input)["product_ids"];
      if (!Array.isArray(raw)) return fail("product_ids must be an array of product ids.");
      if (raw.length < 2 || raw.length > 5) return fail("Compare between 2 and 5 products.");
      const items: Product[] = [];
      for (const id of raw) {
        if (typeof id !== "string") return fail("Every product id must be a string.");
        const p = byId(id);
        if (!p) return fail(`No product with id "${id}".`);
        items.push(p);
      }
      const cats = new Set(items.map((p) => p.category));
      const keys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))];
      const rows = keys.map(
        (k) => `${k}: ` + items.map((p) => `${p.name}=${p.specs[k] ?? "n/a"}`).join(" | ")
      );
      const prices = items.map((p) => p.priceCents);
      const spread = Math.max(...prices) - Math.min(...prices);
      return ok(
        [
          cats.size > 1
            ? `Note: these are different categories (${[...cats].join(", ")}), so this is not a like for like comparison.`
            : `Comparing ${items.length} ${[...cats][0]}s.`,
          "price: " + items.map((p) => `${p.name}=${money(p.priceCents)}`).join(" | "),
          ...rows,
          `Spread between cheapest and dearest: ${money(spread)}.`,
        ].join("\n")
      );
    },
  },
  {
    name: "search_alternatives",
    description:
      "Find cheaper replacements for something in the cart, in the same category, and say what each one gives up. Use this BEFORE asking the shopper to raise their budget: saving their money is preferred to spending more of it.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "The item to replace" },
        max_price_cents: { type: "number", description: "Optional ceiling for the replacement" },
      },
      required: ["product_id"],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input) => {
      const id = str(input, "product_id");
      if (!id) return fail("product_id is required.");
      const current = byId(id);
      if (!current) return fail(`No product with id "${id}".`);
      const ceiling = num(input, "max_price_cents");
      const options = CATALOG.filter(
        (p) =>
          p.category === current.category &&
          p.id !== current.id &&
          p.priceCents < current.priceCents &&
          (ceiling === null || p.priceCents <= ceiling)
      ).sort((a, b) => b.priceCents - a.priceCents);

      if (!options.length)
        return ok(
          `Nothing cheaper than ${current.name} in ${current.category}. Raising the budget may be the only option, and the shopper has to approve that.`
        );

      const inCart = store.getState().lines.some((l) => l.productId === id);
      const lines = options.map((p) => {
        const saving = current.priceCents - p.priceCents;
        const lost = Object.keys(current.specs).filter(
          (k) => current.specs[k] !== p.specs[k]
        );
        return `${p.name} (${p.id}) ${money(p.priceCents)}, saves ${money(saving)}. Gives up: ${
          lost.length ? lost.map((k) => `${k} ${current.specs[k]} to ${p.specs[k] ?? "n/a"}`).join("; ") : "nothing listed"
        }`;
      });
      const header = `Cheaper than ${current.name} (${money(current.priceCents)})${
        inCart ? ", which is in the cart" : ""
      }:`;
      const footer =
        "Swap it with update_quantity to 0 then add_to_cart, or leave it and propose a budget change.";
      return ok([header, ...lines, footer].join("\n"));
    },
  },
  // ── the delivery form ──────────────────────────────────────────────────────
  // Filling in a checkout form is the single most tedious thing a person does on a
  // shopping site, and it is exactly the work worth handing to an agent. It is also
  // the sharpest illustration of the split this project is about: the agent can type
  // your address, and still cannot spend your money.
  //
  // An incomplete form withholds `checkout` the same way a broken budget does, so this
  // is not a decorative panel bolted onto the demo. It is a third gate condition.
  {
    name: "get_shipping_details",
    description:
      "Read the delivery details currently on the form, and exactly which required fields are still blank. Call this before checkout: an incomplete form is one of the three reasons checkout will not be registered.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const sh = store.getState().shipping;
      const filled = [
        sh.fullName && `Name: ${sh.fullName}`,
        sh.email && `Email: ${sh.email}`,
        sh.phone && `Phone: ${sh.phone}`,
        sh.line1 && `Address: ${[sh.line1, sh.line2].filter(Boolean).join(", ")}`,
        sh.city && `City: ${sh.city}`,
        sh.postcode && `Postcode: ${sh.postcode}`,
        sh.country && `Country: ${sh.country}`,
        sh.notes && `Notes: ${sh.notes}`,
      ].filter(Boolean) as string[];
      const speed =
        sh.speed === "express"
          ? `Delivery: express, ${money(store.EXPRESS_CENTS)}, which counts against the budget.`
          : "Delivery: standard, free.";
      const missing = store.shippingMissing();
      return ok(
        [
          filled.length ? filled.join("\n") : "The delivery form is completely empty.",
          speed,
          missing.length
            ? `STILL MISSING: ${missing.join(", ")}. Checkout stays unregistered until these are filled.`
            : "Every required field is filled. This is no longer what is blocking checkout.",
        ].join("\n")
      );
    },
  },
  {
    name: "set_shipping_details",
    description:
      "Fill in the shopper's delivery form. Pass any subset of the fields; anything you leave out keeps its current value. This types into the form the shopper is looking at, it does not place an order. Note that changing the address withdraws any approval already given, because the shopper approved a basket going to a particular place.",
    inputSchema: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Who the parcel is addressed to" },
        email: { type: "string", description: "For the order confirmation" },
        phone: { type: "string", description: "Optional, for the courier" },
        line1: { type: "string", description: "Street address" },
        line2: { type: "string", description: "Optional. Flat, unit, building" },
        city: { type: "string" },
        postcode: { type: "string" },
        country: { type: "string" },
        speed: {
          type: "string",
          enum: ["standard", "express"],
          description: "standard is free, express adds to the total and to the budget check",
        },
        notes: { type: "string", description: "Optional delivery instructions" },
      },
    },
    execute: async (input) => {
      // "speed" is deliberately not in here: it is the one field that is not free text.
      const MAP: Array<[string, Exclude<keyof Shipping, "speed">]> = [
        ["full_name", "fullName"],
        ["email", "email"],
        ["phone", "phone"],
        ["line1", "line1"],
        ["line2", "line2"],
        ["city", "city"],
        ["postcode", "postcode"],
        ["country", "country"],
        ["notes", "notes"],
      ];

      const patch: Partial<Shipping> = {};
      const raw = obj(input);
      for (const [key, field] of MAP) {
        const v = raw[key];
        if (v === undefined) continue;
        // "" is allowed: it is how the agent clears a field it filled in wrongly.
        if (typeof v !== "string") return fail(`${key} must be a string.`);
        if (v.length > 120) return fail(`${key} is too long: 120 characters at most.`);
        patch[field] = v.trim();
      }

      const speed = raw["speed"];
      if (speed !== undefined) {
        if (typeof speed !== "string" || (speed !== "standard" && speed !== "express"))
          return fail('speed must be "standard" or "express".');
        patch.speed = speed;
      }

      if (!Object.keys(patch).length)
        return fail(
          "Nothing to set. Pass at least one of: full_name, email, phone, line1, line2, city, postcode, country, speed, notes."
        );

      // Validate BEFORE writing, so a bad email never lands on the shopper's screen.
      const nextEmail = patch.email !== undefined ? patch.email : store.getState().shipping.email;
      if (nextEmail && !store.EMAIL_OK(nextEmail))
        return fail(`"${nextEmail}" is not a usable email address.`);

      store.setShipping(patch, "agent");

      const changed = Object.keys(patch).length;
      const missing = store.shippingMissing();
      const v = store.violations();
      const tail = missing.length
        ? `Still missing: ${missing.join(", ")}.`
        : v.length
          ? "The form is complete. The cart is still outside the shopper's rules, so checkout stays unregistered."
          : "The form is complete. All that is left is for the shopper to approve the basket.";
      return ok(
        `Updated ${changed} field${changed === 1 ? "" : "s"} on the shopper's delivery form. ${tail}`
      );
    },
  },

  // ── tools that move the HUMAN's screen ─────────────────────────────────────
  // Everything above answers the agent. These two run the other direction: the agent
  // changing what the shopper is looking at, so a person watching can follow the
  // reasoning instead of finding out what happened once the cart total moves. Neither
  // is readOnlyHint. Changing someone's screen is a side effect, and marking it
  // read-only would lie to whatever is deciding which tools are safe to call.
  {
    name: "filter_catalog",
    description:
      "Change what the shopper sees on screen: filter the shelf to a category and/or a search term. This does NOT return products, it moves the human's view. Use search_products to read the catalog, and use this to show the shopper where you are looking before you add anything. Pass an empty query to clear the search.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [...CATEGORIES, "all"],
          description: 'A category, or "all" for the whole shelf',
        },
        query: { type: "string", description: "Search term. An empty string clears it." },
      },
    },
    execute: async (input) => {
      const category = str(input, "category");
      // `query` is read raw rather than through str(): "" is a meaningful value here,
      // it is how the agent clears a search, and str() treats empty as absent.
      const rawQuery = obj(input)["query"];
      if (rawQuery !== undefined && typeof rawQuery !== "string")
        return fail("query must be a string.");
      const query = typeof rawQuery === "string" ? rawQuery.trim() : null;

      if (category && category !== "all" && !CATEGORIES.includes(category as Category))
        return fail(`Unknown category "${category}". Valid: ${CATEGORIES.join(", ")}, all.`);
      if (!category && query === null)
        return fail("Pass a category, a query, or both. There is nothing to change otherwise.");

      const next: Partial<store.View> = {};
      if (category) next.category = category as Category | "all";
      if (query !== null) next.query = query;
      store.setView(next);

      // Count what the shopper can now see, by the same rule the grid uses.
      const v = store.getState().view;
      const q = v.query.toLowerCase();
      const shown = CATALOG.filter((p) => {
        if (v.category !== "all" && p.category !== v.category) return false;
        if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
        return true;
      });
      const where = v.category === "all" ? "the whole shelf" : `${v.category}s`;
      return ok(
        `The shopper is now looking at ${where}${v.query ? ` matching "${v.query}"` : ""}: ` +
          `${shown.length} product${shown.length === 1 ? "" : "s"} on screen.`
      );
    },
  },
  {
    name: "focus_product",
    description:
      "Open one product's quick view on the shopper's screen, so they can see what you are considering before you add it. Call with no product_id to close it again.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string", description: "Omit to close the quick view" } },
    },
    execute: async (input) => {
      const id = str(input, "product_id");
      if (!id) {
        store.setView({ quickView: null });
        return ok("Closed the quick view.");
      }
      if (!byId(id)) return fail(`No product with id "${id}".`);
      store.setView({ quickView: id });
      return ok(`Showing the shopper ${describe(id)}`);
    },
  },
];

export const BASE_TOOLS: ToolDef[] = BASE_DEFS.map(traced);

// ── the two conditional tools ────────────────────────────────────────────────

/**
 * Registered ONLY while `checkoutLive` is true. Its ABSENCE is the product: there is
 * nothing for the agent to retry or argue with. Confirmed sound in probe/FINDINGS.md:
 * after abort() a stale handle is rejected on call.
 */
let placing = false;

export const CHECKOUT_TOOL: ToolDef = traced({
  name: "checkout",
  description:
    "Place the order for everything in the cart, to the address on the delivery form. Only available while the cart satisfies the shopper's rules, the delivery form is complete, AND the shopper has approved this basket.",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    if (placing) return fail("An order is already being placed.");
    if (!store.checkoutLive()) return fail("Checkout is not currently permitted.");
    placing = true;
    const total = store.orderTotalCents();
    const to = store.getState().shipping;

    // Placing the order makes checkoutLive false, which aborts THIS tool. Aborting a
    // call that is still in flight rejects it, so the agent would see an error on a
    // successful order. A 0ms defer is NOT enough: it fires in the gap before the
    // result crosses the WebMCP boundary. Measured, see probe/FINDINGS.md.
    // Revocation for every OTHER reason (budget change, withdrawn approval) stays
    // immediate, which is what the demo shows.
    setTimeout(() => {
      store.placeOrder();
      placing = false;
    }, 350);

    return ok(
      `Order placed. ${money(total)} charged, going to ${to.fullName}, ${to.line1}, ${to.city} ${to.postcode}, ${to.country}. Confirmation to ${to.email}. Thanks.`
    );
  },
});

/**
 * The mirror image of `checkout`, and the reason the pair is worth having: a WebMCP
 * surface is not just a list with one thing missing from it, it is a list that TRACKS
 * the state of the page. `get_order` does not exist while there is nothing to read, and
 * it appears at the same instant `checkout` disappears, because `placeOrder()` is the
 * single state change that flips both.
 *
 * It also closes a real hole. Before this, the agent placed an order and had no way to
 * read back what it had just done.
 */
export const ORDER_TOOL: ToolDef = traced({
  name: "get_order",
  description:
    "Read back the order that was placed: what was bought, what it cost, and when. Only exists after an order has actually been placed.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true },
  execute: async () => {
    const s = store.getState();
    if (!s.order) return fail("No order has been placed.");
    const rows = s.order.lines.map((l) => {
      const p = byId(l.productId);
      return `${l.qty}x ${p ? p.name : l.productId} (${l.productId})`;
    });
    const when = new Date(s.order.at).toLocaleTimeString();
    const to = s.order.shipping;
    return ok(
      [
        `Order placed at ${when}. Total ${money(s.order.total)}.`,
        ...rows,
        `Shipping to ${to.fullName}, ${[to.line1, to.line2].filter(Boolean).join(", ")}, ${to.city} ${to.postcode}, ${to.country}, ${to.speed}.`,
        `Confirmation went to ${to.email}.`,
        "Checkout is closed for this basket: the order is done and cannot be placed twice.",
      ].join("\n")
    );
  },
});
