const http = require("http");
const db = require("./config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";

function req(m, p, b, t) {
  return new Promise((res, rej) => {
    const pl = b ? JSON.stringify(b) : null;
    const r = http.request(
      { method: m, hostname: "localhost", port: 5000, path: p,
        headers: { "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
          ...(pl ? { "Content-Length": Buffer.byteLength(pl) } : {}) } },
      (x) => {
        let d = "";
        x.on("data", (c) => (d += c));
        x.on("end", () => {
          try { res({ s: x.statusCode, b: JSON.parse(d) }); }
          catch { res({ s: x.statusCode, b: d }); }
        });
      }
    );
    r.on("error", rej);
    if (pl) r.write(pl);
    r.end();
  });
}

let passed = 0, failed = 0;
const assert = (c, l, d) => {
  if (c) { passed++; console.log(`  PASS: ${l}`); }
  else { failed++; console.error(`  FAIL: ${l} — ${d || ""}`); }
};

(async () => {
  console.log("\nAdmin product stock field verification\n");

  const [[admin]] = await db.execute("SELECT id,email FROM users WHERE role='admin' LIMIT 1");
  const tA = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

  const img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const base = {
    name: `StockTest ${Date.now()}`,
    category: "Visiting Cards",
    price: 100,
    image: img,
  };
  const ids = [];

  try {
    /* 1. create with stock=1 (form default) */
    let r = await req("POST", "/api/products", { ...base, stock: 1 }, tA);
    assert(r.s === 201 && Number(r.b.product?.stock) === 1, "Create stock=1 persists", JSON.stringify(r.b).slice(0,150));
    if (r.b.product?.id) ids.push(r.b.product.id);
    const pid = r.b.product?.id;

    /* 2. create WITHOUT stock → defaults to 0 (safe) */
    r = await req("POST", "/api/products", { ...base, name: base.name + " B" }, tA);
    assert(r.s === 201 && Number(r.b.product?.stock) === 0, "Missing stock defaults to 0", JSON.stringify(r.b.product?.stock));
    if (r.b.product?.id) ids.push(r.b.product.id);

    /* 3. invalid stock values rejected */
    for (const [label, bad] of [["negative", -5], ["fractional", 2.5], ["text", "abc"]]) {
      r = await req("POST", "/api/products", { ...base, stock: bad }, tA);
      assert(r.s === 400, `Create rejects ${label} stock`, `status=${r.s} ${JSON.stringify(r.b).slice(0,100)}`);
    }

    /* 4. PUT without stock field → preserved, NOT zeroed */
    r = await req("PUT", `/api/products/${pid}`, { ...base, price: 150, image: img, images: [img] }, tA);
    assert(r.s === 200 && Number(r.b.product?.stock) === 1, "Update without stock preserves value 1", `stock=${r.b.product?.stock}`);

    /* 5. PUT stock=7 → saved */
    r = await req("PUT", `/api/products/${pid}`, { ...base, price: 150, stock: 7, images: [img] }, tA);
    assert(r.s === 200 && Number(r.b.product?.stock) === 7, "Update stock=7 persists", `stock=${r.b.product?.stock}`);

    /* 6. PUT stock=0 → saved, product hidden from customers */
    r = await req("PUT", `/api/products/${pid}`, { ...base, price: 150, stock: 0, images: [img] }, tA);
    assert(r.s === 200 && Number(r.b.product?.stock) === 0, "Update stock=0 persists");

    r = await req("GET", "/api/products", null, null);
    const pub = Array.isArray(r.b.products) ? r.b.products : r.b;
    assert(!pub.some((p) => p.id === pid), "Stock=0 hidden from customer listing");

    /* admin still sees it */
    r = await req("GET", "/api/products?includeAll=1", null, tA);
    const all = Array.isArray(r.b.products) ? r.b.products : r.b;
    assert(all.some((p) => p.id === pid), "Admin listing still shows OOS product");

    /* 7. PUT rejects invalid stock too */
    r = await req("PUT", `/api/products/${pid}`, { ...base, price: 150, stock: -3, images: [img] }, tA);
    assert(r.s === 400, "Update rejects negative stock");
    const [[row]] = await db.execute("SELECT stock FROM products WHERE id=?", [pid]);
    assert(Number(row.stock) === 0, "Rejected update did not corrupt stock", `stock=${row.stock}`);
  } finally {
    for (const id of ids) {
      await db.execute("DELETE FROM product_attribute_values WHERE product_id=?", [id]).catch(() => {});
      await db.execute("DELETE FROM product_tags WHERE product_id=?", [id]).catch(() => {});
      await db.execute("DELETE FROM products WHERE id=?", [id]).catch(() => {});
    }
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
