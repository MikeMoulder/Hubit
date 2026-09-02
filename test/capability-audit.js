(async () => {
  const mc = document.modelContext;
  const A = (o) => JSON.stringify(o);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tools = async () => await mc.getTools();
  const get = async (n) => (await tools()).find((t) => t.name === n);
  const call = async (n, a) => {
    const t = await get(n);
    if (!t) return "__ABSENT__";
    try {
      const raw = await mc.executeTool(t, A(a || {}));
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      return (p && p.content && p.content[0] && p.content[0].text) || JSON.stringify(p);
    } catch (e) {
      return "__THREW__ " + e.name + " " + e.message;
    }
  };
  // Prefer an explicit data-audit hook, fall back to button text. The storefront nav
  // now has a "Monitors" link and a price sort, both of which the old text match would
  // have hit before the rules control it meant. The fallback keeps this script working
  // against builds that predate the hooks.
  const click = (txt, sel) => {
    const el = sel ? document.querySelector(sel) : null;
    if (el) { el.click(); return true; }
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.trim().toLowerCase().includes(txt)
    );
    if (b) { b.click(); return true; }
    return false;
  };

  const results = [];
  let pass = 0, fail = 0;
  const check = (name, actual, predicate, note) => {
    const okFlag = predicate(String(actual));
    if (okFlag) pass++; else fail++;
    results.push(
      (okFlag ? "PASS " : "FAIL ") + name + (okFlag ? "" : "\n        got: " + String(actual).slice(0, 160)) + (note ? "\n        " + note : "")
    );
  };
  const has = (s) => (a) => a.toLowerCase().includes(s.toLowerCase());

  results.push("=== SURFACE ===");
  const names = (await tools()).map((t) => t.name).sort();
  check("10 tools at load, checkout absent", names.join(","), (a) => !a.includes("checkout") && a.split(",").length === 10);
  check("compare_products registered", names.join(","), has("compare_products"));
  check("search_alternatives registered", names.join(","), has("search_alternatives"));

  results.push("=== search_products ===");
  check("no args returns catalog", await call("search_products"), has("mon-27-1440"));
  check("by category", await call("search_products", { category: "chair" }), (a) => has("chair-ergo-mesh")(a) && !has("mon-27-1440")(a));
  check("by max price", await call("search_products", { category: "monitor", max_price_cents: 15000 }), (a) => has("mon-24-1080")(a) && !has("mon-ultra-34")(a));
  check("free text query", await call("search_products", { query: "ultrawide" }), has("mon-ultra-34"));
  check("invalid category rejected", await call("search_products", { category: "spaceship" }), has("Unknown category"));
  check("no matches is not an error", await call("search_products", { query: "zzzzz" }), has("No products matched"));

  results.push("=== get_product ===");
  check("valid id", await call("get_product", { product_id: "chair-ergo-mesh" }), has("Ergonomic mesh"));
  check("missing arg rejected", await call("get_product"), has("required"));
  check("unknown id rejected", await call("get_product", { product_id: "nope" }), has("No product with id"));
  check("wrong type rejected", await call("get_product", { product_id: 42 }), has("required"));

  results.push("=== get_constraints / get_cart ===");
  check("constraints readable", await call("get_constraints"), has("Budget: $1,200"));
  check("empty cart", await call("get_cart"), has("Cart is empty"));

  results.push("=== add_to_cart validation ===");
  check("missing product_id", await call("add_to_cart"), has("required"));
  check("unknown product", await call("add_to_cart", { product_id: "ghost" }), has("No product with id"));
  check("qty 0 rejected", await call("add_to_cart", { product_id: "mon-27-1440", quantity: 0 }), has("between 1 and 10"));
  check("qty 11 rejected", await call("add_to_cart", { product_id: "mon-27-1440", quantity: 11 }), has("between 1 and 10"));
  check("qty 1.5 rejected", await call("add_to_cart", { product_id: "mon-27-1440", quantity: 1.5 }), has("between 1 and 10"));
  check("qty as string coerced", await call("add_to_cart", { product_id: "mon-27-1440", quantity: "2" }), has("Added 2x"));
  check("cart reflects it", await call("get_cart"), has("2x"));

  results.push("=== update_quantity / remove_from_cart ===");
  check("update to 1", await call("update_quantity", { product_id: "mon-27-1440", quantity: 1 }), has("Total: $249"));
  check("update out of range", await call("update_quantity", { product_id: "mon-27-1440", quantity: 99 }), has("between 0 and 10"));
  check("update item not in cart", await call("update_quantity", { product_id: "chair-stool", quantity: 1 }), has("not in the cart"));
  check("remove item not in cart", await call("remove_from_cart", { product_id: "chair-stool" }), has("not in the cart"));
  check("update to 0 removes", await call("update_quantity", { product_id: "mon-27-1440", quantity: 0 }), has("Cart is empty"));

  results.push("=== constraint: already have ===");
  click("monitor", '[data-audit="have-monitor"]');
  await sleep(300);
  check("have-monitor is a violation", await call("add_to_cart", { product_id: "mon-27-1440" }), has("already have"));
  click("monitor", '[data-audit="have-monitor"]');
  await sleep(300);
  await call("remove_from_cart", { product_id: "mon-27-1440" });

  results.push("=== propose_constraint_change validation ===");
  check("unknown field rejected", await call("propose_constraint_change", { field: "priority", new_value: 1, reason: "x" }), has("Only"));
  check("negative value rejected", await call("propose_constraint_change", { field: "budgetCents", new_value: -5, reason: "x" }), has("positive amount"));
  check("missing reason rejected", await call("propose_constraint_change", { field: "budgetCents", new_value: 130000 }), has("reason is required"));
  check("valid proposal queued", await call("propose_constraint_change", { field: "budgetCents", new_value: 130000, reason: "Better chair." }), has("Waiting for the shopper"));
  check("proposal did NOT apply itself", await call("get_constraints"), has("Budget: $1,200"));
  click("reject", '[data-audit="reject"]');
  await sleep(300);
  check("rejected proposal leaves rules alone", await call("get_constraints"), has("Budget: $1,200"));

  results.push("=== compare_products ===");
  check("two products compared", await call("compare_products", { product_ids: ["chair-ergo-mesh", "chair-mesh-mid"] }), (a) => has("Comparing 2 chairs")(a) && has("warranty")(a) && has("Spread")(a));
  check("one product rejected", await call("compare_products", { product_ids: ["chair-stool"] }), has("between 2 and 5"));
  check("six products rejected", await call("compare_products", { product_ids: ["a","b","c","d","e","f"] }), has("between 2 and 5"));
  check("not an array rejected", await call("compare_products", { product_ids: "chair-stool" }), has("must be an array"));
  check("unknown id rejected", await call("compare_products", { product_ids: ["chair-stool", "nope"] }), has("No product with id"));
  check("mixed categories flagged", await call("compare_products", { product_ids: ["chair-stool", "mon-24-1080"] }), has("not a like for like"));

  results.push("=== search_alternatives ===");
  const alts = await call("search_alternatives", { product_id: "chair-ergo-mesh" });
  check("finds cheaper options", alts, (a) => has("chair-mesh-mid")(a) && has("saves")(a));
  check("names the trade-off", alts, has("Gives up"));
  check("respects a ceiling", await call("search_alternatives", { product_id: "chair-ergo-mesh", max_price_cents: 15000 }), (a) => has("chair-budget-mesh")(a) && !has("chair-mesh-mid")(a));
  check("cheapest item has no alternatives", await call("search_alternatives", { product_id: "mouse-light-wired" }), has("Nothing cheaper"));
  check("unknown id rejected", await call("search_alternatives", { product_id: "nope" }), has("No product with id"));

  results.push("=== priority is a real rule ===");
  click("price", '[data-audit="priority-price"]');
  await sleep(300);
  const cheapFirst = await call("search_products", { category: "monitor" });
  check("price priority puts cheapest first", cheapFirst, (a) => a.indexOf("mon-24-1080") < a.indexOf("mon-ultra-34"));
  check("search states the ordering rule", cheapFirst, has("stated priority (price)"));
  click("quality", '[data-audit="priority-quality"]');
  await sleep(300);
  const dearFirst = await call("search_products", { category: "monitor" });
  check("quality priority puts best first", dearFirst, (a) => a.indexOf("mon-ultra-34") < a.indexOf("mon-24-1080"));

  results.push("=== THE GATE ===");
  await call("add_to_cart", { product_id: "mon-ultra-34" });
  await call("add_to_cart", { product_id: "kb-mech-tkl" });
  await call("add_to_cart", { product_id: "mouse-erg-wireless" });
  await call("add_to_cart", { product_id: "desk-standing-160" });
  const build = await call("add_to_cart", { product_id: "chair-ergo-mesh" });
  check("quality build is $1,284 over $1,200", build, (a) => has("$1,284")(a) && has("over budget by $84")(a));
  check("checkout ABSENT while over budget", (await get("checkout")) ? "present" : "absent", has("absent"));
  check("calling checkout while gated is impossible", await call("checkout"), has("__ABSENT__"));

  await call("propose_constraint_change", { field: "budgetCents", new_value: 128400, reason: "The chair is the only one with adjustable lumbar." });
  await sleep(300);
  check("approve click found", click("approve the change", '[data-audit="approve-change"]'), (a) => a === "true");
  await sleep(600);
  check("checkout REGISTERED after approval", (await get("checkout")) ? "present" : "absent", has("present"));
  check("agent can now check out", await call("checkout"), has("Order placed"));
  await sleep(700);
  check("checkout gone again after order", (await get("checkout")) ? "present" : "absent", has("absent"));

  results.push("=== APPROVAL IS PER BASKET ===");
  click("start over", '[data-audit="start-over"]');
  await sleep(400);
  await call("add_to_cart", { product_id: "mon-24-1080" });
  await sleep(200);
  click("approve this basket", '[data-audit="approve-basket"]');
  await sleep(500);
  check("checkout live after approving", (await get("checkout")) ? "present" : "absent", has("present"));
  await call("add_to_cart", { product_id: "kb-membrane" });
  await sleep(500);
  check("changing the cart REVOKES checkout", (await get("checkout")) ? "present" : "absent", has("absent"),
    "approval is for the basket you approved, not a standing permission");

  results.push("");
  results.push("TOTAL: " + pass + " passed, " + fail + " failed");
  return results.join("\n");
})()
