/* One-off: refresh mug product templates with upgraded designs.
   Matches templates by name on mug-type products. */
require("dotenv").config();
const mysql = require("mysql2/promise");
const { SETS } = require("./genericTemplateSeeds");

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

  const names = SETS.mug.map((t) => t.name);
  const [rows] = await db.query(
    `SELECT t.id, t.name, p.name AS product
     FROM product_templates t
     JOIN products p ON p.id = t.product_id
     WHERE t.name IN (?) AND (
       LOWER(COALESCE(p.customization_type, '')) = 'mug'
       OR LOWER(p.name) LIKE '%mug%'
     )`,
    [names]
  );

  for (const row of rows) {
    const seed = SETS.mug.find((s) => s.name === row.name);
    if (!seed) continue;
    const design = JSON.stringify({
      front: seed.front || [],
      back: seed.back || [],
    });
    await db.query(
      "UPDATE product_templates SET design_data=? WHERE id=?",
      [design, row.id]
    );
    console.log(`updated #${row.id} ${row.name} (${row.product})`);
  }
  console.log(`done — ${rows.length} template(s) matched`);
  await db.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
