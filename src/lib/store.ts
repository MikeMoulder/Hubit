import { CATALOG, byId } from "./catalog";
import type {
  CartLine,
  Category,
  Constraints,
  Proposal,
  Shipping,
  Violation,
} from "./types";
import { SHIPPING_REQUIRED } from "./types";

/**
 * Vanilla store, not React state. Tool `execute` callbacks run outside React and
 * must be able to mutate, so the store lives here and components subscribe.
 */

export type ToolCall = {
  id: number;
  name: string;
  args: string;
  result: string;
  at: number;
  ok: boolean;
};

/**
 * What the shopper is looking at. It lives HERE and not in React because a tool
 * `execute` runs outside React and cannot reach a `useState` setter: `filter_catalog`
 * and `focus_product` move the human's screen, so the human's screen has to be state
 * the store owns.
 *
 * Nothing in here touches the gate. Looking at a different shelf is not a change to
 * the cart or to the rules, so it must never invalidate approval.
 */
export type View = {
  category: Category | "all";
  query: string;
  cartOpen: boolean;
  quickView: string | null;
};

export type State = {
  lines: CartLine[];
  constraints: Constraints;
  /** Human granted permission to check out. Reset whenever the cart or rules change. */
  approved: boolean;
  pending: Proposal | null;
  shipping: Shipping;
  /** Which delivery fields the AGENT typed, so the form can show the split on screen. */
  shippingBy: Partial<Record<keyof Shipping, "agent">>;
  /** Snapshot, not a pointer at the cart: `get_order` must keep reading the same
   *  order even after the shopper starts filling the basket again. */
  order: { total: number; at: number; lines: CartLine[]; shipping: Shipping } | null;
  view: View;
  calls: ToolCall[];
  seamErrors: string[];
};

const initial: State = {
  lines: [],
  constraints: { budgetCents: 120000, have: [], priority: "quality" },
  approved: false,
  pending: null,
  shipping: {
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "",
    speed: "standard",
    notes: "",
  },
  shippingBy: {},
  order: null,
  view: { category: "all", query: "", cartOpen: false, quickView: null },
  calls: [],
  seamErrors: [],
};

let state: State = initial;
const listeners = new Set<() => void>();

export const getState = () => state;
export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

// ── derived ──────────────────────────────────────────────────────────────────

export function cartTotalCents(s: State = state): number {
  return s.lines.reduce((sum, l) => sum + (byId(l.productId)?.priceCents ?? 0) * l.qty, 0);
}

/** Express is a real cost, so it counts against the budget like everything else. */
export const EXPRESS_CENTS = 1499;

export function shippingCostCents(s: State = state): number {
  return s.shipping.speed === "express" ? EXPRESS_CENTS : 0;
}

/** Goods plus delivery. This, not the goods total, is what the budget is checked against. */
export function orderTotalCents(s: State = state): number {
  return cartTotalCents(s) + shippingCostCents(s);
}

const LABELS: Record<string, string> = {
  fullName: "full name",
  email: "email",
  line1: "address line 1",
  city: "city",
  postcode: "postcode",
  country: "country",
};

/** Rough on purpose. It rejects the obvious mistakes without inventing an RFC. */
export const EMAIL_OK = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/**
 * What the delivery form is still missing, in human words. Empty means the order can
 * physically go out, which is one of the three things checkout needs.
 */
export function shippingMissing(s: State = state): string[] {
  const out: string[] = [];
  for (const f of SHIPPING_REQUIRED) {
    if (!String(s.shipping[f]).trim()) out.push(LABELS[f]);
  }
  if (s.shipping.email.trim() && !EMAIL_OK(s.shipping.email)) out.push("a valid email");
  return out;
}

export function shippingComplete(s: State = state): boolean {
  return shippingMissing(s).length === 0;
}

/** Recomputed on every mutation. Never stored. */
export function violations(s: State = state): Violation[] {
  const out: Violation[] = [];
  const total = orderTotalCents(s);
  if (total > s.constraints.budgetCents) {
    out.push({
      field: "budgetCents",
      message: `Cart is over budget`,
      overByCents: total - s.constraints.budgetCents,
    });
  }
  for (const line of s.lines) {
    const p = byId(line.productId);
    if (p && s.constraints.have.includes(p.category)) {
      out.push({ field: "have", message: `You already have a ${p.category}` });
    }
  }
  return out;
}

/**
 * The gate. One boolean. Everything on screen is derived from it.
 *
 * THREE conditions, and each one is visible on the page: the cart is inside the
 * shopper's rules, the order has somewhere to go, and the shopper has approved THIS
 * basket. A missing delivery address withholds checkout exactly the way a broken budget
 * does, because a tool that cannot be completed should not be on the agent's surface.
 */
export function checkoutLive(s: State = state): boolean {
  return (
    violations(s).length === 0 && shippingComplete(s) && s.approved && s.order === null
  );
}

// ── actions ──────────────────────────────────────────────────────────────────

/** Any change to cart or rules withdraws consent. Approval is for a specific basket. */
function invalidateApproval(next: Partial<State>): Partial<State> {
  return { ...next, approved: false };
}

export function addToCart(productId: string, qty = 1) {
  const existing = state.lines.find((l) => l.productId === productId);
  const lines = existing
    ? state.lines.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l))
    : [...state.lines, { id: `line-${Date.now()}-${productId}`, productId, qty }];
  set(invalidateApproval({ lines }));
}

/** Empties the basket in one call. Still a change to the basket, so consent goes with it. */
export function clearCart() {
  set(invalidateApproval({ lines: [] }));
}

export function removeFromCart(productId: string) {
  set(invalidateApproval({ lines: state.lines.filter((l) => l.productId !== productId) }));
}

export function updateQuantity(productId: string, qty: number) {
  if (qty <= 0) return removeFromCart(productId);
  set(
    invalidateApproval({
      lines: state.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    })
  );
}

/**
 * Delivery details, written by the shopper's keyboard or by the agent's
 * set_shipping_details. Both land here, which is the honest version: there is no
 * separate agent path.
 *
 * It goes through invalidateApproval deliberately. You approved a basket going to a
 * particular address, so changing the address afterwards has to ask you again — an
 * agent must not be able to redirect a parcel you already said yes to.
 */
export function setShipping(patch: Partial<Shipping>, by: "human" | "agent" = "human") {
  // Provenance per field, not per form: the interesting picture is the one where the
  // agent filled six fields and the shopper corrected one of them.
  const shippingBy = { ...state.shippingBy };
  for (const k of Object.keys(patch) as (keyof Shipping)[]) {
    if (by === "agent") shippingBy[k] = "agent";
    else delete shippingBy[k];
  }
  set(invalidateApproval({ shipping: { ...state.shipping, ...patch }, shippingBy }));
}

/**
 * The only writer of view state. Deliberately a plain `set`: it does NOT go through
 * invalidateApproval, because an agent showing you a product must not be able to
 * withdraw your consent as a side effect.
 */
export function setView(next: Partial<View>) {
  set({ view: { ...state.view, ...next } });
}

export function setBudget(cents: number) {
  set(invalidateApproval({ constraints: { ...state.constraints, budgetCents: cents } }));
}

export function toggleHave(category: Constraints["have"][number]) {
  const have = state.constraints.have.includes(category)
    ? state.constraints.have.filter((c) => c !== category)
    : [...state.constraints.have, category];
  set(invalidateApproval({ constraints: { ...state.constraints, have } }));
}

export function setPriority(priority: Constraints["priority"]) {
  set({ constraints: { ...state.constraints, priority } });
}

export function propose(p: Proposal) {
  set({ pending: p });
}

/** The click that opens the gate. */
export function approveProposal() {
  const p = state.pending;
  if (!p) return;
  const constraints = { ...state.constraints };
  if (p.field === "budgetCents") constraints.budgetCents = Number(p.to);
  set({ constraints, pending: null, approved: true });
}

export function rejectProposal() {
  set({ pending: null });
}

/** Approve the basket as it stands, with no rule change needed. */
export function approveAsIs() {
  set({ approved: true });
}

export function revokeApproval() {
  set({ approved: false });
}

export function placeOrder() {
  set({
    order: {
      total: orderTotalCents(),
      at: Date.now(),
      lines: state.lines,
      shipping: state.shipping,
    },
    approved: false,
  });
}

/**
 * Start over empties the basket. It deliberately keeps `calls` AND `shipping`: the log
 * is evidence, and where you live is not part of the basket you just abandoned.
 */
export function reset() {
  set({ ...initial, calls: state.calls, shipping: state.shipping, shippingBy: state.shippingBy });
}

let callId = 0;
export function recordCall(name: string, args: string, result: string, ok = true) {
  set({ calls: [...state.calls, { id: ++callId, name, args, result, at: Date.now(), ok }].slice(-40) });
}

export function recordSeamError(message: string) {
  set({ seamErrors: [...state.seamErrors, message] });
}

export const ALL_CATEGORIES = [...new Set(CATALOG.map((p) => p.category))];
