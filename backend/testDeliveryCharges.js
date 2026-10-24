/* Test suite — /api/admin/delivery-charges (Step 1)

   Auth, validation, CRUD lifecycle, duplicate-pincode 409,
   missing-record 404. Uses a dedicated test pincode and
   cleans it up; never touches real customer/order data. */

const http = require("http");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const JWT_SECRET =
  process.env.JWT_SECRET || "printexpert_secret_key_2026";

const BASE = "/api/admin/delivery-charges";
const TEST_PIN = "654321"; /* unique fixture pincode */
const TEST_PIN_2 = "654322";

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

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra });
  console.log(
    `${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  [${extra}]` : ""}`
  );
}

async function cleanup() {
  try {
    await db.execute(
      "DELETE FROM delivery_charges WHERE pincode IN (?, ?)",
      [TEST_PIN, TEST_PIN_2]
    );
  } catch {}
}

async function main() {
  const adminToken = jwt.sign(
    { id: 900001, email: "test-admin@example.com", role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const userToken = jwt.sign(
    { id: 900002, email: "test-user@example.com", role: "user" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  await cleanup(); /* ensure fixture pincodes are free */

  /* ---- AUTH ---- */
  let r = await req("GET", BASE);
  check("GET without token -> 401", r.s === 401, `s=${r.s}`);

  r = await req("GET", BASE, null, userToken);
  check("GET as non-admin -> 403", r.s === 403, `s=${r.s}`);

  /* ---- LIST + CREATE ---- */
  r = await req("GET", BASE, null, adminToken);
  check("GET as admin -> 200", r.s === 200, `s=${r.s}`);
  check("list returns array", Array.isArray(r.b.charges));

  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN, city: "Test City", state: "Test State", charge: 80 },
    adminToken
  );
  check("POST valid -> 201", r.s === 201, `s=${r.s}`);
  const rowId = r.b.charge?.id;
  check("created row has id", Number.isInteger(rowId));
  check("created charge = 80", Number(r.b.charge?.charge) === 80);
  check("created isActive = true", r.b.charge?.isActive === true);

  /* ---- DUPLICATE ---- */
  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN, city: "Dupe", state: "Dupe", charge: 10 },
    adminToken
  );
  check("POST duplicate pincode -> 409", r.s === 409, `s=${r.s}`);

  /* ---- VALIDATION ---- */
  r = await req(
    "POST",
    BASE,
    { pincode: "abc12", city: "X", state: "Y", charge: 10 },
    adminToken
  );
  check("POST invalid pincode -> 400", r.s === 400, `s=${r.s}`);

  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN_2, city: "X", state: "Y", charge: -5 },
    adminToken
  );
  check("POST negative charge -> 400", r.s === 400, `s=${r.s}`);

  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN_2, city: "X", state: "Y", charge: "eighty" },
    adminToken
  );
  check("POST non-numeric charge -> 400", r.s === 400, `s=${r.s}`);

  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN_2, city: "X", state: "Y" },
    adminToken
  );
  check("POST missing charge -> 400", r.s === 400, `s=${r.s}`);

  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN_2, city: " ", state: "Y", charge: 5 },
    adminToken
  );
  check("POST empty city -> 400", r.s === 400, `s=${r.s}`);

  /* explicit 0 charge IS allowed (free delivery config) */
  r = await req(
    "POST",
    BASE,
    { pincode: TEST_PIN_2, city: "Free City", state: "Free State", charge: 0 },
    adminToken
  );
  check("POST explicit 0 charge -> 201", r.s === 201, `s=${r.s}`);
  const rowId2 = r.b.charge?.id;

  /* ---- UPDATE ---- */
  r = await req(
    "PUT",
    `${BASE}/${rowId}`,
    { pincode: TEST_PIN, city: "Updated City", state: "Updated State", charge: 95 },
    adminToken
  );
  check("PUT valid -> 200", r.s === 200, `s=${r.s}`);

  r = await req(
    "PUT",
    `${BASE}/${rowId}`,
    { pincode: TEST_PIN_2, city: "Valid City", state: "Valid State", charge: 1 },
    adminToken
  );
  check("PUT to another existing pincode -> 409", r.s === 409, `s=${r.s}`);

  r = await req("PUT", `${BASE}/999999999`, { pincode: "123456", city: "Valid City", state: "Valid State", charge: 1 }, adminToken);
  check("PUT missing id -> 404", r.s === 404, `s=${r.s}`);

  r = await req("PUT", `${BASE}/not-a-number`, { pincode: "123456", city: "Valid City", state: "Valid State", charge: 1 }, adminToken);
  check("PUT non-numeric id -> 400", r.s === 400, `s=${r.s}`);

  /* ---- TOGGLE ---- */
  r = await req("PATCH", `${BASE}/${rowId}/toggle`, { isActive: false }, adminToken);
  check("PATCH toggle off -> 200 + isActive:false", r.s === 200 && r.b.isActive === false, `s=${r.s}`);

  r = await req("PATCH", `${BASE}/${rowId}/toggle`, {}, adminToken);
  check("PATCH toggle w/o body flips -> isActive:true", r.s === 200 && r.b.isActive === true, `s=${r.s}`);

  r = await req("PATCH", `${BASE}/999999999/toggle`, {}, adminToken);
  check("PATCH toggle missing id -> 404", r.s === 404, `s=${r.s}`);

  /* ---- DELETE ---- */
  r = await req("DELETE", `${BASE}/${rowId2}`, null, adminToken);
  check("DELETE existing -> 200", r.s === 200, `s=${r.s}`);

  r = await req("DELETE", `${BASE}/${rowId2}`, null, adminToken);
  check("DELETE already-gone -> 404", r.s === 404, `s=${r.s}`);

  /* ---- VERIFY DB STATE ---- */
  const [left] = await db.execute(
    "SELECT id, pincode, charge, is_active FROM delivery_charges WHERE pincode IN (?, ?)",
    [TEST_PIN, TEST_PIN_2]
  );
  check("TEST_PIN_2 row deleted", left.length === 1 && left[0].pincode === TEST_PIN);
  check("updated charge persisted = 95", Number(left[0]?.charge) === 95, `got=${left[0]?.charge}`);
  check("is_active restored = 1", Number(left[0]?.is_active) === 1);

  await cleanup(); /* leave no fixture rows */

  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
  process.exit();
}

main().catch((e) => {
  console.error("Test runner error:", e);
  process.exitCode = 1;
  process.exit();
});
