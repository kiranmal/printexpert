const http = require("http");
const db = require("./config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";

function req(m, p, b, t) {
  return new Promise((res, rej) => {
    const pl = b ? JSON.stringify(b) : null;
    const r = http.request(
      {
        method: m, hostname: "localhost", port: 5000, path: p,
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
          ...(pl ? { "Content-Length": Buffer.byteLength(pl) } : {}),
        },
      },
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
  console.log("\nAdmin order-details data verification\n");

  const [[admin]] = await db.execute("SELECT id,email FROM users WHERE role='admin' LIMIT 1");
  const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
  const userToken = jwt.sign({ id: 2, email: "rajarun8078@gmail.com", role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  const [[p]] = await db.execute("SELECT id,price,stock,weight_grams FROM products WHERE status='Active' AND stock>10 LIMIT 1");
  const origStock = Number(p.stock);
  /* weight fixture for shipping quote — snapshot + restore */
  const origWeight = p.weight_grams;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p.id]);
  const on = `ORDD-${Date.now()}`;
  const qty = Math.min(3, origStock - 1); /* stay under stock */

  const bc = {
    productId: p.id, name: "Card", quantity: qty, itemType: "business-card", price: p.price,
    personName: "Test Person", companyName: "TestCo", template: "classic",
    frontDesign: {
      background: "#ffffff",
      elements: [
        { type: "text", text: "Hello Front", fontFamily: "Arial", fontSize: 18, color: "#111111", bold: true },
        { type: "image", src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg", label: "Logo" },
      ],
    },
    backDesign: { background: "#eeeeee", elements: [{ type: "text", text: "Back Text" }] },
  };
  const std = {
    productId: p.id, name: "Std", quantity: 1, price: p.price, itemType: "standard",
    uploadedDesigns: [{ name: "design.pdf", type: "application/pdf", size: 12345 }],
  };

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 0]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  try {
    let r = await req("POST", "/api/orders", {
      orderNumber: on, customerName: "Arun", email: "a@b.c", phone: "9000000000",
      paymentMethod: "cod", status: "New", items: [bc, std], couponCode: null,
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, userToken);
    assert(r.s === 201, "Multi-item order created", `status=${r.s ?? r.s} msg=${r.b?.message}`);

    r = await req("GET", "/api/admin/orders", null, adminToken);
    const o = (r.b.orders || []).find((x) => x.orderNumber === on);
    assert(r.s === 200 && !!o, "Admin fetches the order");

    const it = o?.items || [];
    assert(it.length === 2, "Both items present", `len=${it.length}`);

    const bcItem = it.find((x) => x.itemType === "business-card") || it[0];
    assert(bcItem?.frontDesign?.elements?.length === 2, "Front design elements persisted", JSON.stringify(bcItem?.frontDesign?.elements?.length));
    assert(bcItem?.backDesign?.elements?.length === 1, "Back design elements persisted");
    assert(bcItem?.frontDesign?.elements?.[0]?.text === "Hello Front", "Design text survived sanitize");
    assert(String(bcItem?.frontDesign?.elements?.[1]?.src || "").startsWith("data:image"), "Design image src persisted");
    assert(bcItem?.personName === "Test Person" || bcItem?.customization?.personName === "Test Person", "personName persisted");
    assert(bcItem?.template === "classic" || bcItem?.customization?.template === "classic", "template persisted");

    const stdItem = it.find((x) => x.itemType === "standard") || it[1];
    assert(Array.isArray(stdItem?.uploadedDesigns) && stdItem.uploadedDesigns[0]?.name === "design.pdf",
      "uploadedDesigns metadata persisted", JSON.stringify(stdItem?.uploadedDesigns));

    /* unauthorized access */
    r = await req("GET", "/api/admin/orders", null, userToken);
    assert(r.s === 403, "Regular user blocked from admin orders (403)");
    r = await req("GET", "/api/admin/orders", null, null);
    assert(r.s === 401, "No token blocked (401)");
  } finally {
    await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [origStock, origWeight, p.id]);
    await db.execute("DELETE FROM orders WHERE order_id=?", [on]);
if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
