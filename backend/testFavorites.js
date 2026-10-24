const http = require("http");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET =
  process.env.JWT_SECRET || "printexpert_secret_key_2026";

function req(m, p, b, t) {
  return new Promise((res) => {
    const pl = b ? JSON.stringify(b) : null;
    const r = http.request(
      {
        method: m,
        hostname: "localhost",
        port: 5000,
        path: p,
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
    r.on("error", () => res({ s: 0, b: {} }));
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
  console.log("\nUser favorites API\n");
  const em = `fav_${Date.now()}@t.com`;
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["F", em, "9000000090", await bcrypt.hash("x", 10)]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
  const t = jwt.sign({ id: u.id, email: em, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const snap = { id: "35", name: "Premium Flyer", price: 400, image: "data:image/png;base64,AAAA" };

  try {
    let r = await req("GET", "/api/favorites");
    assert(r.s === 401 || r.s === 403, "favorites need auth", `status=${r.s}`);

    r = await req("POST", "/api/favorites", { productId: "35", snapshot: snap }, t);
    assert(r.s === 200 && r.b.success, "favorite added", `status=${r.s}`);

    r = await req("POST", "/api/favorites", { productId: "35", snapshot: snap }, t);
    assert(r.s === 200, "duplicate add is idempotent", `status=${r.s}`);

    r = await req("GET", "/api/favorites", null, t);
    assert(
      r.s === 200 && r.b.favorites?.length === 1 && r.b.favorites[0].name === "Premium Flyer",
      "list returns snapshot w/ image",
      JSON.stringify(r.b).slice(0, 140)
    );

    r = await req("POST", "/api/favorites/merge", {
      favorites: [
        { productId: "30", snapshot: { id: "30", name: "Tee" } },
        { productId: "35", snapshot: { id: "35", name: "Old" } },
      ],
    }, t);
    assert(r.s === 200 && r.b.merged >= 1, "merge works", `status=${r.s}`);

    r = await req("GET", "/api/favorites", null, t);
    const keep = r.b.favorites.find((f) => String(f.id) === "35");
    assert(keep?.name === "Premium Flyer", "merge doesn't overwrite existing");

    r = await req("DELETE", "/api/favorites/35", null, t);
    assert(r.s === 200, "favorite removed");
    r = await req("GET", "/api/favorites", null, t);
    assert(!r.b.favorites.some((f) => String(f.id) === "35"), "removed from list");
  } finally {
    await db.execute("DELETE FROM user_favorites WHERE user_id=?", [u.id]);
    await db.execute("DELETE FROM users WHERE email=?", [em]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
