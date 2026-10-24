/*
 * seed.js — One-time cloud DB setup
 * Render Shell se run karo:  node seed.js
 *
 * Kya karta hai:
 *   1. users table create (agar nahi hai)
 *   2. admin user create (ADMIN_EMAIL / ADMIN_PASSWORD env)
 *   3. frontend products data ko products table mein import
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./config/db");

/* ---------------------------------------------------------
   Safety guard — seeds must NEVER run against production.
   Refuses when APP_ENV=production unless --force-prod.
--------------------------------------------------------- */
if (
  process.env.APP_ENV === "production" &&
  !process.argv.includes("--force-prod")
) {
  console.error(
    "Refusing to seed: APP_ENV=production.\n" +
      "If you truly intend to seed a production database, " +
      "re-run with --force-prod."
  );
  process.exit(1);
}

const createUsersTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      address TEXT DEFAULT NULL,
      photo TEXT DEFAULT NULL,
      role VARCHAR(20) DEFAULT 'user',
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("users table ready");
};

const createProductsTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      subcategory VARCHAR(100) DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      old_price DECIMAL(10,2) DEFAULT NULL,
      stock INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      badge VARCHAR(50) DEFAULT NULL,
      rating DECIMAL(2,1) DEFAULT 4.8,
      reviews INT DEFAULT 0,
      discount VARCHAR(20) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      images LONGTEXT DEFAULT NULL,
      paper_types TEXT DEFAULT NULL,
      sizes TEXT DEFAULT NULL,
      features TEXT DEFAULT NULL,
      customizable TINYINT(1) NOT NULL DEFAULT 0,
      customization_type VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("products table ready");
};

const createAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "admin@printexpert.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const hashed = await bcrypt.hash(password, 12);

  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existing.length > 0) {
    await pool.execute(
      "UPDATE users SET password = ?, role = 'admin' WHERE email = ?",
      [hashed, email]
    );
    console.log("Admin updated:", email);
  } else {
    await pool.execute(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'admin')",
      ["Administrator", email, "", hashed]
    );
    console.log("Admin created:", email);
  }
};

const loadProductsData = () => {
  const file = path.join(__dirname, "..", "frontend", "src", "data", "products.js");
  const source = fs.readFileSync(file, "utf8");
  // ES module -> eval-able: keep `const products` intact, export at the end
  const arraySource = source.replace(
    /export default products;?\s*$/m,
    "module.exports = products;"
  );
  const mod = { exports: [] };
  new Function("module", arraySource)(mod);
  return mod.exports;
};

const seedProducts = async () => {
  const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM products");
  if (rows[0].count > 0) {
    console.log(`Products already exist (${rows[0].count}) — skipping`);
    return;
  }

  const products = loadProductsData();
  console.log(`Importing ${products.length} products...`);

  for (const p of products) {
    await pool.execute(
      `INSERT INTO products
        (name, category, subcategory, price, old_price, stock, status, badge, rating, reviews, discount, description, images, paper_types, sizes, features, customizable, customization_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.name,
        p.category || "General",
        p.subcategory || null,
        p.price || 0,
        p.oldPrice || null,
        p.stock ?? 100,
        p.status || "Active",
        p.badge || null,
        p.rating || 4.8,
        p.reviews || 0,
        p.discount || null,
        p.description || null,
        JSON.stringify(p.images || []),
        JSON.stringify(p.paperTypes || []),
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.features || []),
        p.customizable ? 1 : 0,
        p.customizationType || null,
      ]
    );
  }

  console.log(`Done — ${products.length} products imported`);
};

(async () => {
  try {
    await createUsersTable();
    await createProductsTable();
    await createAdmin();
    await seedProducts();
    console.log("Seed complete");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
})();
