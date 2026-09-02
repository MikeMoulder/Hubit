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
};

export type CartLine = { id: string; productId: string; qty: number };

export type Constraints = {
  budgetCents: number;
  /** Things the shopper already owns, so the agent should not buy them. */
  have: Category[];
  priority: "quality" | "price";
};

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
  invoke(name: string, args: unknown): Promise<ToolResult>;
  onChange(cb: () => void): () => void;
}
