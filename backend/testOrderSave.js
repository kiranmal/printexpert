/**
 * Reproduce & verify the "Unable to save order" fix:
 * product 31 carries ~5.9MB base64 in products.images.
 * Checkout sends items + products + cart all containing
 * that blob — stored payload must stay under 16MB packet.
 */
const http = require("http");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";
const BASE = "http://localhost:5000";

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request(
      {
        method, hostname: "localhost", port: 5000, path,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json;
          try { json = JSON.parse(data); } catch { json = data; }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

let passed = 0, failed = 0;
const assert = (c, l, d) => {
  if (c) { passed++; console.log(`  PASS: ${l}`); }
  else { failed++; console.error(`  FAIL: ${l} — ${d || ""}`); }
};

(async () => {
  console.log("\nOrder-save payload fix verification\n");

  const ts = Date.now();
  const email = `os_${ts}@t.com`;
  const hash = await bcrypt.hash("P", 10);
  await db.execute(
    "INSERT INTO users (name,email,phone,password,role,status) VALUES (?,?,?,?,?,?)",
    ["OS", email, "9000000040", hash, "user", "Active"]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [email]);
  const token = jwt.sign({ id: u.id, email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  /* product 31 = the real failing product; snapshot stock */
  const [[prod]] = await db.execute(
    "SELECT id,name,price,status,stock,images FROM products WHERE id=31"
  );
  const origStock = Number(prod.stock);
  /* weight fixture for shipping quotes — snapshot + restore */
  const [[wrow]] = await db.execute("SELECT weight_grams FROM products WHERE id=?", [prod.id]);
  const origWeight = wrow?.weight_grams ?? null;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [prod.id]);
  const images = JSON.parse(prod.images || "[]");
  const imgMB = (JSON.stringify(images).length / 1048576).toFixed(1);
  console.log(`  product "${prod.name}" images column ≈ ${imgMB} MB`);

  const orderNum = `OS-${ts}`;
  const orderNum2 = `OS-${ts}-2`;

  /* mimic real checkout body: item carries image+images,
     and products/items/cart are three copies of it */
  const cartItem = {
    id: prod.id,
    productId: prod.id,
    name: prod.name,
    image: images[0] || "",
    images: images,
    price: prod.price,
    quantity: 1,
    size: "Standard",
    unit: "Pieces",
    attributes: {},
    category: "Test",
    customized: false,
  };
  const orderBody = {
    orderNumber: orderNum,
    orderId: orderNum,
    customerName: "Test User",
    email, phone: "9000000040",
    shippingAddress: { address: "123 Test St", city: "Pune", state: "MH", pincode: "411001" },
    paymentMethod: "cod",
    paymentStatus: "Pending",
    status: "New",
    products: [cartItem],
    items: [cartItem],
    cart: [cartItem],           /* third copy — the payload killer */
    total: prod.price,
    grandTotal: prod.price,
  };
  const bodyMB = (JSON.stringify(orderBody).length / 1048576).toFixed(1);
  console.log(`  request body ≈ ${bodyMB} MB (before fix: INSERT failed, packet>16MB)\n`);

  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 0]
  );
  const createdCharge = chargeIns.affectedRows === 1;

  try {
    let r = await request("POST", "/api/orders", orderBody, token);
    assert(r.status === 201 && r.body.success,
      "Order with huge product images now saves",
      `status=${r.status} msg=${r.body.message}`);

    const [[row]] = await db.execute(
      "SELECT LENGTH(payload) plen, LENGTH(items) ilen FROM orders WHERE order_id=?",
      [orderNum]
    );
    console.log(`  stored payload=${(row.plen/1024).toFixed(0)}KB, items=${(row.ilen/1024).toFixed(0)}KB`);
    assert(row.plen < 1024 * 1024, "Stored payload under 1MB", `plen=${row.plen}`);

    /* stock decremented once */
    let [[p1]] = await db.execute("SELECT stock FROM products WHERE id=?", [prod.id]);
    assert(Number(p1.stock) === origStock - 1, "Stock decremented by 1", `stock=${p1.stock}`);

    /* idempotent retry — no double decrement, still succeeds */
    orderBody.orderNumber = orderNum; // same
    r = await request("POST", "/api/orders", orderBody, token);
    assert(r.status === 201 || r.status === 200, "Retry same orderNumber OK", `status=${r.status}`);
    [[p1]] = await db.execute("SELECT stock FROM products WHERE id=?", [prod.id]);
    assert(Number(p1.stock) === origStock - 1, "Retry did NOT double-decrement", `stock=${p1.stock}`);
    const [[cnt]] = await db.execute(
      "SELECT COUNT(*) c FROM orders WHERE order_id=?", [orderNum]
    );
    assert(cnt.c === 1, "Still one order row");

    /* second normal order still works */
    orderBody.orderNumber = orderNum2;
    orderBody.orderId = orderNum2;
    orderBody.cart = undefined;
    r = await request("POST", "/api/orders", orderBody, token);
    assert(r.status === 201, "Second order saves", `status=${r.status} msg=${r.body.message}`);
    [[p1]] = await db.execute("SELECT stock FROM products WHERE id=?", [prod.id]);
    assert(Number(p1.stock) === origStock - 2, "Stock total -2", `stock=${p1.stock}`);

  } finally {
    await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [origStock, origWeight, prod.id]);
    await db.execute("DELETE FROM orders WHERE order_id IN (?, ?)", [orderNum, orderNum2]);
    await db.execute("DELETE FROM users WHERE email=?", [email]);
if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
