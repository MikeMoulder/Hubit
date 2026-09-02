import type { Product } from "./types";

/**
 * Seeded so a quality-priority home office build lands at $1,284 against a $1,200
 * budget: over by $84. That is the demo's 0:25 beat and it must be deterministic.
 * Descriptions are seller-authored text and are always returned untrusted.
 *
 * Images: /public/products/<id>.jpeg, 825x1024 (4:5), one per product. A missing or
 * broken file falls back per product to a category-tinted panel, so the build is
 * never blocked on assets.
 */
export const CATALOG: Product[] = [
  // monitors
  {
    id: "mon-ultra-34",
    name: "34\" Ultrawide 165Hz",
    category: "monitor",
    priceCents: 31900,
    specs: { size: "34 inch", resolution: "3440x1440", refresh: "165Hz", panel: "IPS" },
    description: "Curved ultrawide with a factory colour report in the box. Two upstream inputs and a 90W USB-C that charges a laptop while it drives the panel.",
    badge: "Best seller",
  },
  {
    id: "mon-27-1440",
    name: "27\" 1440p 144Hz",
    category: "monitor",
    priceCents: 24900,
    specs: { size: "27 inch", resolution: "2560x1440", refresh: "144Hz", panel: "IPS" },
    description: "The safe pick. Even backlight, a stand that actually adjusts, and no coating haze on text.",
  },
  {
    id: "mon-24-1080",
    name: "24\" 1080p 75Hz",
    category: "monitor",
    priceCents: 12900,
    specs: { size: "24 inch", resolution: "1920x1080", refresh: "75Hz", panel: "VA" },
    description: "Cheap and honest. Fine as a second screen, tiring as a first one.",
  },

  // keyboards
  {
    id: "kb-mech-tkl",
    name: "Mechanical TKL, tactile",
    category: "keyboard",
    priceCents: 14900,
    specs: { layout: "Tenkeyless", switches: "Tactile brown", body: "Aluminium", connection: "USB-C" },
    description: "Gasket mount, doubleshot PBT caps, and it does not rattle when you type fast. Hot swap sockets if you change your mind about the switches.",
    badge: "Best seller",
  },
  {
    id: "kb-mech-full",
    name: "Mechanical full size, linear",
    category: "keyboard",
    priceCents: 8900,
    specs: { layout: "Full size", switches: "Linear red", body: "ABS", connection: "USB-C" },
    description: "Number pad, quiet enough for a shared room, unremarkable in every other way.",
  },
  {
    id: "kb-membrane",
    name: "Low profile membrane",
    category: "keyboard",
    priceCents: 3400,
    specs: { layout: "Full size", switches: "Membrane", body: "ABS", connection: "Wireless" },
    description: "Thin, silent, forgettable. Buy it if the desk matters more than the typing.",
  },

  // mice
  {
    id: "mouse-erg-wireless",
    name: "Ergonomic wireless, 8K",
    category: "mouse",
    priceCents: 7900,
    specs: { sensor: "8000 DPI", weight: "78g", connection: "2.4GHz + Bluetooth", battery: "70 hours" },
    description: "Shaped for a full palm grip. Charges over USB-C and pairs with three machines on a switch.",
    badge: "Best seller",
  },
  {
    id: "mouse-basic-wireless",
    name: "Wireless optical",
    category: "mouse",
    priceCents: 3900,
    specs: { sensor: "1600 DPI", weight: "92g", connection: "2.4GHz", battery: "AA, 9 months" },
    description: "Does what a mouse does. The scroll wheel is the part that will fail first.",
  },
  {
    id: "mouse-trackball",
    name: "Thumb trackball",
    category: "mouse",
    priceCents: 5900,
    specs: { sensor: "2000 DPI", weight: "145g", connection: "Bluetooth", battery: "AA, 18 months" },
    description: "Takes a week to stop feeling wrong. People with wrist pain rarely go back.",
  },

  // desks
  {
    id: "desk-standing-160",
    name: "Standing desk, 160cm",
    category: "desk",
    priceCents: 34900,
    specs: { width: "160cm", depth: "80cm", range: "62 to 128cm", motors: "Dual" },
    description: "Dual motor, four memory presets, and it does not wobble at full height with two monitors on it. Bamboo top.",
    badge: "Best seller",
  },
  {
    id: "desk-fixed-140",
    name: "Fixed desk, 140cm",
    category: "desk",
    priceCents: 19900,
    specs: { width: "140cm", depth: "70cm", height: "75cm", frame: "Steel" },
    description: "A flat surface on four legs, which is most of what a desk needs to be. Cable tray included.",
  },
  {
    id: "desk-compact-120",
    name: "Compact desk, 120cm",
    category: "desk",
    priceCents: 11900,
    specs: { width: "120cm", depth: "60cm", height: "74cm", frame: "Steel" },
    description: "For a corner or a small room. One monitor and a laptop is the honest limit.",
  },

  // chairs
  {
    id: "chair-ergo-mesh",
    name: "Ergonomic mesh, adjustable",
    category: "chair",
    priceCents: 38800,
    specs: { back: "Mesh", lumbar: "Adjustable depth", arms: "4D", warranty: "12 years" },
    description: "Independent seat tilt, adjustable lumbar depth, and arms that move in every direction you would want. The part of this list that your back will notice in year three.",
    badge: "Best seller",
  },
  {
    id: "chair-task-padded",
    name: "Padded task chair",
    category: "chair",
    priceCents: 19900,
    specs: { back: "Padded", lumbar: "Fixed", arms: "Height only", warranty: "3 years" },
    description: "Comfortable for a morning, tiring by five. The foam compresses inside a year.",
  },
  {
    id: "chair-stool",
    name: "Drafting stool",
    category: "chair",
    priceCents: 9900,
    specs: { back: "Low", lumbar: "None", arms: "None", warranty: "2 years" },
    description: "Pairs with a standing desk for the hours you do not want to stand. Not a chair for a full day.",
  },
  // second tier, added so search/compare/alternatives have real choices to reason over
  {
    id: "mon-32-4k",
    name: "32\" 4K 60Hz",
    category: "monitor",
    priceCents: 28900,
    specs: { size: "32 inch", resolution: "3840x2160", refresh: "60Hz", panel: "IPS" },
    description: "Pixel density for text and photo work. Not for anything that moves quickly.",
    badge: "Sale",
    compareAtCents: 32900,
  },
  {
    id: "mon-27-1080",
    name: "27\" 1080p 100Hz",
    category: "monitor",
    priceCents: 15900,
    specs: { size: "27 inch", resolution: "1920x1080", refresh: "100Hz", panel: "VA" },
    description: "Big and cheap. At this size 1080p looks soft, which people notice within a week.",
  },
  {
    id: "kb-mech-65",
    name: "Mechanical 65%, silent",
    category: "keyboard",
    priceCents: 11900,
    specs: { layout: "65 percent", switches: "Silent tactile", body: "Aluminium", connection: "Bluetooth" },
    description: "Small enough to leave desk space for a mouse. Silenced switches for shared rooms.",
  },
  {
    id: "kb-split-ergo",
    name: "Split ergonomic",
    category: "keyboard",
    priceCents: 19900,
    specs: { layout: "Split", switches: "Tactile", body: "ABS", connection: "USB-C" },
    description: "Two halves you position to your shoulders. A fortnight of slower typing, then better wrists.",
    badge: "Low stock",
  },
  {
    id: "mouse-vertical",
    name: "Vertical ergonomic",
    category: "mouse",
    priceCents: 6900,
    specs: { sensor: "4000 DPI", weight: "110g", connection: "Bluetooth", battery: "60 hours" },
    description: "Holds the forearm in a handshake position. Awkward for a week, then unremarkable.",
    badge: "New",
  },
  {
    id: "mouse-light-wired",
    name: "Lightweight wired",
    category: "mouse",
    priceCents: 2900,
    specs: { sensor: "12000 DPI", weight: "58g", connection: "USB-C wired", battery: "None" },
    description: "No battery to charge and nothing to pair. The cable is the whole trade.",
  },
  {
    id: "desk-standing-140",
    name: "Standing desk, 140cm",
    category: "desk",
    priceCents: 27900,
    specs: { width: "140cm", depth: "70cm", range: "70 to 120cm", motors: "Single" },
    description: "Single motor, so it lifts more slowly and dislikes uneven loads. Two presets.",
  },
  {
    id: "desk-corner-l",
    name: "Corner desk, L shape",
    category: "desk",
    priceCents: 22900,
    specs: { width: "160cm x 120cm", depth: "60cm", height: "75cm", frame: "Steel" },
    description: "Two working surfaces at a right angle. Needs a corner it will never leave.",
    badge: "Sale",
    compareAtCents: 25900,
  },
  {
    id: "chair-mesh-mid",
    name: "Mesh task chair",
    category: "chair",
    priceCents: 27900,
    specs: { back: "Mesh", lumbar: "Adjustable height", arms: "3D", warranty: "7 years" },
    description: "Most of the ergonomic chair for two thirds of the price. The armrests are the compromise.",
    badge: "Sale",
    compareAtCents: 31900,
  },
  {
    id: "chair-budget-mesh",
    name: "Budget mesh chair",
    category: "chair",
    priceCents: 13900,
    specs: { back: "Mesh", lumbar: "Fixed", arms: "Height only", warranty: "2 years" },
    description: "Breathable and adjustable enough for a few hours. The base is plastic.",
  },

  // third tier, taking the shelf to 40. Nothing here is priced above the dearest
  // item already in its category, so the quality-priority build stays $1,284.
  {
    id: "mon-27-1440-usbc",
    name: "27\" 1440p USB-C dock",
    category: "monitor",
    priceCents: 27900,
    specs: { size: "27 inch", resolution: "2560x1440", refresh: "75Hz", panel: "IPS" },
    description: "One cable to the laptop: 96W of charge, the webcam, the keyboard and the network, all through the panel. Replaces a dock you would otherwise buy.",
    badge: "New",
  },
  {
    id: "mon-34-1440-va",
    name: "34\" Ultrawide 100Hz VA",
    category: "monitor",
    priceCents: 22900,
    specs: { size: "34 inch", resolution: "3440x1440", refresh: "100Hz", panel: "VA" },
    description: "The width of the 165Hz ultrawide for a hundred less. Deeper blacks, slower pixels, visible smearing in dark scenes.",
  },
  {
    id: "mon-24-1200",
    name: "24\" 1920x1200 100Hz",
    category: "monitor",
    priceCents: 17900,
    specs: { size: "24 inch", resolution: "1920x1200", refresh: "100Hz", panel: "IPS" },
    description: "The extra 120 pixels of height are worth more than they sound, and it pivots to portrait for reading code.",
  },

  {
    id: "kb-mech-75",
    name: "Mechanical 75%, wireless",
    category: "keyboard",
    priceCents: 15900,
    specs: { layout: "75 percent", switches: "Tactile", body: "Aluminium", connection: "Bluetooth + 2.4GHz" },
    description: "Arrow keys and a function row without the number pad. Three device profiles and a knob for volume.",
  },
  {
    id: "kb-lowpro-mech",
    name: "Low profile mechanical",
    category: "keyboard",
    priceCents: 12900,
    specs: { layout: "Full size", switches: "Low profile tactile", body: "Aluminium", connection: "USB-C" },
    description: "Laptop key height with real switches under it. The travel is short enough that heavy typists overshoot for a week.",
  },
  {
    id: "kb-budget-mech",
    name: "Budget mechanical TKL",
    category: "keyboard",
    priceCents: 5900,
    specs: { layout: "Tenkeyless", switches: "Tactile", body: "ABS", connection: "USB-C" },
    description: "Cheapest way into mechanical switches. The case flexes and the caps go shiny, but it types properly.",
    badge: "Sale",
    compareAtCents: 7900,
  },

  {
    id: "mouse-pro-wireless",
    name: "Wireless, 4K polling",
    category: "mouse",
    priceCents: 6400,
    specs: { sensor: "26000 DPI", weight: "63g", connection: "2.4GHz", battery: "90 hours" },
    description: "Light, fast, and it reports four times as often as it needs to for anything you do at a desk.",
  },
  {
    id: "mouse-silent-wireless",
    name: "Silent click wireless",
    category: "mouse",
    priceCents: 4900,
    specs: { sensor: "4000 DPI", weight: "88g", connection: "Bluetooth", battery: "AA, 12 months" },
    description: "The click is a muffled thud instead of a snap. Made for shared rooms and late calls.",
  },
  {
    id: "mouse-compact-bt",
    name: "Compact Bluetooth",
    category: "mouse",
    priceCents: 3400,
    specs: { sensor: "1200 DPI", weight: "62g", connection: "Bluetooth", battery: "AAA, 6 months" },
    description: "Small enough for a bag. Cramped if your hand is larger than average, which is most hands.",
  },

  {
    id: "desk-fixed-160",
    name: "Fixed desk, 160cm",
    category: "desk",
    priceCents: 23900,
    specs: { width: "160cm", depth: "80cm", height: "75cm", frame: "Steel" },
    description: "The full width of the standing desk without the motors. Solid, heavy, and it will not move again once built.",
  },
  {
    id: "desk-standing-120",
    name: "Standing desk, 120cm",
    category: "desk",
    priceCents: 21900,
    specs: { width: "120cm", depth: "60cm", range: "72 to 118cm", motors: "Single" },
    description: "A sit-stand frame that fits a small room. One monitor and a laptop before it feels crowded.",
    badge: "New",
  },
  {
    id: "desk-wall-fold",
    name: "Wall mounted fold-down",
    category: "desk",
    priceCents: 14900,
    specs: { width: "110cm", depth: "50cm", height: "Fixed at mount", frame: "Steel and birch" },
    description: "Folds flat to 6cm when you are done for the day. Needs studs and an afternoon to mount properly.",
  },

  {
    id: "chair-mesh-headrest",
    name: "Mesh chair with headrest",
    category: "chair",
    priceCents: 33900,
    specs: { back: "Mesh", lumbar: "Adjustable depth", arms: "4D", warranty: "10 years" },
    description: "The headrest is the difference, and you only notice it when you lean back to think. Everything else adjusts the way you would expect.",
  },
  {
    id: "chair-exec-leather",
    name: "Executive, bonded leather",
    category: "chair",
    priceCents: 32900,
    specs: { back: "Padded leather", lumbar: "Fixed", arms: "Height only", warranty: "5 years" },
    description: "Looks expensive on a call and runs warm by the afternoon. Bonded leather, so it will crack before the frame gives out.",
    badge: "Low stock",
  },
  {
    id: "chair-kneeling",
    name: "Kneeling stool",
    category: "chair",
    priceCents: 11900,
    specs: { back: "None", lumbar: "Posture by geometry", arms: "None", warranty: "2 years" },
    description: "Tips your hips forward so your spine stacks itself. Good for two hours at a time, punishing after four.",
  },
];

export const CATEGORY_LABEL: Record<Product["category"], string> = {
  monitor: "Monitors",
  keyboard: "Keyboards",
  mouse: "Mice",
  desk: "Desks",
  chair: "Chairs",
};

export const byId = (id: string) => CATALOG.find((p) => p.id === id);

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * True since 2026-09-02: /public/products/ holds all 40 photos, one per id.
 *
 * Set it back to false and the grid falls back to typographic cards with zero image
 * requests, which is what a build with no assets should do. Forty 404s in the console
 * during a demo is worse than forty typographic cards.
 */
export const HAS_PRODUCT_IMAGES = true;

/** Every product resolves to the same path. Drop files in, flip the flag, done. */
export const imageSrc = (p: Product): string | undefined =>
  p.image ?? (HAS_PRODUCT_IMAGES ? `/products/${p.id}.jpeg` : undefined);

export const countByCategory = (c: Product["category"]) =>
  CATALOG.filter((p) => p.category === c).length;

/**
 * Ratings are derived from the id, not authored, so they are stable across reloads
 * and nobody has to hand-write forty of them. Display only: no tool reads a rating,
 * and none of it reaches the agent.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const rating = (p: Product) => 4.1 + (hash(p.id) % 9) / 10;
export const reviewCount = (p: Product) => 18 + (hash(p.id + "r") % 322);
