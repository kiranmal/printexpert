const db = require("./config/db");
(async () => {
  const [r] = await db.execute(
    "SELECT status, COUNT(*) c FROM orders GROUP BY status"
  );
  console.log("before:", JSON.stringify(r));
  const [u] = await db.execute(
    "UPDATE orders SET status='New' WHERE status='Payment Pending'"
  );
  console.log("normalized rows:", u.affectedRows);
  const [r2] = await db.execute(
    "SELECT status, COUNT(*) c FROM orders GROUP BY status"
  );
  console.log("after:", JSON.stringify(r2));
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
