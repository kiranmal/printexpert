/* =====================================================
   EXISTING PRODUCTS KO CUSTOMIZABLE FLAG DO

   Name/category match karke customization_type set karta hai.
   Run: node setCustomizable.js
===================================================== */

require("dotenv").config();
const pool = require("./config/db");

const RULES = [
  { match: "notebook", type: "spiral-notebook" },
  { match: "letterhead", type: "letterhead" },
  { match: "envelope", type: "envelope" },
  { match: "flyer", type: "flyer" },
  { match: "brochure", type: "brochure" },
  { match: "poster", type: "poster" },
  { match: "label", type: "sticker" },
  { match: "sticker", type: "sticker" },
  { match: "paper bag", type: "paper-bag" },
  { match: "tote bag", type: "tote-bag" },
  { match: "box", type: "box" },
  { match: "cap", type: "cap" },
  { match: "gift set", type: "giftset" },
  { match: "bottle", type: "bottle" },
  { match: "mug", type: "mug" },
  { match: "pen", type: "pen" },
  { match: "business card", type: "business-card" },
  { match: "visiting card", type: "business-card" },
  { match: "cards", type: "business-card" },
  { match: "t-shirt", type: "tshirt" },
  { match: "tshirt", type: "tshirt" },
  { match: "polo", type: "tshirt" },
  { match: "hoodie", type: "hoodie" },
];

const run = async () => {
  /* columns ensure karo — purani DB mein nahi honge */
  try {
    await pool.execute(
      "ALTER TABLE products ADD COLUMN customizable TINYINT(1) NOT NULL DEFAULT 0"
    );
  } catch {
    /* exists */
  }

  try {
    await pool.execute(
      "ALTER TABLE products ADD COLUMN customization_type VARCHAR(50) DEFAULT NULL"
    );
  } catch {
    /* exists */
  }

  /* pehle specific overrides — category words confuse na kare */
  const OVERRIDES = [
    { like: "%Gift Set%", type: "giftset" },
    { like: "%Bottle%", type: "bottle" },
    { like: "%Cap%", type: "cap" },
    { like: "%Notebook%", type: "spiral-notebook" },
  ];

  for (const o of OVERRIDES) {
    await pool.execute(
      "UPDATE products SET customizable = 1, customization_type = ? WHERE name LIKE ?",
      [o.type, o.like]
    );
  }

  const [rows] = await pool.execute(
    "SELECT id, name, category, customizable FROM products"
  );

  let updated = 0;

  for (const p of rows) {
    const nameOnly = `${p.name || ""}`.toLowerCase();
    const hay =
      `${p.name || ""} ${p.category || ""}`.toLowerCase();

    /* name match pehle, category sirf tab jab name na mile */
    const rule =
      RULES.find((r) => nameOnly.includes(r.match)) ||
      RULES.find((r) => hay.includes(r.match));

    if (!rule) continue;

    await pool.execute(
      "UPDATE products SET customizable = 1, customization_type = ? WHERE id = ?",
      [rule.type, p.id]
    );

    console.log(
      `✓ ${p.name} → ${rule.type}`
    );
    updated++;
  }

  console.log(
    `Done — ${updated} products marked customizable`
  );

  process.exit(0);
};

run().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
