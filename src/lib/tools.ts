import { CATALOG, byId, money } from "./catalog";
import * as store from "./store";
import type { Category, ToolDef, ToolResult } from "./types";

/**
 * The nine tools ARE the API of this project. There are no HTTP endpoints.
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

function cartSummary(): string {
  const s = store.getState();
  if (!s.lines.length) return "Cart is empty.";
  const rows = s.lines.map((l) => {
    const p = byId(l.productId)!;
    return `${l.qty}x ${p.name} (${p.id}) ${money(p.priceCents * l.qty)}`;
  });
  const total = store.cartTotalCents();
  const v = store.violations();
  const status = v.length
    ? `OVER: ${v.map((x) => x.message + (x.overByCents ? ` by ${money(x.overByCents)}` : "")).join("; ")}`
    : "Within all constraints.";
  return `${rows.join("\n")}\nTotal: ${money(total)} of ${money(s.constraints.budgetCents)}. ${status}`;
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

// ── the eight always-on tools ────────────────────────────────────────────────

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
      return ok(hits.map((p) => describe(p.id)).join("\n"));
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
];

export const BASE_TOOLS: ToolDef[] = BASE_DEFS.map(traced);

// ── the gated tool ───────────────────────────────────────────────────────────

/**
 * Registered ONLY while `checkoutLive` is true. Its ABSENCE is the product: there is
 * nothing for the agent to retry or argue with. Confirmed sound in probe/FINDINGS.md:
 * after abort() a stale handle is rejected on call.
 */
let placing = false;

export const CHECKOUT_TOOL: ToolDef = traced({
  name: "checkout",
  description:
    "Place the order for everything in the cart. Only available while the cart satisfies the shopper's rules AND the shopper has approved this basket.",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    if (placing) return fail("An order is already being placed.");
    if (!store.checkoutLive()) return fail("Checkout is not currently permitted.");
    placing = true;
    const total = store.cartTotalCents();

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

    return ok(`Order placed. ${money(total)} charged. Thanks.`);
  },
});
