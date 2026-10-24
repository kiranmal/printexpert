/* One-off: upgrade letterhead / spiral-notebook / envelope
   templates to the new premium seed designs.
   Updates existing rows (matched by sort order), inserts any
   additional designs so each product ends with the full set. */
require("dotenv").config();
const mysql = require("mysql2/promise");
const { SETS } = require("./genericTemplateSeeds");

const TARGETS = {
  letterhead: "letterhead",
  "spiral-notebook": "spiral-notebook",
  envelope: "envelope",
};

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "printexpert",
    port: Number(process.env.DB_PORT) || 3306,
    ssl:
      process.env.DB_HOST &&
      !/localhost|127\.0\.0\.1/.test(process.env.DB_HOST)
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const [prods] = await db.query(
    `SELECT id, name, customization_type FROM products
     WHERE customization_type IN ('letterhead','spiral-notebook','envelope')
        OR name IN ('Premium Letterheads','Spiral Notebooks','Business Envelopes')`
  );

  for (const p of prods) {
    const key = TARGETS[p.customization_type];
    if (!key) continue;
    const designs = SETS[key];
    const [rows] = await db.query(
      "SELECT id, name FROM product_templates WHERE product_id=? ORDER BY sort_order, id",
      [p.id]
    );

    for (let i = 0; i < designs.length; i++) {
      const d = designs[i];
      const design = JSON.stringify({
        front: d.front || [],
        back: d.back || [],
      });
      if (rows[i]) {
        await db.query(
          "UPDATE product_templates SET name=?, design_data=? WHERE id=?",
          [d.name, design, rows[i].id]
        );
        console.log(`updated #${rows[i].id} → ${d.name} (${p.name})`);
      } else {
        await db.query(
          "INSERT INTO product_templates (product_id, name, design_data, status, sort_order) VALUES (?,?,?,?,?)",
          [p.id, d.name, design, "Active", i]
        );
        console.log(`inserted ${d.name} (${p.name})`);
      }
    }
  }
  await db.end();
  console.log("done");
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
