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
        const chunks = [];
        x.on("data", (c) => chunks.push(c));
        x.on("end", () => {
          const data = Buffer.concat(chunks);
          try { res({ s: x.statusCode, b: JSON.parse(data.toString()), raw: data }); }
          catch { res({ s: x.statusCode, b: null, raw: data }); }
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

/* small real PNG (8x8 red) */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVQYlWP8z8DwnwEKmBgYGOkYAAAk+wIHRsD48QAAAABJRU5ErkJggg==",
  "base64"
);
const PNG_B64 = `data:image/png;base64,${PNG.toString("base64")}`;

(async () => {
  console.log("\nCustomer file upload + retrieval verification\n");

  const ts = Date.now();
  const hash = await bcrypt.hash("P", 10);
  await db.execute(
    "INSERT INTO users (name,email,phone,password,role,status) VALUES (?,?,?,?,?,?)",
    ["FU", `fu_${ts}@t.com`, "9000000050", hash, "user", "Active"]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [`fu_${ts}@t.com`]);
  const token = jwt.sign({ id: u.id, email: `fu_${ts}@t.com`, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const [[other]] = await db.execute("SELECT id,email FROM users WHERE role='user' AND id != ? LIMIT 1", [u.id]);
  const otherToken = jwt.sign({ id: other.id, email: other.email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const [[admin]] = await db.execute("SELECT id,email FROM users WHERE role='admin' LIMIT 1");
  const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

  const [[p]] = await db.execute("SELECT id,price,stock,weight_grams FROM products WHERE status='Active' AND stock>5 LIMIT 1");
  /* weight fixture for shipping quote — snapshot + restore */
  const origWeight = p.weight_grams;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p.id]);
  const origStock = Number(p.stock);
  const on = `FU-${ts}`;
  let fileId = null;

  try {
    /* 1. unauth upload rejected */
    let r = await req("POST", "/api/files", { name: "x.png", type: "image/png", dataUrl: PNG_B64 }, null);
    assert(r.s === 401, "Unauthenticated upload rejected (401)");

    /* 2. bad mime rejected */
    r = await req("POST", "/api/files", { name: "x.exe", type: "application/x-msdownload", dataUrl: "data:application/x-msdownload;base64,AAAA" }, token);
    assert(r.s === 400, "Disallowed mime rejected (400)");

    /* 3. valid upload */
    r = await req("POST", "/api/files", { name: "artwork.png", type: "image/png", dataUrl: PNG_B64 }, token);
    assert(r.s === 201 && r.b.fileId, "Valid file uploaded", JSON.stringify(r.b));
    fileId = r.b.fileId;

    /* 4. owner can read it back — bytes identical */
    r = await req("GET", `/api/files/${fileId}`, null, token);
    assert(r.s === 200 && Buffer.compare(r.raw, PNG) === 0, "Owner retrieves identical bytes");

    /* 5. other user blocked */
    r = await req("GET", `/api/files/${fileId}`, null, otherToken);
    assert(r.s === 403, "Other user blocked (403)");

    /* 6. admin can read */
    r = await req("GET", `/api/files/${fileId}`, null, adminToken);
    assert(r.s === 200 && Buffer.compare(r.raw, PNG) === 0, "Admin retrieves file bytes");

    /* 7. order carries fileId ref */
    const item = {
      productId: p.id, quantity: 1, price: p.price, itemType: "standard",
      uploadedDesigns: [{ name: "artwork.png", type: "image/png", size: PNG.length, fileId, url: `/api/files/${fileId}` }],
    };
    r = await req("POST", "/api/orders", {
      orderNumber: on, customerName: "T", email: `fu_${ts}@t.com`, phone: "9000000050",
      paymentMethod: "cod", status: "New", items: [item],
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, token);
    assert(r.s === 201, "Order with fileId ref saved", JSON.stringify(r.b));

    /* 8. admin order fetch contains the file ref */
    r = await req("GET", "/api/admin/orders", null, adminToken);
    const o = (r.b.orders || []).find((x) => x.orderNumber === on);
    const savedUpload = o?.items?.[0]?.uploadedDesigns?.[0];
    assert(savedUpload?.fileId === fileId && savedUpload?.name === "artwork.png",
      "fileId persisted in order item", JSON.stringify(savedUpload));

    /* 9. unknown fileId 404 */
    r = await req("GET", "/api/files/f_nonexistent", null, adminToken);
    assert(r.s === 404, "Unknown fileId → 404");
  } finally {
    await db.execute("UPDATE products SET stock=?, weight_grams=? WHERE id=?", [origStock, origWeight, p.id]);
    await db.execute("DELETE FROM orders WHERE order_id=?", [on]);
    if (fileId) await db.execute("DELETE FROM uploaded_files WHERE id=?", [fileId]);
    await db.execute("DELETE FROM users WHERE email=?", [`fu_${ts}@t.com`]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
