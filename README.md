# Print Expert

**Printing Solutions, Perfect Results** — an online store for custom printing:
visiting cards, stationery, marketing material, stickers, packaging, apparel,
mugs & gifts, pens & drinkware.

- `frontend/` — React + Vite storefront and admin panel
- `backend/`  — Node.js / Express API on MySQL / MariaDB

## Quick start (local)

1. **Create the database** (once) — run as a MySQL/MariaDB admin:

   ```
   mysql -u root -p < backend/printexpert_database.sql
   ```

   This creates the `printexpert` database, every table, the admin account,
   categories, 30 products (with sub-categories, weights and images),
   coupons and sample delivery pincodes.

2. **Backend**

   ```
   cd backend
   npm install
   npm start          # http://localhost:5000
   ```

3. **Frontend**

   ```
   cd frontend
   npm install
   npm run dev        # http://localhost:5173
   ```

Admin panel: `http://localhost:5173/admin` — sign in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD` from `backend/.env`.

## Brand

| Colour  | Hex       |
| ------- | --------- |
| Ink     | `#191B21` |
| Magenta | `#E72183` (text: `#C5165B`) |
| Cyan    | `#0190D9` |
| Yellow  | `#FAD303` |
