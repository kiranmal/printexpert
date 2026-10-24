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
          ...(pl
            ? { "Content-Length": Buffer.byteLength(pl) }
            : {}),
        },
      },
      (x) => {
        let d = "";
        x.on("data", (c) => (d += c));
        x.on("end", () => {
          try {
            res({ s: x.statusCode, b: JSON.parse(d) });
          } catch {
            res({ s: x.statusCode, b: d });
          }
        });
      }
    );
    r.on("error", () => res({ s: 0, b: {} }));
    if (pl) r.write(pl);
    r.end();
  });
}

let passed = 0,
  failed = 0;
const assert = (c, l, d) => {
  if (c) {
    passed++;
    console.log(`  PASS: ${l}`);
  } else {
    failed++;
    console.error(`  FAIL: ${l} — ${d || ""}`);
  }
};

(async () => {
  console.log("\nCustomization drafts API\n");

  const ts = Date.now();
  const mkTok = async (em) => {
    await db.execute(
      "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
      ["D", em, "9000000080", await bcrypt.hash("x", 10)]
    );
    const [[u]] = await db.execute(
      "SELECT id FROM users WHERE email=?",
      [em]
    );
    return jwt.sign(
      { id: u.id, email: em, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  };
  const e1 = `d1_${ts}@t.com`;
  const e2 = `d2_${ts}@t.com`;
  const t1 = await mkTok(e1);
  const t2 = await mkTok(e2);

  const draft = {
    designs: { front: [{ id: 1, type: "text", text: "ABC" }], back: [] },
    size: "A4",
  };

  try {
    /* auth required */
    let r = await req("GET", "/api/drafts/customizer/31");
    assert(r.s === 401 || r.s === 403, "drafts need auth", `status=${r.s}`);

    /* empty → 404 */
    r = await req("GET", "/api/drafts/customizer/31", null, t1);
    assert(r.s === 404, "no draft → 404");

    /* save */
    r = await req(
      "PUT",
      "/api/drafts/customizer/31",
      { draft, revision: 1 },
      t1
    );
    assert(r.s === 200 && r.b.success, "draft saved", `status=${r.s}`);

    /* read back */
    r = await req("GET", "/api/drafts/customizer/31", null, t1);
    assert(
      r.s === 200 &&
        r.b.draft?.designs?.front?.[0]?.text === "ABC",
      "draft round-trips",
      JSON.stringify(r.b).slice(0, 120)
    );

    /* second save bumps stored revision → then a stale
       incoming revision must be rejected */
    await req(
      "PUT",
      "/api/drafts/customizer/31",
      { draft, revision: 2 },
      t1
    );
    const [[row]] = await db.execute(
      "SELECT revision FROM customization_drafts WHERE editor='customizer' AND product_id='31' ORDER BY id DESC LIMIT 1"
    );
    r = await req(
      "PUT",
      "/api/drafts/customizer/31",
      { draft: { x: 1 }, revision: row.revision - 1 },
      t1
    );
    assert(r.s === 409, "older revision → 409", `status=${r.s}`);

    /* oversized payload rejected */
    r = await req(
      "PUT",
      "/api/drafts/customizer/31",
      { draft: { big: "x".repeat(9 * 1024 * 1024) }, revision: 99 },
      t1
    );
    assert(r.s === 400, "oversized draft rejected", `status=${r.s}`);

    /* other user can't see it */
    r = await req("GET", "/api/drafts/customizer/31", null, t2);
    assert(r.s === 404, "other user's draft hidden");

    /* merge: guest drafts → account */
    r = await req(
      "POST",
      "/api/drafts/merge",
      {
        drafts: [
          { editor: "customizer", productId: "30", draft, revision: 5 },
          { editor: "business-card", productId: "30", draft, revision: 2 },
        ],
      },
      t2
    );
    assert(r.s === 200 && r.b.merged === 2, "merge stores guest drafts", `status=${r.s}`);

    /* merge never overwrites newer */
    r = await req(
      "POST",
      "/api/drafts/merge",
      { drafts: [{ editor: "customizer", productId: "30", draft: { old: true }, revision: 1 }] },
      t2
    );
    let g = await req("GET", "/api/drafts/customizer/30", null, t2);
    assert(
      g.b.draft?.designs?.front?.[0]?.text === "ABC",
      "merge keeps newer revision"
    );

    /* different editors coexist on same product */
    r = await req("GET", "/api/drafts/business-card/30", null, t2);
    assert(r.s === 200, "editor scoping works");

    /* delete */
    r = await req("DELETE", "/api/drafts/customizer/31", null, t1);
    assert(r.s === 200, "draft deleted");
    r = await req("GET", "/api/drafts/customizer/31", null, t1);
    assert(r.s === 404, "deleted draft gone");
  } finally {
    await db.execute(
      "DELETE FROM customization_drafts WHERE user_id IN (SELECT id FROM users WHERE email IN (?,?))",
      [e1, e2]
    );
    await db.execute("DELETE FROM users WHERE email IN (?,?)", [e1, e2]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
