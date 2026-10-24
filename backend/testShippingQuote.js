/* Test suite — POST /api/shipping/quote (Step 3C)

   Quotes derive weight from products.weight_grams via
   productId — client weight/charge fields are ignored.
   Deterministic mock rates, WEIGHT_MISSING, UNSERVICEABLE.
   Fixture weights are snapshotted + restored. */

const http = require("http");
const db = require("./config/db");

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  [${extra}]` : ""}`);
}

function req(b) {
  return new Promise((res) => {
    const pl = JSON.stringify(b);
    const r = http.request(
      {
        method: "POST",
        hostname: "localhost",
        port: 5000,
        path: "/api/shipping/quote",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(pl),
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
    r.write(pl);
    r.end();
  });
}

/* mock formula mirror — 30 + zone*10 + slab*15 + (cod?30:0) */
const mockRate = (pin, weightG, mode) =>
  30 + Number(pin[0]) * 10 + Math.max(1, Math.ceil(weightG / 500)) * 15 + (mode === "cod" ? 30 : 0);

async function main() {
  /* fixtures: P1=500g weighted, P2=NULL weight */
  const [[p1]] = await db.execute(
    "SELECT id, name, weight_grams FROM products WHERE status='Active' LIMIT 1"
  );
  const [[p2]] = await db.execute(
    "SELECT id, name, weight_grams FROM products WHERE status='Active' AND id<>? LIMIT 1",
    [p1.id]
  );
  const w1 = p1.weight_grams;
  const w2 = p2?.weight_grams ?? null;
  await db.execute("UPDATE products SET weight_grams=500 WHERE id=?", [p1.id]);
  if (p2) await db.execute("UPDATE products SET weight_grams=NULL WHERE id=?", [p2.id]);

  try {
    /* ── happy paths ── */
    let r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: p1.id, quantity: 1 }] });
    check("quote -> 200 serviceable", r.s === 200 && r.b.serviceable === true, `s=${r.s} msg=${r.b?.message}`);
    check("provider mock", r.b.provider === "mock");
    check("charge matches formula (500g,cod)", Number(r.b.shippingCharge) === mockRate("411001", 500, "cod"), `charge=${r.b.shippingCharge}`);
    check("currency INR", r.b.currency === "INR");
    check("quoteId hex24", /^[a-f0-9]{24}$/.test(r.b.quoteId || ""));
    check("weightSource items (all DB weights)", r.b.weightSource === "items");
    check("weightG = 500 from DB", Number(r.b.weightG) === 500);

    const q1 = r;
    r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: p1.id, quantity: 1 }] });
    check("deterministic charge", r.b.shippingCharge === q1.b.shippingCharge);
    check("deterministic quoteId", r.b.quoteId === q1.b.quoteId);

    /* qty multiplies DB weight: 3×500 = 1500 */
    r = await req({ pincode: "411001", paymentMode: "online", items: [{ productId: p1.id, quantity: 3 }] });
    check("qty3 -> weightG 1500", Number(r.b.weightG) === 1500, `${r.b.weightG}`);
    check("qty3 charge = rate(1500,prepaid)", Number(r.b.shippingCharge) === mockRate("411001", 1500, "prepaid"));

    /* prepaid cheaper */
    r = await req({ pincode: "411001", paymentMode: "online", items: [{ productId: p1.id, quantity: 1 }] });
    check("prepaid = cod-30", Number(r.b.shippingCharge) === mockRate("411001", 500, "prepaid"));

    /* zone variation */
    r = await req({ pincode: "110001", paymentMode: "online", items: [{ productId: p1.id, quantity: 1 }] });
    check("zone1 rate", Number(r.b.shippingCharge) === mockRate("110001", 500, "prepaid"));

    /* tamper: client weight/charge ignored */
    r = await req({ pincode: "411001", paymentMode: "online", items: [{ productId: p1.id, quantity: 1, weightGrams: 1 }], shippingCharge: 999, total: 1 });
    check("client weightGrams:1 ignored (DB 500 wins)", Number(r.b.weightG) === 500 && Number(r.b.shippingCharge) === mockRate("411001", 500, "prepaid"), `w=${r.b.weightG}`);

    /* ── WEIGHT_MISSING ── */
    if (p2) {
      r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: p2.id, quantity: 1 }] });
      check("NULL-weight product -> 400 WEIGHT_MISSING", r.s === 400 && r.b.code === "WEIGHT_MISSING", `s=${r.s}`);
      check("WEIGHT_MISSING identifies product", String(r.b.missing?.[0]?.productId) === String(p2.id) && !!r.b.missing?.[0]?.name);
    }

    /* ── invalid product id ── */
    r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: 999999999, quantity: 1 }] });
    check("unknown product -> 400 INVALID_PRODUCT", r.s === 400 && r.b.code === "INVALID_PRODUCT");
    r = await req({ pincode: "411001", paymentMode: "cod", items: [{ quantity: 1 }] });
    check("missing productId -> 400", r.s === 400 && r.b.code === "INVALID_PRODUCT");

    /* ── serviceability fixture ── */
    r = await req({ pincode: "999999", paymentMode: "cod", items: [{ productId: p1.id, quantity: 1 }] });
    check("9-prefix -> serviceable:false", r.s === 200 && r.b.serviceable === false);
    check("unserviceable code", r.b.code === "UNSERVICEABLE_PINCODE");

    /* ── validation ── */
    r = await req({ pincode: "", paymentMode: "cod", items: [{ productId: p1.id, quantity: 1 }] });
    check("missing pincode -> 400", r.s === 400 && r.b.code === "INVALID_PINCODE");
    r = await req({ pincode: "411001", paymentMode: "", items: [{ productId: p1.id, quantity: 1 }] });
    check("missing paymentMode -> 400", r.s === 400 && r.b.code === "INVALID_PAYMENT_MODE");
    r = await req({ pincode: "411001", paymentMode: "crypto", items: [{ productId: p1.id, quantity: 1 }] });
    check("unknown paymentMode -> 400", r.s === 400);
    r = await req({ pincode: "411001", paymentMode: "cod", items: [] });
    check("empty items -> 400 ITEMS_REQUIRED", r.s === 400 && r.b.code === "ITEMS_REQUIRED");
    r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: p1.id, quantity: 0 }] });
    check("zero qty -> 400", r.s === 400 && r.b.code === "INVALID_QUANTITY");
    r = await req({ pincode: "411001", paymentMode: "cod", items: [{ productId: "abc", quantity: 1 }] });
    check("non-numeric productId -> 400", r.s === 400 && r.b.code === "INVALID_PRODUCT");
  } finally {
    await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [w1, p1.id]);
    if (p2) await db.execute("UPDATE products SET weight_grams=? WHERE id=?", [w2, p2.id]);
    const passed = results.filter((x) => x.ok).length;
    console.log(`\n${passed}/${results.length} passed`);
    process.exit(passed === results.length ? 0 : 1);
  }
}

main().catch((e) => {
  console.error("runner error:", e);
  process.exit(1);
});
