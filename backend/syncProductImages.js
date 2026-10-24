/* =====================================================
   LIVE DB PRODUCT IMAGES SYNC

   Har product ki images local vector mockups pe set karta hai:
   /products/<id>-front.svg + /products/<id>-back.svg

   Run: node syncProductImages.js
===================================================== */

require("dotenv").config();
const pool = require("./config/db");

const run = async () => {
  const [rows] = await pool.execute(
    "SELECT id, name FROM products"
  );

  let updated = 0;

  for (const p of rows) {
    const images = JSON.stringify([
      `/products/${p.id}-front.svg`,
      `/products/${p.id}-back.svg`,
    ]);

    await pool.execute(
      "UPDATE products SET images = ? WHERE id = ?",
      [images, p.id]
    );

    console.log(`✓ ${p.name} → mockup images`);
    updated++;
  }

  console.log(
    `Done — ${updated} products updated with mockup images`
  );

  process.exit(0);
};

run().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
