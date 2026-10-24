const http = require("http");
const db = require("./config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";

function req(m, p, b, t) {
  return new Promise((res) => {
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
    r.on("error", () => res({ s: 0, b: {} }));
    if (pl) r.write(pl);
    r.end();
  });
}

(async () => {
  const em = `dbgadmin_${Date.now()}@t.com`;
  const hash = await bcrypt.hash("x", 10);
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'admin','Active')",
    ["A", em, "9000000050", hash]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
  const t = jwt.sign({ id: u.id, email: em, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

  /* minimal product — like AddProduct.jsx sends */
  const body = {
    name: "DBG Test Product " + Date.now(),
    price: 150,
    oldPrice: 0,
    category: "Debug",
    subcategory: "",
    stock: 5,
    status: "Active",
    description: "test",
    images: [],
    features: [],
    sizes: [],
    paperTypes: [],
    quantityStep: 1,
    unit: "Pieces",
    customizable: false,
  };

  const r = await req("POST", "/api/products", body, t);
  console.log("POST /api/products →", r.s, JSON.stringify(r.b).slice(0, 300));

  if (r.b?.product?.id || r.b?.id) {
    const id = r.b.product?.id || r.b.id;
    const [[p]] = await db.execute(
      "SELECT id,name,status,stock FROM products WHERE id=?", [id]);
    console.log("row in DB:", JSON.stringify(p));
    await db.execute("DELETE FROM products WHERE id=?", [id]);
  }
  await db.execute("DELETE FROM users WHERE email=?", [em]);
  process.exit(0);
})();
