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
  console.log("\nOrder-success total verification\n");

  const ts = Date.now();
  const em = `os_${ts}@t.com`;
  const hash = await bcrypt.hash("P", 10);
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["OS", em, "9000000080", hash]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
  const t = jwt.sign({ id: u.id, email: em, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const [[p]] = await db.execute("SELECT id,price,stock,weight_grams FROM products WHERE status='Active' AND stock>2 LIMIT 1");
  /* weight fixture for shipping quote — snapshot + restore.
     mock rate: 30 + zone(4)*10 + slab(1000g→2)*15 + cod 30 = 130 */
  const origWeight = p.weight_grams;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p.id]);
  const expected = Number(p.price) * 2 + 130;
  const ON = `OS-${ts}`;

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 0]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  try {
    /* client lies about the price — server must still
       return its own authoritative total */
    let r = await req("POST", "/api/orders", {
      orderNumber: ON, customerName: "T", email: em,
      phone: "9000000080", paymentMethod: "cod",
      items: [{ productId: p.id, quantity: 2, price: 9999 }],
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, t);

    assert(r.s === 201, "Order saved", `status=${r.s}`);
    assert(
      typeof r.b.total !== "undefined",
      "201 response includes total",
      JSON.stringify(r.b)
    );
    assert(
      Number(r.b.total) === expected,
      `Server total is authoritative (₹${expected}, not client's ₹9999×2)`,
      `got ${r.b.total}`
    );
    assert(
      r.b.subtotal != null && r.b.orderNumber === ON,
      "Response has subtotal + orderNumber"
    );

    /* track endpoint returns the same total — what the
       refreshed success page re-verifies against */
    r = await req("GET", `/api/orders/track/${ON}`, null, t);
    assert(
      r.s === 200 &&
        Number(r.b.order?.total) === expected,
      "Track endpoint returns saved total",
      `got ${r.b.order?.total}`
    );

    /* another user cannot read it */
    const em2 = `os2_${ts}@t.com`;
    await db.execute(
      "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
      ["OS2", em2, "9000000081", hash]
    );
    const [[u2]] = await db.execute("SELECT id FROM users WHERE email=?", [em2]);
    const t2 = jwt.sign({ id: u2.id, email: em2, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    r = await req("GET", `/api/orders/track/${ON}`, null, t2);
    assert(r.s === 403, "Other user's order hidden (403)", `status=${r.s}`);

    /* nonexistent order → 404, not fake data */
    r = await req("GET", `/api/orders/track/FAKE-${ts}`, null, t);
    assert(r.s === 404, "Invalid order → 404", `status=${r.s}`);

    await db.execute("DELETE FROM users WHERE email=?", [em2]);
  } finally {
    await db.execute("DELETE FROM orders WHERE order_id=?", [ON]);
    await db.execute("DELETE FROM users WHERE email=?", [em]);
if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [origWeight, p.id]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
