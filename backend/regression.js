/**
 * PHASE 8 — FINAL REGRESSION SUITE
 * Covers: public catalog, auth lifecycle, cart (guest merge, CRUD, isolation,
 * customization), orders (all-server authority, ownership, dup protection),
 * admin endpoints, payment safety, coupons, contact inquiries, delivery check.
 * Cleans up only records it creates.
 */
const http = require("http");
const db = require("./config/db");
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
const failures = [];
function assert(cond, label, detail) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else {
    failed++; failures.push(label);
    console.error(`  FAIL: ${label} — ${detail || "condition false"}`);
  }
}
function section(name) { console.log(`\n=== ${name} ===`); }

(async () => {
  console.log(`\nPhase 8 regression against ${BASE}\n`);

  const ts = Date.now();
  const emailU = `p8user_${ts}@test.com`;
  const emailV = `p8other_${ts}@test.com`;
  const orderNum = `P8-${ts}`;
  const adminTestCat = `p8cat_${ts}`;
  const adminTestSub = `p8sub_${ts}`;

  /* pick a real active product + one with a real category */
  const [[product]] = await db.execute(
    "SELECT id, price, quantity_step, category, subcategory, stock FROM products WHERE status='Active' AND stock>0 LIMIT 1"
  );
  if (!product) { console.error("No active product found"); process.exit(1); }
  const PID = product.id;
  const REAL_PRICE = Number(product.price);
  const STEP = Math.max(1, Number(product.quantity_step) || 1);
  const ORIG_STOCK = Number(product.stock); /* orders now decrement stock — restore in cleanup */

  /* existing admin user (created earlier via createAdmin.js / seeds) */
  const [[adminRow]] = await db.execute(
    "SELECT id, email, role FROM users WHERE role='admin' LIMIT 1"
  );
  const adminToken = adminRow
    ? jwt.sign({ id: adminRow.id, email: adminRow.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" })
    : null;

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 0]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  /* weight fixture for shipping quotes — snapshot + restore */
  const [[wrow]] = await db.execute("SELECT weight_grams FROM products WHERE id=?", [PID]);
  const ORIG_WEIGHT = wrow?.weight_grams ?? null;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [PID]);

  try {
    /* ══════ 1. PUBLIC CATALOG ══════ */
    section("Public catalog");
    let r = await request("GET", "/", null, null);
    assert(r.status === 200, "GET / health");
    r = await request("GET", "/api/products", null, null);
    const productList = r.body?.products || r.body;
    assert(r.status === 200 && Array.isArray(productList), "Product listing");
    r = await request("GET", `/api/products/${PID}`, null, null);
    assert(r.status === 200 && (r.body?.id || r.body?.product?.id), "Product details by ID");
    r = await request("GET", `/api/products/${PID}/templates`, null, null);
    assert(r.status === 200, "Product templates endpoint");
    r = await request("GET", "/api/categories", null, null);
    assert(r.status === 200, "Categories endpoint");
    r = await request("GET", "/api/subcategories", null, null);
    assert(r.status === 200, "Subcategories endpoint");
    r = await request("GET", "/api/tags", null, null);
    assert(r.status === 200, "Tags endpoint");
    r = await request("GET", "/api/attributes", null, null);
    assert(r.status === 200, "Attributes endpoint");
    r = await request("GET", "/api/coupons/active", null, null);
    assert(r.status === 200, "Active coupons endpoint");

    /* search + category filter */
    const [[p2]] = await db.execute(
      "SELECT name, category FROM products WHERE status='Active' LIMIT 1"
    );
    const kw = String(p2.name || "").split(" ")[0].slice(0, 4);
    if (kw.length >= 3) {
      r = await request("GET", `/api/products?search=${encodeURIComponent(kw)}`, null, null);
      const found = r.body?.products || r.body;
      assert(r.status === 200 && Array.isArray(found) && found.length > 0, "Product search works", `kw=${kw} found=${found?.length}`);
    }
    if (p2.category) {
      r = await request("GET", `/api/products?category=${encodeURIComponent(p2.category)}`, null, null);
      const catList = r.body?.products || r.body;
      assert(r.status === 200 && Array.isArray(catList) && catList.every((p) => p.category === p2.category), "Category filter works");
    }

    /* ══════ 2. AUTH LIFECYCLE ══════ */
    section("Auth lifecycle");
    r = await request("POST", "/api/auth/signup", {
      name: "P8 User", email: emailU, phone: "9876500010", password: "Passw0rd!",
    }, null);
    assert(r.status === 201 || r.body.success, "Signup succeeds", `status=${r.status}`);

    r = await request("POST", "/api/auth/signup", {
      name: "P8 Other", email: emailV, phone: "9876500011", password: "Passw0rd!",
    }, null);
    assert(r.status === 201 || r.body.success, "Second signup succeeds");

    r = await request("POST", "/api/auth/login", { email: emailU, password: "Passw0rd!" }, null);
    assert(r.body.success && r.body.token && r.body.user, "Login returns token+user");
    const tokenU = r.body.token;

    r = await request("POST", "/api/auth/login", { email: emailV, password: "Passw0rd!" }, null);
    const tokenV = r.body.token;
    assert(Boolean(tokenV), "Second login succeeds");

    r = await request("POST", "/api/auth/login", { email: emailU, password: "wrong" }, null);
    assert(r.status === 401, "Wrong password → 401");

    r = await request("GET", "/api/auth/me", null, tokenU);
    assert(r.status === 200, "GET /api/auth/me with token");

    const badToken = jwt.sign({ id: 1, email: "x@x.com", role: "user" }, "wrong-secret", { expiresIn: "1h" });
    r = await request("GET", "/api/auth/me", null, badToken);
    assert(r.status === 401, "Invalid token → 401");

    const expiredToken = jwt.sign({ id: 1, email: "x@x.com", role: "user" }, JWT_SECRET, { expiresIn: "0s" });
    await new Promise((res) => setTimeout(res, 1100));
    r = await request("GET", "/api/auth/me", null, expiredToken);
    assert(r.status === 401, "Expired token → 401");

    /* ══════ 3. AUTH CART — add/update/remove/clear ══════ */
    section("Authenticated cart");
    r = await request("POST", "/api/cart", {
      product_id: PID, quantity: STEP, paper_type: "Matte", size: "A5", item_type: "standard",
    }, tokenU);
    assert(r.status === 201 || r.body.success, "Add standard item");

    r = await request("POST", "/api/cart", {
      product_id: PID, quantity: STEP, paper_type: "Matte", size: "A5", item_type: "standard",
    }, tokenU);
    assert(r.body.success && r.body.merged === true, "Same variant merges (qty additive)");

    r = await request("GET", "/api/cart", null, tokenU);
    assert(r.body.cart.length === 1 && r.body.cart[0].quantity === STEP * 2,
      "Merged qty = 2×step", `qty=${r.body.cart[0]?.quantity}`);
    const cartItemId = r.body.cart[0].id;
    assert(typeof r.body.cart[0].price === "number", "Live DB price present");

    /* business-card customization */
    r = await request("POST", "/api/cart", {
      product_id: PID, quantity: 100, item_type: "business-card",
      customization: {
        frontDesign: { backgroundColor: "#fff", elements: [{ type: "text", text: "Front" }] },
        backDesign: { backgroundColor: "#eee", elements: [{ type: "text", text: "Back" }] },
        template: "tpl-1",
      },
    }, tokenU);
    assert(r.status === 201, "Business-card item added");
    const bcId = r.body.item?.id || r.body.cartItem?.id;

    /* generic custom item */
    r = await request("POST", "/api/cart", {
      product_id: PID, quantity: 1, item_type: "custom",
      customization: {
        designs: { front: [{ type: "text", text: "Hi" }], back: [] },
        personName: "Reg Person", companyName: "Reg Corp",
      },
    }, tokenU);
    assert(r.status === 201, "Custom item added");

    r = await request("GET", "/api/cart", null, tokenU);
    assert(r.body.cart.length === 3, "3 distinct items (std+2 custom)", `len=${r.body.cart.length}`);
    const bcRow = r.body.cart.find((i) => i.itemType === "business-card");
    const bcCust = typeof bcRow?.customization === "string" ? JSON.parse(bcRow.customization) : bcRow?.customization;
    assert(bcCust?.frontDesign?.elements?.[0]?.text === "Front", "BC front design preserved");
    assert(bcCust?.backDesign?.elements?.[0]?.text === "Back", "BC back design preserved");
    const cuRow = r.body.cart.find((i) => i.itemType === "custom");
    const cuCust = typeof cuRow?.customization === "string" ? JSON.parse(cuRow.customization) : cuRow?.customization;
    assert(cuCust?.personName === "Reg Person", "Custom item fields preserved");

    /* quantity update */
    r = await request("PUT", `/api/cart/${cartItemId}`, { quantity: STEP * 3 }, tokenU);
    assert(r.body.success, "Update qty");
    r = await request("GET", "/api/cart", null, tokenU);
    assert(r.body.cart.find((i) => i.id === cartItemId)?.quantity === STEP * 3, "Qty updated");

    /* remove item */
    r = await request("DELETE", `/api/cart/${cartItemId}`, null, tokenU);
    assert(r.body.success, "Remove item");

    /* ══════ 4. CART ISOLATION ══════ */
    section("Cart isolation");
    r = await request("GET", "/api/cart", null, tokenV);
    assert(r.body.cart.length === 0, "User V cart empty (isolation)");
    r = await request("POST", "/api/cart", {
      product_id: PID, quantity: STEP, paper_type: "Glossy", size: "A4", item_type: "standard",
    }, tokenV);
    assert(r.body.success, "User V adds own item");
    r = await request("GET", "/api/cart", null, tokenU);
    const uCount = r.body.cart.length;
    r = await request("GET", "/api/cart", null, tokenV);
    assert(r.body.cart.length === 1 && uCount === 2, "Carts independent");

    /* ══════ 5. GUEST→SERVER MERGE ══════ */
    section("Guest cart merge");
    /* simulate what CartContext sends after login */
    const guestPayload = [
      { product_id: PID, quantity: STEP * 2, paper_type: "Matte", size: "A5", item_type: "standard" },
      { product_id: PID, quantity: 100, item_type: "business-card",
        customization: { frontDesign: { elements: [{ type: "text", text: "G" }] }, template: "g" } },
      { product_id: 999999, quantity: 1, item_type: "standard" }, /* invalid → skipped */
    ];
    r = await request("POST", "/api/cart/merge", { items: guestPayload }, tokenU);
    assert(r.body.success && r.body.merged === 2 && r.body.skipped === 1,
      "Merge: 2 merged, 1 skipped", `m=${r.body.merged} s=${r.body.skipped}`);

    /* merge is idempotent — retry does NOT inflate standard qty */
    r = await request("POST", "/api/cart/merge", { items: guestPayload }, tokenU);
    assert(r.body.success, "Merge retry succeeds");
    r = await request("GET", "/api/cart", null, tokenU);
    const matteItem = r.body.cart.find((i) => i.itemType === "standard" && i.paperType === "Matte");
    assert(matteItem && matteItem.quantity === STEP * 2,
      "Retry did NOT inflate qty (GREATEST)", `qty=${matteItem?.quantity}`);

    /* ══════ 6. ORDERS ══════ */
    section("Orders — server-side authority");
    /* price tampering: claim ₹1 */
    r = await request("POST", "/api/orders", {
      orderNumber: orderNum,
      customerName: "P8 User", email: emailU, phone: "9876500010",
      paymentMethod: "cod", status: "New",
      items: [{ productId: PID, quantity: STEP, price: 1 }],
      total: 1, grandTotal: 1,
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, tokenU);
    assert(r.status === 201 && r.body.success, "Order created");
    const [[ordRow]] = await db.execute(
      "SELECT total, user_id FROM orders WHERE order_id = ?", [orderNum]
    );
    assert(Number(ordRow.total) >= REAL_PRICE * STEP,
      "Server total overrides client price", `stored=${ordRow.total}`);
    assert(Number(ordRow.user_id) === Number(JSON.parse(Buffer.from(tokenU.split(".")[1], "base64").toString()).id),
      "Order bound to JWT user");

    /* dup submission: same orderNumber twice → 1 row */
    await request("POST", "/api/orders", {
      orderNumber: orderNum, customerName: "P8 User", email: emailU, phone: "9876500010",
      items: [{ productId: PID, quantity: STEP }],
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, tokenU);
    const [[dup]] = await db.execute("SELECT COUNT(*) c FROM orders WHERE order_id = ?", [orderNum]);
    assert(dup.c === 1, "Duplicate orderNumber → single row");

    /* order history */
    r = await request("GET", "/api/orders/my", null, tokenU);
    assert(r.body.orders.some((o) => String(o.orderNumber || o.order_id) === orderNum),
      "User sees own order in /api/orders/my");
    r = await request("GET", "/api/orders/my", null, tokenV);
    assert(!r.body.orders.some((o) => String(o.orderNumber || o.order_id) === orderNum),
      "User V does NOT see User U's order");

    /* track order (public) */
    r = await request("GET", `/api/orders/track/${orderNum}`, null, tokenU);
    assert(r.status === 200 || r.status === 404, "Order tracking endpoint responds", `status=${r.status}`);

    /* ══════ 7. CHECKOUT-ADJACENT APIs ══════ */
    section("Checkout-adjacent APIs");
    r = await request("POST", "/api/check-delivery", {
      name: "P8 User", phone: "9876500010", address: "123 Test Street, Area",
      city: "Pune", state: "Maharashtra", pincode: "411001",
    }, null);
    assert(r.status === 200, "check-delivery works", `status=${r.status}`);

    r = await request("POST", "/api/coupons/validate", { code: "NONEXISTENT_XYZ", subtotal: 100 }, null);
    assert(!r.body.success, "Invalid coupon rejected");

    r = await request("POST", "/api/contact-inquiries", {
      name: "P8", email: emailU, phone: "9876500010", message: "Regression test inquiry",
    }, null);
    assert(r.status === 201 || r.body.success, "Contact inquiry accepted", `status=${r.status}`);

    /* ══════ 8. ADMIN — protected endpoints ══════ */
    section("Admin endpoints");
    r = await request("GET", "/api/admin/orders", null, null);
    assert(r.status === 401, "Admin orders without token → 401");
    r = await request("GET", "/api/admin/orders", null, tokenU);
    assert(r.status === 403, "Admin orders with user token → 403", `status=${r.status}`);

    if (adminToken) {
      r = await request("GET", "/api/admin/orders", null, adminToken);
      assert(r.status === 200 && Array.isArray(r.body.orders), "Admin sees all orders");

      /* category CRUD smoke test */
      r = await request("POST", "/api/admin/categories", { name: adminTestCat }, adminToken);
      assert(r.status === 201 || r.body.success, "Admin creates category");
      const catId = r.body.id || r.body.category?.id;
      if (catId) {
        r = await request("DELETE", `/api/admin/categories/${catId}`, null, adminToken);
        assert(r.body.success !== false, "Admin deletes category");
      }

      /* notifications endpoint exists */
      r = await request("GET", "/api/admin/notifications", null, adminToken);
      assert(r.status === 200, "Admin notifications endpoint");

      /* feedback endpoint exists */
      r = await request("GET", "/api/admin/feedback", null, adminToken);
      assert(r.status === 200, "Admin feedback endpoint");
    } else {
      console.log("  SKIP: no admin user in DB — admin role tests skipped");
    }

    /* ══════ 9. PAYMENT SAFETY (Razorpay unconfigured) ══════ */
    section("Payment safety (no credentials configured)");
    r = await request("POST", "/api/payments/razorpay/order", { orderNumber: orderNum }, tokenU);
    assert(r.status === 503 || (r.status === 200 && r.body.success),
      "Razorpay order endpoint safe", `status=${r.status}`);
    r = await request("POST", "/api/payments/razorpay/order", { orderNumber: orderNum }, tokenV);
    assert(r.status === 403 || r.status === 503,
      "User V blocked from U's order payment", `status=${r.status}`);
    r = await request("POST", "/api/payments/razorpay/order", { orderNumber: orderNum }, null);
    assert(r.status === 401, "Payment order requires auth");
    r = await request("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNum,
      razorpay_order_id: "order_fake",
      razorpay_payment_id: "pay_fake",
      razorpay_signature: "deadbeef",
    }, tokenU);
    assert(r.status !== 200 || r.body.success !== true,
      "Fake signature rejected", `status=${r.status}`);
    r = await request("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNum, razorpay_order_id: "x", razorpay_payment_id: "y", razorpay_signature: "z",
    }, null);
    assert(r.status === 401, "Verify requires auth");

    /* ══════ 10. CLEAR CART cleanup verification ══════ */
    section("Cart clear");
    r = await request("DELETE", "/api/cart", null, tokenU);
    assert(r.body.success, "Clear cart");
    r = await request("GET", "/api/cart", null, tokenU);
    assert(r.body.cart.length === 0, "Cart empty after clear");

  } finally {
    /* cleanup only records created by this test */
    try {
      await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [ORIG_STOCK, ORIG_WEIGHT, PID]);
      const [[u1]] = await db.execute("SELECT id FROM users WHERE email=?", [emailU]);
      const [[u2]] = await db.execute("SELECT id FROM users WHERE email=?", [emailV]);
      if (u1) await db.execute("DELETE FROM cart_items WHERE user_id=?", [u1.id]);
      if (u2) await db.execute("DELETE FROM cart_items WHERE user_id=?", [u2.id]);
      await db.execute("DELETE FROM orders WHERE order_id=?", [orderNum]);
      await db.execute("DELETE FROM contact_inquiries WHERE email=? AND message LIKE '%Regression test%'", [emailU]);
      await db.execute("DELETE FROM categories WHERE name=?", [adminTestCat]).catch(() => {});
      await db.execute("DELETE FROM users WHERE email IN (?, ?)", [emailU, emailV]);
      if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
    } catch (e) {
      console.error("cleanup error:", e.message);
    }
    console.log(`\n══════════════════════════════════════`);
    console.log(`  FINAL RESULTS: ${passed} passed, ${failed} failed`);
    if (failures.length) console.log("  Failed:", failures.join(" | "));
    console.log(`══════════════════════════════════════\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
})();
