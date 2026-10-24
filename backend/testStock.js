/**
 * Stock visibility & purchase-guard tests.
 * Uses a REAL product (id from DB) — toggles its stock/status temporarily,
 * always restoring the original values at the end.
 */
const http = require("http");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";
const PORT = Number(process.env.PORT) || 5000;
const BASE = `http://localhost:${PORT}`;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

let passed = 0, failed = 0;
const fails = [];
function assert(cond, label, detail) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; fails.push(label); console.error(`  FAIL: ${label} — ${detail || ""}`); }
}

(async () => {
  console.log(`\nStock rule tests against ${BASE}\n`);

  const ts = Date.now();
  const email = `stock_${ts}@test.com`;
  const orderNum = `STK-${ts}`;
  const hash = await bcrypt.hash("Pass123", 10);

  await db.execute("INSERT INTO users (name, email, phone, password, role, status) VALUES (?,?,?,?,?,?)",
    ["StockT", email, "9000000030", hash, "user", "Active"]);
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [email]);
  const token = jwt.sign({ id: u.id, email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  const [[adminRow]] = await db.execute("SELECT id, email FROM users WHERE role='admin' LIMIT 1");
  const adminToken = adminRow
    ? jwt.sign({ id: adminRow.id, email: adminRow.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" })
    : null;

  /* pick a real product; snapshot its state for restore */
  const [[prod]] = await db.execute(
    "SELECT id, name, price, status, stock, quantity_step, weight_grams FROM products WHERE status='Active' AND stock>0 LIMIT 1"
  );
  if (!prod) { console.error("No active in-stock product"); process.exit(1); }
  const PID = prod.id;
  const ORIG = { status: prod.status, stock: prod.stock, weight: prod.weight_grams };
  const STEP = Math.max(1, Number(prod.quantity_step) || 1);
  const restore = () =>
    db.execute("UPDATE products SET status=?, stock=?, weight_grams=? WHERE id=?", [ORIG.status, ORIG.stock, ORIG.weight, PID]);

  /* weight fixture for shipping quotes — restore() undoes it */
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [PID]);

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 40]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  try {
    /* ═══ 1. Active + in-stock: visible & purchasable ═══ */
    console.log("--- active + stock>0 ---");
    let r = await request("GET", "/api/products", null, null);
    const list = r.body.products || [];
    assert(list.some((p) => p.id === PID), "In-stock product in customer list");
    assert(list.every((p) => p.status === "Active" && Number(p.stock) > 0),
      "Customer list contains only purchasable products");

    r = await request("POST", "/api/cart", { product_id: PID, quantity: STEP, item_type: "standard" }, token);
    assert(r.body.success || r.status === 201, "Add to cart allowed when in stock");

    /* ═══ 2. stock=0: hidden + blocked ═══ */
    console.log("--- stock=0 ---");
    await db.execute("UPDATE products SET stock=0 WHERE id=?", [PID]);

    r = await request("GET", "/api/products", null, null);
    assert(!(r.body.products || []).some((p) => p.id === PID), "OOS hidden from customer list");
    assert((r.body.products || []).every((p) => Number(p.stock) > 0), "No OOS products in list");

    r = await request("GET", `/api/products?search=${encodeURIComponent(String(prod.name).split(" ")[0])}`, null, null);
    assert(!(r.body.products || []).some((p) => p.id === PID), "OOS hidden from search results");

    r = await request("GET", `/api/products/${PID}`, null, null);
    assert(r.status === 404, "OOS product details → 404 for customer");

    r = await request("POST", "/api/cart", { product_id: PID, quantity: STEP, item_type: "standard" }, token);
    assert(r.status === 400 && /out of stock/i.test(r.body.message || ""), "Add to cart rejected (direct API)", `status=${r.status} msg=${r.body.message}`);

    r = await request("POST", "/api/orders", {
      orderNumber: `${orderNum}-OOS`, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: STEP }],
    }, token);
    assert(r.status === 400, "Order rejected when OOS", `status=${r.status}`);

    /* merge endpoint also skips OOS */
    r = await request("POST", "/api/cart/merge", {
      items: [{ product_id: PID, quantity: STEP, item_type: "standard" }],
    }, token);
    assert(r.body.success && r.body.merged === 0 && r.body.skipped === 1, "Merge skips OOS item");

    /* admin still sees OOS product via includeAll */
    if (adminToken) {
      r = await request("GET", "/api/products?includeAll=1", null, adminToken);
      assert((r.body.products || []).some((p) => p.id === PID), "Admin sees OOS product (includeAll)");
      r = await request("GET", `/api/products/${PID}`, null, adminToken);
      assert(r.status === 200, "Admin can fetch OOS product details");
    }

    /* includeAll ignored for non-admin token */
    r = await request("GET", "/api/products?includeAll=1", null, token);
    assert(!(r.body.products || []).some((p) => p.id === PID), "includeAll ignored for regular user");

    /* ═══ 3. stock=5: qty clamped, oversell blocked ═══ */
    console.log("--- limited stock ---");
    await db.execute("UPDATE products SET stock=5, status='Active' WHERE id=?", [PID]);
    await db.execute("DELETE FROM cart_items WHERE user_id=?", [u.id]);

    r = await request("POST", "/api/cart", { product_id: PID, quantity: 50, item_type: "standard" }, token);
    assert(r.body.success || r.status === 201, "Add qty>stock accepted (clamped)");
    r = await request("GET", "/api/cart", null, token);
    assert(r.body.cart[0]?.quantity <= 5, "Cart qty clamped to stock", `qty=${r.body.cart[0]?.quantity}`);

    r = await request("POST", "/api/orders", {
      orderNumber: `${orderNum}-PARTIAL`, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 100 }],
    }, token);
    /* server clamps to maxQty (none set) then stock-check rejects since 100>5 */
    assert(r.status === 400, "Order with qty>stock rejected", `status=${r.status} msg=${r.body.message}`);

    /* ═══ 4. valid order DECREMENTS stock atomically ═══ */
    console.log("--- stock decrement ---");
    const before = 5;
    r = await request("POST", "/api/orders", {
      orderNumber: orderNum, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 2 }],
    }, token);
    assert(r.status === 201, "Order placed", `status=${r.status} msg=${r.body.message}`);
    let [[after]] = await db.execute("SELECT stock FROM products WHERE id=?", [PID]);
    assert(Number(after.stock) === before - 2, "Stock decremented by order qty", `stock=${after.stock}`);

    /* retry same orderNumber → no double decrement */
    await request("POST", "/api/orders", {
      orderNumber: orderNum, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 2 }],
    }, token);
    [[after]] = await db.execute("SELECT stock FROM products WHERE id=?", [PID]);
    assert(Number(after.stock) === before - 2, "Idempotent retry → no double decrement", `stock=${after.stock}`);

    /* ═══ 5. stock exhausted → immediate unavailability ═══ */
    console.log("--- exhaustion ---");
    r = await request("POST", "/api/orders", {
      orderNumber: `${orderNum}-LAST`, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 3 }],
    }, token);
    assert(r.status === 201, "Final 3 units orderable", `status=${r.status} msg=${r.body.message}`);
    [[after]] = await db.execute("SELECT stock FROM products WHERE id=?", [PID]);
    assert(Number(after.stock) === 0, "Stock hits exactly 0", `stock=${after.stock}`);

    r = await request("GET", "/api/products", null, null);
    assert(!(r.body.products || []).some((p) => p.id === PID), "Immediately hidden once stock=0");

    r = await request("POST", "/api/cart", { product_id: PID, quantity: 1, item_type: "standard" }, token);
    assert(r.status === 400, "Cannot add after exhaustion");

    r = await request("POST", "/api/orders", {
      orderNumber: `${orderNum}-OVER`, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 1 }],
    }, token);
    assert(r.status === 400, "Cannot order after exhaustion");
    [[after]] = await db.execute("SELECT stock FROM products WHERE id=?", [PID]);
    assert(Number(after.stock) === 0, "Stock never goes negative", `stock=${after.stock}`);

    /* ═══ 6. inactive product blocked regardless of stock ═══ */
    console.log("--- inactive ---");
    await db.execute("UPDATE products SET stock=50, status='Inactive' WHERE id=?", [PID]);
    r = await request("GET", "/api/products", null, null);
    assert(!(r.body.products || []).some((p) => p.id === PID), "Inactive hidden even with stock>0");
    r = await request("POST", "/api/cart", { product_id: PID, quantity: 1, item_type: "standard" }, token);
    assert(r.status === 400, "Inactive rejected from cart");
    r = await request("POST", "/api/orders", {
      orderNumber: `${orderNum}-INACT`, customerName: "T", email, phone: "9000000030",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: PID, quantity: 1 }],
    }, token);
    assert(r.status === 400, "Inactive rejected from order");

  } finally {
    await restore();
    await db.execute("DELETE FROM cart_items WHERE user_id=?", [u.id]);
    await db.execute("DELETE FROM orders WHERE order_id LIKE ?", [`${orderNum}%`]);
    await db.execute("DELETE FROM users WHERE email=?", [email]);
    if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed`);
    if (fails.length) console.log("  Failed:", fails.join(" | "));
    console.log("");
    process.exit(failed > 0 ? 1 : 0);
  }
})();
