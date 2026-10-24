/**
 * testPayments.js — Razorpay payment-flow backend tests.
 *
 * Spawns a SECOND server instance on PORT 5001 with dummy
 * test-mode keys, then exercises:
 *   - auth/validation gates on /payments/razorpay/order
 *   - HMAC signature verify (bad + good + idempotent replay)
 *   - webhook signature + captured/failed + idempotency
 *
 * What it CANNOT test: the real Razorpay dashboard call
 * (client.orders.create) — that needs genuine test keys.
 * It simulates a created rzp order by writing
 * razorpay_order_id into the orders row directly.
 */

const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const db = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET =
  process.env.JWT_SECRET || "printexpert_secret_key_2026";

const PORT = 5001;
const RZP_SECRET = "test_webhook_secret_value";
const WH_SECRET = "test_webhook_sig_secret";

function req(m, p, b, token, extraHeaders) {
  return new Promise((res) => {
    const pl = b !== undefined ? (typeof b === "string" ? b : JSON.stringify(b)) : null;
    const r = http.request(
      {
        method: m,
        hostname: "localhost",
        port: PORT,
        path: p,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(pl ? { "Content-Length": Buffer.byteLength(pl) } : {}),
          ...(extraHeaders || {}),
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function serverUp() {
  for (let i = 0; i < 40; i++) {
    const r = await req("GET", "/api/products").catch(() => ({ s: 0 }));
    if (r.s === 200) return true;
    await wait(250);
  }
  return false;
}

let passed = 0, failed = 0;
const assert = (c, l, d) => {
  if (c) { passed++; console.log(`  PASS: ${l}`); }
  else { failed++; console.error(`  FAIL: ${l} — ${d || ""}`); }
};

(async () => {
  console.log("\nRazorpay payments backend (test instance :5001)\n");

  const child = spawn("node", ["server.js"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      RAZORPAY_KEY_ID: "rzp_test_dummykey",
      RAZORPAY_KEY_SECRET: RZP_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WH_SECRET,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let errLog = "";
  child.stderr.on("data", (d) => { errLog += d.toString(); });
  child.stdout.on("data", () => {});
  child.on("exit", (c) => {
    if (c && c !== 0) console.error("  test server exited:", c, errLog.slice(-300));
  });
  process.on("exit", () => child.kill());

  const up = await serverUp();
  if (!up) {
    console.error("  FAIL: test server did not start");
    child.kill();
    process.exit(1);
  }

  /* users + a real order */
  const em = `pay_${Date.now()}@t.com`;
  const em2 = `pay2_${Date.now()}@t.com`;
  const hash = await bcrypt.hash("x", 10);
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["P", em, "9000000001", hash]
  );
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["P2", em2, "9000000002", hash]
  );
  const [[u]] = await db.execute("SELECT id FROM users WHERE email=?", [em]);
  const [[u2]] = await db.execute("SELECT id FROM users WHERE email=?", [em2]);
  const token = jwt.sign({ id: u.id, email: em, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
  const token2 = jwt.sign({ id: u2.id, email: em2, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  const orderNo = `#PAY${Date.now().toString().slice(-8)}`;
  /* shipping-charge fixture — only delete it if we created it */
  const [chargeIns] = await db.execute(
    "INSERT IGNORE INTO delivery_charges (pincode, city, state, charge, is_active) VALUES (?,?,?,?,1)",
    ["411001", "Pune", "Maharashtra", 40]
  );
  const createdCharge = chargeIns.affectedRows === 1;
  /* weight fixture for shipping quotes — snapshot + restore */
  const [[wrow]] = await db.execute("SELECT weight_grams FROM products WHERE id=?", [35]);
  const origWeight = wrow?.weight_grams ?? null;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [35]);
  const mk = await req("POST", "/api/orders", {
    orderNumber: orderNo,
    customerName: "P",
    items: [{ productId: 35, quantity: 1 }],
    paymentMethod: "online",
    shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
  }, token);

  try {
    assert(mk.s === 200 || mk.s === 201, "test order created", `status=${mk.s}`);

    /* ---------- /order gates ---------- */
    let r = await req("POST", "/api/payments/razorpay/order", { orderNumber: orderNo });
    assert(r.s === 401 || r.s === 403, "rzp order needs auth", `status=${r.s}`);

    r = await req("POST", "/api/payments/razorpay/order", {}, token);
    assert(r.s === 400, "orderNumber required", `status=${r.s}`);

    r = await req("POST", "/api/payments/razorpay/order", { orderNumber: "#NOPE" }, token);
    assert(r.s === 404, "unknown order → 404", `status=${r.s}`);

    r = await req("POST", "/api/payments/razorpay/order", { orderNumber: orderNo }, token2);
    assert(r.s === 403, "other user's order → 403", `status=${r.s}`);

    /* real call would hit Razorpay API — dummy key fails → 500;
       that path proves the route runs server-side creation */
    r = await req("POST", "/api/payments/razorpay/order", { orderNumber: orderNo }, token);
    assert(
      r.s === 500 || r.s === 200,
      "owner order → rzp create attempted (500 w/ dummy key)",
      `status=${r.s} ${JSON.stringify(r.b).slice(0, 100)}`
    );

    /* ---------- verify flow (simulate created rzp order) ---------- */
    const RZP_OID = `order_test_${Date.now()}`;
    const RZP_PID = `pay_test_${Date.now()}`;
    await db.execute(
      "UPDATE orders SET razorpay_order_id=?, payment_status='Pending' WHERE order_id=?",
      [RZP_OID, orderNo]
    );

    /* bad signature → 400 */
    r = await req("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNo,
      razorpay_order_id: RZP_OID,
      razorpay_payment_id: RZP_PID,
      razorpay_signature: "deadbeef".repeat(8),
    }, token);
    assert(r.s === 400, "bad signature rejected", `status=${r.s} ${JSON.stringify(r.b).slice(0, 100)}`);

    /* wrong order id → 400 */
    const goodSig = crypto
      .createHmac("sha256", RZP_SECRET)
      .update(`${RZP_OID}|${RZP_PID}`)
      .digest("hex");
    r = await req("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNo,
      razorpay_order_id: "order_forge_x",
      razorpay_payment_id: RZP_PID,
      razorpay_signature: crypto
        .createHmac("sha256", RZP_SECRET)
        .update("order_forge_x|" + RZP_PID)
        .digest("hex"),
    }, token);
    assert(r.s === 400, "forged rzp order id rejected", `status=${r.s}`);

    /* correct signature → Paid */
    r = await req("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNo,
      razorpay_order_id: RZP_OID,
      razorpay_payment_id: RZP_PID,
      razorpay_signature: goodSig,
    }, token);
    assert(r.s === 200 && r.b.success, "valid signature marks Paid", `status=${r.s}`);

    const [[paidRow]] = await db.execute(
      "SELECT payment_status, razorpay_payment_id FROM orders WHERE order_id=?",
      [orderNo]
    );
    assert(
      String(paidRow.payment_status).toLowerCase() === "paid" &&
        paidRow.razorpay_payment_id === RZP_PID,
      "DB: Paid + payment id stored",
      JSON.stringify(paidRow)
    );

    /* replay → idempotent */
    r = await req("POST", "/api/payments/razorpay/verify", {
      orderNumber: orderNo,
      razorpay_order_id: RZP_OID,
      razorpay_payment_id: RZP_PID,
      razorpay_signature: goodSig,
    }, token);
    assert(r.s === 200, "duplicate verify is idempotent", `status=${r.s}`);

    /* ---------- webhook ---------- */
    const whBody = (pid, oid, event) =>
      JSON.stringify({
        event,
        payload: { payment: { entity: { id: pid, order_id: oid } } },
      });

    /* order 2 for the failed-payment webhook */
    const orderNo2 = `#PAYF${Date.now().toString().slice(-8)}`;
    await req("POST", "/api/orders", {
      orderNumber: orderNo2,
      customerName: "P",
      items: [{ productId: 35, quantity: 1 }],
      paymentMethod: "online",
      shippingAddress: { address: "T", city: "Pune", state: "Maharashtra", pincode: "411001" },
    }, token);
    const RZP_OID2 = `order_t2_${Date.now()}`;
    await db.execute(
      "UPDATE orders SET razorpay_order_id=? WHERE order_id=?",
      [RZP_OID2, orderNo2]
    );

    r = await req("POST", "/api/payments/razorpay/webhook", whBody("pay_x", RZP_OID2, "payment.failed"));
    assert(r.s === 400, "webhook w/o signature → 400", `status=${r.s}`);

    const body2 = whBody("pay_fail_1", RZP_OID2, "payment.failed");
    r = await req("POST", "/api/payments/razorpay/webhook", body2, null, {
      "x-razorpay-signature": "bad",
    });
    assert(r.s === 401, "webhook bad signature → 401", `status=${r.s}`);

    const sig2 = crypto.createHmac("sha256", WH_SECRET).update(body2).digest("hex");
    r = await req("POST", "/api/payments/razorpay/webhook", body2, null, {
      "x-razorpay-signature": sig2,
    });
    assert(r.s === 200, "webhook valid sig accepted", `status=${r.s}`);

    const [[failRow]] = await db.execute(
      "SELECT payment_status FROM orders WHERE order_id=?",
      [orderNo2]
    );
    assert(
      String(failRow.payment_status).toLowerCase() === "failed",
      "failed payment → Failed status",
      JSON.stringify(failRow)
    );

    /* captured webhook on a second rzp order → Paid */
    const body3 = whBody("pay_cap_1", RZP_OID2, "payment.captured");
    const sig3 = crypto.createHmac("sha256", WH_SECRET).update(body3).digest("hex");
    r = await req("POST", "/api/payments/razorpay/webhook", body3, null, {
      "x-razorpay-signature": sig3,
    });
    assert(r.s === 200, "captured webhook accepted", `status=${r.s}`);

    const [[capRow]] = await db.execute(
      "SELECT payment_status, razorpay_payment_id FROM orders WHERE order_id=?",
      [orderNo2]
    );
    /* failed → captured later: payment_status updates to Paid */
    assert(
      String(capRow.payment_status).toLowerCase() === "paid",
      "captured webhook marks Paid",
      JSON.stringify(capRow)
    );

    /* replay captured → still 200, still Paid (idempotent) */
    r = await req("POST", "/api/payments/razorpay/webhook", body3, null, {
      "x-razorpay-signature": sig3,
    });
    assert(r.s === 200, "webhook replay idempotent", `status=${r.s}`);

    /* unknown order → ack'd, no crash */
    const body4 = whBody("pay_z", "order_nobody", "payment.captured");
    const sig4 = crypto.createHmac("sha256", WH_SECRET).update(body4).digest("hex");
    r = await req("POST", "/api/payments/razorpay/webhook", body4, null, {
      "x-razorpay-signature": sig4,
    });
    assert(r.s === 200, "unknown-order webhook ack'd", `status=${r.s}`);
  } finally {
    /* cleanup */
    await db.execute("DELETE FROM orders WHERE order_id IN (?,?)", [orderNo, `#PAYF${Date.now().toString().slice(-8)}`]).catch(() => {});
    await db.execute(
      "DELETE FROM orders WHERE order_id LIKE '#PAY%' OR order_id LIKE '#PAYF%'"
    ).catch(() => {});
    await db.execute("DELETE FROM users WHERE email IN (?,?)", [em, em2]);
    if (createdCharge) await db.execute("DELETE FROM delivery_charges WHERE pincode=?", ["411001"]).catch(() => {});
    await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [origWeight, 35]).catch(() => {});
    child.kill();
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
