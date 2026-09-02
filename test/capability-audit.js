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
  const click = (txt) => {
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
    okFlag ? pass++ : fail++;
    results.push(
      (okFlag ? "PASS " : "FAIL ") + name + (okFlag ? "" : "\n        got: " + String(actual).slice(0, 160)) + (note ? "\n        " + note : "")
    );
  };
  const has = (s) => (a) => a.toLowerCase().includes(s.toLowerCase());
  const notThrew = (a) => !a.startsWith("__THREW__") && !a.startsWith("__ABSENT__");

  results.push("=== SURFACE ===");
  const names = (await tools()).map((t) => t.name).sort();
  check("8 tools at load, checkout absent", names.join(","), (a) => !a.includes("checkout") && a.split(",").length === 8);

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
  click("monitor");
  await sleep(300);
  check("have-monitor is a violation", await call("add_to_cart", { product_id: "mon-27-1440" }), has("already have"));
  click("monitor");
  await sleep(300);
  await call("remove_from_cart", { product_id: "mon-27-1440" });

  results.push("=== propose_constraint_change validation ===");
  check("unknown field rejected", await call("propose_constraint_change", { field: "priority", new_value: 1, reason: "x" }), has("Only"));
  check("negative value rejected", await call("propose_constraint_change", { field: "budgetCents", new_value: -5, reason: "x" }), has("positive amount"));
  check("missing reason rejected", await call("propose_constraint_change", { field: "budgetCents", new_value: 130000 }), has("reason is required"));
  check("valid proposal queued", await call("propose_constraint_change", { field: "budgetCents", new_value: 130000, reason: "Better chair." }), has("Waiting for the shopper"));
  check("proposal did NOT apply itself", await call("get_constraints"), has("Budget: $1,200"));
  click("reject");
  await sleep(300);
  check("rejected proposal leaves rules alone", await call("get_constraints"), has("Budget: $1,200"));

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
  check("approve click found", click("approve the change"), (a) => a === "true");
  await sleep(600);
  check("checkout REGISTERED after approval", (await get("checkout")) ? "present" : "absent", has("present"));
  check("agent can now check out", await call("checkout"), has("Order placed"));
  await sleep(700);
  check("checkout gone again after order", (await get("checkout")) ? "present" : "absent", has("absent"));

  results.push("=== APPROVAL IS PER BASKET ===");
  click("start over");
  await sleep(400);
  await call("add_to_cart", { product_id: "mon-24-1080" });
  await sleep(200);
  click("approve this basket");
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
