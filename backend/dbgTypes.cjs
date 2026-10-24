const db = require("./config/db");
(async () => {
  const [r] = await db.execute(
    "SELECT id,name,price,sizes,paper_types FROM products WHERE id IN (15,16)"
  );
  r.forEach((p) => {
    console.log("=", p.id, p.name, "₹" + p.price);
    console.log("  sizes:", String(p.sizes).slice(0, 200));
    console.log("  paper_types:", String(p.paper_types).slice(0, 200));
  });
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
