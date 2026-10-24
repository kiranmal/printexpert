const db = require("./config/db");
(async () => {
  const [cols] = await db.execute("SHOW COLUMNS FROM orders");
  console.log("columns:", cols.map((c) => c.Field).join(", "));
  const [r] = await db.execute(
    "SELECT * FROM orders WHERE order_id LIKE 'ATC%' ORDER BY id DESC LIMIT 3"
  );
  console.log("\nATC orders:", r.length);
  for (const o of r) {
    console.log(" ", o.order_id, "total:", o.total, "pay:", o.payment_status);
    for (const key of ["items", "data", "payload", "order_data"]) {
      if (o[key]) {
        try {
          const items = JSON.parse(o[key]);
          const arr = items.items || items.products || items;
          (Array.isArray(arr) ? arr : []).forEach((i) =>
            console.log("    item:", i.name, "| pid:", i.productId, "| qty:", i.quantity, "| price:", i.price)
          );
        } catch {
          console.log("    raw:", String(o[key]).slice(0, 150));
        }
        break;
      }
    }
  }
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
