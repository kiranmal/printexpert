const http = require("http");
const db = require("./config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
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
  console.log("\nOrder cancellation verification\n");

  const ts = Date.now();
  const hash = await bcrypt.hash("P", 10);

  const mkUser = async (name, email, phone) => {
    await db.execute(
      "INSERT INTO users (name,email,phone,password,role,status) VALUES (?,?,?,?,?,?)",
      [name, email, phone, hash, "user", "Active"]
    );
    const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [email]);
    return u.id;
  };

  const u1 = await mkUser("C1", `c1_${ts}@t.com`, "9000000070");
  const u2 = await mkUser("C2", `c2_${ts}@t.com`, "9000000071");
  const t1 = jwt.sign({ id: u1, email: `c1_${ts}@t.com`, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const t2 = jwt.sign({ id: u2, email: `c2_${ts}@t.com`, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const [[admin]] = await db.execute("SELECT id,email FROM users WHERE role='admin' LIMIT 1");
  const tA = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

  const [[p1]] = await db.execute("SELECT id,price,stock,weight_grams FROM products WHERE status='Active' AND stock>20 LIMIT 1");
  const [[p2]] = await db.execute("SELECT id,price,stock,weight_grams FROM products WHERE status='Active' AND stock>20 AND id != ? LIMIT 1", [p1.id]);
  const s1 = Number(p1.stock), s2 = Number(p2 ? p2.stock : 0);
  /* weight fixtures for shipping quotes — snapshot + restore */
  const w1 = p1.weight_grams, w2 = p2?.weight_grams ?? null;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p1.id]);
  if (p2) await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p2.id]);

  const orderFor = (num, items) => ({
    orderNumber: num, customerName: "T", email: `c1_${ts}@t.com`,
    phone: "9000000070", paymentMethod: "cod", status: "New", items,
    shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
  });

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 40]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  const O1 = `CN-${ts}-1`, O2 = `CN-${ts}-2`, O3 = `CN-${ts}-3`, O4 = `CN-${ts}-4`, O5 = `CN-${ts}-5`;

  try {
    /* --- setup orders --- */
    let r = await req("POST", "/api/orders", orderFor(O1, [
      { productId: p1.id, quantity: 2, price: p1.price },
      { productId: p2.id, quantity: 3, price: p2.price },
    ]), t1);
    assert(r.s === 201, "Multi-item order created", JSON.stringify(r.b));

    r = await req("POST", "/api/orders", orderFor(O2, [{ productId: p1.id, quantity: 1, price: p1.price }]), t1);
    assert(r.s === 201, "Order O2 created");

    r = await req("POST", "/api/orders", orderFor(O3, [{ productId: p1.id, quantity: 1, price: p1.price }]), t1);
    r = await req("POST", "/api/orders", orderFor(O4, [{ productId: p1.id, quantity: 1, price: p1.price }]), t1);
    /* O4 → Delivered directly (admin status) */
    await db.execute("UPDATE orders SET status='Delivered' WHERE order_id=?", [O4]);
    /* O5: paid online order */
    r = await req("POST", "/api/orders", {
      ...orderFor(O5, [{ productId: p1.id, quantity: 1, price: p1.price }]),
      paymentMethod: "online", paymentStatus: "Paid", status: "New",
    }, t1);
    assert(r.s === 201, "Paid online order created");

    /* stock after 5 orders: p1 -(2+1+1+1+1)= -6, p2 -3 */
    let [[p]] = await db.execute("SELECT stock FROM products WHERE id=?", [p1.id]);
    assert(Number(p.stock) === s1 - 6, "Stock deducted at order time", `stock=${p.stock} exp=${s1 - 6}`);

    /* --- 1. unauthenticated cancel → 401 --- */
    r = await req("PUT", `/api/orders/${O1}/cancel`, { reason: "x" }, null);
    assert(r.s === 401, "Unauthenticated cancel rejected (401)");

    /* --- 2. other user cannot cancel --- */
    r = await req("PUT", `/api/orders/${O1}/cancel`, { reason: "x" }, t2);
    assert(r.s === 403, "Other customer blocked (403)");

    /* --- 3. owner cancels own eligible order → stock restored --- */
    r = await req("PUT", `/api/orders/${O1}/cancel`, { reason: "Changed mind" }, t1);
    assert(r.s === 200 && r.b.success, "Owner cancels own order", JSON.stringify(r.b));
    assert(r.b.cancelledBy === "customer" && r.b.cancelReason === "Changed mind" && r.b.cancelledAt,
      "Cancel response returns saved fields", JSON.stringify({ cancelledBy: r.b.cancelledBy, cancelReason: r.b.cancelReason, cancelledAt: r.b.cancelledAt }));
    [[p]] = await db.execute("SELECT stock FROM products WHERE id=?", [p1.id]);
    assert(Number(p.stock) === s1 - 4, "P1 stock restored +2", `stock=${p.stock}`);
    if (p2) {
      const [[q]] = await db.execute("SELECT stock FROM products WHERE id=?", [p2.id]);
      assert(Number(q.stock) === s2, "P2 stock restored +3", `stock=${q.stock}`);
    }

    /* --- 4. already-cancelled is idempotent — no double restore --- */
    r = await req("PUT", `/api/orders/${O1}/cancel`, {}, t1);
    assert(r.s === 200 && r.b.alreadyCancelled === true, "Re-cancel idempotent (alreadyCancelled)");
    [[p]] = await db.execute("SELECT stock FROM products WHERE id=?", [p1.id]);
    assert(Number(p.stock) === s1 - 4, "Stock NOT restored twice", `stock=${p.stock}`);

    /* --- 5. cancellation metadata saved --- */
    const [[o1]] = await db.execute("SELECT status,cancelled_at,cancelled_by,cancel_reason FROM orders WHERE order_id=?", [O1]);
    assert(o1.status === "Cancelled" && o1.cancelled_at && o1.cancelled_by === "customer" && o1.cancel_reason === "Changed mind",
      "Cancel metadata saved", JSON.stringify(o1));

    /* --- track endpoint returns persisted cancel fields --- */
    r = await req("GET", `/api/orders/track/${O1}`, null, t1);
    assert(r.s === 200 && r.b.order?.cancelledAt && r.b.order?.cancelledBy === "customer" && r.b.order?.cancelReason === "Changed mind",
      "Track API returns cancel fields after refresh",
      JSON.stringify({ cancelledBy: r.b.order?.cancelledBy, cancelledAt: r.b.order?.cancelledAt, cancelReason: r.b.order?.cancelReason }));

    /* --- 6. admin cancels customer's order --- */
    r = await req("PUT", `/api/orders/${O2}/cancel`, { reason: "Out of stock at warehouse" }, tA);
    assert(r.s === 200 && r.b.success, "Admin cancels customer order", JSON.stringify(r.b));
    assert(r.b.cancelledBy === "admin" && r.b.cancelReason === "Out of stock at warehouse",
      "Admin cancel response has actor+reason");
    [[p]] = await db.execute("SELECT stock FROM products WHERE id=?", [p1.id]);
    assert(Number(p.stock) === s1 - 3, "Stock restored +1 after admin cancel");

    /* --- 7. Delivered order cannot be cancelled --- */
    r = await req("PUT", `/api/orders/${O4}/cancel`, { reason: "x" }, t1);
    assert(r.s === 400, "Delivered order cannot be cancelled (400)");

    /* --- 8. paid online → refund pending, not "refunded" --- */
    r = await req("PUT", `/api/orders/${O5}/cancel`, { reason: "wrong item" }, t1);
    assert(r.s === 200 && r.b.refundStatus === "Pending", "Online paid → refundStatus Pending", JSON.stringify(r.b));
    const [[o5]] = await db.execute("SELECT refund_status,status FROM orders WHERE order_id=?", [O5]);
    assert(o5.status === "Cancelled" && o5.refund_status === "Pending",
      "refund_status persisted (not fake refunded)");

    /* --- 9. COD order → no refund record --- */
    const [[o2]] = await db.execute("SELECT refund_status FROM orders WHERE order_id=?", [O2]);
    assert(o2.refund_status === null, "COD cancel → no refund status");

    /* --- 10. cancelled order can't be cancelled by other user anyway --- */
    r = await req("PUT", `/api/orders/${O1}/cancel`, {}, t2);
    assert(r.s === 403, "Other user still blocked on cancelled order");

    /* --- 11. stock restored exactly once overall --- */
    [[p]] = await db.execute("SELECT stock FROM products WHERE id=?", [p1.id]);
    assert(Number(p.stock) === s1 - 2, "Final stock = original -2 (O3+O4 still active)", `stock=${p.stock} exp=${s1 - 2}`);
  } finally {
    await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [s1, w1, p1.id]);
    if (p2) await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [s2, w2, p2.id]);
    await db.execute("DELETE FROM orders WHERE order_id IN (?,?,?,?,?)", [O1, O2, O3, O4, O5]);
    await db.execute("DELETE FROM users WHERE email IN (?,?)", [`c1_${ts}@t.com`, `c2_${ts}@t.com`]);
if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
