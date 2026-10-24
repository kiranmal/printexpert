/* =========================================================
   SHIPPING SERVICE — Step 3C (mock mode, DB weights)

   Backend-only layer that will later call Delhivery's real
   rate/serviceability APIs. DELHIVERY_MODE=mock returns
   deterministic rates so checkout + order flows can be
   built and tested without live credentials.

   WEIGHT — authoritative: every item's weight comes from
   products.weight_grams in the database, resolved by
   productId. Client-supplied weight/price/charge fields are
   never trusted. A product with NULL/non-positive weight
   yields 400 WEIGHT_MISSING — no assumed weight is used.
========================================================= */

const crypto = require("crypto");
const db = require("../config/db");

const MODE = (
  process.env.DELHIVERY_MODE || "mock"
).toLowerCase();

/* mock serviceability: pins starting with "9" are the
   deterministic UNSERVICEABLE fixture; 1-8 are serviceable */
const MOCK_UNSERVICEABLE_PREFIX = "9";

const PIN_RE = /^[1-9][0-9]{5}$/;

/* normalize client payment names → cod | prepaid */
function normalizePaymentMode(raw) {
  const m = String(raw || "")
    .trim()
    .toLowerCase();
  if (["cod", "cash_on_delivery", "cash"].includes(m))
    return "cod";
  if (
    ["online", "prepaid", "razorpay", "card", "upi"].includes(
      m
    )
  )
    return "prepaid";
  return null;
}

/* deterministic mock rate — identical inputs always give
   the same charge, so tests are repeatable.
   inputs: zone (pincode[0], 1-8), weight slabs of 500 g,
   paymentMode (cod adds 30).
   charge = 30 + zone*10 + slab*15 + (cod ? 30 : 0) */
function mockRate({ pincode, weightG, paymentMode }) {
  const zone = Number(pincode[0]);
  const slabs = Math.max(1, Math.ceil(weightG / 500));
  return 30 + zone * 10 + slabs * 15 + (paymentMode === "cod" ? 30 : 0);
}

const quoteIdFor = (inputs) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(inputs))
    .digest("hex")
    .slice(0, 24);

const bad = (status, code, message, extra = {}) => ({
  ok: false,
  status,
  body: { success: false, code, message, ...extra },
});

/**
 * checkServiceable(pincode) — item-free serviceability only,
 * shared by check-delivery and the quote path.
 * Mock: pins starting with "9" are the deterministic
 * unserviceable fixture. Live mode is not implemented.
 */
function checkServiceable(pincode) {
  const pin = String(pincode || "").trim();
  if (!PIN_RE.test(pin)) {
    return { serviceable: false, code: "INVALID_PINCODE" };
  }
  if (MODE === "live") {
    return { serviceable: false, code: "LIVE_NOT_CONFIGURED" };
  }
  if (pin.startsWith(MOCK_UNSERVICEABLE_PREFIX)) {
    return {
      serviceable: false,
      code: "UNSERVICEABLE_PINCODE",
      message: "Delivery is not available for this pincode.",
    };
  }
  return { serviceable: true };
}

/**
 * quoteShipping({ pincode, paymentMode, items })
 * items: [{ productId, quantity }] — productId resolves the
 * authoritative weight_grams from the products table;
 * quantity multiplies it.
 *
 * returns { ok, status, body } — the route just forwards it.
 */
async function quoteShipping({ pincode, paymentMode, items }) {
  const pin = String(pincode || "").trim();
  const mode = normalizePaymentMode(paymentMode);

  /* ---------- input validation ---------- */
  if (!PIN_RE.test(pin)) {
    return bad(
      400,
      "INVALID_PINCODE",
      "A valid 6 digit Indian pincode is required."
    );
  }
  if (!mode) {
    return bad(
      400,
      "INVALID_PAYMENT_MODE",
      "Payment mode must be COD or a prepaid method."
    );
  }

  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return bad(
      400,
      "ITEMS_REQUIRED",
      "At least one item is required to quote shipping."
    );
  }

  const wanted = [];
  for (const it of list) {
    const pid = String(it?.productId ?? "").trim();
    const q = Number(it?.quantity ?? 1);
    if (!/^[0-9]+$/.test(pid)) {
      return bad(
        400,
        "INVALID_PRODUCT",
        "Every item needs a valid product id."
      );
    }
    if (!Number.isFinite(q) || q <= 0 || q > 10000) {
      return bad(
        400,
        "INVALID_QUANTITY",
        "Every item needs a valid positive quantity."
      );
    }
    wanted.push({ productId: pid, quantity: q });
  }

  /* ---------- authoritative weights from DB ---------- */
  const ids = [...new Set(wanted.map((w) => w.productId))];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT id, name, weight_grams
     FROM products WHERE id IN (${placeholders})`,
    ids
  );
  const byId = new Map(rows.map((r) => [String(r.id), r]));

  const unknown = wanted.filter((w) => !byId.has(w.productId));
  if (unknown.length) {
    return bad(
      400,
      "INVALID_PRODUCT",
      "One or more products were not found.",
      { productIds: unknown.map((u) => u.productId) }
    );
  }

  const missing = wanted
    .filter((w) => {
      const g = Number(byId.get(w.productId).weight_grams);
      return !Number.isFinite(g) || g <= 0;
    })
    .map((w) => ({
      productId: w.productId,
      name: byId.get(w.productId).name,
    }));
  if (missing.length) {
    return bad(
      400,
      "WEIGHT_MISSING",
      "Some products do not have a configured weight, so the shipping charge cannot be calculated.",
      { missing }
    );
  }

  const weightG = wanted.reduce(
    (sum, w) =>
      sum +
      Number(byId.get(w.productId).weight_grams) * w.quantity,
    0
  );

  /* ---------- provider ---------- */
  const svc = checkServiceable(pin);
  if (svc.code === "LIVE_NOT_CONFIGURED") {
    /* live Delhivery contract is intentionally NOT
       implemented yet — requires approved creds +
       verified API docs */
    return bad(
      501,
      "LIVE_NOT_CONFIGURED",
      "Live Delhivery integration is not configured yet."
    );
  }

  if (!svc.serviceable) {
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        serviceable: false,
        code: svc.code || "UNSERVICEABLE_PINCODE",
        message:
          svc.message ||
          "Delivery is not available for this pincode.",
        provider: "mock",
        currency: "INR",
        pincode: pin,
      },
    };
  }

  const shippingCharge = mockRate({
    pincode: pin,
    weightG,
    paymentMode: mode,
  });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      serviceable: true,
      shippingCharge,
      currency: "INR",
      provider: "mock",
      pincode: pin,
      paymentMode: mode,
      weightG,
      /* all weights came from products.weight_grams */
      weightSource: "items",
      quoteId: quoteIdFor({
        mode: MODE,
        pin,
        weightG,
        paymentMode: mode,
      }),
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  quoteShipping,
  checkServiceable,
  normalizePaymentMode,
};
