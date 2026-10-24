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

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

(async () => {
  console.log("\nCart uploaded-designs persistence verification\n");

  const ts = Date.now();
  const em = `cu_${ts}@t.com`;
  const hash = await bcrypt.hash("P", 10);
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["CU", em, "9000000090", hash]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
  const t = jwt.sign({ id: u.id, email: em, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const [[p]] = await db.execute("SELECT id,stock FROM products WHERE status='Active' AND stock>10 LIMIT 1");

  try {
    /* 1. upload a real file → fileId */
    let r = await req("POST", "/api/files",
      { name: "logo.png", type: "image/png", dataUrl: PNG }, t);
    assert(r.s === 201 || r.s === 200, "File uploaded", `status=${r.s}`);
    const fileId = r.b.fileId;

    /* 2. add to cart with uploadedDesigns refs */
    r = await req("POST", "/api/cart", {
      product_id: p.id, quantity: 2, item_type: "standard",
      uploadedDesigns: [
        { name: "logo.png", type: "image/png", size: 70, fileId },
        { name: "notes.pdf", type: "application/pdf", size: 1234 },
      ],
    }, t);
    assert(r.s === 200 || r.s === 201, "Cart item added with uploads", `status=${r.s}`);

    /* 3. GET /api/cart returns the uploaded refs */
    r = await req("GET", "/api/cart", null, t);
    const item = (r.b.cart || []).find((i) => Number(i.productId) === p.id);
    assert(item && Array.isArray(item.uploadedDesigns) && item.uploadedDesigns.length === 2,
      "GET /api/cart returns uploadedDesigns",
      JSON.stringify(item?.uploadedDesigns));
    assert(item.uploadedDesigns[0].fileId === fileId, "fileId survives round-trip");
    assert(item.isCustomized === true, "isCustomized flagged");

    /* 4. quantity update preserves uploads */
    r = await req("PUT", `/api/cart/${item.id}`, { quantity: 4 }, t);
    r = await req("GET", "/api/cart", null, t);
    const item2 = (r.b.cart || []).find((i) => i.id === item.id);
    assert(item2.quantity === 4 && item2.uploadedDesigns.length === 2,
      "Qty update preserves uploadedDesigns");

    /* 5. same product, DIFFERENT uploads → separate row (no overwrite) */
    r = await req("POST", "/api/cart", {
      product_id: p.id, quantity: 1, item_type: "standard",
      uploadedDesigns: [{ name: "other.png", type: "image/png", size: 50 }],
    }, t);
    r = await req("GET", "/api/cart", null, t);
    const rows = (r.b.cart || []).filter((i) => Number(i.productId) === p.id);
    assert(rows.length === 2, "Different upload set → separate cart row", `rows=${rows.length}`);
    const rowB = rows.find((i) => i.uploadedDesigns?.[0]?.name === "other.png");
    assert(rowB && rows.find((i) => i.uploadedDesigns?.[0]?.name === "logo.png"),
      "Both upload sets intact");

    /* 6. guest-merge carries uploads */
    const em2 = `cu2_${ts}@t.com`;
    await db.execute(
      "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
      ["CU2", em2, "9000000091", hash]
    );
    const [[u2]] = await db.execute("SELECT id FROM users WHERE email=?", [em2]);
    const t2 = jwt.sign({ id: u2.id, email: em2, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    r = await req("POST", "/api/cart/merge", {
      items: [{
        product_id: p.id, quantity: 3, item_type: "standard",
        uploadedDesigns: [{ name: "merged.png", type: "image/png", size: 60 }],
      }],
    }, t2);
    assert(r.b.merged === 1, "Guest merge accepted");
    r = await req("GET", "/api/cart", null, t2);
    const mergedItem = (r.b.cart || [])[0];
    assert(mergedItem?.uploadedDesigns?.[0]?.name === "merged.png",
      "Merged guest item keeps uploadedDesigns");

    /* 7. raw dataUrl must NOT be stored server-side */
    const [[raw]] = await db.execute(
      "SELECT uploaded_designs FROM cart_items WHERE id=?", [item.id]
    );
    const stored = JSON.parse(raw.uploaded_designs);
    assert(!JSON.stringify(stored).includes("data:"),
      "No base64 stored in cart_items");

    await db.execute("DELETE FROM users WHERE email=?", [em2]);
    await db.execute("DELETE FROM cart_items WHERE user_id=?", [u2.id]);
  } finally {
    await db.execute("DELETE FROM cart_items WHERE user_id=?", [u.id]);
    await db.execute("DELETE FROM users WHERE email=?", [em]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
