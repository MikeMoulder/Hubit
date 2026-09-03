// COMMITTED FIRST, FROZEN. All three lanes build against this file.
// Changes here are announced to the whole team before they land.

export type Category = "monitor" | "keyboard" | "mouse" | "desk" | "chair";

export type Product = {
  id: string;
  name: string;
  category: Category;
  priceCents: number;
  specs: Record<string, string>;
  /** Seller-authored text. Always returned with untrustedContentHint. */
  description: string;
  /** /products/<id>.jpg when supplied. Falls back to an initials block. */
  image?: string;

  // Storefront display only. No tool reads these, and they are never sent to an
  // agent: they exist so the grid reads as a shop rather than a table of rows.
  /** Corner flag on the card. One per product at most. */
  badge?: "Best seller" | "New" | "Sale" | "Low stock";
  /** Struck-through "was" price. Visual only, priceCents is always what you pay. */
  compareAtCents?: number;
};

export type CartLine = { id: string; productId: string; qty: number };

export type Constraints = {
  budgetCents: number;
  /** Things the shopper already owns, so the agent should not buy them. */
  have: Category[];
  priority: "quality" | "price";
};

/**
 * Where the order goes. Filled by the shopper OR by the agent through
 * set_shipping_details, which is the point: handing over the tedious part of a checkout
 * is exactly the work you want an agent to do, and it is still not the same thing as
 * handing over permission to pay.
 *
 * Nothing here is persisted or transmitted. There is no backend to send it to.
 */
export type Shipping = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  speed: ShippingSpeed;
  notes: string;
};

export type ShippingSpeed = "standard" | "express";

/** The fields an order cannot go out without. line2, phone and notes are optional. */
export const SHIPPING_REQUIRED = [
  "fullName",
  "email",
  "line1",
  "city",
  "postcode",
  "country",
] as const;

export type ShippingField = keyof Shipping;

export type Violation = {
  field: keyof Constraints;
  message: string;
  overByCents?: number;
};

export type Proposal = {
  field: keyof Constraints;
  from: string;
  to: string;
  reason: string;
};

/** One row in the tool rail. Rendered from OUR registry, never from `toolchange`. */
export type ToolRow = {
  name: string;
  description: string;
  readOnly: boolean;
  untrusted: boolean;
  /** false renders the greyed, gated slot. The absence must be as visible as the presence. */
  registered: boolean;
  gated?: boolean;
  callCount: number;
  lastArgs?: string;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => Promise<ToolResult>;
};

/** The seam. Nothing outside lib/webmcp.ts touches document.modelContext. */
export type RegisteredToolInfo = { name: string; description: string; origin?: string };

export interface ToolHost {
  readonly available: boolean;
  readonly runtime: "webmcp" | "local";
  register(def: ToolDef): () => void;
  list(): RegisteredToolInfo[];
  onChange(cb: () => void): () => void;
}
