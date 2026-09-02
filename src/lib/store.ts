import { CATALOG, byId } from "./catalog";
import type { CartLine, Constraints, Proposal, Violation } from "./types";

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

export type State = {
  lines: CartLine[];
  constraints: Constraints;
  /** Human granted permission to check out. Reset whenever the cart or rules change. */
  approved: boolean;
  pending: Proposal | null;
  order: { total: number; at: number } | null;
  calls: ToolCall[];
  seamErrors: string[];
};

const initial: State = {
  lines: [],
  constraints: { budgetCents: 120000, have: [], priority: "quality" },
  approved: false,
  pending: null,
  order: null,
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

/** Recomputed on every mutation. Never stored. */
export function violations(s: State = state): Violation[] {
  const out: Violation[] = [];
  const total = cartTotalCents(s);
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

/** The gate. One boolean. Everything on screen is derived from it. */
export function checkoutLive(s: State = state): boolean {
  return violations(s).length === 0 && s.approved && s.order === null;
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
  set({ order: { total: cartTotalCents(), at: Date.now() }, approved: false });
}

export function reset() {
  set({ ...initial, calls: state.calls });
}

let callId = 0;
export function recordCall(name: string, args: string, result: string, ok = true) {
  set({ calls: [...state.calls, { id: ++callId, name, args, result, at: Date.now(), ok }].slice(-40) });
}

export function recordSeamError(message: string) {
  set({ seamErrors: [...state.seamErrors, message] });
}

export const ALL_CATEGORIES = [...new Set(CATALOG.map((p) => p.category))];
