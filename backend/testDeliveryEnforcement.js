/* Test suite — Step 2 shipping enforcement

   check-delivery: active charge -> shippingCharge returned;
   missing/inactive -> serviceable:false + MISSING_CHARGE;
   invalid pincode / city-state mismatch unchanged.

   /api/orders: server-side pincode + charge enforcement;
   client-supplied shippingCharge/total tampering ignored;
   correct authoritative total. Fixtures only; rows that
   already existed are snapshotted and restored. */

const http = require("http");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const JWT_SECRET =
  process.env.JWT_SECRET || "printexpert_secret_key_2026";

/* real pins for check-delivery (India Post validates them);
   format-valid fake pins for /api/orders (no India Post call) */
const PIN_A = "411001"; /* Pune — gets charge 80 */
const PIN_B = "110001"; /* Delhi — gets explicit charge 0 */
const PIN_C = "560001"; /* Bangalore — left WITHOUT any row */
const PIN_D = "400001"; /* Mumbai — created then deactivated */
const PIN_ORD = "654321"; /* fake — order tests only */
const PIN_ORD_FREE = "654322";

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

/* snapshot existing rows so we can restore afterwards */
const pins = [PIN_A, PIN_B, PIN_C, PIN_D, PIN_ORD, PIN_ORD_FREE];
const backups = {};

async function snapshot() {
  const [rows] = await db.execute(
    `SELECT * FROM delivery_charges WHERE pincode IN (${pins.map(() => "?").join(",")})`,
    pins
  );
  rows.forEach((r) => (backups[r.pincode] = r));
  await db.execute(
    `DELETE FROM delivery_charges WHERE pincode IN (${pins.map(() => "?").join(",")})`,
    pins
  );
}

async function restore() {
  await db.execute(
    `DELETE FROM delivery_charges WHERE pincode IN (${pins.map(() => "?").join(",")})`,
    pins
  );
  for (const r of Object.values(backups)) {
    await db.execute(
      `INSERT INTO delivery_charges (id, pincode, city, state, charge, is_active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [r.id, r.pincode, r.city, r.state, r.charge, r.is_active, r.created_at, r.updated_at]
    );
  }
}

const setCharge = (pin, charge, active = 1) =>
  db.execute(
    `INSERT INTO delivery_charges (pincode, city, state, charge, is_active)
     VALUES (?,?,?,?,?)`,
    [pin, "City", "State", charge, active]
  );

const orderBody = (pin, extra = {}) => ({
  orderNumber: `DEN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  customerName: "Delivery Test",
  email: "den@test.com",
  phone: "9000000000",
  paymentMethod: "cod",
  status: "New",
  shippingAddress: { address: "T", city: "C", state: "S", pincode: pin },
  ...extra,
});

let userToken;
let orderIds = [];

async function main() {
  await snapshot();
  let prod, origWeight, lightProd, lightOrig;
  try {
    /* user for order tests */
    const em = `den_${Date.now()}@t.com`;
    const hash = await bcrypt.hash("P", 10);
    await db.execute(
      "INSERT INTO users (name,email,phone,password,role,status) VALUES (?,?,?,?,?,?)",
      ["DEN", em, "9000000000", hash, "user", "Active"]
    );
    const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
    userToken = jwt.sign({ id: u.id, email: em, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

    const [[prodRow]] = await db.execute(
      "SELECT id, name, price, stock, weight_grams FROM products WHERE status='Active' AND stock>2 LIMIT 1"
    );
    prod = prodRow;
    const price = Number(prod.price);
    const item = { productId: prod.id, quantity: 1 };

    /* weight fixtures — snapshot + restore */
    origWeight = prod.weight_grams;
    await db.execute(
      "UPDATE products SET weight_grams=? WHERE id=?",
      [500, prod.id]
    );
    const [[lightRow]] = await db.execute(
      "SELECT id, name, weight_grams FROM products WHERE status='Active' AND stock>2 AND id<>? LIMIT 1",
      [prod.id]
    );
    lightProd = lightRow;
    lightOrig = lightProd?.weight_grams ?? null;
    if (lightProd) {
      await db.execute(
        "UPDATE products SET weight_grams=NULL WHERE id=?",
        [lightProd.id]
      );
    }

    /* mirror of the documented mock rate formula */
    const mockRate = (pin, wG, mode) =>
      30 + Number(pin[0]) * 10 + Math.max(1, Math.ceil(wG / 500)) * 15 + (mode === "cod" ? 30 : 0);

    /* ════════ CHECK-DELIVERY ════════ */
    console.log("--- /api/check-delivery ---");

    /* check-delivery validates address via India Post +
       serviceability via the shipping service — it no
       longer consults delivery_charges or returns a charge */
    let r = await req("POST", "/api/check-delivery", {
      name: "Test", address: "123 Street Road", city: "Pune",
      state: "Maharashtra", pincode: PIN_A,
    });
    if (r.s === 503) {
      check("check-delivery serviceable (skipped — 503 external)", true, "503 external");
    } else {
      check("valid pin -> serviceable (no charge in response)",
        r.s === 200 && r.b.serviceable === true && r.b.shippingCharge === undefined,
        `s=${r.s} charge=${r.b.shippingCharge}`);
    }

    r = await req("POST", "/api/check-delivery", {
      name: "Test", address: "123 Street Road", city: "Delhi",
      state: "Delhi", pincode: PIN_B,
    });
    if (r.s === 503) {
      check("second pin serviceable (skipped — 503 external)", true);
    } else {
      check("no charge row needed -> still serviceable",
        r.b.serviceable === true, `code=${r.b.code}`);
    }

    r = await req("POST", "/api/check-delivery", {
      name: "Test", address: "123 Street Road", city: "Pune",
      state: "Maharashtra", pincode: "12",
    });
    check("malformed pincode -> 400", r.s === 400, `s=${r.s}`);

    r = await req("POST", "/api/check-delivery", {
      name: "Test", address: "123 Street Road", city: "Wrongcity",
      state: "Wrongstate", pincode: PIN_A,
    });
    if (r.s === 503) {
      check("city/state mismatch (skipped — 503 external)", true);
    } else {
      check("city/state mismatch -> serviceable:false NOT MISSING_CHARGE",
        r.b.serviceable === false && r.b.code !== "MISSING_CHARGE", `code=${r.b.code}`);
    }

    /* ════════ /api/orders ════════ */
    console.log("--- /api/orders ---");

    /* missing pincode */
    r = await req("POST", "/api/orders", orderBody("", { items: [item] }), userToken);
    check("order w/o pincode -> 400 INVALID_PINCODE", r.s === 400 && r.b.code === "INVALID_PINCODE", `s=${r.s} code=${r.b.code}`);

    /* malformed pincode */
    r = await req("POST", "/api/orders", orderBody("12", { items: [item] }), userToken);
    check("order bad-format pincode -> 400", r.s === 400 && r.b.code === "INVALID_PINCODE", `s=${r.s}`);

    /* unserviceable pincode (9-prefix mock fixture) */
    r = await req("POST", "/api/orders", orderBody("999999", { items: [item] }), userToken);
    check("unserviceable pincode -> 400 UNSERVICEABLE_PINCODE", r.s === 400 && r.b.code === "UNSERVICEABLE_PINCODE", `s=${r.s} code=${r.b.code}`);

    /* product missing weight -> WEIGHT_MISSING */
    if (lightProd) {
      r = await req("POST", "/api/orders", orderBody(PIN_ORD, { items: [{ productId: lightProd.id, quantity: 1 }] }), userToken);
      check("unweighted product -> 400 WEIGHT_MISSING", r.s === 400 && r.b.code === "WEIGHT_MISSING", `s=${r.s} code=${r.b.code}`);
      check("WEIGHT_MISSING names the product", r.b.missing?.[0]?.productId === String(lightProd.id) || r.b.missing?.[0]?.productId === lightProd.id);
    }

    /* active service — order succeeds, total = price + mock rate */
    const expShip = mockRate(PIN_ORD, 500, "prepaid"); /* paymentMethod "online" → prepaid */
    const onOk = `DEN-OK-${Date.now()}`;
    r = await req("POST", "/api/orders", orderBody(PIN_ORD, {
      orderNumber: onOk, items: [item],
      paymentMethod: "online",
      shippingCharge: 999, total: 1, grandTotal: 1, /* tampered */
    }), userToken);
    orderIds.push(onOk);
    check("order w/ serviceable pin -> 201", r.s === 201, `s=${r.s} msg=${r.b?.message}`);
    check("server total = price + mock rate (tamper ignored)", Number(r.b.total) === price + expShip, `total=${r.b.total} expected=${price + expShip}`);
    check("response shippingCharge = mock rate", Number(r.b.shippingCharge) === expShip, `charge=${r.b.shippingCharge}`);
    const [[row]] = await db.execute("SELECT total, payload FROM orders WHERE order_id=?", [onOk]);
    check("stored total = price + rate", Number(row.total) === price + expShip, `stored=${row.total}`);
    const pay = JSON.parse(row.payload || "{}");
    check("payload shipping = rate", Number(pay.shipping) === expShip, `payload=${pay.shipping}`);

    /* cod → COD surcharge applies */
    const expShipCod = mockRate(PIN_ORD, 500, "cod");
    const onCod = `DEN-COD-${Date.now()}`;
    r = await req("POST", "/api/orders", orderBody(PIN_ORD, {
      orderNumber: onCod, items: [item], paymentMethod: "cod",
    }), userToken);
    orderIds.push(onCod);
    check("cod order gets cod rate", r.s === 201 && Number(r.b.shippingCharge) === expShipCod, `charge=${r.b.shippingCharge} exp=${expShipCod}`);

    /* quantity multiplies weight: 3×500g = 1500g */
    const expShip3 = mockRate(PIN_ORD, 1500, "cod");
    const on3 = `DEN-Q3-${Date.now()}`;
    r = await req("POST", "/api/orders", orderBody(PIN_ORD, {
      orderNumber: on3, items: [{ productId: prod.id, quantity: 3 }], paymentMethod: "cod",
    }), userToken);
    orderIds.push(on3);
    check("qty 3 -> 1500g rate", r.s === 201 && Number(r.b.shippingCharge) === expShip3, `charge=${r.b.shippingCharge} exp=${expShip3}`);

  } finally {
    if (prod) await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [origWeight, prod.id]).catch(() => {});
    if (lightProd) await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [lightOrig, lightProd.id]).catch(() => {});
    await db.execute("DELETE FROM orders WHERE order_id LIKE 'DEN-%'").catch(() => {});
    await db.execute("DELETE FROM users WHERE email LIKE 'den_%@t.com'").catch(() => {});
    await restore().catch((e) => console.error("restore failed:", e.message));
    const passed = results.filter((x) => x.ok).length;
    console.log(`\n${passed}/${results.length} passed`);
    process.exit(passed === results.length ? 0 : 1);
  }
}

main().catch((e) => {
  console.error("runner error:", e);
  restore().finally(() => process.exit(1));
});
