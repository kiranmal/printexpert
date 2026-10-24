/* Test suite — products.weight_grams (Step 3B)

   Create/update validation, response round-trip, and
   backward compat for products saved without weight.
   Fixture products only — deleted at the end. */

const http = require("http");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const JWT_SECRET =
  process.env.JWT_SECRET || "printexpert_secret_key_2026";

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  [${extra}]` : ""}`);
}

function req(m, p, b, token) {
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(pl ? { "Content-Length": Buffer.byteLength(pl) } : {}),
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

const base = (extra = {}) => ({
  name: `WeightTest-${Date.now()}`,
  price: 99,
  stock: 5,
  ...extra,
});

async function main() {
  const adminToken = jwt.sign(
    { id: 1, email: "admin@test.com", role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const createdIds = [];

  /* ── valid weight ── */
  let r = await req("POST", "/api/products", base({ weightGrams: 350 }), adminToken);
  check("create with weight 350 -> 201", r.s === 201, `s=${r.s} msg=${r.b?.message}`);
  const p1 = r.b.product?.id;
  if (p1) createdIds.push(p1);
  check("response returns weightGrams 350", Number(r.b.product?.weightGrams) === 350, `${r.b.product?.weightGrams}`);

  /* ── invalid weights rejected ── */
  r = await req("POST", "/api/products", base({ weightGrams: 0 }), adminToken);
  check("weight 0 -> 400", r.s === 400, `s=${r.s}`);
  r = await req("POST", "/api/products", base({ weightGrams: -50 }), adminToken);
  check("weight -50 -> 400", r.s === 400, `s=${r.s}`);
  r = await req("POST", "/api/products", base({ weightGrams: "abc" }), adminToken);
  check("weight 'abc' -> 400", r.s === 400, `s=${r.s}`);

  /* ── missing weight — backward compat ── */
  r = await req("POST", "/api/products", base(), adminToken);
  check("create w/o weight -> 201", r.s === 201, `s=${r.s}`);
  const p2 = r.b.product?.id;
  if (p2) createdIds.push(p2);
  check("no weight -> weightGrams null", r.b.product?.weightGrams === null, `${r.b.product?.weightGrams}`);

  /* ── empty string = not supplied ── */
  r = await req("POST", "/api/products", base({ weightGrams: "" }), adminToken);
  check("weight '' -> 201 (treated as absent)", r.s === 201, `s=${r.s}`);
  const p3 = r.b.product?.id;
  if (p3) createdIds.push(p3);

  /* ── update weight ── */
  r = await req("PUT", `/api/products/${p1}`, { name: "WeightTest-Upd", price: 99, weightGrams: 425 }, adminToken);
  check("update weight to 425 -> 200", r.s === 200, `s=${r.s}`);
  check("updated weightGrams 425", Number(r.b.product?.weightGrams) === 425, `${r.b.product?.weightGrams}`);

  /* ── update w/o weight -> preserved ── */
  r = await req("PUT", `/api/products/${p1}`, { name: "WeightTest-Upd2", price: 99 }, adminToken);
  check("update w/o weight -> preserved 425", r.s === 200 && Number(r.b.product?.weightGrams) === 425, `${r.b.product?.weightGrams}`);

  /* ── update invalid weight ── */
  r = await req("PUT", `/api/products/${p1}`, { name: "X", price: 99, weightGrams: -1 }, adminToken);
  check("update invalid weight -> 400", r.s === 400, `s=${r.s}`);

  /* ── DB row matches ── */
  const [[row]] = await db.execute("SELECT weight_grams FROM products WHERE id=?", [p1]);
  check("DB weight_grams = 425", Number(row?.weight_grams) === 425, `db=${row?.weight_grams}`);

  /* ── GET product exposes weightGrams ── */
  r = await req("GET", `/api/products/${p1}`, null, adminToken);
  check("GET product returns weightGrams", Number((r.b.product || r.b).weightGrams) === 425, `${(r.b.product || r.b).weightGrams}`);

  /* cleanup */
  for (const id of createdIds) {
    await db.execute("DELETE FROM products WHERE id=?", [id]).catch(() => {});
  }

  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("runner error:", e);
  process.exit(1);
});
