import type { Product } from "./types";

/**
 * Seeded so a quality-priority home office build lands at $1,284 against a $1,200
 * budget: over by $84. That is the demo's 0:25 beat and it must be deterministic.
 * Descriptions are seller-authored text and are always returned untrusted.
 *
 * Images: drop files at /public/products/<id>.jpg. A missing file falls back to an
 * initials block, so the build is never blocked on assets.
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
  },
  {
    id: "mouse-vertical",
    name: "Vertical ergonomic",
    category: "mouse",
    priceCents: 6900,
    specs: { sensor: "4000 DPI", weight: "110g", connection: "Bluetooth", battery: "60 hours" },
    description: "Holds the forearm in a handshake position. Awkward for a week, then unremarkable.",
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
  },
  {
    id: "chair-mesh-mid",
    name: "Mesh task chair",
    category: "chair",
    priceCents: 27900,
    specs: { back: "Mesh", lumbar: "Adjustable height", arms: "3D", warranty: "7 years" },
    description: "Most of the ergonomic chair for two thirds of the price. The armrests are the compromise.",
  },
  {
    id: "chair-budget-mesh",
    name: "Budget mesh chair",
    category: "chair",
    priceCents: 13900,
    specs: { back: "Mesh", lumbar: "Fixed", arms: "Height only", warranty: "2 years" },
    description: "Breathable and adjustable enough for a few hours. The base is plastic.",
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
