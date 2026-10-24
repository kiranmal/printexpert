const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const JWT_SECRET = process.env.JWT_SECRET || "printexpert_secret_key_2026";

/* =========================================================
   MIDDLEWARE
========================================================= */

/* =========================================================
   MIDDLEWARE — CORS FIX FOR VERCEL
========================================================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",

  process.env.CLIENT_URL,
  process.env.SITE_URL,

  ...(process.env.CORS_ORIGINS || "").split(","),

  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ""));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("CORS origin not allowed:", origin);
      return callback(null, false);
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-razorpay-signature",
    ],
  }),
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests that do not send an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("CORS origin not allowed:", origin);

      // Do not throw an error that turns CORS failures into
      // confusing backend errors.
      return callback(null, false);
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-razorpay-signature",
    ],
  }),
);

/* Parse JSON requests and preserve Razorpay webhook raw body. */
app.use(
  express.json({
    limit: "30mb",
    verify: (req, res, buf) => {
      if (
        req.originalUrl &&
        req.originalUrl.includes("/api/payments/razorpay/webhook")
      ) {
        req.rawBody = buf;
      }
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "30mb",
  }),
);
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

/* =========================================================
   MYSQL DATABASE
========================================================= */

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "printexpert",
  port: Number(process.env.DB_PORT) || 3306,

  /* Cloud DBs (Aiven etc.) require SSL */
  ssl:
    process.env.DB_HOST &&
    !["localhost", "127.0.0.1"].includes(process.env.DB_HOST)
      ? { rejectUnauthorized: false }
      : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/* =========================================================
   DATABASE CONNECTION TEST
========================================================= */

async function testDatabaseConnection() {
  try {
    const connection = await db.getConnection();

    console.log("=================================");
    console.log("MySQL Database Connected");
    console.log("Database:", process.env.DB_NAME || "printexpert");
    console.log("=================================");

    connection.release();
  } catch (error) {
    console.error("=================================");
    console.error("MySQL Connection Failed");
    console.error("Error:", error.message);
    console.error("=================================");
  }
}

testDatabaseConnection();

/* =========================================================
   HELPER
========================================================= */

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* =========================================================
   HOME / HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Print Expert API is running",
  });
});

/* =========================================================
   TEST API
========================================================= */

app.get("/api/test", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.status(200).json({
      success: true,
      message: "Backend and MySQL connection successful",
    });
  } catch (error) {
    console.error("TEST API ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Backend is running but MySQL connection failed.",
    });
  }
});

/* =========================================================
   SIGNUP
   POST /api/auth/signup
========================================================= */

app.post("/api/auth/signup", async (req, res) => {
  try {
    console.log("=================================");
    console.log("SIGNUP REQUEST RECEIVED");
    console.log("Body:", {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    });
    console.log("=================================");

    const { name, email, phone, password } = req.body;

    /* -------------------------------------------------------
       REQUIRED FIELDS
    ------------------------------------------------------- */

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    /* -------------------------------------------------------
       CLEAN DATA
    ------------------------------------------------------- */

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();

    /* -------------------------------------------------------
       NAME VALIDATION
    ------------------------------------------------------- */

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your full name.",
      });
    }

    /* -------------------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------------- */

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    /* -------------------------------------------------------
       PHONE VALIDATION
    ------------------------------------------------------- */

    const phoneRegex = /^[6-9]\d{9}$/;

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10 digit Indian phone number.",
      });
    }

    /* -------------------------------------------------------
       PASSWORD VALIDATION
    ------------------------------------------------------- */

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    /* -------------------------------------------------------
       CHECK EMAIL ALREADY EXISTS
    ------------------------------------------------------- */

    const [existingUsers] = await db.execute(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered!",
      });
    }

    /* -------------------------------------------------------
       HASH PASSWORD
    ------------------------------------------------------- */

    const hashedPassword = await bcrypt.hash(String(password), 10);

    /* -------------------------------------------------------
       INSERT USER INTO MYSQL
    ------------------------------------------------------- */

    const [result] = await db.execute(
      `
      INSERT INTO users
      (
        name,
        email,
        phone,
        password,
        address,
        photo,
        role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [cleanName, cleanEmail, cleanPhone, hashedPassword, "", "", "user"],
    );

    /* -------------------------------------------------------
       SUCCESS
    ------------------------------------------------------- */

    console.log("New user created successfully. ID:", result.insertId);

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: "",
        photo: "",
        role: "user",
      },
    });
  } catch (error) {
    console.error("=================================");
    console.error("SIGNUP ERROR");
    console.error(error);
    console.error("=================================");

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This email is already registered!",
      });
    }

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "users table does not exist in printexpert database.",
      });
    }

    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        success: false,
        message: "users table columns do not match the backend code.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating account.",
    });
  }
});

/* =========================================================
   LOGIN
   POST /api/auth/login
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    /* -------------------------------------------------------
       FIND USER
    ------------------------------------------------------- */

    const [users] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password,
        address,
        photo,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail],
    );

    /* -------------------------------------------------------
       USER NOT FOUND
    ------------------------------------------------------- */

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please create an account first.",
      });
    }

    const user = users[0];

    /* -------------------------------------------------------
       PASSWORD CHECK
    ------------------------------------------------------- */

    const passwordMatch = await bcrypt.compare(String(password), user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password!",
      });
    }

    /* -------------------------------------------------------
       JWT TOKEN
    ------------------------------------------------------- */

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        /* unique id per session — without it, two logins
           within the same second produce the SAME token
           and a logout revoke would kill both */
        jti: crypto.randomBytes(16).toString("hex"),
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    /* -------------------------------------------------------
       USER DATA
    ------------------------------------------------------- */

    const loggedInUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      photo: user.photo || "",
      role: user.role || "user",
    };

    /* -------------------------------------------------------
       SUCCESS
    ------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${loggedInUser.name}!`,
      token,
      user: loggedInUser,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while logging in.",
    });
  }
});

/* =========================================================
   JWT AUTHENTICATION MIDDLEWARE
========================================================= */

/* tokens revoked via POST /api/auth/logout — in-memory
   blacklist, keyed by token hash. Scoped to the process;
   JWT expiry (30d) covers anything that outlives it. */
const revokedTokens = new Set();
const tokenHash = (t) =>
  crypto.createHash("sha256").update(String(t)).digest("hex");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing.",
      });
    }

    if (revokedTokens.has(tokenHash(token))) {
      return res.status(401).json({
        success: false,
        message: "Session has been logged out.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

/* =========================================================
   GET CURRENT USER
   GET /api/auth/me
========================================================= */

/* ensure address columns exist (safe migration) */
let addressColumnsEnsured = false;
async function ensureAddressColumns() {
  if (addressColumnsEnsured) return;
  addressColumnsEnsured = true;
  const cols = [
    "city VARCHAR(100)",
    "state VARCHAR(100)",
    "pincode VARCHAR(10)",
  ];
  for (const col of cols) {
    const name = col.split(" ")[0];
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN ${col} DEFAULT NULL`);
    } catch {
      /* column already exists — ignore */
    }
  }
}

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    await ensureAddressColumns();
    const [users] = await db.execute(
      `
        SELECT
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          photo,
          role
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("GET CURRENT USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching user.",
    });
  }
});

/* =========================================================
   LOGOUT — revoke the presented token so it cannot be
   replayed even while its JWT expiry is still valid
   POST /api/auth/logout
========================================================= */

app.post("/api/auth/logout", authenticateToken, (req, res) => {
  const token = req.headers.authorization.substring(7);
  revokedTokens.add(tokenHash(token));
  return res.json({
    success: true,
    message: "Logged out.",
  });
});

/* =========================================================
   FORGOT PASSWORD — email OTP flow
   POST /api/auth/forgot-password  { email }
   POST /api/auth/reset-password   { email, otp, newPassword }
========================================================= */

let resetTableEnsured = false;
async function ensurePasswordResetTable() {
  if (resetTableEnsured) return;
  resetTableEnsured = true;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          INT          NOT NULL AUTO_INCREMENT,
      email       VARCHAR(190) NOT NULL,
      otp         VARCHAR(6)   NOT NULL,
      expires_at  DATETIME     NOT NULL,
      attempts    INT          NOT NULL DEFAULT 0,
      used        TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pr_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/* lazy transporter — created once, only when SMTP creds exist */
let mailTransporter = null;
function getMailer() {
  if (mailTransporter !== null) return mailTransporter || null;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "SMTP not configured (SMTP_HOST/USER/PASS) — reset emails cannot be sent.",
    );
    mailTransporter = false;
    return null;
  }

  mailTransporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });
  return mailTransporter;
}

async function sendResetOtpEmail(email, otp) {
  const mailer = getMailer();
  if (!mailer) return false;

  await mailer.sendMail({
    from: process.env.SMTP_FROM || `"Print Expert" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your password reset code — Print Expert",
    text: `Your password reset code is: ${otp}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
        <h2 style="color:#25262d">Password Reset</h2>
        <p>Your password reset code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#25262d">${otp}</p>
        <p style="color:#64748b">It expires in <b>10 minutes</b>. If you did not request this, ignore this email.</p>
        <p style="color:#94a3b8;font-size:12px">Print Expert</p>
      </div>`,
  });
  return true;
}

/* ---- request OTP ---- */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    await ensurePasswordResetTable();

    const [users] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    /* generic response — do not leak whether the account exists */
    if (users.length === 0) {
      return res.json({
        success: true,
        message: "If this email is registered, a reset code has been sent.",
      });
    }

    /* rate limit — max 3 OTPs per email per hour */
    const [recent] = await db.execute(
      `SELECT COUNT(*) AS c FROM password_resets
       WHERE email = ? AND created_at > NOW() - INTERVAL 1 HOUR`,
      [email],
    );
    if (Number(recent[0].c) >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many reset requests. Please try again later.",
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    await db.execute(
      `INSERT INTO password_resets (email, otp, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [email, otp],
    );

    const sent = await sendResetOtpEmail(email, otp).catch((e) => {
      console.error("Reset email send failed:", e.message);
      return false;
    });

    if (!sent) {
      return res.status(503).json({
        success: false,
        message: "Could not send the reset email. Please try again later.",
      });
    }

    return res.json({
      success: true,
      message: "If this email is registered, a reset code has been sent.",
    });
  } catch (error) {
    console.error("forgot-password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to process the request.",
    });
  }
});

/* ---- verify OTP + set new password ---- */
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code.",
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    await ensurePasswordResetTable();

    /* latest unused OTP for this email */
    const [rows] = await db.execute(
      `SELECT * FROM password_resets
       WHERE email = ? AND used = 0
       ORDER BY id DESC LIMIT 1`,
      [email],
    );

    const bad = () =>
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset code.",
      });

    if (rows.length === 0) return bad();
    const row = rows[0];

    if (new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) {
      return bad();
    }

    if (row.otp !== otp) {
      await db.execute(
        "UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?",
        [row.id],
      );
      return bad();
    }

    /* OTP correct — mark used, update password */
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute("UPDATE password_resets SET used = 1 WHERE id = ?", [
      row.id,
    ]);
    await db.execute("UPDATE users SET password = ? WHERE email = ?", [
      hash,
      email,
    ]);

    return res.json({
      success: true,
      message: "Password updated. You can sign in now.",
    });
  } catch (error) {
    console.error("reset-password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
    });
  }
});

/* =========================================================
   CUSTOMIZATION DRAFTS — auto-save/resume (logged-in users)

   One draft per (user, editor, product). Drafts never touch
   cart/orders/stock — they are working state only.
   Expiry: 30 days since last update (lazy purge).
========================================================= */

const DRAFT_MAX_AGE_DAYS = 30;

let draftsTableEnsured = false;
async function ensureDraftsTable() {
  if (draftsTableEnsured) return;
  draftsTableEnsured = true;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customization_drafts (
      id          INT          NOT NULL AUTO_INCREMENT,
      user_id     INT          NOT NULL,
      editor      VARCHAR(30)  NOT NULL DEFAULT 'customizer',
      product_id  VARCHAR(64)  NOT NULL,
      draft       LONGTEXT     NOT NULL,
      revision    INT          NOT NULL DEFAULT 1,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_draft_user (user_id, editor, product_id),
      KEY idx_draft_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/* lazy expiry — rows older than DRAFT_MAX_AGE_DAYS are dead */
async function purgeOldDrafts(userId = null) {
  try {
    await ensureDraftsTable();
    await db.execute(
      `DELETE FROM customization_drafts
       WHERE updated_at < NOW() - INTERVAL ? DAY
       ${userId ? "AND user_id = ?" : ""}`,
      userId ? [DRAFT_MAX_AGE_DAYS, userId] : [DRAFT_MAX_AGE_DAYS],
    );
  } catch {
    /* best-effort cleanup */
  }
}

function sanitizeDraftInput(d) {
  /* allow only plain-JSON objects, cap size ~8MB */
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  try {
    const s = JSON.stringify(d);
    return s.length <= 8 * 1024 * 1024 ? s : null;
  } catch {
    return null;
  }
}

/* ---- read one draft ---- */
app.get(
  "/api/drafts/:editor/:productId",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureDraftsTable();
      await purgeOldDrafts(req.user.id);

      const editor = String(req.params.editor).slice(0, 30);
      const productId = String(req.params.productId).slice(0, 64);

      const [rows] = await db.execute(
        `SELECT draft, revision, updated_at
         FROM customization_drafts
         WHERE user_id = ? AND editor = ? AND product_id = ?`,
        [req.user.id, editor, productId],
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "No saved draft.",
        });
      }

      let draft;
      try {
        draft = JSON.parse(rows[0].draft);
      } catch {
        draft = null;
      }

      return res.json({
        success: true,
        draft,
        revision: rows[0].revision,
        updatedAt: rows[0].updated_at,
        expiresInDays: DRAFT_MAX_AGE_DAYS,
      });
    } catch (error) {
      console.error("GET /api/drafts error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to load draft.",
      });
    }
  },
);

/* ---- create/update draft (upsert, revision-checked) ---- */
app.put(
  "/api/drafts/:editor/:productId",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureDraftsTable();
      await purgeOldDrafts(req.user.id);

      const editor = String(req.params.editor).slice(0, 30);
      const productId = String(req.params.productId).slice(0, 64);
      const draftJson = sanitizeDraftInput(req.body?.draft);
      const revision = Math.max(1, parseInt(req.body?.revision, 10) || 1);

      if (!draftJson) {
        return res.status(400).json({
          success: false,
          message: "Invalid or oversized draft payload.",
        });
      }

      const [existing] = await db.execute(
        `SELECT revision FROM customization_drafts
         WHERE user_id = ? AND editor = ? AND product_id = ?`,
        [req.user.id, editor, productId],
      );

      /* an older/later revision must not overwrite a newer one */
      if (existing.length && existing[0].revision > revision) {
        return res.status(409).json({
          success: false,
          message: "A newer draft exists.",
          currentRevision: existing[0].revision,
        });
      }

      const nextRev = existing.length
        ? Math.max(existing[0].revision + 1, revision)
        : revision;

      await db.execute(
        `INSERT INTO customization_drafts
           (user_id, editor, product_id, draft, revision)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           draft = VALUES(draft),
           revision = VALUES(revision)`,
        [req.user.id, editor, productId, draftJson, nextRev],
      );

      return res.json({ success: true, revision: nextRev });
    } catch (error) {
      console.error("PUT /api/drafts error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to save draft.",
      });
    }
  },
);

/* ---- discard draft ---- */
app.delete(
  "/api/drafts/:editor/:productId",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureDraftsTable();
      await db.execute(
        `DELETE FROM customization_drafts
         WHERE user_id = ? AND editor = ? AND product_id = ?`,
        [
          req.user.id,
          String(req.params.editor).slice(0, 30),
          String(req.params.productId).slice(0, 64),
        ],
      );
      return res.json({ success: true });
    } catch (error) {
      console.error("DELETE /api/drafts error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to delete draft.",
      });
    }
  },
);

/* ---- merge guest drafts into the account ---- */
app.post("/api/drafts/merge", authenticateToken, async (req, res) => {
  try {
    await ensureDraftsTable();
    await purgeOldDrafts(req.user.id);

    const items = Array.isArray(req.body?.drafts)
      ? req.body.drafts.slice(0, 50)
      : [];

    let merged = 0;
    for (const item of items) {
      const editor = String(item?.editor || "customizer").slice(0, 30);
      const productId = String(item?.productId || "").slice(0, 64);
      const draftJson = sanitizeDraftInput(item?.draft);
      const revision = Math.max(1, parseInt(item?.revision, 10) || 1);
      if (!productId || !draftJson) continue;

      const [existing] = await db.execute(
        `SELECT revision FROM customization_drafts
           WHERE user_id = ? AND editor = ? AND product_id = ?`,
        [req.user.id, editor, productId],
      );

      /* keep whichever is newer — never lose either version */
      if (existing.length && existing[0].revision > revision) continue;

      await db.execute(
        `INSERT INTO customization_drafts
             (user_id, editor, product_id, draft, revision)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             draft = VALUES(draft),
             revision = VALUES(revision)`,
        [req.user.id, editor, productId, draftJson, revision],
      );
      merged++;
    }

    return res.json({ success: true, merged });
  } catch (error) {
    console.error("POST /api/drafts/merge error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to merge drafts.",
    });
  }
});

/* =========================================================
   USER FAVORITES — wishlist for logged-in customers.

   Snapshot keeps a small product copy (name/price/image)
   so cards render without re-fetching; product_id joins
   still let admins/trace the real product.
========================================================= */

let favoritesTableEnsured = false;
async function ensureFavoritesTable() {
  if (favoritesTableEnsured) return;
  favoritesTableEnsured = true;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id          INT         NOT NULL AUTO_INCREMENT,
      user_id     INT         NOT NULL,
      product_id  VARCHAR(64) NOT NULL,
      snapshot    LONGTEXT    NOT NULL,
      created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_fav_user (user_id, product_id),
      KEY idx_fav_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function sanitizeFavoriteInput(b) {
  const productId = String(b?.productId || "").slice(0, 64);
  const snapshot = b?.snapshot;
  if (!productId || !snapshot || typeof snapshot !== "object") return null;
  try {
    const s = JSON.stringify(snapshot);
    return s.length <= 8 * 1024 * 1024 ? { productId, snapshot: s } : null;
  } catch {
    return null;
  }
}

/* list */
app.get("/api/favorites", authenticateToken, async (req, res) => {
  try {
    await ensureFavoritesTable();
    const [rows] = await db.execute(
      `SELECT product_id, snapshot, created_at
       FROM user_favorites WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    const favorites = rows
      .map((r) => {
        try {
          const snap = JSON.parse(r.snapshot);
          return { ...snap, id: snap?.id ?? r.product_id };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return res.json({ success: true, favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load favorites.",
    });
  }
});

/* add (idempotent per product) */
app.post("/api/favorites", authenticateToken, async (req, res) => {
  try {
    await ensureFavoritesTable();
    const clean = sanitizeFavoriteInput(req.body);
    if (!clean) {
      return res.status(400).json({
        success: false,
        message: "Invalid favorite payload.",
      });
    }
    await db.execute(
      `INSERT INTO user_favorites (user_id, product_id, snapshot)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE snapshot = VALUES(snapshot)`,
      [req.user.id, clean.productId, clean.snapshot],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("POST /api/favorites error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to save favorite.",
    });
  }
});

/* remove */
app.delete("/api/favorites/:productId", authenticateToken, async (req, res) => {
  try {
    await ensureFavoritesTable();
    await db.execute(
      `DELETE FROM user_favorites
         WHERE user_id = ? AND product_id = ?`,
      [req.user.id, String(req.params.productId).slice(0, 64)],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/favorites error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to remove favorite.",
    });
  }
});

/* merge guest localStorage favorites on login */
app.post("/api/favorites/merge", authenticateToken, async (req, res) => {
  try {
    await ensureFavoritesTable();
    const items = Array.isArray(req.body?.favorites)
      ? req.body.favorites.slice(0, 200)
      : [];
    let merged = 0;
    for (const item of items) {
      const clean = sanitizeFavoriteInput({
        productId: item?.productId ?? item?.id,
        snapshot: item?.snapshot ?? item,
      });
      if (!clean) continue;
      await db.execute(
        `INSERT IGNORE INTO user_favorites
             (user_id, product_id, snapshot)
           VALUES (?, ?, ?)`,
        [req.user.id, clean.productId, clean.snapshot],
      );
      merged++;
    }
    return res.json({ success: true, merged });
  } catch (error) {
    console.error("POST /api/favorites/merge error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to merge favorites.",
    });
  }
});

/* =========================================================
   UPDATE PROFILE
   PUT /api/auth/profile
========================================================= */

app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    await ensureAddressColumns();

    const { name, phone, address, city, state, pincode, photo } = req.body;

    /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

    const cleanName = String(name || "").trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid name.",
      });
    }

    /* -----------------------------------------------------
         PHONE
      ----------------------------------------------------- */

    const cleanPhone = String(phone || "").trim();

    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10 digit Indian phone number.",
      });
    }

    /* -----------------------------------------------------
         UPDATE DATABASE
      ----------------------------------------------------- */

    await db.execute(
      `
        UPDATE users
        SET
          name = ?,
          phone = ?,
          address = ?,
          city = ?,
          state = ?,
          pincode = ?,
          photo = ?
        WHERE id = ?
        `,
      [
        cleanName,
        cleanPhone,
        String(address || "").trim(),
        String(city || "").trim(),
        String(state || "").trim(),
        String(pincode || "").trim(),
        String(photo || "").trim(),
        req.user.id,
      ],
    );

    /* -----------------------------------------------------
         GET UPDATED USER
      ----------------------------------------------------- */

    const [users] = await db.execute(
      `
        SELECT
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          photo,
          role
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: users[0],
    });
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile.",
    });
  }
});

/* =========================================================
   SHIPPING QUOTE — Step 3A

   POST /api/shipping/quote
   Body: { pincode, paymentMode, items?: [{quantity, weightGrams?}] }

   Returns serviceable + calculated charge from the backend
   shipping service. DELHIVERY_MODE=mock returns deterministic
   rates (provider:"mock"); live mode returns 501 until the
   real Delhivery contract is wired. The client-supplied
   shippingCharge/total fields are never read here or at
   order time.
========================================================= */

const shippingService = require("./services/shippingService");

app.post("/api/shipping/quote", async (req, res) => {
  try {
    const { pincode, paymentMode, items } = req.body || {};
    const r = await shippingService.quoteShipping({
      pincode,
      paymentMode,
      items,
    });
    return res.status(r.status).json(r.body);
  } catch (error) {
    /* DB/provider failures must never collapse into a
       missing-pincode or ₹0 response */
    console.error("Shipping quote error:", error);
    return res.status(502).json({
      success: false,
      code: "SHIPPING_QUOTE_FAILED",
      message: "Unable to calculate shipping right now. Please try again.",
    });
  }
});

/* =========================================================
   CHECK DELIVERY
   POST /api/check-delivery
========================================================= */

app.post("/api/check-delivery", async (req, res) => {
  try {
    const { name, pincode, city, state, address } = req.body;

    /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

    if (!name || normalize(name).length < 2) {
      return res.status(400).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message: "Please enter your full name.",
      });
    }

    /* -----------------------------------------------------
         ADDRESS
      ----------------------------------------------------- */

    if (!address || normalize(address).length < 5) {
      return res.status(400).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message: "Please enter your complete delivery address.",
      });
    }

    /* -----------------------------------------------------
         CITY
      ----------------------------------------------------- */

    if (!city || normalize(city).length < 2) {
      return res.status(400).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message: "Please enter a valid city.",
      });
    }

    /* -----------------------------------------------------
         STATE
      ----------------------------------------------------- */

    if (!state || normalize(state).length < 2) {
      return res.status(400).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message: "Please enter a valid state.",
      });
    }

    /* -----------------------------------------------------
         PINCODE
      ----------------------------------------------------- */

    const pin = String(pincode || "").trim();

    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message: "Please enter a valid 6 digit Indian pincode.",
      });
    }

    /* -----------------------------------------------------
         INDIA POST PINCODE API
      ----------------------------------------------------- */

    const apiResponse = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
    );

    if (!apiResponse.ok) {
      return res.status(503).json({
        success: false,
        validAddress: false,
        serviceable: false,
        message:
          "Pincode verification service is temporarily unavailable. Please try again.",
      });
    }

    const data = await apiResponse.json();

    /* -----------------------------------------------------
         INVALID PINCODE
      ----------------------------------------------------- */

    if (
      !Array.isArray(data) ||
      !data[0] ||
      data[0].Status !== "Success" ||
      !Array.isArray(data[0].PostOffice) ||
      data[0].PostOffice.length === 0
    ) {
      return res.status(200).json({
        success: true,
        validAddress: false,
        serviceable: false,
        message:
          "This pincode does not appear to be a valid Indian delivery pincode.",
        pincode: pin,
      });
    }

    const postOffices = data[0].PostOffice;

    /* -----------------------------------------------------
         NORMALIZE CITY / STATE
      ----------------------------------------------------- */

    const normalizedCity = normalize(city);

    const normalizedState = normalize(state);

    /* -----------------------------------------------------
         CITY MATCH
      ----------------------------------------------------- */

    const cityMatch = postOffices.some((office) => {
      const possibleCities = [
        normalize(office.Name),
        normalize(office.District),
        normalize(office.Division),
        normalize(office.Region),
      ].filter(Boolean);

      return possibleCities.some(
        (value) =>
          value === normalizedCity ||
          value.includes(normalizedCity) ||
          normalizedCity.includes(value),
      );
    });

    /* -----------------------------------------------------
         STATE MATCH
      ----------------------------------------------------- */

    const stateMatch = postOffices.some((office) => {
      const officeState = normalize(office.State);

      return (
        officeState === normalizedState ||
        officeState.includes(normalizedState) ||
        normalizedState.includes(officeState)
      );
    });

    /* -----------------------------------------------------
         CITY / STATE NOT MATCHED
      ----------------------------------------------------- */

    if (!cityMatch || !stateMatch) {
      return res.status(200).json({
        success: true,
        validAddress: false,
        serviceable: false,
        message:
          "Pincode is valid, but the entered city/state does not match this pincode.",
        pincode: pin,
      });
    }

    /* -----------------------------------------------------
         SERVICEABILITY — single source is the shipping
         service (Step 4). The shipping CHARGE itself is
         items-dependent and comes from /api/shipping/quote —
         this endpoint no longer returns a charge.
      ----------------------------------------------------- */

    const svc = shippingService.checkServiceable(pin);

    if (svc.code === "LIVE_NOT_CONFIGURED") {
      return res.status(502).json({
        success: false,
        code: "SHIPPING_QUOTE_FAILED",
        message: "Unable to check delivery right now. Please try again.",
      });
    }

    if (!svc.serviceable) {
      return res.status(200).json({
        success: true,
        validAddress: true,
        serviceable: false,
        code: svc.code || "UNSERVICEABLE_PINCODE",
        message:
          svc.message ||
          "Delivery is not available for this pincode. Please try another pincode or contact support.",
        pincode: pin,
      });
    }

    /* -----------------------------------------------------
         DELIVERY AVAILABLE
      ----------------------------------------------------- */

    return res.status(200).json({
      success: true,
      validAddress: true,
      serviceable: true,
      message: "Delivery is available at this address.",
      pincode: pin,
      city: String(city).trim(),
      state: String(state).trim(),
      postOffices: postOffices.map((office) => ({
        name: office.Name || "",
        district: office.District || "",
        state: office.State || "",
        division: office.Division || "",
        region: office.Region || "",
      })),
    });
  } catch (error) {
    console.error("CHECK DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      validAddress: false,
      serviceable: false,
      message: "Address verification failed. Please try again.",
    });
  }
});

/* =========================================================
   ADMIN � GET ALL USERS
   GET /api/admin/users
========================================================= */

app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [users] = await db.execute(
        `
        SELECT
          id,
          name,
          email,
          phone,
          address,
          photo,
          role,
          status,
          created_at
        FROM users
        ORDER BY id DESC
        `,
      );

      return res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("ADMIN GET USERS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while fetching users.",
      });
    }
  },
);

/* =========================================================
   ADMIN � UPDATE USER STATUS
   PUT /api/admin/users/:id/status
========================================================= */

app.put(
  "/api/admin/users/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["Active", "Blocked"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value.",
        });
      }

      const [result] = await db.execute(
        `
        UPDATE users
        SET status = ?
        WHERE id = ?
        `,
        [status, id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `User ${status === "Blocked" ? "blocked" : "unblocked"} successfully.`,
      });
    } catch (error) {
      console.error("ADMIN UPDATE USER STATUS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while updating user status.",
      });
    }
  },
);

/* =========================================================
   PRODUCTS
========================================================= */

async function ensureProductsTable() {
  await db.execute(`
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
      quantity_step INT NOT NULL DEFAULT 1,
      customizable TINYINT(1) NOT NULL DEFAULT 0,
      customization_type VARCHAR(50) DEFAULT NULL,
      weight_grams INT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  /* add missing column on the old table */
  try {
    await db.execute(
      "ALTER TABLE products ADD COLUMN quantity_step INT NOT NULL DEFAULT 1",
    );
  } catch {
    /* column already exists */
  }

  try {
    await db.execute(
      "ALTER TABLE products ADD COLUMN customizable TINYINT(1) NOT NULL DEFAULT 0",
    );
  } catch {
    /* column already exists */
  }

  try {
    await db.execute(
      "ALTER TABLE products ADD COLUMN customization_type VARCHAR(50) DEFAULT NULL",
    );
  } catch {
    /* column already exists */
  }

  /* shipping weight in grams — NULL means the product has
     no configured weight (Delhivery Step 3B) */
  try {
    await db.execute(
      "ALTER TABLE products ADD COLUMN weight_grams INT DEFAULT NULL",
    );
  } catch {
    /* column already exists */
  }
}

function parseProductList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* =====================================================
   CUSTOMIZATION PAYLOAD SANITIZATION
   Cart/Checkout se aaya designs object blindly trust nahi �
   har element ko validate/clamp karke store karte hain.
===================================================== */

const sanitizeColor = (value) => {
  const s = String(value || "").trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;

  if (
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/.test(
      s,
    )
  ) {
    return s;
  }

  return "#111827";
};

const clampNum = (n, min, max, fallback = 0) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};

const sanitizeDesignElement = (el) => {
  if (!el || typeof el !== "object") return null;

  const clean = {
    type: ["text", "image", "shape", "qr"].includes(el.type) ? el.type : "text",
    id: String(el.id || "").slice(0, 80),
    kind: typeof el.kind === "string" ? el.kind.slice(0, 40) : null,
    label: String(el.label || "").slice(0, 80),
    x: clampNum(el.x, -50, 150, 50),
    y: clampNum(el.y, -50, 150, 50),
    rotation: clampNum(el.rotation, -360, 360, 0),
    hidden: Boolean(el.hidden),
  };

  if (el.panel != null) {
    clean.panel = clampNum(el.panel, 0, 2, 0);
  }
  if (el.panelCount != null) {
    clean.panelCount = clampNum(el.panelCount, 2, 3, 3);
  }

  if (clean.type === "text") {
    clean.text = String(el.text || "").slice(0, 500);
    clean.fontSize = clampNum(el.fontSize, 4, 200, 16);
    clean.fontFamily = String(el.fontFamily || "").slice(0, 60);
    clean.color = sanitizeColor(el.color);
    clean.bold = Boolean(el.bold);
    clean.italic = Boolean(el.italic);
    clean.underline = Boolean(el.underline);
    clean.align = ["left", "center", "right"].includes(el.align)
      ? el.align
      : "center";
    clean.letterSpacing = clampNum(el.letterSpacing, -5, 30, 0);
    clean.opacity = clampNum(el.opacity, 0, 1, 1);
    if (el.width != null) clean.width = clampNum(el.width, 1, 100, 70);
    if (el.height != null) clean.height = clampNum(el.height, 1, 100, 10);
    if (el.lineHeight != null)
      clean.lineHeight = clampNum(el.lineHeight, 0.5, 3, 1.18);
  } else if (clean.type === "image") {
    clean.src =
      typeof el.src === "string" && el.src.length < 6000000 ? el.src : null;
    clean.width = clampNum(el.width, 1, 150, 20);
    clean.height = clampNum(el.height, 0, 150, 0);
    clean.opacity = clampNum(el.opacity, 0, 1, 1);
  } else if (clean.type === "qr") {
    clean.src =
      typeof el.src === "string" && el.src.length < 6000000 ? el.src : null;
    clean.width = clampNum(el.width, 1, 150, 20);
    clean.opacity = clampNum(el.opacity, 0, 1, 1);
  } else {
    clean.shape = String(el.shape || "rect").slice(0, 20);
    clean.color = sanitizeColor(el.color);
    clean.width = clampNum(el.width, 1, 150, 50);
    clean.height = clampNum(el.height, 0, 150, 10);
    clean.opacity = clampNum(el.opacity, 0, 1, 1);
  }

  return clean;
};

const sanitizeDesigns = (designs) => {
  if (!designs || typeof designs !== "object" || Array.isArray(designs)) {
    return null;
  }

  const clean = {};

  for (const [side, list] of Object.entries(designs)) {
    if (!Array.isArray(list)) continue;

    clean[String(side).slice(0, 30)] = list
      .slice(0, 60)
      .map(sanitizeDesignElement)
      .filter(Boolean);
  }

  return Object.keys(clean).length > 0 ? clean : null;
};

/* business/visiting card design � {background, gradient,
   backgroundImage, elements[]} shape; icon elements bhi */
const sanitizeCardElement = (el) => {
  if (!el || typeof el !== "object") return null;

  const type = ["text", "image", "shape", "icon"].includes(el.type)
    ? el.type
    : "text";

  const clean = {
    type,
    id: String(el.id || "").slice(0, 80),
    label: String(el.label || "").slice(0, 80),
    x: clampNum(el.x, -50, 150, 50),
    y: clampNum(el.y, -50, 150, 50),
    rotation: clampNum(el.rotation, -360, 360, 0),
    opacity: clampNum(el.opacity, 0, 1, 1),
    visible: el.visible !== false,
    color: sanitizeColor(el.color),
    width: clampNum(el.width, 1, 150, 30),
  };

  if (type === "text") {
    clean.text = String(el.text || "").slice(0, 500);
    clean.fontSize = clampNum(el.fontSize, 4, 200, 16);
    clean.fontFamily = String(el.fontFamily || "Inter").slice(0, 60);
    clean.fontWeight = clampNum(el.fontWeight, 100, 900, 500);
    clean.italic = Boolean(el.italic);
    clean.underline = Boolean(el.underline);
    clean.align = ["left", "center", "right"].includes(el.align)
      ? el.align
      : "left";
    clean.letterSpacing = clampNum(el.letterSpacing, -5, 30, 0);
    clean.lineHeight = clampNum(el.lineHeight, 0.5, 4, 1.2);
    if (el.preset) {
      clean.preset = String(el.preset).slice(0, 40);
    }
  } else if (type === "image") {
    clean.src =
      typeof el.src === "string" && el.src.length < 6000000 ? el.src : null;
    clean.name = String(el.name || "").slice(0, 80);
  } else if (type === "shape") {
    clean.shape = ["rectangle", "circle", "line"].includes(el.shape)
      ? el.shape
      : "rectangle";
  } else {
    /* icon */
    clean.icon = String(el.icon || "").slice(0, 40);
  }

  return clean;
};

const sanitizeCardDesign = (design) => {
  if (!design || typeof design !== "object" || Array.isArray(design)) {
    return null;
  }

  const elements = Array.isArray(design.elements)
    ? design.elements.slice(0, 60).map(sanitizeCardElement).filter(Boolean)
    : [];

  const gradient = String(design.gradient || "").slice(0, 300);

  return {
    background: sanitizeColor(design.background || "#ffffff"),
    gradient: /^(linear|radial|conic)-gradient/.test(gradient) ? gradient : "",
    backgroundImage: String(design.backgroundImage || "").slice(0, 400),
    elements,
  };
};

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || "",
    price: Number(row.price || 0),
    oldPrice: Number(row.old_price || row.price || 0),
    stock: Number(row.stock || 0),
    status: row.status || "Active",
    badge: row.badge || "",
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    discount: row.discount || "",
    description: row.description || "",
    images: parseProductList(row.images),
    paperTypes: parseProductList(row.paper_types),
    sizes: parseProductList(row.sizes),
    features: parseProductList(row.features),
    quantityStep: Math.max(1, Number(row.quantity_step || 1)),
    customizable: row.customizable === 1 || row.customizable === true,
    customizationType: row.customization_type || "",
    unit: row.unit || "Pieces",
    weightGrams:
      row.weight_grams !== null && row.weight_grams !== undefined
        ? Number(row.weight_grams)
        : null,
    maxQuantity:
      row.max_qty !== null && row.max_qty !== undefined
        ? Number(row.max_qty)
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required.",
    });
  }

  next();
}

function getProductPayload(body) {
  const images = Array.isArray(body.images)
    ? body.images
    : body.image
      ? [body.image]
      : [];

  /* stock: absent → null so updates can preserve the saved
     value; provided but invalid → stockError for callers to
     reject. Only non-negative integers are accepted. */
  let stock = null;
  let stockError = null;
  if (
    body.stock !== undefined &&
    body.stock !== null &&
    String(body.stock) !== ""
  ) {
    const n = Number(body.stock);
    if (!Number.isInteger(n) || n < 0) {
      stockError = "Stock must be a whole number of 0 or more.";
    } else {
      stock = n;
    }
  }

  /* weightGrams: supplied → must be a positive number;
     absent/empty → null (create) / preserve (update) —
     no weight is ever invented for existing products */
  let weightGrams = null;
  let weightError = null;
  let weightProvided = false;
  if (
    body.weightGrams !== undefined &&
    body.weightGrams !== null &&
    String(body.weightGrams).trim() !== ""
  ) {
    weightProvided = true;
    const w = Number(body.weightGrams);
    if (!Number.isFinite(w) || w <= 0) {
      weightError = "Weight must be a positive number (grams).";
    } else {
      weightGrams = Math.round(w);
    }
  }

  return {
    name: String(body.name || "").trim(),
    category: String(body.category || "General").trim(),
    subcategory: String(body.subcategory || "").trim() || null,
    price: Number(body.price || 0),
    oldPrice: Number(body.oldPrice ?? body.price ?? 0),
    stock,
    stockError,
    weightGrams,
    weightError,
    weightProvided,
    /* canonical product status is Active/Inactive — display labels
       like "In Stock" must never be stored in this column */
    status:
      String(body.status || "Active").trim() === "Inactive"
        ? "Inactive"
        : "Active",
    badge: String(body.badge || "").trim() || null,
    rating: Number(body.rating ?? 4.8),
    reviews: Math.max(0, Number(body.reviews ?? 0)),
    discount: String(body.discount || "").trim() || null,
    description: String(body.description || "").trim(),
    images,
    paperTypes: Array.isArray(body.paperTypes) ? body.paperTypes : [],
    sizes: Array.isArray(body.sizes) ? body.sizes : [],
    features: Array.isArray(body.features) ? body.features : [],
    quantityStep: Math.max(1, Math.floor(Number(body.quantityStep ?? 1)) || 1),
    customizable:
      body.customizable === true ||
      body.customizable === 1 ||
      body.isCustomizable === true ||
      body.isCustomizable === 1,
    customizationType:
      String(body.customizationType || body.customization_type || "").trim() ||
      null,
    unit: String(body.unit || "").trim() || null,
    maxQuantity:
      body.maxQuantity !== undefined &&
      body.maxQuantity !== null &&
      String(body.maxQuantity) !== ""
        ? Math.max(1, Math.floor(Number(body.maxQuantity)) || 0)
        : null,
  };
}

app.get("/api/products", async (req, res) => {
  try {
    await ensureTaxonomy();

    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const subcategory = String(req.query.subcategory || "").trim();
    const tag = String(req.query.tag || "").trim();

    /* optional admin check — only when a valid admin
       token is supplied may out-of-stock/inactive
       products be included (?includeAll=1) */
    let isAdmin = false;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        isAdmin = decoded?.role === "admin" || decoded?.user?.role === "admin";
      } catch {
        isAdmin = false;
      }
    }
    const includeAll = String(req.query.includeAll || "") === "1" && isAdmin;

    let sql = "SELECT * FROM products";
    const params = [];
    const where = [];

    /* customer-facing catalog: only active products
       with available stock are visible */
    if (!includeAll) {
      where.push("status = 'Active' AND stock > 0");
    }

    if (search) {
      where.push(`(
          name LIKE ?
          OR category LIKE ?
          OR subcategory LIKE ?
          OR description LIKE ?
          OR badge LIKE ?
          OR id IN (
            SELECT pt.product_id FROM product_tags pt
            JOIN tags t ON t.id = pt.tag_id
            WHERE t.name LIKE ?
          )
      )`);

      const keyword = `%${search}%`;

      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (category) {
      where.push("(category = ? OR category_id = ?)");
      params.push(category, Number(category) || -1);
    }

    if (subcategory) {
      where.push("(subcategory = ? OR subcategory_id = ?)");
      params.push(subcategory, Number(subcategory) || -1);
    }

    if (tag) {
      where.push(`id IN (
        SELECT pt.product_id FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id
        WHERE t.name = ? OR t.id = ?
      )`);
      params.push(tag, Number(tag) || -1);
    }

    /* dynamic attribute filter � ?attr_value=<id>[,<id>...]
       every selected value must match (AND) */
    const attrValueIds = String(req.query.attr_value || "")
      .split(",")
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);

    for (const vid of attrValueIds) {
      where.push(`id IN (
        SELECT pav.product_id FROM product_attribute_values pav
        WHERE pav.attribute_value_id = ?
      )`);
      params.push(vid);
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += " ORDER BY id DESC";

    const [rows] = await db.execute(sql, params);

    const productIds = rows.map((r) => r.id);
    const tagMap = await getTagsForProducts(productIds);
    const attrMap = await getAttributesForProducts(productIds);

    const products = rows.map((row) => {
      const tags = tagMap.get(row.id) || [];
      const p = mapProduct(row);

      /* catalog list ke liye sirf cover image kaafi hai —
         full gallery /api/products/:id se aati hai;
         isse list response bahut chhota rehta hai */
      if (Array.isArray(p.images) && p.images.length > 1) {
        p.images = [p.images[0]];
      }

      return {
        ...p,
        tags,
        tagIds: tags.map((t) => t.id),
        attributes: attrMap.get(row.id) || [],
      };
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load products.",
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    await ensureProductsTable();

    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id.",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    /* customer-facing: inactive or out-of-stock products
       are not viewable; admins (valid token) still see them */
    const row = rows[0];
    const purchasable = row.status === "Active" && Number(row.stock) > 0;

    if (!purchasable) {
      let isAdmin = false;
      const authHeader = req.headers.authorization || "";
      if (authHeader.startsWith("Bearer ")) {
        try {
          const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
          isAdmin =
            decoded?.role === "admin" || decoded?.user?.role === "admin";
        } catch {
          isAdmin = false;
        }
      }
      if (!isAdmin) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }
    }

    const tagMap = await getTagsForProducts([id]);
    const tags = tagMap.get(id) || [];
    const attrMap = await getAttributesForProducts([id]);

    return res.status(200).json({
      success: true,
      product: {
        ...mapProduct(rows[0]),
        tags,
        tagIds: tags.map((t) => t.id),
        attributes: attrMap.get(id) || [],
      },
    });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load product.",
    });
  }
});

/* =========================================================
   PRODUCT TEMPLATES � templates belong to ONE product.
   Public GET: Active templates only.
   Mutations: admin only (authenticateToken + requireAdmin).
========================================================= */

const { CARD_TEMPLATE_SEEDS } = require("./cardTemplateSeeds");

let cardTemplatesSeeded = false;

async function ensureProductTemplatesTable() {
  await ensureProductsTable();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_templates (
      id INT NOT NULL AUTO_INCREMENT,
      product_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      thumbnail TEXT DEFAULT NULL,
      design_data LONGTEXT DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pt_product (product_id),
      CONSTRAINT fk_pt_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* one-time migration: legacy hardcoded business-card
     templates -> DB, once per customizable product */
  if (cardTemplatesSeeded) return;
  cardTemplatesSeeded = true;

  try {
    /* non-card customizable products get their own
       product-appropriate template set */
    const { genericSeedsFor } = require("./genericTemplateSeeds");
    const [allCust] = await db.execute(
      `SELECT id, name, customization_type
       FROM products
       WHERE customizable = 1`,
    );

    for (const p of allCust) {
      const type = String(p.customization_type || "").toLowerCase();
      if (
        type === "business-card" ||
        /visiting card|business card/.test(p.name.toLowerCase())
      ) {
        continue; /* card seeds handle these below */
      }

      const [c] = await db.execute(
        "SELECT COUNT(*) AS n FROM product_templates WHERE product_id = ?",
        [p.id],
      );
      if (Number(c[0].n) > 0) continue;

      const seeds = genericSeedsFor({
        name: p.name,
        customizationType: p.customization_type,
      });

      for (const t of seeds) {
        await db.execute(
          `INSERT INTO product_templates
             (product_id, name, design_data, status, sort_order)
           VALUES (?, ?, ?, 'Active', ?)`,
          [p.id, t.name, JSON.stringify(t.design), t.sortOrder],
        );
      }
    }

    const [prods] = await db.execute(
      `SELECT id FROM products
       WHERE customizable = 1
         AND (customization_type = 'business-card'
              OR LOWER(name) LIKE '%visiting card%'
              OR LOWER(name) LIKE '%business card%')`,
    );

    for (const p of prods) {
      const [c] = await db.execute(
        "SELECT COUNT(*) AS n FROM product_templates WHERE product_id = ?",
        [p.id],
      );
      if (Number(c[0].n) > 0) continue;

      for (const t of CARD_TEMPLATE_SEEDS) {
        await db.execute(
          `INSERT INTO product_templates
             (product_id, name, design_data, status, sort_order)
           VALUES (?, ?, ?, 'Active', ?)`,
          [p.id, t.name, JSON.stringify(t.design), t.sortOrder],
        );
      }
    }
  } catch (e) {
    /* seed failure must never take the API down */
    cardTemplatesSeeded = false;
    console.error("TEMPLATE SEED ERROR:", e.message);
  }
}

const mapTemplate = (row) => {
  let design = null;
  try {
    design = row.design_data ? JSON.parse(row.design_data) : null;
  } catch {
    design = null;
  }

  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    thumbnail: row.thumbnail || null,
    status: row.status || "Active",
    sortOrder: Number(row.sort_order || 0),
    design,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/* sanitize one element of the generic (non-card) customizer
   format � text/shape/image/qr with kind/bold/hidden fields */
const sanitizeGenericElement = (el) => {
  if (!el || typeof el !== "object") return null;

  const type = ["text", "shape", "image", "qr"].includes(el.type)
    ? el.type
    : "text";

  const clean = {
    type,
    kind: String(el.kind || "custom").slice(0, 40),
    label: String(el.label || "").slice(0, 80),
    x: clampNum(el.x, -50, 150, 50),
    y: clampNum(el.y, -50, 150, 50),
    width: clampNum(el.width, 1, 150, 30),
    height: clampNum(el.height, 0, 200, 10),
    rotation: clampNum(el.rotation, -360, 360, 0),
    opacity: clampNum(el.opacity, 0, 1, 1),
    hidden: Boolean(el.hidden),
    color: sanitizeColor(el.color || "#172033"),
  };

  if (type === "text") {
    clean.text = String(el.text || "").slice(0, 500);
    clean.fontSize = clampNum(el.fontSize, 4, 200, 14);
    clean.fontFamily = String(el.fontFamily || "Poppins").slice(0, 60);
    clean.bold = Boolean(el.bold);
    clean.italic = Boolean(el.italic);
    clean.underline = Boolean(el.underline);
    clean.align = ["left", "center", "right"].includes(el.align)
      ? el.align
      : "center";
    clean.letterSpacing = clampNum(el.letterSpacing, -5, 30, 0);
  } else if (type === "image") {
    clean.src =
      typeof el.src === "string" && el.src.length < 6000000 ? el.src : null;
    clean.name = String(el.name || "").slice(0, 80);
  } else if (type === "shape") {
    clean.shape = ["rect", "rectangle", "circle", "line"].includes(el.shape)
      ? el.shape
      : "rect";
  } else if (type === "qr") {
    clean.src =
      typeof el.src === "string" && el.src.length < 6000000 ? el.src : null;
  }

  return clean;
};

const sanitizeGenericSide = (els) => {
  if (!Array.isArray(els)) return [];
  return els.slice(0, 80).map(sanitizeGenericElement).filter(Boolean);
};

/* sanitize a template payload � supports BOTH formats:
   card engine: {frontDesign:{...}, backDesign:{...}}
   generic engine: {front:[elements], back:[elements]}   */
const sanitizeTemplateDesign = (design) => {
  if (!design || typeof design !== "object") return null;

  /* business-card format */
  if (design.frontDesign || design.backDesign) {
    const front = sanitizeCardDesign(design.frontDesign);
    const back = sanitizeCardDesign(design.backDesign);
    if (!front && !back) return null;
    return { frontDesign: front, backDesign: back };
  }

  /* generic customizer format */
  if (Array.isArray(design.front) || Array.isArray(design.back)) {
    return {
      front: sanitizeGenericSide(design.front),
      back: sanitizeGenericSide(design.back),
    };
  }

  return null;
};

/* PUBLIC � active templates for one product.
   Admins (valid token) also get inactive ones. */
app.get("/api/products/:id/templates", async (req, res) => {
  try {
    await ensureProductTemplatesTable();

    const productId = Number(req.params.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id." });
    }

    /* optional admin check � only when a token is present */
    let isAdmin = false;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        isAdmin = decoded?.role === "admin" || decoded?.user?.role === "admin";
      } catch {
        isAdmin = false;
      }
    }

    const [rows] = await db.execute(
      `SELECT * FROM product_templates
       WHERE product_id = ?
       ${isAdmin ? "" : "AND status = 'Active'"}
       ORDER BY sort_order ASC, id ASC`,
      [productId],
    );

    return res.status(200).json({
      success: true,
      templates: rows.map(mapTemplate),
    });
  } catch (error) {
    console.error("GET TEMPLATES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load templates.",
    });
  }
});

/* ADMIN � create template for a specific product */
app.post(
  "/api/products/:id/templates",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureProductTemplatesTable();

      const productId = Number(req.params.id);
      if (!Number.isFinite(productId) || productId <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product id." });
      }

      /* product must exist */
      const [prod] = await db.execute(
        "SELECT id FROM products WHERE id = ? LIMIT 1",
        [productId],
      );
      if (prod.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      const name = String(req.body.name || "")
        .trim()
        .slice(0, 100);
      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "Template name required." });
      }

      const design = sanitizeTemplateDesign(req.body.design);
      const status = req.body.status === "Inactive" ? "Inactive" : "Active";
      const sortOrder = clampNum(req.body.sortOrder, 0, 9999, 0);

      const [result] = await db.execute(
        `INSERT INTO product_templates
           (product_id, name, thumbnail, design_data, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          name,
          String(req.body.thumbnail || "").slice(0, 6000000) || null,
          design ? JSON.stringify(design) : null,
          status,
          sortOrder,
        ],
      );

      const [rows] = await db.execute(
        "SELECT * FROM product_templates WHERE id = ?",
        [result.insertId],
      );

      return res.status(201).json({
        success: true,
        message: "Template created.",
        template: mapTemplate(rows[0]),
      });
    } catch (error) {
      console.error("CREATE TEMPLATE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to create template.",
      });
    }
  },
);

/* ADMIN � update a template (name/status/sortOrder/design) */
app.put(
  "/api/products/:id/templates/:templateId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureProductTemplatesTable();

      const productId = Number(req.params.id);
      const templateId = Number(req.params.templateId);
      if (!Number.isFinite(productId) || !Number.isFinite(templateId)) {
        return res.status(400).json({ success: false, message: "Invalid id." });
      }

      /* template must belong to THIS product � no cross-product edits */
      const [existing] = await db.execute(
        `SELECT * FROM product_templates
         WHERE id = ? AND product_id = ? LIMIT 1`,
        [templateId, productId],
      );
      if (existing.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found." });
      }

      const row = existing[0];
      const name =
        req.body.name !== undefined
          ? String(req.body.name).trim().slice(0, 100)
          : row.name;
      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "Template name required." });
      }

      const status =
        req.body.status !== undefined
          ? req.body.status === "Inactive"
            ? "Inactive"
            : "Active"
          : row.status;

      const sortOrder =
        req.body.sortOrder !== undefined
          ? clampNum(req.body.sortOrder, 0, 9999, row.sort_order)
          : row.sort_order;

      const design =
        req.body.design !== undefined
          ? sanitizeTemplateDesign(req.body.design)
          : null;

      /* optional: template ko doosre product pe move karo */
      let newProductId = productId;
      if (req.body.productId !== undefined) {
        const candidate = Number(req.body.productId);
        if (!Number.isFinite(candidate) || candidate <= 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid product id.",
          });
        }
        const [prod] = await db.execute(
          "SELECT id FROM products WHERE id = ? LIMIT 1",
          [candidate],
        );
        if (prod.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Target product not found.",
          });
        }
        newProductId = candidate;
      }

      await db.execute(
        `UPDATE product_templates
         SET name = ?, status = ?, sort_order = ?,
             thumbnail = ?, design_data = COALESCE(?, design_data),
             product_id = ?
         WHERE id = ?`,
        [
          name,
          status,
          sortOrder,
          req.body.thumbnail !== undefined
            ? String(req.body.thumbnail || "").slice(0, 6000000) || null
            : row.thumbnail,
          design ? JSON.stringify(design) : null,
          newProductId,
          templateId,
        ],
      );

      const [rows] = await db.execute(
        "SELECT * FROM product_templates WHERE id = ?",
        [templateId],
      );

      return res.status(200).json({
        success: true,
        message: "Template updated.",
        template: mapTemplate(rows[0]),
      });
    } catch (error) {
      console.error("UPDATE TEMPLATE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update template.",
      });
    }
  },
);

/* ADMIN � saare templates grouped by product.
   Admin Templates page ke liye ek hi call. */
app.get(
  "/api/admin/templates",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureProductTemplatesTable();

      const [rows] = await db.execute(
        `SELECT t.*, p.name AS product_name,
                p.customization_type AS product_type,
                p.customizable AS product_customizable
         FROM product_templates t
         JOIN products p ON p.id = t.product_id
         ORDER BY p.name ASC, t.sort_order ASC, t.id ASC`,
      );

      const grouped = new Map();
      for (const row of rows) {
        const pid = row.product_id;
        if (!grouped.has(pid)) {
          grouped.set(pid, {
            productId: pid,
            productName: row.product_name,
            productType: row.product_type || "",
            customizable: Number(row.product_customizable || 0),
            templates: [],
          });
        }
        grouped.get(pid).templates.push(mapTemplate(row));
      }

      return res.status(200).json({
        success: true,
        groups: Array.from(grouped.values()),
      });
    } catch (error) {
      console.error("ADMIN TEMPLATES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load templates.",
      });
    }
  },
);

/* ADMIN � delete a template belonging to the product */
app.delete(
  "/api/products/:id/templates/:templateId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureProductTemplatesTable();

      const productId = Number(req.params.id);
      const templateId = Number(req.params.templateId);

      const [result] = await db.execute(
        `DELETE FROM product_templates
         WHERE id = ? AND product_id = ?`,
        [templateId, productId],
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Template not found." });
      }

      return res.status(200).json({
        success: true,
        message: "Template deleted.",
      });
    } catch (error) {
      console.error("DELETE TEMPLATE ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete template.",
      });
    }
  },
);

app.post(
  "/api/products/import",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const products = Array.isArray(req.body.products) ? req.body.products : [];

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required for import.",
      });
    }

    const connection = await db.getConnection();

    try {
      await ensureProductsTable();
      const [countRows] = await connection.execute(
        "SELECT COUNT(*) AS total FROM products",
      );

      if (Number(countRows[0].total) > 0) {
        return res.status(409).json({
          success: false,
          message: "Products already exist in the database.",
        });
      }

      await connection.beginTransaction();

      for (const item of products) {
        const product = getProductPayload(item);

        if (!product.name || product.price <= 0 || product.stockError) {
          continue;
        }

        await connection.execute(
          `INSERT INTO products
            (name, category, subcategory, price, old_price, stock, status,
             badge, rating, reviews, discount, description, images,
             paper_types, sizes, features, quantity_step,
             customizable, customization_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.name,
            product.category,
            product.subcategory,
            product.price,
            product.oldPrice,
            product.stock ?? 0,
            product.status,
            product.badge,
            product.rating,
            product.reviews,
            product.discount,
            product.description,
            JSON.stringify(product.images),
            JSON.stringify(product.paperTypes),
            JSON.stringify(product.sizes),
            JSON.stringify(product.features),
            product.quantityStep,
            product.customizable ? 1 : 0,
            product.customizationType,
          ],
        );
      }

      await connection.commit();
      const [rows] = await connection.execute(
        "SELECT * FROM products ORDER BY id DESC",
      );

      return res.status(201).json({
        success: true,
        message: "Products imported successfully.",
        products: rows.map(mapProduct),
      });
    } catch (error) {
      await connection.rollback();
      console.error("IMPORT PRODUCTS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to import products.",
      });
    } finally {
      connection.release();
    }
  },
);

app.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureTaxonomy();
    const product = getProductPayload(req.body);

    if (!product.name || product.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product name and a valid price are required.",
      });
    }

    if (product.stockError) {
      return res.status(400).json({
        success: false,
        message: product.stockError,
      });
    }

    if (product.weightError) {
      return res.status(400).json({
        success: false,
        message: product.weightError,
      });
    }

    /* categoryId/subcategoryId diya ho to naam wahi se resolve;
         otherwise resolve the id by name */
    const categoryRow = await resolveCategoryId(req.body);
    const subcategoryRow = await resolveSubcategoryId(
      req.body,
      categoryRow?.id,
    );

    if (categoryRow) {
      product.category = categoryRow.name;
    }
    if (subcategoryRow) {
      product.subcategory = subcategoryRow.name;
    }

    const [result] = await db.execute(
      `INSERT INTO products
          (name, category, subcategory, category_id, subcategory_id,
           price, old_price, stock, status,
           badge, rating, reviews, discount, description, images,
           paper_types, sizes, features, quantity_step,
           customizable, customization_type, unit, max_qty, weight_grams)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.name,
        product.category,
        product.subcategory,
        categoryRow?.id || null,
        subcategoryRow?.id || null,
        product.price,
        product.oldPrice,
        product.stock ?? 0,
        product.status,
        product.badge,
        product.rating,
        product.reviews,
        product.discount,
        product.description,
        JSON.stringify(product.images),
        JSON.stringify(product.paperTypes),
        JSON.stringify(product.sizes),
        JSON.stringify(product.features),
        product.quantityStep,
        product.customizable ? 1 : 0,
        product.customizationType,
        product.unit || "Pieces",
        product.maxQuantity,
        product.weightGrams,
      ],
    );

    if (Array.isArray(req.body?.tagIds)) {
      await syncProductTags(result.insertId, req.body.tagIds);
    }

    if (
      Array.isArray(req.body?.attributeValues) ||
      Array.isArray(req.body?.attributeTexts)
    ) {
      await syncProductAttributes(
        result.insertId,
        req.body.attributeValues,
        req.body.attributeTexts,
      );
    }

    const [rows] = await db.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [result.insertId],
    );

    const tagMap = await getTagsForProducts([result.insertId]);
    const tags = tagMap.get(result.insertId) || [];
    const attrMap = await getAttributesForProducts([result.insertId]);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product: {
        ...mapProduct(rows[0]),
        tags,
        tagIds: tags.map((t) => t.id),
        attributes: attrMap.get(result.insertId) || [],
      },
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create product.",
    });
  }
});

app.put(
  "/api/products/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureTaxonomy();
      const product = getProductPayload(req.body);

      if (!product.name || product.price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Product name and a valid price are required.",
        });
      }

      if (product.stockError) {
        return res.status(400).json({
          success: false,
          message: product.stockError,
        });
      }

      if (product.weightError) {
        return res.status(400).json({
          success: false,
          message: product.weightError,
        });
      }

      const categoryRow = await resolveCategoryId(req.body);
      const subcategoryRow = await resolveSubcategoryId(
        req.body,
        categoryRow?.id,
      );

      if (categoryRow) {
        product.category = categoryRow.name;
      }
      if (subcategoryRow) {
        product.subcategory = subcategoryRow.name;
      }

      const [result] = await db.execute(
        `UPDATE products SET
          name = ?, category = ?, subcategory = ?,
          category_id = ?, subcategory_id = ?,
          price = ?, old_price = ?,
          stock = COALESCE(?, stock), status = ?, badge = ?, rating = ?, reviews = ?,
          discount = ?, description = ?, images = ?, paper_types = ?,
          sizes = ?, features = ?, quantity_step = ?,
          customizable = ?, customization_type = ?, unit = COALESCE(?, unit), max_qty = ?,
          weight_grams = COALESCE(?, weight_grams)
         WHERE id = ?`,
        [
          product.name,
          product.category,
          product.subcategory,
          categoryRow?.id || null,
          subcategoryRow?.id || null,
          product.price,
          product.oldPrice,
          product.stock,
          product.status,
          product.badge,
          product.rating,
          product.reviews,
          product.discount,
          product.description,
          JSON.stringify(product.images),
          JSON.stringify(product.paperTypes),
          JSON.stringify(product.sizes),
          JSON.stringify(product.features),
          product.quantityStep,
          product.customizable ? 1 : 0,
          product.customizationType,
          product.unit,
          product.maxQuantity,
          /* supplied → validated value; absent → NULL so
             COALESCE preserves the saved weight */
          product.weightProvided ? product.weightGrams : null,
          req.params.id,
        ],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      if (Array.isArray(req.body?.tagIds)) {
        await syncProductTags(Number(req.params.id), req.body.tagIds);
      }

      if (
        Array.isArray(req.body?.attributeValues) ||
        Array.isArray(req.body?.attributeTexts)
      ) {
        await syncProductAttributes(
          Number(req.params.id),
          req.body.attributeValues,
          req.body.attributeTexts,
        );
      }

      const [rows] = await db.execute(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [req.params.id],
      );

      const tagMap = await getTagsForProducts([Number(req.params.id)]);
      const tags = tagMap.get(Number(req.params.id)) || [];
      const attrMap = await getAttributesForProducts([Number(req.params.id)]);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully.",
        product: {
          ...mapProduct(rows[0]),
          tags,
          tagIds: tags.map((t) => t.id),
          attributes: attrMap.get(Number(req.params.id)) || [],
        },
      });
    } catch (error) {
      console.error("UPDATE PRODUCT ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update product.",
      });
    }
  },
);

app.delete(
  "/api/products/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureTaxonomy();
      await db.execute("DELETE FROM product_tags WHERE product_id = ?", [
        req.params.id,
      ]);
      await db.execute(
        "DELETE FROM product_attribute_values WHERE product_id = ?",
        [req.params.id],
      );
      const [result] = await db.execute("DELETE FROM products WHERE id = ?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
      });
    } catch (error) {
      console.error("DELETE PRODUCT ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete product.",
      });
    }
  },
);

/* =========================================================
   FEEDBACK
========================================================= */

async function ensureFeedbackTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      subject VARCHAR(255) DEFAULT NULL,
      message TEXT NOT NULL,
      type ENUM('contact','review','complaint') DEFAULT 'contact',
      product_id INT DEFAULT NULL,
      rating INT DEFAULT NULL,
      status ENUM('Pending','Reviewed','Resolved') DEFAULT 'Pending',
      admin_reply TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

app.post("/api/feedback", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      type,
      product_id: productId,
      rating,
    } = req.body;
    const feedbackName = String(name || "").trim();
    const feedbackMessage = String(message || "").trim();

    if (feedbackName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters.",
      });
    }

    if (feedbackMessage.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 5 characters.",
      });
    }

    const feedbackType = ["contact", "review", "complaint"].includes(type)
      ? type
      : "contact";
    const feedbackRating = rating
      ? Math.max(1, Math.min(5, Number(rating)))
      : null;
    const productIdValue = productId ? Number(productId) : null;

    await ensureFeedbackTable();
    const [result] = await db.execute(
      `INSERT INTO feedback
        (name, email, phone, subject, message, type, product_id, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedbackName,
        email ? String(email).trim() : null,
        phone ? String(phone).trim() : null,
        subject ? String(subject).trim() : null,
        feedbackMessage,
        feedbackType,
        productIdValue,
        feedbackRating,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      feedbackId: result.insertId,
    });
  } catch (error) {
    console.error("POST FEEDBACK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit feedback.",
    });
  }
});

app.get(
  "/api/admin/feedback",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureFeedbackTable();
      const [rows] = await db.execute(
        "SELECT * FROM feedback ORDER BY id DESC",
      );

      return res.status(200).json({
        success: true,
        feedback: rows,
      });
    } catch (error) {
      console.error("GET ADMIN FEEDBACK ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load feedback.",
      });
    }
  },
);

app.put(
  "/api/admin/feedback/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status, adminReply, name, subject, rating, message } = req.body;
      const updates = [];
      const values = [];

      if (status !== undefined) {
        const normalizedStatus = String(status).trim();

        if (!["Pending", "Reviewed", "Resolved"].includes(normalizedStatus)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status. Allowed: Pending, Reviewed, Resolved.",
          });
        }

        updates.push("status = ?");
        values.push(normalizedStatus);
      }

      if (adminReply !== undefined) {
        updates.push("admin_reply = ?");
        values.push(String(adminReply).trim());
      }

      if (name !== undefined) {
        updates.push("name = ?");
        values.push(String(name).trim());
      }

      if (subject !== undefined) {
        updates.push("subject = ?");
        values.push(String(subject).trim());
      }

      if (rating !== undefined) {
        updates.push("rating = ?");
        values.push(Math.min(5, Math.max(1, Number(rating) || 5)));
      }

      if (message !== undefined) {
        updates.push("message = ?");
        values.push(String(message).trim());
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields provided to update.",
        });
      }

      await ensureFeedbackTable();
      values.push(req.params.id);
      const [result] = await db.execute(
        `UPDATE feedback SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Feedback not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Feedback updated successfully.",
      });
    } catch (error) {
      console.error("UPDATE FEEDBACK ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update feedback.",
      });
    }
  },
);

app.delete(
  "/api/admin/feedback/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureFeedbackTable();
      const [result] = await db.execute("DELETE FROM feedback WHERE id = ?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Feedback not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Feedback deleted successfully.",
      });
    } catch (error) {
      console.error("DELETE FEEDBACK ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete feedback.",
      });
    }
  },
);

/* =========================================================
   ADMIN NOTIFICATIONS
   Events are DERIVED from orders + contact_inquiries
   (no duplication). Only the per-admin READ state is
   persisted � survives refresh/logout, scoped per admin.
========================================================= */

async function ensureNotificationReadsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_notification_reads (
      id INT NOT NULL AUTO_INCREMENT,
      admin_id INT NOT NULL,
      notif_key VARCHAR(100) NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      hidden TINYINT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_admin_notif (admin_id, notif_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  try {
    await db.execute(
      `ALTER TABLE admin_notification_reads
       ADD COLUMN hidden TINYINT NOT NULL DEFAULT 0`,
    );
  } catch {
    /* column already exists */
  }
}

const buildAdminNotifications = async (adminId) => {
  const [orders] = await db.execute(
    `SELECT order_id, customer_name, total, status,
            payment_status, created_at
     FROM orders ORDER BY created_at DESC LIMIT 60`,
  );

  const [inquiries] = await db.execute(
    `SELECT id, name, product_name, message, status,
            created_at
     FROM contact_inquiries
     ORDER BY created_at DESC LIMIT 40`,
  );

  const [reads] = await db.execute(
    `SELECT notif_key, hidden FROM admin_notification_reads
     WHERE admin_id = ?`,
    [adminId],
  );
  const readSet = new Set(
    reads.filter((r) => !r.hidden).map((r) => r.notif_key),
  );
  const hiddenSet = new Set(
    reads.filter((r) => r.hidden).map((r) => r.notif_key),
  );

  const notifications = [
    ...orders.map((o) => ({
      key: `order-${o.order_id}`,
      type: "order",
      title: "New order received",
      text: `${o.customer_name || "Customer"} placed order ${o.order_id}.`,
      time: o.created_at,
      link: "/admin/orders",
      orderNumber: o.order_id,
      total: o.total,
      status: o.status,
      read: readSet.has(`order-${o.order_id}`),
    })),
    ...inquiries.map((i) => ({
      key: `inquiry-${i.id}`,
      type: "inquiry",
      title: "New inquiry",
      text: `${i.name || "Customer"}: ${String(
        i.product_name || i.message || "",
      ).slice(0, 90)}`,
      time: i.created_at,
      link: "/admin/inquiries",
      read: readSet.has(`inquiry-${i.id}`),
    })),
  ]
    .filter((n) => !hiddenSet.has(n.key))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
};

/* ADMIN � full notification feed */
app.get(
  "/api/admin/notifications",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureOrdersTable();
      await ensureContactInquiriesTable();
      await ensureNotificationReadsTable();

      const data = await buildAdminNotifications(req.user.id);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      console.error("Notifications error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load notifications.",
      });
    }
  },
);

/* ADMIN � mark one notification read */
app.post(
  "/api/admin/notifications/read",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const key = String(req.body?.key || "").slice(0, 100);
      if (!/^(order|inquiry)-.{1,80}$/.test(key)) {
        return res.status(400).json({
          success: false,
          message: "Valid notification key required.",
        });
      }

      await ensureNotificationReadsTable();
      await db.execute(
        `INSERT IGNORE INTO admin_notification_reads
         (admin_id, notif_key) VALUES (?, ?)`,
        [req.user.id, key],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Mark read error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update notification.",
      });
    }
  },
);

/* ADMIN � mark all read (keys supplied so we don't
   create phantom rows for nonexistent events) */
app.post(
  "/api/admin/notifications/read-all",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const keys = Array.isArray(req.body?.keys)
        ? req.body.keys
            .filter(
              (k) =>
                typeof k === "string" && /^(order|inquiry)-.{1,80}$/.test(k),
            )
            .slice(0, 200)
        : [];

      await ensureNotificationReadsTable();
      if (keys.length) {
        await db.query(
          `INSERT IGNORE INTO admin_notification_reads
           (admin_id, notif_key) VALUES ?`,
          [keys.map((k) => [req.user.id, k])],
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update notifications.",
      });
    }
  },
);

/* ADMIN � dismiss ONE notification (hides from this
   admin's feed; order/inquiry itself untouched) */
app.post(
  "/api/admin/notifications/dismiss",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const key = String(req.body?.key || "").slice(0, 100);
      if (!/^(order|inquiry)-.{1,80}$/.test(key)) {
        return res.status(400).json({
          success: false,
          message: "Valid notification key required.",
        });
      }

      await ensureNotificationReadsTable();
      await db.execute(
        `INSERT INTO admin_notification_reads
         (admin_id, notif_key, hidden) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE hidden = 1`,
        [req.user.id, key],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Dismiss notif error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete notification.",
      });
    }
  },
);

/* ADMIN � clear all notifications for this admin */
app.post(
  "/api/admin/notifications/clear",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const keys = Array.isArray(req.body?.keys)
        ? req.body.keys
            .filter(
              (k) =>
                typeof k === "string" && /^(order|inquiry)-.{1,80}$/.test(k),
            )
            .slice(0, 200)
        : [];

      await ensureNotificationReadsTable();
      if (keys.length) {
        await db.query(
          `INSERT INTO admin_notification_reads
           (admin_id, notif_key, hidden) VALUES ?
           ON DUPLICATE KEY UPDATE hidden = 1`,
          [keys.map((k) => [req.user.id, k, 1])],
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Clear notifs error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to clear notifications.",
      });
    }
  },
);

/* =========================================================
   CATEGORIES
========================================================= */

const DEFAULT_CATEGORIES = [
  {
    name: "Visiting Cards",
    items: [
      "Premium Business Cards",
      "Standard Cards",
      "Matte Cards",
      "Glossy Cards",
    ],
  },
  {
    name: "Stationery & Office",
    items: ["Letterheads", "Notebooks", "Envelopes", "Office Files", "Stamps"],
  },
  {
    name: "Marketing Materials",
    items: ["Flyers", "Brochures", "Posters", "Leaflets", "Calendars"],
  },
  {
    name: "Stickers & Labels",
    items: [
      "Product Labels",
      "Vinyl Stickers",
      "Round Stickers",
      "Packaging Labels",
    ],
  },
  {
    name: "Packaging",
    items: ["Paper Bags", "Boxes", "Food Packaging", "Product Packaging"],
  },
  {
    name: "Clothing & Bags",
    items: ["T-Shirts", "Caps", "Tote Bags", "Corporate Bags"],
  },
  {
    name: "Mugs & Gifts",
    items: ["Coffee Mugs", "Photo Mugs", "Keychains", "Corporate Gifts"],
  },
  {
    name: "Pens & Drinkware",
    items: ["Ball Pens", "Premium Pens", "Water Bottles", "Travel Mugs"],
  },
  {
    name: "Custom Polo T-Shirts",
    items: ["Corporate Polo", "Printed Polo", "Custom T-Shirts"],
  },
];

async function ensureCategoriesTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      items TEXT DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY category_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  const [rows] = await db.execute("SELECT COUNT(*) AS count FROM categories");

  if (rows[0].count === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      await db.execute(
        "INSERT INTO categories (name, items, sort_order) VALUES (?, ?, ?)",
        [cat.name, JSON.stringify(cat.items), i],
      );
    }
    console.log("Default categories seeded");
  }

  const addColumn = async (sql) => {
    try {
      await db.execute(sql);
    } catch {
      /* column already exists � skip */
    }
  };

  await addColumn(
    "ALTER TABLE categories ADD COLUMN slug VARCHAR(190) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE categories ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'",
  );
  await addColumn(
    "ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  );
}

/* =========================================================
   TAXONOMY � subcategories + tags + product_tags
   Relational store; categories.items JSON se migrate hota hai
========================================================= */

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

async function ensureTaxonomyTables() {
  const addColumn = async (sql) => {
    try {
      await db.execute(sql);
    } catch {
      /* column already exists � skip */
    }
  };

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id INT NOT NULL AUTO_INCREMENT,
      category_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(190) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY sub_cat_name (category_id, name),
      KEY category_id (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY tag_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_tags (
      product_id INT NOT NULL,
      tag_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, tag_id),
      KEY tag_id (tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  /* ---------- dynamic product attributes ---------- */

  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_attributes (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(140) DEFAULT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'select',
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY attr_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS attribute_values (
      id INT NOT NULL AUTO_INCREMENT,
      attribute_id INT NOT NULL,
      value VARCHAR(150) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY attr_value (attribute_id, value),
      KEY attribute_id (attribute_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  /* value_id=0 -> text/number/boolean attribute ka text_value store */
  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_attribute_values (
      product_id INT NOT NULL,
      attribute_id INT NOT NULL,
      attribute_value_id INT NOT NULL DEFAULT 0,
      text_value VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, attribute_id, attribute_value_id),
      KEY attribute_id (attribute_id),
      KEY attribute_value_id (attribute_value_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  /* attribute's category/subcategory relevance �
     no row -> attribute applies to all products.
     0 = wildcard (category-only scope) */
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attribute_scopes (
      attribute_id INT NOT NULL,
      category_id INT NOT NULL DEFAULT 0,
      subcategory_id INT NOT NULL DEFAULT 0,
      PRIMARY KEY (attribute_id, category_id, subcategory_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await addColumn(
    "ALTER TABLE products ADD COLUMN category_id INT DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE products ADD COLUMN subcategory_id INT DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE products ADD COLUMN unit VARCHAR(30) DEFAULT NULL",
  );
  await addColumn("ALTER TABLE products ADD COLUMN max_qty INT DEFAULT NULL");
}

/* Ek baar per process � idempotent data migration */
async function migrateTaxonomyOnce() {
  /* 1. categories.items JSON -> subcategories rows */
  const [cats] = await db.execute(
    "SELECT id, name, items, slug FROM categories",
  );

  for (const cat of cats) {
    if (!cat.slug) {
      await db.execute("UPDATE categories SET slug = ? WHERE id = ?", [
        slugify(cat.name),
        cat.id,
      ]);
    }

    let items = [];
    try {
      items = JSON.parse(cat.items || "[]");
    } catch {
      items = [];
    }

    for (let i = 0; i < items.length; i++) {
      const itemName = String(items[i] || "").trim();
      if (!itemName) continue;

      await db.execute(
        `INSERT INTO subcategories (category_id, name, slug, sort_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE slug = VALUES(slug)`,
        [cat.id, itemName, slugify(itemName), i],
      );
    }
  }

  /* 2. products.category/subcategory strings -> FK ids */
  const [products] = await db.execute(
    "SELECT id, category, subcategory, badge, customizable FROM products",
  );

  const [catRows] = await db.execute("SELECT id, name FROM categories");
  const catByName = new Map(
    catRows.map((c) => [String(c.name).toLowerCase(), c.id]),
  );

  const [subRows] = await db.execute(
    "SELECT id, category_id, name FROM subcategories",
  );
  const subByCatName = new Map(
    subRows.map((s) => [
      `${s.category_id}::${String(s.name).toLowerCase()}`,
      s.id,
    ]),
  );

  for (const p of products) {
    const categoryId =
      catByName.get(String(p.category || "").toLowerCase()) || null;

    let subcategoryId = null;

    if (categoryId && p.subcategory) {
      const subName = String(p.subcategory).trim();
      const key = `${categoryId}::${subName.toLowerCase()}`;

      if (!subByCatName.has(key)) {
        const [ins] = await db.execute(
          `INSERT INTO subcategories (category_id, name, slug)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [categoryId, subName, slugify(subName)],
        );
        subByCatName.set(key, ins.insertId);
      }

      subcategoryId = subByCatName.get(key);
    }

    if (categoryId || subcategoryId) {
      await db.execute(
        `UPDATE products
         SET category_id = COALESCE(?, category_id),
             subcategory_id = COALESCE(?, subcategory_id)
         WHERE id = ?`,
        [categoryId, subcategoryId, p.id],
      );
    }
  }

  /* 3. badges + customizable -> tags (seed, idempotent) */
  const tagNames = new Set();

  products.forEach((p) => {
    const badge = String(p.badge || "").trim();
    if (badge) tagNames.add(badge);
    if (p.customizable) tagNames.add("Customizable");
  });

  const tagIdByName = new Map();

  for (const name of tagNames) {
    const [ins] = await db.execute(
      `INSERT INTO tags (name, slug)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [name, slugify(name)],
    );
    tagIdByName.set(name, ins.insertId);
  }

  for (const p of products) {
    const wanted = [];

    const badge = String(p.badge || "").trim();
    if (badge && tagIdByName.has(badge)) {
      wanted.push(tagIdByName.get(badge));
    }

    if (p.customizable && tagIdByName.has("Customizable")) {
      wanted.push(tagIdByName.get("Customizable"));
    }

    for (const tagId of wanted) {
      await db.execute(
        `INSERT IGNORE INTO product_tags (product_id, tag_id)
         VALUES (?, ?)`,
        [p.id, tagId],
      );
    }
  }
}

/* =========================================================
   ATTRIBUTE MIGRATION � rigid sizes/paper_types ->
   dynamic attributes + seeded attribute library
========================================================= */

const ATTR_SEEDS = [
  {
    name: "Material",
    type: "select",
    values: [
      "Cotton",
      "Polyester",
      "Metal",
      "Plastic",
      "Stainless Steel",
      "Ceramic",
      "Kraft Paper",
    ],
    scopeCategories: [
      "Clothing & Bags",
      "Pens & Drinkware",
      "Mugs & Gifts",
      "Custom Polo T-Shirts",
      "Packaging",
    ],
  },
  {
    name: "Capacity",
    type: "select",
    values: ["500 ml", "750 ml", "1 Litre", "11 oz", "15 oz"],
    scopeCategories: ["Pens & Drinkware", "Mugs & Gifts"],
  },
  {
    name: "Finish",
    type: "select",
    values: ["Matte", "Glossy", "Velvet", "Textured"],
    scopeCategories: [
      "Visiting Cards",
      "Marketing Materials",
      "Stationery & Office",
    ],
  },
  {
    name: "Print Area",
    type: "select",
    values: ["Front Only", "Back Only", "Full Wrap", "Center"],
    scopeCategories: [
      "Mugs & Gifts",
      "Clothing & Bags",
      "Custom Polo T-Shirts",
    ],
  },
];

async function upsertAttribute(name, type) {
  const [rows] = await db.execute(
    `INSERT INTO product_attributes (name, slug, type)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [name, slugify(name), type],
  );
  return rows.insertId;
}

async function upsertAttributeValue(attributeId, value, order = 0) {
  const [rows] = await db.execute(
    `INSERT INTO attribute_values (attribute_id, value, sort_order)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [attributeId, value, order],
  );
  return rows.insertId;
}

async function migrateAttributesOnce() {
  /* 1. seed attribute library + scopes */
  const [cats] = await db.execute("SELECT id, name FROM categories");
  const catIdByName = new Map(
    cats.map((c) => [String(c.name).toLowerCase(), c.id]),
  );

  for (const seed of ATTR_SEEDS) {
    const attrId = await upsertAttribute(seed.name, seed.type);

    for (let i = 0; i < seed.values.length; i++) {
      await upsertAttributeValue(attrId, seed.values[i], i);
    }

    /* add scopes (existing scopes untouched) */
    const [existingScopes] = await db.execute(
      `SELECT COUNT(*) AS c FROM attribute_scopes
       WHERE attribute_id = ?`,
      [attrId],
    );

    if (Number(existingScopes[0].c) === 0) {
      for (const catName of seed.scopeCategories) {
        const catId = catIdByName.get(catName.toLowerCase());
        if (catId) {
          await db.execute(
            `INSERT IGNORE INTO attribute_scopes
             (attribute_id, category_id, subcategory_id)
             VALUES (?, ?, 0)`,
            [attrId, catId],
          );
        }
      }
    }
  }

  /* 2. products.sizes -> "Size" or "Capacity" for drinkware;
        products.paper_types -> "Paper Type" */

  const [products] = await db.execute(
    `SELECT id, name, category, subcategory, category_id,
            sizes, paper_types
     FROM products`,
  );

  const sizeAttrId = await upsertAttribute("Size", "multi-select");
  const paperAttrId = await upsertAttribute("Paper Type", "multi-select");

  /* Paper Type sirf print categories pe apply ho */
  const [paperScopes] = await db.execute(
    "SELECT COUNT(*) AS c FROM attribute_scopes WHERE attribute_id = ?",
    [paperAttrId],
  );
  if (Number(paperScopes[0].c) === 0) {
    for (const catName of [
      "Visiting Cards",
      "Stationery & Office",
      "Marketing Materials",
      "Stickers & Labels",
      "Packaging",
    ]) {
      const catId = catIdByName.get(catName.toLowerCase());
      if (catId) {
        await db.execute(
          `INSERT IGNORE INTO attribute_scopes
           (attribute_id, category_id, subcategory_id)
           VALUES (?, ?, 0)`,
          [paperAttrId, catId],
        );
      }
    }
  }

  const [capacityRows] = await db.execute(
    "SELECT id FROM product_attributes WHERE name = 'Capacity' LIMIT 1",
  );
  const capacityAttrId = capacityRows[0]?.id;

  const [materialRows] = await db.execute(
    "SELECT id FROM product_attributes WHERE name = 'Material' LIMIT 1",
  );
  const materialAttrId = materialRows[0]?.id;

  for (const p of products) {
    const sizes = parseProductList(p.sizes);
    const papers = parseProductList(p.paper_types);
    const drinkware = /bottle|mug/i.test(`${p.name} ${p.subcategory}`);

    /* sizes -> Size ya Capacity */
    const targetAttr =
      drinkware && capacityAttrId ? capacityAttrId : sizeAttrId;

    for (let i = 0; i < sizes.length; i++) {
      const val = String(sizes[i] || "").trim();
      if (!val) continue;
      const vid = await upsertAttributeValue(targetAttr, val, i);
      await db.execute(
        `INSERT IGNORE INTO product_attribute_values
         (product_id, attribute_id, attribute_value_id)
         VALUES (?, ?, ?)`,
        [p.id, targetAttr, vid],
      );
    }

    /* paper_types -> Paper Type */
    for (let i = 0; i < papers.length; i++) {
      const val = String(papers[i] || "").trim();
      if (!val) continue;
      const vid = await upsertAttributeValue(paperAttrId, val, i);
      await db.execute(
        `INSERT IGNORE INTO product_attribute_values
         (product_id, attribute_id, attribute_value_id)
         VALUES (?, ?, ?)`,
        [p.id, paperAttrId, vid],
      );
    }

    /* Material auto-guess by name (safe heuristics) */
    if (materialAttrId) {
      const guess = /mug/i.test(p.name)
        ? "Ceramic"
        : /bottle/i.test(p.name)
          ? "Stainless Steel"
          : /pen/i.test(p.name)
            ? "Metal"
            : /t-?shirt|polo|cap|tote|bag\b/i.test(p.name)
              ? "Cotton"
              : null;

      if (guess) {
        const vid = await upsertAttributeValue(materialAttrId, guess);
        await db.execute(
          `INSERT IGNORE INTO product_attribute_values
           (product_id, attribute_id, attribute_value_id)
           VALUES (?, ?, ?)`,
          [p.id, materialAttrId, vid],
        );
      }
    }
  }

  /* 4. unit field � category ke hisaab se sensible default */
  await db.execute(
    `UPDATE products SET unit = 'Cards'
     WHERE unit IS NULL AND category LIKE '%Card%'`,
  );
  await db.execute(
    `UPDATE products SET unit = 'Boxes'
     WHERE unit IS NULL AND (category = 'Packaging' OR name LIKE '%Box%')`,
  );
  await db.execute(
    `UPDATE products SET unit = 'Sets'
     WHERE unit IS NULL AND name LIKE '%Set%'`,
  );
  await db.execute(`UPDATE products SET unit = 'Pieces' WHERE unit IS NULL`);
}

/* product attributes in a single query */
async function getAttributesForProducts(productIds) {
  const ids = (Array.isArray(productIds) ? productIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT pav.product_id, pav.text_value,
            a.id AS attribute_id, a.name, a.type,
            av.id AS value_id, av.value
     FROM product_attribute_values pav
     JOIN product_attributes a ON a.id = pav.attribute_id
     LEFT JOIN attribute_values av ON av.id = pav.attribute_value_id
     WHERE pav.product_id IN (${placeholders})
     ORDER BY a.name ASC, av.sort_order ASC, av.id ASC`,
    ids,
  );

  const map = new Map();

  rows.forEach((r) => {
    if (!map.has(r.product_id)) map.set(r.product_id, new Map());
    const attrs = map.get(r.product_id);

    if (!attrs.has(r.attribute_id)) {
      attrs.set(r.attribute_id, {
        attributeId: r.attribute_id,
        name: r.name,
        type: r.type,
        values: [],
        value: null,
      });
    }

    const attr = attrs.get(r.attribute_id);

    if (r.value_id) {
      attr.values.push({ id: r.value_id, value: r.value });
      /* single-value mirror for select-type */
      if (attr.type === "select" && attr.value === null) {
        attr.value = r.value;
      }
    } else if (r.text_value !== null) {
      attr.value = r.text_value;
    }
  });

  /* Map->array normalize */
  const out = new Map();
  map.forEach((attrs, productId) => {
    out.set(productId, [...attrs.values()]);
  });
  return out;
}

/* replace product attributes � with validation */
async function syncProductAttributes(productId, valueIds, attributeTexts) {
  const ids = (Array.isArray(valueIds) ? valueIds : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);

  /* validate value ids -> attribute map */
  let valid = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await db.execute(
      `SELECT av.id AS value_id, av.attribute_id, a.type
       FROM attribute_values av
       JOIN product_attributes a ON a.id = av.attribute_id
       WHERE av.id IN (${placeholders})
         AND a.status = 'Active' AND av.status = 'Active'`,
      ids,
    );
    valid = rows;
  }

  /* select-type: sirf ek value per attribute rakho */
  const seenSelect = new Set();
  valid = valid.filter((r) => {
    if (r.type === "multi-select") return true;
    if (seenSelect.has(r.attribute_id)) return false;
    seenSelect.add(r.attribute_id);
    return true;
  });

  const texts = (Array.isArray(attributeTexts) ? attributeTexts : [])
    .map((t) => ({
      attributeId: Number(t?.attributeId || t?.attribute_id),
      value: String(t?.value ?? "").trim(),
    }))
    .filter((t) => Number.isFinite(t.attributeId) && t.value !== "");

  /* existing rows delete + fresh insert (full replace) */
  await db.execute(
    "DELETE FROM product_attribute_values WHERE product_id = ?",
    [productId],
  );

  for (const r of valid) {
    await db.execute(
      `INSERT IGNORE INTO product_attribute_values
       (product_id, attribute_id, attribute_value_id)
       VALUES (?, ?, ?)`,
      [productId, r.attribute_id, r.value_id],
    );
  }

  for (const t of texts) {
    const [attrRow] = await db.execute(
      `SELECT id, type FROM product_attributes
       WHERE id = ? AND status = 'Active' LIMIT 1`,
      [t.attributeId],
    );
    if (
      attrRow.length > 0 &&
      ["text", "number", "boolean"].includes(attrRow[0].type)
    ) {
      await db.execute(
        `INSERT INTO product_attribute_values
         (product_id, attribute_id, attribute_value_id, text_value)
         VALUES (?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE text_value = VALUES(text_value)`,
        [productId, t.attributeId, t.value],
      );
    }
  }
}

let taxonomyReadyPromise = null;
function ensureTaxonomy() {
  if (!taxonomyReadyPromise) {
    taxonomyReadyPromise = (async () => {
      await ensureProductsTable();
      await ensureCategoriesTable();
      await ensureTaxonomyTables();
      await migrateTaxonomyOnce();
      await migrateAttributesOnce();
    })().catch((err) => {
      taxonomyReadyPromise = null;
      throw err;
    });
  }
  return taxonomyReadyPromise;
}

/* tags for all product ids in one query */
async function getTagsForProducts(productIds) {
  const ids = (Array.isArray(productIds) ? productIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT pt.product_id, t.id, t.name
     FROM product_tags pt
     JOIN tags t ON t.id = pt.tag_id
     WHERE pt.product_id IN (${placeholders})
     ORDER BY t.name ASC`,
    ids,
  );

  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.product_id)) map.set(r.product_id, []);
    map.get(r.product_id).push({ id: r.id, name: r.name });
  });
  return map;
}

/* product_tags sync � tagIds replace karta hai */
async function syncProductTags(productId, tagIds) {
  const ids = (Array.isArray(tagIds) ? tagIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  await db.execute("DELETE FROM product_tags WHERE product_id = ?", [
    productId,
  ]);

  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  const [valid] = await db.execute(
    `SELECT id FROM tags WHERE id IN (${placeholders})`,
    ids,
  );

  for (const row of valid) {
    await db.execute(
      `INSERT IGNORE INTO product_tags (product_id, tag_id)
       VALUES (?, ?)`,
      [productId, row.id],
    );
  }
}

/* name/id se category resolve */
async function resolveCategoryId(body) {
  const id = Number(body?.categoryId || body?.category_id);
  if (Number.isFinite(id) && id > 0) {
    const [rows] = await db.execute(
      "SELECT id, name FROM categories WHERE id = ? LIMIT 1",
      [id],
    );
    if (rows.length > 0) return rows[0];
  }

  const name = String(body?.category || "").trim();
  if (name) {
    const [rows] = await db.execute(
      "SELECT id, name FROM categories WHERE name = ? LIMIT 1",
      [name],
    );
    if (rows.length > 0) return rows[0];
  }

  return null;
}

/* name/id se subcategory resolve (parent category ke andar) */
async function resolveSubcategoryId(body, categoryId) {
  if (!categoryId) return null;

  const id = Number(body?.subcategoryId || body?.subcategory_id);
  if (Number.isFinite(id) && id > 0) {
    const [rows] = await db.execute(
      `SELECT id, name FROM subcategories
       WHERE id = ? AND category_id = ? LIMIT 1`,
      [id, categoryId],
    );
    if (rows.length > 0) return rows[0];
  }

  const name = String(body?.subcategory || "").trim();
  if (name) {
    const [rows] = await db.execute(
      `SELECT id, name FROM subcategories
       WHERE category_id = ? AND name = ? LIMIT 1`,
      [categoryId, name],
    );
    if (rows.length > 0) return rows[0];

    /* name is valid but row missing � create it */
    const [ins] = await db.execute(
      `INSERT INTO subcategories (category_id, name, slug)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [categoryId, name, slugify(name)],
    );
    return { id: ins.insertId, name };
  }

  return null;
}

/* =========================================================
   PUBLIC � categories with subcategories
========================================================= */

app.get("/api/categories", async (req, res) => {
  try {
    await ensureTaxonomy();

    const [rows] = await db.execute(
      `SELECT id, name, slug, status, sort_order
       FROM categories
       ORDER BY sort_order ASC, id ASC`,
    );

    const [subs] = await db.execute(
      `SELECT id, category_id, name, slug, status, sort_order
       FROM subcategories
       ORDER BY sort_order ASC, id ASC`,
    );

    const subsByCat = new Map();
    subs.forEach((s) => {
      if (!subsByCat.has(s.category_id)) {
        subsByCat.set(s.category_id, []);
      }
      subsByCat.get(s.category_id).push({
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
      });
    });

    const categories = rows.map((row) => {
      const detail = subsByCat.get(row.id) || [];
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status || "Active",
        /* backward compat � storefront nav sirf Active subs */
        items: detail.filter((s) => s.status === "Active").map((s) => s.name),
        subcategories: detail,
      };
    });

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load categories.",
    });
  }
});

/* =========================================================
   PUBLIC � subcategories (?category_id= optional)
========================================================= */

app.get("/api/subcategories", async (req, res) => {
  try {
    await ensureTaxonomy();

    const categoryId = Number(req.query.category_id);
    let sql = `SELECT s.id, s.category_id, s.name, s.slug, s.status,
                      s.sort_order, c.name AS category_name
               FROM subcategories s
               LEFT JOIN categories c ON c.id = s.category_id`;
    const params = [];

    if (Number.isFinite(categoryId) && categoryId > 0) {
      sql += " WHERE s.category_id = ?";
      params.push(categoryId);
    }

    sql += " ORDER BY s.category_id ASC, s.sort_order ASC, s.id ASC";

    const [rows] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      subcategories: rows,
    });
  } catch (error) {
    console.error("Subcategories fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load subcategories.",
    });
  }
});

/* =========================================================
   PUBLIC � tags
========================================================= */

app.get("/api/tags", async (req, res) => {
  try {
    await ensureTaxonomy();

    const [rows] = await db.execute(
      `SELECT t.id, t.name, t.slug, t.status,
              COUNT(pt.product_id) AS productCount
       FROM tags t
       LEFT JOIN product_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name ASC`,
    );

    return res.status(200).json({
      success: true,
      tags: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        productCount: Number(r.productCount || 0),
      })),
    });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load tags.",
    });
  }
});

/* =========================================================
   PUBLIC � attributes
   ?category_id=&subcategory_id= -> sirf relevant attributes
   (unscoped attrs + scopes matching cat/sub)
========================================================= */

app.get("/api/attributes", async (req, res) => {
  try {
    await ensureTaxonomy();

    const categoryId = Number(req.query.category_id) || 0;
    const subcategoryId = Number(req.query.subcategory_id) || 0;

    const [attrs] = await db.execute(
      `SELECT id, name, slug, type, status
       FROM product_attributes
       ORDER BY name ASC`,
    );

    const [values] = await db.execute(
      `SELECT id, attribute_id, value, sort_order, status
       FROM attribute_values
       ORDER BY sort_order ASC, id ASC`,
    );

    const [scopes] = await db.execute(
      `SELECT attribute_id, category_id, subcategory_id
       FROM attribute_scopes`,
    );

    const scopesByAttr = new Map();
    scopes.forEach((s) => {
      if (!scopesByAttr.has(s.attribute_id)) {
        scopesByAttr.set(s.attribute_id, []);
      }
      scopesByAttr.get(s.attribute_id).push({
        categoryId: s.category_id,
        subcategoryId: s.subcategory_id,
      });
    });

    const valuesByAttr = new Map();
    values.forEach((v) => {
      if (!valuesByAttr.has(v.attribute_id)) {
        valuesByAttr.set(v.attribute_id, []);
      }
      valuesByAttr.get(v.attribute_id).push({
        id: v.id,
        value: v.value,
        status: v.status,
      });
    });

    let attributes = attrs.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      type: a.type,
      status: a.status,
      values: valuesByAttr.get(a.id) || [],
      scopes: scopesByAttr.get(a.id) || [],
    }));

    /* relevance filter � for form/detail */
    if (categoryId || subcategoryId) {
      attributes = attributes.filter((a) => {
        const s = a.scopes;
        if (s.length === 0) return true; /* global attr */
        return s.some(
          (sc) =>
            (sc.subcategoryId && sc.subcategoryId === subcategoryId) ||
            (sc.subcategoryId === 0 && sc.categoryId === categoryId),
        );
      });
    }

    return res.status(200).json({ success: true, attributes });
  } catch (error) {
    console.error("Attributes fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load attributes.",
    });
  }
});

/* =========================================================
   ADMIN � ATTRIBUTES CRUD
========================================================= */

const VALID_ATTR_TYPES = [
  "select",
  "multi-select",
  "text",
  "number",
  "boolean",
];

async function saveAttributeScopes(attrId, categoryIds, subcategoryIds) {
  const cats = (Array.isArray(categoryIds) ? categoryIds : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  const subs = (Array.isArray(subcategoryIds) ? subcategoryIds : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  await db.execute("DELETE FROM attribute_scopes WHERE attribute_id = ?", [
    attrId,
  ]);

  for (const cid of cats) {
    await db.execute(
      `INSERT IGNORE INTO attribute_scopes
       (attribute_id, category_id, subcategory_id)
       VALUES (?, ?, 0)`,
      [attrId, cid],
    );
  }

  for (const sid of subs) {
    const [sub] = await db.execute(
      "SELECT category_id FROM subcategories WHERE id = ? LIMIT 1",
      [sid],
    );
    if (sub.length > 0) {
      await db.execute(
        `INSERT IGNORE INTO attribute_scopes
         (attribute_id, category_id, subcategory_id)
         VALUES (?, ?, ?)`,
        [attrId, sub[0].category_id, sid],
      );
    }
  }
}

app.post(
  "/api/admin/attributes",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const type = VALID_ATTR_TYPES.includes(req.body?.type)
        ? req.body.type
        : "select";

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Attribute name must be at least 2 characters.",
        });
      }

      await ensureTaxonomy();

      const [dup] = await db.execute(
        "SELECT id FROM product_attributes WHERE name = ? LIMIT 1",
        [name],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Attribute already exists.",
        });
      }

      const [result] = await db.execute(
        `INSERT INTO product_attributes (name, slug, type)
         VALUES (?, ?, ?)`,
        [name, slugify(name), type],
      );

      await saveAttributeScopes(
        result.insertId,
        req.body?.categoryIds,
        req.body?.subcategoryIds,
      );

      return res.status(201).json({
        success: true,
        message: "Attribute added.",
        attribute: {
          id: result.insertId,
          name,
          slug: slugify(name),
          type,
          status: "Active",
        },
      });
    } catch (error) {
      console.error("Attribute add error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to add attribute.",
      });
    }
  },
);

app.put(
  "/api/admin/attributes/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid attribute id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, name, type, status FROM product_attributes WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attribute not found.",
        });
      }

      const name =
        req.body?.name !== undefined
          ? String(req.body.name).trim()
          : existing[0].name;

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Attribute name must be at least 2 characters.",
        });
      }

      const type =
        req.body?.type !== undefined && VALID_ATTR_TYPES.includes(req.body.type)
          ? req.body.type
          : existing[0].type;

      const status = ["Active", "Inactive"].includes(req.body?.status)
        ? req.body.status
        : existing[0].status;

      const [dup] = await db.execute(
        "SELECT id FROM product_attributes WHERE name = ? AND id != ? LIMIT 1",
        [name, id],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Another attribute with this name already exists.",
        });
      }

      await db.execute(
        "UPDATE product_attributes SET name = ?, slug = ?, type = ?, status = ? WHERE id = ?",
        [name, slugify(name), type, status, id],
      );

      if (
        req.body?.categoryIds !== undefined ||
        req.body?.subcategoryIds !== undefined
      ) {
        await saveAttributeScopes(
          id,
          req.body?.categoryIds,
          req.body?.subcategoryIds,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Attribute updated.",
        attribute: { id, name, slug: slugify(name), type, status },
      });
    } catch (error) {
      console.error("Attribute update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update attribute.",
      });
    }
  },
);

app.delete(
  "/api/admin/attributes/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid attribute id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id FROM product_attributes WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attribute not found.",
        });
      }

      const [used] = await db.execute(
        `SELECT COUNT(*) AS c FROM product_attribute_values
         WHERE attribute_id = ?`,
        [id],
      );

      if (Number(used[0].c) > 0) {
        await db.execute(
          "UPDATE product_attributes SET status = 'Inactive' WHERE id = ?",
          [id],
        );
        return res.status(200).json({
          success: true,
          message: `Attribute is used by ${Number(used[0].c)} product assignment(s) � deactivated instead of deleted.`,
        });
      }

      await db.execute("DELETE FROM attribute_scopes WHERE attribute_id = ?", [
        id,
      ]);
      await db.execute("DELETE FROM attribute_values WHERE attribute_id = ?", [
        id,
      ]);
      await db.execute("DELETE FROM product_attributes WHERE id = ?", [id]);

      return res.status(200).json({
        success: true,
        message: "Attribute deleted.",
      });
    } catch (error) {
      console.error("Attribute delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete attribute.",
      });
    }
  },
);

/* =========================================================
   ADMIN � ATTRIBUTE VALUES CRUD
========================================================= */

app.post(
  "/api/admin/attributes/:id/values",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const attributeId = Number(req.params.id);
      const value = String(req.body?.value || "").trim();

      if (!Number.isFinite(attributeId) || attributeId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid attribute id.",
        });
      }

      if (value.length < 1) {
        return res.status(400).json({
          success: false,
          message: "Value is required.",
        });
      }

      await ensureTaxonomy();

      const [attr] = await db.execute(
        "SELECT id, type FROM product_attributes WHERE id = ? LIMIT 1",
        [attributeId],
      );

      if (attr.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attribute not found.",
        });
      }

      if (!["select", "multi-select"].includes(attr[0].type)) {
        return res.status(400).json({
          success: false,
          message: `Attribute type '${attr[0].type}' does not use option values.`,
        });
      }

      const [dup] = await db.execute(
        `SELECT id FROM attribute_values
         WHERE attribute_id = ? AND value = ? LIMIT 1`,
        [attributeId, value],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Value already exists for this attribute.",
        });
      }

      const [maxRow] = await db.execute(
        `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder
         FROM attribute_values WHERE attribute_id = ?`,
        [attributeId],
      );

      const [result] = await db.execute(
        `INSERT INTO attribute_values (attribute_id, value, sort_order)
         VALUES (?, ?, ?)`,
        [attributeId, value, maxRow[0].maxOrder + 1],
      );

      return res.status(201).json({
        success: true,
        message: "Attribute value added.",
        value: {
          id: result.insertId,
          attribute_id: attributeId,
          value,
          status: "Active",
        },
      });
    } catch (error) {
      console.error("Attribute value add error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to add attribute value.",
      });
    }
  },
);

app.put(
  "/api/admin/attribute-values/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid value id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, attribute_id, value, status FROM attribute_values WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attribute value not found.",
        });
      }

      const value =
        req.body?.value !== undefined
          ? String(req.body.value).trim()
          : existing[0].value;

      if (value.length < 1) {
        return res.status(400).json({
          success: false,
          message: "Value is required.",
        });
      }

      const status = ["Active", "Inactive"].includes(req.body?.status)
        ? req.body.status
        : existing[0].status;

      const [dup] = await db.execute(
        `SELECT id FROM attribute_values
         WHERE attribute_id = ? AND value = ? AND id != ? LIMIT 1`,
        [existing[0].attribute_id, value, id],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Value already exists for this attribute.",
        });
      }

      await db.execute(
        "UPDATE attribute_values SET value = ?, status = ? WHERE id = ?",
        [value, status, id],
      );

      return res.status(200).json({
        success: true,
        message: "Attribute value updated.",
        value: { id, value, status },
      });
    } catch (error) {
      console.error("Attribute value update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update attribute value.",
      });
    }
  },
);

app.delete(
  "/api/admin/attribute-values/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid value id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id FROM attribute_values WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attribute value not found.",
        });
      }

      /* products are never deleted � only assignments detached */
      const [ref] = await db.execute(
        `SELECT COUNT(DISTINCT product_id) AS c
         FROM product_attribute_values WHERE attribute_value_id = ?`,
        [id],
      );

      await db.execute(
        "DELETE FROM product_attribute_values WHERE attribute_value_id = ?",
        [id],
      );
      await db.execute("DELETE FROM attribute_values WHERE id = ?", [id]);

      return res.status(200).json({
        success: true,
        message: `Value deleted (removed from ${Number(ref[0].c)} product(s)).`,
      });
    } catch (error) {
      console.error("Attribute value delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete attribute value.",
      });
    }
  },
);

app.post(
  "/api/admin/categories",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const items = Array.isArray(req.body?.items)
        ? req.body.items.map((item) => String(item).trim()).filter(Boolean)
        : [];

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Category name must be at least 2 characters.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id FROM categories WHERE name = ? LIMIT 1",
        [name],
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Category already exists.",
        });
      }

      const [maxRow] = await db.execute(
        "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM categories",
      );

      const [result] = await db.execute(
        "INSERT INTO categories (name, items, slug, sort_order) VALUES (?, ?, ?, ?)",
        [name, JSON.stringify(items), slugify(name), maxRow[0].maxOrder + 1],
      );

      /* items -> subcategories rows */
      for (let i = 0; i < items.length; i++) {
        await db.execute(
          `INSERT INTO subcategories (category_id, name, slug, sort_order)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE slug = VALUES(slug)`,
          [result.insertId, items[i], slugify(items[i]), i],
        );
      }

      return res.status(201).json({
        success: true,
        message: "Category added.",
        category: {
          id: result.insertId,
          name,
          items,
        },
      });
    } catch (error) {
      console.error("Category add error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to add category.",
      });
    }
  },
);

app.put(
  "/api/admin/categories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const name = String(req.body?.name || "").trim();
      const items = Array.isArray(req.body?.items)
        ? req.body.items.map((item) => String(item).trim()).filter(Boolean)
        : [];

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid category id.",
        });
      }

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Category name must be at least 2 characters.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, name, status FROM categories WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }

      const [duplicate] = await db.execute(
        "SELECT id FROM categories WHERE name = ? AND id != ? LIMIT 1",
        [name, id],
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Another category with this name already exists.",
        });
      }

      const status = ["Active", "Inactive"].includes(req.body?.status)
        ? req.body.status
        : existing[0].status || "Active";

      const oldName = existing[0].name;

      await db.execute(
        "UPDATE categories SET name = ?, items = ?, slug = ?, status = ? WHERE id = ?",
        [name, JSON.stringify(items), slugify(name), status, id],
      );

      /* category rename -> products.category sync */
      if (oldName && oldName !== name) {
        await db.execute(
          "UPDATE products SET category = ? WHERE category = ?",
          [name, oldName],
        );
      }

      /* items -> subcategories sync (add missing; removed ones
         delete karo sirf jab koi product use na kar raha ho,
         otherwise mark it Inactive) */
      const wanted = new Set(items.map((i) => String(i).toLowerCase()));

      const [existingSubs] = await db.execute(
        "SELECT id, name FROM subcategories WHERE category_id = ?",
        [id],
      );

      for (let i = 0; i < items.length; i++) {
        await db.execute(
          `INSERT INTO subcategories (category_id, name, slug, sort_order, status)
           VALUES (?, ?, ?, ?, 'Active')
           ON DUPLICATE KEY UPDATE status = 'Active', sort_order = VALUES(sort_order)`,
          [id, items[i], slugify(items[i]), i],
        );
      }

      for (const sub of existingSubs) {
        if (wanted.has(String(sub.name).toLowerCase())) {
          continue;
        }

        const [used] = await db.execute(
          `SELECT COUNT(*) AS c FROM products
           WHERE subcategory = ? AND (category_id = ? OR category = ?)`,
          [sub.name, id, name],
        );

        if (Number(used[0].c) > 0) {
          await db.execute(
            "UPDATE subcategories SET status = 'Inactive' WHERE id = ?",
            [sub.id],
          );
        } else {
          await db.execute("DELETE FROM subcategories WHERE id = ?", [sub.id]);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Category updated.",
        category: { id, name, items, status },
      });
    } catch (error) {
      console.error("Category update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update category.",
      });
    }
  },
);

app.delete(
  "/api/admin/categories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid category id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, name FROM categories WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }

      /* Dependency check � if products/subcategories still
         use it, do not delete; deactivate is safer */
      const [productUse] = await db.execute(
        `SELECT COUNT(*) AS c FROM products
         WHERE category_id = ? OR category = ?`,
        [id, existing[0].name],
      );

      const [subUse] = await db.execute(
        "SELECT COUNT(*) AS c FROM subcategories WHERE category_id = ?",
        [id],
      );

      if (Number(productUse[0].c) > 0 || Number(subUse[0].c) > 0) {
        return res.status(409).json({
          success: false,
          message: `Category has ${Number(productUse[0].c)} product(s) and ${Number(subUse[0].c)} subcategory(ies). Deactivate it or reassign them first.`,
        });
      }

      await db.execute("DELETE FROM categories WHERE id = ?", [id]);

      return res.status(200).json({
        success: true,
        message: "Category deleted.",
      });
    } catch (error) {
      console.error("Category delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete category.",
      });
    }
  },
);

/* =========================================================
   ADMIN � SUBCATEGORIES CRUD
========================================================= */

app.post(
  "/api/admin/subcategories",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const categoryId = Number(req.body?.category_id ?? req.body?.categoryId);
      const name = String(req.body?.name || "").trim();

      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid parent category is required.",
        });
      }

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Subcategory name must be at least 2 characters.",
        });
      }

      await ensureTaxonomy();

      const [cat] = await db.execute(
        "SELECT id FROM categories WHERE id = ? LIMIT 1",
        [categoryId],
      );

      if (cat.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Parent category does not exist.",
        });
      }

      const [dup] = await db.execute(
        `SELECT id FROM subcategories
         WHERE category_id = ? AND name = ? LIMIT 1`,
        [categoryId, name],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Subcategory already exists in this category.",
        });
      }

      const [maxRow] = await db.execute(
        `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder
         FROM subcategories WHERE category_id = ?`,
        [categoryId],
      );

      const [result] = await db.execute(
        `INSERT INTO subcategories (category_id, name, slug, sort_order)
         VALUES (?, ?, ?, ?)`,
        [categoryId, name, slugify(name), maxRow[0].maxOrder + 1],
      );

      return res.status(201).json({
        success: true,
        message: "Subcategory added.",
        subcategory: {
          id: result.insertId,
          category_id: categoryId,
          name,
          slug: slugify(name),
          status: "Active",
        },
      });
    } catch (error) {
      console.error("Subcategory add error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to add subcategory.",
      });
    }
  },
);

app.put(
  "/api/admin/subcategories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid subcategory id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, category_id, name, status FROM subcategories WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found.",
        });
      }

      const current = existing[0];

      const name =
        req.body?.name !== undefined
          ? String(req.body.name).trim()
          : current.name;

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Subcategory name must be at least 2 characters.",
        });
      }

      const categoryId =
        req.body?.category_id !== undefined ||
        req.body?.categoryId !== undefined
          ? Number(req.body.category_id ?? req.body.categoryId)
          : current.category_id;

      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid parent category is required.",
        });
      }

      const status = ["Active", "Inactive"].includes(req.body?.status)
        ? req.body.status
        : current.status;

      const [cat] = await db.execute(
        "SELECT id FROM categories WHERE id = ? LIMIT 1",
        [categoryId],
      );

      if (cat.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Parent category does not exist.",
        });
      }

      const [dup] = await db.execute(
        `SELECT id FROM subcategories
         WHERE category_id = ? AND name = ? AND id != ? LIMIT 1`,
        [categoryId, name, id],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Subcategory already exists in this category.",
        });
      }

      await db.execute(
        `UPDATE subcategories
         SET category_id = ?, name = ?, slug = ?, status = ?
         WHERE id = ?`,
        [categoryId, name, slugify(name), status, id],
      );

      /* rename -> products.subcategory sync */
      if (current.name !== name) {
        await db.execute(
          `UPDATE products SET subcategory = ?
           WHERE subcategory = ? AND (subcategory_id = ? OR category_id = ?)`,
          [name, current.name, id, categoryId],
        );
      }

      return res.status(200).json({
        success: true,
        message: "Subcategory updated.",
        subcategory: {
          id,
          category_id: categoryId,
          name,
          slug: slugify(name),
          status,
        },
      });
    } catch (error) {
      console.error("Subcategory update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update subcategory.",
      });
    }
  },
);

app.delete(
  "/api/admin/subcategories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid subcategory id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, name, category_id FROM subcategories WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found.",
        });
      }

      const [used] = await db.execute(
        `SELECT COUNT(*) AS c FROM products
         WHERE subcategory_id = ? OR subcategory = ?`,
        [id, existing[0].name],
      );

      if (Number(used[0].c) > 0) {
        await db.execute(
          "UPDATE subcategories SET status = 'Inactive' WHERE id = ?",
          [id],
        );

        return res.status(200).json({
          success: true,
          message: `Subcategory is used by ${Number(used[0].c)} product(s) � deactivated instead of deleted.`,
        });
      }

      await db.execute("DELETE FROM subcategories WHERE id = ?", [id]);

      return res.status(200).json({
        success: true,
        message: "Subcategory deleted.",
      });
    } catch (error) {
      console.error("Subcategory delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete subcategory.",
      });
    }
  },
);

/* =========================================================
   ADMIN � TAGS CRUD
========================================================= */

app.post(
  "/api/admin/tags",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Tag name must be at least 2 characters.",
        });
      }

      await ensureTaxonomy();

      const [dup] = await db.execute(
        "SELECT id FROM tags WHERE name = ? LIMIT 1",
        [name],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Tag already exists.",
        });
      }

      const [result] = await db.execute(
        "INSERT INTO tags (name, slug) VALUES (?, ?)",
        [name, slugify(name)],
      );

      return res.status(201).json({
        success: true,
        message: "Tag added.",
        tag: {
          id: result.insertId,
          name,
          slug: slugify(name),
          status: "Active",
        },
      });
    } catch (error) {
      console.error("Tag add error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to add tag.",
      });
    }
  },
);

app.put(
  "/api/admin/tags/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tag id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id, name, status FROM tags WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tag not found.",
        });
      }

      const name =
        req.body?.name !== undefined
          ? String(req.body.name).trim()
          : existing[0].name;

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Tag name must be at least 2 characters.",
        });
      }

      const status = ["Active", "Inactive"].includes(req.body?.status)
        ? req.body.status
        : existing[0].status;

      const [dup] = await db.execute(
        "SELECT id FROM tags WHERE name = ? AND id != ? LIMIT 1",
        [name, id],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Another tag with this name already exists.",
        });
      }

      await db.execute(
        "UPDATE tags SET name = ?, slug = ?, status = ? WHERE id = ?",
        [name, slugify(name), status, id],
      );

      return res.status(200).json({
        success: true,
        message: "Tag updated.",
        tag: { id, name, slug: slugify(name), status },
      });
    } catch (error) {
      console.error("Tag update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update tag.",
      });
    }
  },
);

app.delete(
  "/api/admin/tags/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid tag id.",
        });
      }

      await ensureTaxonomy();

      const [existing] = await db.execute(
        "SELECT id FROM tags WHERE id = ? LIMIT 1",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tag not found.",
        });
      }

      /* products are never deleted � only assignments detached */
      const [ref] = await db.execute(
        "SELECT COUNT(*) AS c FROM product_tags WHERE tag_id = ?",
        [id],
      );

      await db.execute("DELETE FROM product_tags WHERE tag_id = ?", [id]);
      await db.execute("DELETE FROM tags WHERE id = ?", [id]);

      return res.status(200).json({
        success: true,
        message: `Tag deleted (removed from ${Number(ref[0].c)} product(s)).`,
      });
    } catch (error) {
      console.error("Tag delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete tag.",
      });
    }
  },
);

/* =========================================================
   CART  (persistent, user-specific)
========================================================= */

let cartTableEnsured = false;
async function ensureCartTable() {
  if (cartTableEnsured) return;
  cartTableEnsured = true;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id            INT          NOT NULL AUTO_INCREMENT,
      user_id       INT          NOT NULL,
      product_id    INT          NOT NULL,
      quantity      INT          NOT NULL DEFAULT 1,
      paper_type    VARCHAR(50)  DEFAULT NULL,
      size          VARCHAR(50)  DEFAULT NULL,
      attributes    JSON         DEFAULT NULL,
      item_type     VARCHAR(20)  NOT NULL DEFAULT 'standard',
      customization JSON         DEFAULT NULL,
      variant_hash  VARCHAR(64)  NOT NULL,
      created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ci_user (user_id),
      KEY idx_ci_product (product_id),
      UNIQUE KEY uq_ci_variant (user_id, variant_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* uploaded design file references (metadata + fileId —
     raw bytes live in uploaded_files) */
  try {
    await db.execute(
      "ALTER TABLE cart_items ADD COLUMN uploaded_designs JSON DEFAULT NULL",
    );
  } catch {
    /* column already exists */
  }
}

/* ---- cart helper: sanitize uploaded-design references ----
   keeps only metadata + durable fileId; strips base64/blob
   payloads so cart rows stay light */
function sanitizeUploadedDesigns(body) {
  const list = Array.isArray(body?.uploadedDesigns)
    ? body.uploadedDesigns
    : Array.isArray(body?.uploaded_designs)
      ? body.uploaded_designs
      : [];

  if (!list.length) return null;

  const clean = list
    .slice(0, 5)
    .map((d) => {
      if (!d || typeof d !== "object") return null;
      const name = String(d.name || "").slice(0, 200);
      const type = String(d.type || "").slice(0, 80);
      const size = Number.isFinite(Number(d.size)) ? Number(d.size) : null;
      const fileId =
        String(d.fileId || d.file_id || "")
          .slice(0, 64)
          .trim() || null;
      if (!name && !fileId) return null;
      return { name, type, size, fileId };
    })
    .filter(Boolean);

  return clean.length ? clean : null;
}

/* ---- cart helper: compute variant_hash ---- */
function computeVariantHash(fields) {
  const canonical = JSON.stringify(fields);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/* ---- cart helper: sanitize customization payload ---- */
function sanitizeCartCustomization(itemType, body) {
  if (itemType === "standard") return null;

  const c = body.customization;
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  if (JSON.stringify(c).length > 300000) return null; // 300 KB cap

  if (itemType === "business-card") {
    return {
      ...c,
      frontDesign: sanitizeCardDesign(c.frontDesign || body.frontDesign),
      backDesign: sanitizeCardDesign(c.backDesign || body.backDesign),
      template: c.template ? String(c.template).slice(0, 40) : null,
    };
  }

  /* custom / generic customizer items */
  return {
    ...c,
    designs: sanitizeDesigns(c.designs || body.designs),
    text: String(c.text || body.text || "").slice(0, 500),
    color: c.color ? sanitizeColor(c.color) : null,
    personName: String(c.personName || body.personName || "").slice(0, 120),
    designation: String(c.designation || body.designation || "").slice(0, 120),
    companyName: String(c.companyName || body.companyName || "").slice(0, 160),
  };
}

/* =========================================================
   CART API ROUTES
========================================================= */

/* ---------- GET /api/cart ---------- */
app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();
    await ensureProductsTable();

    const userId = req.user.id;

    const [userRows] = await db.execute(
      `SELECT ci.*,
                p.name        AS product_name,
                p.price       AS product_price,
                p.old_price   AS product_old_price,
                p.images      AS product_images,
                p.status      AS product_status,
                p.category    AS product_category,
                p.subcategory AS product_subcategory,
                p.quantity_step,
                p.max_qty,
                p.unit        AS product_unit,
                p.customizable,
                p.customization_type,
                p.description AS product_description,
                p.stock       AS product_stock
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = ?
         ORDER BY ci.created_at DESC`,
      [userId],
    );

    const items = userRows.map((row) => {
      const attrs =
        row.attributes && typeof row.attributes === "string"
          ? JSON.parse(row.attributes)
          : row.attributes || null;

      const custom =
        row.customization && typeof row.customization === "string"
          ? JSON.parse(row.customization)
          : row.customization || null;

      const uploadedDesigns =
        row.uploaded_designs && typeof row.uploaded_designs === "string"
          ? JSON.parse(row.uploaded_designs)
          : row.uploaded_designs || null;

      const productImages = parseProductList(row.product_images);

      return {
        id: row.id,
        productId: row.product_id,
        quantity: row.quantity,
        paperType: row.paper_type,
        size: row.size,
        attributes: attrs,
        itemType: row.item_type,
        customization: custom,
        uploadedDesigns,
        isCustomized:
          (custom && Object.keys(custom).length > 0) ||
          (Array.isArray(uploadedDesigns) && uploadedDesigns.length > 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        /* live product data */
        name: row.product_name || "Unknown Product",
        price: Number(row.product_price || 0),
        oldPrice: Number(row.product_old_price || row.product_price || 0),
        image: productImages[0] || "",
        images: productImages,
        category: row.product_category || "General",
        subcategory: row.product_subcategory || "",
        status: row.product_status || "Deleted",
        quantityStep: Math.max(1, Number(row.quantity_step || 1)),
        maxQuantity:
          row.max_qty !== null && row.max_qty !== undefined
            ? Number(row.max_qty)
            : null,
        unit: row.product_unit || "Pieces",
        customizable: row.customizable === 1 || row.customizable === true,
        customizationType: row.customization_type || "",
        description: row.product_description || "",
        stock: Number(row.product_stock || 0),
        productAvailable:
          row.product_name !== null &&
          row.product_status === "Active" &&
          Number(row.product_stock || 0) > 0,
      };
    });

    return res.json({ success: true, cart: items });
  } catch (error) {
    console.error("GET /api/cart error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load cart.",
    });
  }
});

/* ---------- POST /api/cart ---------- */
app.post("/api/cart", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();
    await ensureProductsTable();

    const userId = req.user.id;
    const body = req.body || {};

    /* ---- resolve product_id ---- */
    const productId = Number(
      body.product_id || body.productId || body.originalProductId || 0,
    );
    if (!productId || !Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product_id is required.",
      });
    }

    /* ---- fetch product ---- */
    const [prodRows] = await db.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [productId],
    );
    if (prodRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = mapProduct(prodRows[0]);

    if (product.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is not currently available.`,
      });
    }

    const stock = Number(product.stock) || 0;

    if (stock <= 0) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is out of stock.`,
      });
    }

    /* ---- item_type ---- */
    const allowedTypes = ["standard", "business-card", "custom"];
    const itemType = allowedTypes.includes(body.item_type || body.itemType)
      ? body.item_type || body.itemType
      : "standard";

    /* ---- quantity ---- */
    const minQty = Math.max(1, Number(product.quantityStep) || 1);
    const maxQty = product.maxQuantity;

    let quantity = Math.floor(Number(body.quantity) || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity.",
      });
    }
    if (quantity < minQty) quantity = minQty;
    if (maxQty && quantity > maxQty) {
      return res.status(400).json({
        success: false,
        message: `Maximum quantity for "${product.name}" is ${maxQty}.`,
      });
    }
    /* never allow a cart quantity greater than available stock */
    if (quantity > stock) quantity = stock;

    /* ---- paper_type & size ---- */
    const paperType = body.paper_type || body.paperType || null;
    const size = body.size || null;

    /* ---- attributes (validate against product_attribute_values) ---- */
    let cleanAttrs = null;
    const rawAttrs = body.attributes;

    if (rawAttrs && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)) {
      const [pavRows] = await db.execute(
        `SELECT a.name AS attr_name, av.value
           FROM product_attribute_values pav
           JOIN product_attributes a ON a.id = pav.attribute_id
           JOIN attribute_values av  ON av.id = pav.attribute_value_id
           WHERE pav.product_id = ?`,
        [productId],
      );

      const allowed = new Map();
      pavRows.forEach((r) => {
        const key = String(r.attr_name).toLowerCase();
        if (!allowed.has(key)) allowed.set(key, new Set());
        allowed.get(key).add(String(r.value).toLowerCase());
      });

      const filtered = {};
      for (const [attrName, val] of Object.entries(rawAttrs)) {
        const key = String(attrName).toLowerCase();
        const value = String(val).trim();
        if (!value) continue;
        if (allowed.has(key) && allowed.get(key).has(value.toLowerCase())) {
          filtered[attrName] = value;
        }
      }
      if (Object.keys(filtered).length > 0) cleanAttrs = filtered;
    }

    /* ---- customization ---- */
    const customization = sanitizeCartCustomization(itemType, body);

    /* ---- uploaded design references ---- */
    const uploadedDesigns = sanitizeUploadedDesigns(body);

    /* ---- variant_hash ---- */
    let hashInput;
    if (itemType === "standard") {
      /* sort attributes for deterministic hash */
      const sortedAttrs = cleanAttrs
        ? Object.keys(cleanAttrs)
            .sort()
            .reduce((o, k) => {
              o[k] = cleanAttrs[k];
              return o;
            }, {})
        : null;
      hashInput = {
        product_id: productId,
        item_type: "standard",
        paper_type: paperType || null,
        size: size || null,
        attributes: sortedAttrs,
        /* different upload sets must NOT merge into the
             same cart row — include their signature */
        uploaded_designs: uploadedDesigns
          ? uploadedDesigns.map((d) => d.fileId || d.name)
          : null,
      };
    } else {
      /* customized items: always unique */
      hashInput = {
        product_id: productId,
        item_type: itemType,
        custom_key: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      };
    }
    const variantHash = computeVariantHash(hashInput);

    /* ---- insert or merge ---- */
    const attrsJson = cleanAttrs ? JSON.stringify(cleanAttrs) : null;
    const customJson = customization ? JSON.stringify(customization) : null;
    const uploadsJson = uploadedDesigns
      ? JSON.stringify(uploadedDesigns)
      : null;

    if (itemType === "standard") {
      /* UPSERT: same variant → add quantity */
      const [result] = await db.execute(
        `INSERT INTO cart_items
             (user_id, product_id, quantity, paper_type, size, attributes,
              item_type, customization, uploaded_designs, variant_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             quantity = LEAST(quantity + VALUES(quantity), ?),
             updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          productId,
          quantity,
          paperType,
          size,
          attrsJson,
          itemType,
          customJson,
          uploadsJson,
          variantHash,
          Math.min(maxQty || 999999999, stock),
        ],
      );

      /* fetch the upserted row */
      const [inserted] = await db.execute(
        "SELECT * FROM cart_items WHERE user_id = ? AND variant_hash = ?",
        [userId, variantHash],
      );

      return res.status(200).json({
        success: true,
        message:
          result.affectedRows > 1
            ? "Cart item quantity updated."
            : "Item added to cart.",
        merged: result.affectedRows > 1,
        item: inserted[0] || null,
      });
    } else {
      /* customized: always a new row */
      const [result] = await db.execute(
        `INSERT INTO cart_items
             (user_id, product_id, quantity, paper_type, size, attributes,
              item_type, customization, uploaded_designs, variant_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          productId,
          quantity,
          paperType,
          size,
          attrsJson,
          itemType,
          customJson,
          uploadsJson,
          variantHash,
        ],
      );

      return res.status(201).json({
        success: true,
        message: "Customized item added to cart.",
        item: {
          id: result.insertId,
          user_id: userId,
          product_id: productId,
          quantity,
          paper_type: paperType,
          size,
          attributes: cleanAttrs,
          item_type: itemType,
          customization,
          uploaded_designs: uploadedDesigns,
          variant_hash: variantHash,
        },
      });
    }
  } catch (error) {
    console.error("POST /api/cart error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add item to cart.",
    });
  }
});

/* ---------- PUT /api/cart/:id ---------- */
app.put("/api/cart/:id", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();
    await ensureProductsTable();

    const userId = req.user.id;
    const cartItemId = Number(req.params.id);

    if (!cartItemId || !Number.isFinite(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: "Valid cart item ID is required.",
      });
    }

    /* fetch item — scoped to user */
    const [existing] = await db.execute(
      "SELECT * FROM cart_items WHERE id = ? AND user_id = ?",
      [cartItemId, userId],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    const cartItem = existing[0];

    /* fetch product for rules */
    const [prodRows] = await db.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [cartItem.product_id],
    );

    const product = prodRows.length > 0 ? mapProduct(prodRows[0]) : null;

    const minQty = product ? Math.max(1, Number(product.quantityStep) || 1) : 1;
    const maxQty = product?.maxQuantity || null;

    /* validate new quantity */
    let quantity = Math.floor(Number(req.body.quantity) || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity.",
      });
    }

    if (quantity < minQty) quantity = minQty;
    if (maxQty && quantity > maxQty) {
      return res.status(400).json({
        success: false,
        message: `Maximum quantity is ${maxQty}.`,
      });
    }

    /* stock guard — product may have sold out after being
         added to the cart; quantity can never exceed stock */
    if (product) {
      const stock = Number(product.stock) || 0;
      if (stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `"${product.name}" is out of stock. Please remove it from your cart.`,
        });
      }
      if (quantity > stock) quantity = stock;
    }

    await db.execute(
      "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
      [quantity, cartItemId, userId],
    );

    return res.json({
      success: true,
      message: "Cart item updated.",
      item: { ...cartItem, quantity },
    });
  } catch (error) {
    console.error("PUT /api/cart/:id error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart item.",
    });
  }
});

/* ---------- DELETE /api/cart/:id ---------- */
app.delete("/api/cart/:id", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();

    const userId = req.user.id;
    const cartItemId = Number(req.params.id);

    if (!cartItemId || !Number.isFinite(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: "Valid cart item ID is required.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
      [cartItemId, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    return res.json({
      success: true,
      message: "Item removed from cart.",
    });
  } catch (error) {
    console.error("DELETE /api/cart/:id error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove cart item.",
    });
  }
});

/* ---------- DELETE /api/cart (clear all) ---------- */
app.delete("/api/cart", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();

    const userId = req.user.id;

    const [result] = await db.execute(
      "DELETE FROM cart_items WHERE user_id = ?",
      [userId],
    );

    return res.json({
      success: true,
      message: "Cart cleared.",
      deletedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("DELETE /api/cart error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart.",
    });
  }
});

/* ---------- POST /api/cart/merge (guest → user, idempotent) ---------- */
app.post("/api/cart/merge", authenticateToken, async (req, res) => {
  try {
    await ensureCartTable();
    await ensureProductsTable();

    const userId = req.user.id;
    const guestItems = req.body.items;

    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return res.json({ success: true, merged: 0, skipped: 0 });
    }

    /* cap to 50 items to prevent abuse */
    const items = guestItems.slice(0, 50);
    let merged = 0;
    let skipped = 0;

    for (const gi of items) {
      try {
        /* resolve product */
        const productId = Number(
          gi.product_id || gi.productId || gi.originalProductId || gi.id || 0,
        );
        if (!productId || !Number.isFinite(productId) || productId <= 0) {
          skipped++;
          continue;
        }

        const [prodRows] = await db.execute(
          "SELECT * FROM products WHERE id = ? LIMIT 1",
          [productId],
        );
        if (prodRows.length === 0) {
          skipped++;
          continue;
        }

        const product = mapProduct(prodRows[0]);
        if (product.status !== "Active" || Number(product.stock) <= 0) {
          skipped++;
          continue;
        }

        const stock = Number(product.stock) || 0;

        /* item_type */
        const allowedTypes = ["standard", "business-card", "custom"];
        const itemType = allowedTypes.includes(gi.item_type || gi.itemType)
          ? gi.item_type || gi.itemType
          : "standard";

        /* quantity */
        const minQty = Math.max(1, Number(product.quantityStep) || 1);
        const maxQty = product.maxQuantity;
        let quantity = Math.floor(Number(gi.quantity) || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) quantity = minQty;
        if (quantity < minQty) quantity = minQty;
        if (maxQty && quantity > maxQty) quantity = maxQty;
        if (quantity > stock) quantity = stock;

        /* paper_type & size */
        const paperType = gi.paper_type || gi.paperType || null;
        const size = gi.size || null;

        /* attributes */
        let cleanAttrs = null;
        const rawAttrs = gi.attributes;
        if (
          rawAttrs &&
          typeof rawAttrs === "object" &&
          !Array.isArray(rawAttrs)
        ) {
          const [pavRows] = await db.execute(
            `SELECT a.name AS attr_name, av.value
               FROM product_attribute_values pav
               JOIN product_attributes a ON a.id = pav.attribute_id
               JOIN attribute_values av  ON av.id = pav.attribute_value_id
               WHERE pav.product_id = ?`,
            [productId],
          );
          const allowed = new Map();
          pavRows.forEach((r) => {
            const key = String(r.attr_name).toLowerCase();
            if (!allowed.has(key)) allowed.set(key, new Set());
            allowed.get(key).add(String(r.value).toLowerCase());
          });
          const filtered = {};
          for (const [attrName, val] of Object.entries(rawAttrs)) {
            const key = String(attrName).toLowerCase();
            const value = String(val).trim();
            if (!value) continue;
            if (allowed.has(key) && allowed.get(key).has(value.toLowerCase())) {
              filtered[attrName] = value;
            }
          }
          if (Object.keys(filtered).length > 0) cleanAttrs = filtered;
        }

        /* customization */
        const customization = sanitizeCartCustomization(itemType, gi);

        /* uploaded design references */
        const uploadedDesigns = sanitizeUploadedDesigns(gi);

        /* variant_hash */
        let hashInput;
        if (itemType === "standard") {
          const sortedAttrs = cleanAttrs
            ? Object.keys(cleanAttrs)
                .sort()
                .reduce((o, k) => {
                  o[k] = cleanAttrs[k];
                  return o;
                }, {})
            : null;
          hashInput = {
            product_id: productId,
            item_type: "standard",
            paper_type: paperType || null,
            size: size || null,
            attributes: sortedAttrs,
            uploaded_designs: uploadedDesigns
              ? uploadedDesigns.map((d) => d.fileId || d.name)
              : null,
          };
        } else {
          hashInput = {
            product_id: productId,
            item_type: itemType,
            custom_key: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          };
        }
        const variantHash = computeVariantHash(hashInput);

        const attrsJson = cleanAttrs ? JSON.stringify(cleanAttrs) : null;
        const customJson = customization ? JSON.stringify(customization) : null;
        const uploadsJson = uploadedDesigns
          ? JSON.stringify(uploadedDesigns)
          : null;

        if (itemType === "standard") {
          /* IDEMPOTENT MERGE: use GREATEST (keep the larger quantity)
               so retrying does not inflate quantities */
          await db.execute(
            `INSERT INTO cart_items
                 (user_id, product_id, quantity, paper_type, size, attributes,
                  item_type, customization, uploaded_designs, variant_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 quantity = LEAST(GREATEST(quantity, VALUES(quantity)), ?),
                 uploaded_designs = COALESCE(
                   cart_items.uploaded_designs, VALUES(uploaded_designs)),
                 updated_at = CURRENT_TIMESTAMP`,
            [
              userId,
              productId,
              quantity,
              paperType,
              size,
              attrsJson,
              itemType,
              customJson,
              uploadsJson,
              variantHash,
              Math.min(maxQty || 999999999, stock),
            ],
          );
        } else {
          /* customized: always new row */
          await db.execute(
            `INSERT INTO cart_items
                 (user_id, product_id, quantity, paper_type, size, attributes,
                  item_type, customization, uploaded_designs, variant_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              productId,
              quantity,
              paperType,
              size,
              attrsJson,
              itemType,
              customJson,
              uploadsJson,
              variantHash,
            ],
          );
        }

        merged++;
      } catch (itemErr) {
        console.error("Merge item error:", itemErr.message);
        skipped++;
      }
    }

    return res.json({ success: true, merged, skipped });
  } catch (error) {
    console.error("POST /api/cart/merge error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to merge cart.",
    });
  }
});

/* =========================================================
   ORDERS
========================================================= */

async function ensureOrdersTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(60) DEFAULT NULL,
      user_id INT DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'New',
      customer_name VARCHAR(150) DEFAULT NULL,
      email VARCHAR(190) DEFAULT NULL,
      phone VARCHAR(30) DEFAULT NULL,
      total DECIMAL(10,2) DEFAULT 0,
      total_price DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT NULL,
      payment_status VARCHAR(30) DEFAULT 'Pending',
      items LONGTEXT DEFAULT NULL,
      payload LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY order_id (order_id),
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  /* add missing columns on the old schema */
  const addColumn = async (sql) => {
    try {
      await db.execute(sql);
    } catch {
      /* column already exists � skip */
    }
  };

  await addColumn("ALTER TABLE orders ADD COLUMN payload LONGTEXT");
  await addColumn(
    "ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0",
  );
  await addColumn("ALTER TABLE orders ADD UNIQUE KEY order_id (order_id)");

  /* Razorpay payment fields */
  await addColumn(
    "ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(80) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(80) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN razorpay_signature VARCHAR(255) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN payment_attempts INT NOT NULL DEFAULT 0",
  );

  /* cancellation fields */
  await addColumn(
    "ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMP NULL DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN cancelled_by VARCHAR(50) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(500) DEFAULT NULL",
  );
  await addColumn(
    "ALTER TABLE orders ADD COLUMN refund_status VARCHAR(30) DEFAULT NULL",
  );
}

/* statuses from which an order may still be cancelled —
   shipped/out-for-delivery/delivered/cancelled are final */
const CANCELLABLE_STATUSES = new Set([
  "new",
  "pending",
  "processing",
  "confirmed",
  "order placed",
]);

const isOrderCancellable = (status) =>
  CANCELLABLE_STATUSES.has(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

const buildOrderTracking = (status) => {
  const s = String(status || "").toLowerCase();
  return {
    ordered: true,
    processing:
      s.includes("process") ||
      s.includes("ship") ||
      s.includes("out") ||
      s.includes("deliver"),
    shipped: s.includes("ship") || s.includes("out") || s.includes("deliver"),
    outForDelivery: s.includes("deliver"),
    delivered: s.includes("delivered"),
  };
};

const parseOrderRow = (row) => {
  let payload = {};
  try {
    payload = JSON.parse(row.payload || "{}");
  } catch {
    payload = {};
  }

  return {
    ...payload,
    id: payload.id || row.order_id,
    orderId: payload.orderId || row.order_id,
    orderNumber: payload.orderNumber || row.order_id,
    status: row.status,
    customerName: payload.customerName || row.customer_name,
    email: payload.email || row.email,
    total: payload.total ?? Number(row.total_price),
    grandTotal: payload.grandTotal ?? Number(row.total_price),
    createdAt: payload.createdAt || row.created_at,
    updatedAt: row.updated_at,
    dbId: row.id,
    paymentMethod: payload.paymentMethod || row.payment_method || "",
    paymentStatus: row.payment_status || "Pending",
    razorpayOrderId: row.razorpay_order_id || null,
    razorpayPaymentId: row.razorpay_payment_id || null,
    cancelledAt: row.cancelled_at || null,
    cancelledBy: row.cancelled_by || null,
    cancelReason: row.cancel_reason || null,
    refundStatus: row.refund_status || null,
  };
};

/* Stored order items keep only lightweight images —
   fill missing ones from the products table so order
   views still show thumbnails (covers orders saved
   before/after the payload-slimming change) */
const enrichOrderItemImages = async (orders) => {
  const list = Array.isArray(orders) ? orders : [orders];
  const missing = new Set();

  for (const o of list) {
    const items = o?.items || o?.products || [];
    for (const it of items) {
      const pid = Number(it?.productId || it?.originalProductId || it?.id);
      const hasImage =
        (typeof it?.image === "string" && it.image) ||
        (Array.isArray(it?.images) && it.images[0]);
      if (Number.isFinite(pid) && pid > 0 && !hasImage) {
        missing.add(pid);
      }
    }
  }

  if (missing.size === 0) return orders;

  const ids = [...missing];
  const [rows] = await db.execute(
    `SELECT id, images FROM products
     WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );

  const imgMap = new Map();
  rows.forEach((r) => {
    const imgs = parseProductList(r.images);
    if (imgs[0]) imgMap.set(String(r.id), imgs[0]);
  });

  for (const o of list) {
    const items = o?.items || o?.products || [];
    for (const it of items) {
      const pid = String(
        it?.productId || it?.originalProductId || it?.id || "",
      );
      const img = imgMap.get(pid);
      if (!img) continue;
      if (!it.image) it.image = img;
      if (!Array.isArray(it.images) || !it.images[0]) {
        it.images = [img];
      }
    }
  }

  return orders;
};

/* =========================================================
   CUSTOMER-UPLOADED FILES
   Design uploads were previously stored only in the
   customer's browser localStorage (printExpertDesigns_<pid>)
   and never reached the server — admins saw filenames but
   could never open the actual file. These endpoints persist
   the real bytes and serve them back to the owner or admin.
========================================================= */

const ensureUploadsTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      mime VARCHAR(100) NOT NULL,
      size INT NOT NULL,
      data LONGBLOB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const UPLOAD_MIME_ALLOWLIST = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const UPLOAD_MAX_BYTES = 12 * 1024 * 1024; /* 12 MB decoded */

/* POST /api/files — authenticated upload of one design file.
   Body: { name, type, dataUrl }. Returns durable fileId. */
app.post("/api/files", authenticateToken, async (req, res) => {
  try {
    await ensureUploadsTable();

    const name = String(req.body?.name || "file").slice(0, 255);
    const mime = String(req.body?.type || "").toLowerCase();
    const dataUrl = String(req.body?.dataUrl || "");

    if (!UPLOAD_MIME_ALLOWLIST.includes(mime)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Allowed: PNG, JPG, WebP, GIF, PDF.",
      });
    }

    const m = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!m || m[1].toLowerCase() !== mime) {
      return res.status(400).json({
        success: false,
        message: "Invalid file data.",
      });
    }

    const buf = Buffer.from(m[2], "base64");
    if (!buf.length || buf.length > UPLOAD_MAX_BYTES) {
      return res.status(400).json({
        success: false,
        message: "File too large (max 12 MB).",
      });
    }

    const fileId = `f_${crypto.randomBytes(16).toString("hex")}`;

    await db.execute(
      `INSERT INTO uploaded_files (id, user_id, name, mime, size, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fileId, req.user.id, name, mime, buf.length, buf],
    );

    return res.status(201).json({
      success: true,
      fileId,
      name,
      type: mime,
      size: buf.length,
      url: `/api/files/${fileId}`,
    });
  } catch (error) {
    console.error("UPLOAD FILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to upload file.",
    });
  }
});

/* GET /api/files/:id — owner or admin only. Streams the file. */
app.get("/api/files/:id", authenticateToken, async (req, res) => {
  try {
    await ensureUploadsTable();

    const fileId = String(req.params.id || "").slice(0, 64);
    const [rows] = await db.execute(
      `SELECT user_id, name, mime, size, data
       FROM uploaded_files WHERE id = ? LIMIT 1`,
      [fileId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const f = rows[0];
    const isOwner = Number(f.user_id) === Number(req.user?.id);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    res.setHeader("Content-Type", f.mime);
    res.setHeader("Content-Length", f.size);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${String(f.name).replace(/[^\w.\- ]/g, "_")}"`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.end(f.data);
  } catch (error) {
    console.error("GET FILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load file.",
    });
  }
});

/* USER � place an order (login required) */
app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const order = req.body || {};
    const orderNumber = String(
      order.orderNumber || order.orderId || order.id || "",
    ).trim();

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required.",
      });
    }

    await ensureOrdersTable();

    const status = String(order.status || "New");
    const customerName = String(
      order.customerName || order.customer?.name || order.name || "",
    );
    const email = String(order.email || order.customer?.email || "");
    const phone = String(order.phone || order.customer?.phone || "");

    /*
     * SERVER-SIDE ORDER VALIDATION
     * Never blindly trust the total sent by the frontend.
     * DB se current product price lekar subtotal, coupon aur final total
     * recalculate karenge.
     */

    const rawItems = Array.isArray(order.items || order.products || order.cart)
      ? order.items || order.products || order.cart
      : [];

    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one product.",
      });
    }

    const productIds = rawItems
      .map((item) =>
        String(item.productId || item.originalProductId || item.id || ""),
      )
      .filter(Boolean);

    const productMap = new Map();

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");

      const [productRows] = await db.execute(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        productIds,
      );

      productRows
        .map(mapProduct)
        .forEach((p) => productMap.set(String(p.id), p));
    }

    const validatedItems = [];
    let subtotal = 0;

    for (const item of rawItems) {
      const pid = String(
        item.productId || item.originalProductId || item.id || "",
      );

      const product = productMap.get(pid);

      if (!product || product.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name || pid}" is not available.`,
        });
      }

      /* quantity: integer, >= min step, <= max_qty (if set) */
      const minQty = Math.max(1, Number(product.quantityStep) || 1);
      const maxQty =
        product.maxQuantity !== null && product.maxQuantity !== undefined
          ? Number(product.maxQuantity)
          : null;

      let quantity = Math.floor(Number(item.quantity) || 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for "${product.name}".`,
        });
      }

      if (quantity < minQty) quantity = minQty;
      if (maxQty && quantity > maxQty) quantity = maxQty;

      /* stock check — reject the whole order if any
           item has insufficient stock (final guard) */
      const stock = Number(product.stock) || 0;
      if (stock < quantity) {
        return res.status(400).json({
          success: false,
          message:
            stock <= 0
              ? `"${product.name}" is out of stock.`
              : `Only ${stock} unit(s) of "${product.name}" are available.`,
        });
      }

      const price = Number(product.price || 0);
      const itemTotal = price * quantity;

      subtotal += itemTotal;

      /* dynamic attribute selections validate � sirf product
           ke allowed attribute values accept honge */
      const cleanAttrs = {};

      if (
        item.attributes &&
        typeof item.attributes === "object" &&
        !Array.isArray(item.attributes)
      ) {
        const [pavRows] = await db.execute(
          `SELECT a.name AS attr_name, av.value
             FROM product_attribute_values pav
             JOIN product_attributes a
               ON a.id = pav.attribute_id
             JOIN attribute_values av
               ON av.id = pav.attribute_value_id
             WHERE pav.product_id = ?`,
          [pid],
        );

        const allowed = new Map();
        pavRows.forEach((r) => {
          const key = String(r.attr_name).toLowerCase();
          if (!allowed.has(key)) allowed.set(key, new Set());
          allowed.get(key).add(String(r.value).toLowerCase());
        });

        for (const [attrName, val] of Object.entries(item.attributes)) {
          const key = String(attrName).toLowerCase();
          const value = String(val).trim();

          if (!value) continue;

          if (allowed.has(key) && allowed.get(key).has(value.toLowerCase())) {
            cleanAttrs[attrName] = value;
          } else if (!allowed.has(key)) {
            /* attribute not configured on this product �
                 silently drop, do not block the order */
            continue;
          } else {
            /* attribute hai par value invalid � drop */
            continue;
          }
        }
      }

      /* strip heavy catalog image blobs — the product's
           images already live in the products table and are
           re-fetched by productId wherever needed. Copying
           multi-MB base64 into every order row blows past
           MySQL max_allowed_packet and breaks order save. */
      const lightImage =
        typeof item.image === "string" &&
        item.image.length > 0 &&
        item.image.length < 200000
          ? item.image
          : "";
      const lightImages = Array.isArray(item.images)
        ? item.images
            .filter(
              (i) => typeof i === "string" && i.length > 0 && i.length < 200000,
            )
            .slice(0, 3)
        : [];

      validatedItems.push({
        ...item,
        productId: pid,
        price,
        quantity,
        total: itemTotal,
        unit: product.unit || "Pieces",
        attributes: cleanAttrs,
        image: lightImage,
        images: lightImages,

        /* customization sanitize � text/color/design
             structure validate karke hi store */
        designs: sanitizeDesigns(item.designs),

        /* business-card designs � front/back objects */
        frontDesign: sanitizeCardDesign(
          item.frontDesign || item.customization?.frontDesign,
        ),
        backDesign: sanitizeCardDesign(
          item.backDesign || item.customization?.backDesign,
        ),
        customization: (() => {
          const c = item.customization;
          if (
            !c ||
            typeof c !== "object" ||
            Array.isArray(c) ||
            JSON.stringify(c).length > 300000
          ) {
            return null;
          }
          return {
            ...c,
            frontDesign: sanitizeCardDesign(c.frontDesign),
            backDesign: sanitizeCardDesign(c.backDesign),
          };
        })(),
        template: String(item.template || "").slice(0, 40) || null,
        color:
          item.color !== undefined && item.color !== null
            ? sanitizeColor(item.color)
            : null,
        personName: String(item.personName || "").slice(0, 120),
        designation: String(item.designation || "").slice(0, 120),
        companyName: String(item.companyName || "").slice(0, 160),
        text: String(item.text || "").slice(0, 500),
      });
    }

    /* Coupon validate server side */
    let discount = 0;
    const couponCode = String(order.couponCode || "").trim();

    if (couponCode) {
      await ensureCouponsTable();

      const [couponRows] = await db.execute(
        "SELECT * FROM coupons WHERE code = ? LIMIT 1",
        [couponCode.toUpperCase()],
      );

      if (couponRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code.",
        });
      }

      const coupon = couponRows[0];
      const now = new Date();

      if (!coupon.active) {
        return res.status(400).json({
          success: false,
          message: "This coupon is no longer active.",
        });
      }

      if (now < new Date(coupon.valid_from)) {
        return res.status(400).json({
          success: false,
          message: `Coupon starts from ${new Date(coupon.valid_from).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
        });
      }

      if (now > new Date(coupon.valid_to)) {
        return res.status(400).json({
          success: false,
          message: "This coupon has expired.",
        });
      }

      if (subtotal < Number(coupon.min_order)) {
        return res.status(400).json({
          success: false,
          message: `Minimum order ?${Number(coupon.min_order).toLocaleString("en-IN")} required for this coupon.`,
        });
      }

      discount =
        coupon.type === "percent"
          ? Math.round((subtotal * Number(coupon.value)) / 100)
          : Number(coupon.value);

      discount = Math.min(discount, subtotal);
    }

    /* -------------------------------------------------
         SHIPPING CHARGE — authoritative quote service.
         The client's shipping/total fields are ignored;
         unserviceable pins, missing weights and provider
         failures BLOCK the order — never defaulted to ₹0.
      ------------------------------------------------- */

    const deliveryPincode = String(
      order.shippingAddress?.pincode ||
        order.address?.pincode ||
        order.pincode ||
        "",
    ).trim();

    if (!/^[1-9][0-9]{5}$/.test(deliveryPincode)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PINCODE",
        message: "A valid delivery pincode is required to place the order.",
      });
    }

    /* authoritative quote — serviceability + rate from the
         shipping service using current DB product weights.
         WEIGHT_MISSING / UNSERVICEABLE_PINCODE / provider
         failures reject the order; never falls back to ₹0 */
    const quote = await shippingService.quoteShipping({
      pincode: deliveryPincode,
      /* orders that never reach Razorpay (missing/other
           method) are priced at the COD rate */
      paymentMode: order.paymentMethod || "cod",
      items: validatedItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });

    if (!quote.ok) {
      return res.status(quote.status).json(quote.body);
    }

    if (!quote.body.serviceable) {
      return res.status(400).json({
        success: false,
        code: quote.body.code || "UNSERVICEABLE_PINCODE",
        message:
          quote.body.message || "Delivery is not available for this pincode.",
      });
    }

    const shippingCharge = Number(quote.body.shippingCharge);

    const finalTotal = Math.max(0, subtotal + shippingCharge - discount);

    /* if the frontend's total does not match, the server total is used */
    const frontendTotal = Number(
      order.total ?? order.grandTotal ?? order.totalPrice ?? 0,
    );

    if (Math.abs(frontendTotal - finalTotal) > 0.01) {
      console.warn(
        `Order total mismatch for ${orderNumber}: frontend=${frontendTotal}, server=${finalTotal}`,
      );
    }

    const total = finalTotal;

    const payload = {
      ...order,
      /* the request body's products/items/cart all carry
           the same heavy image blobs — keep only the slim
           validatedItems copies (undefined keys are dropped
           by JSON.stringify) */
      products: validatedItems,
      items: validatedItems,
      cart: undefined,
      subtotal,
      discount,
      shipping: shippingCharge,
      total: finalTotal,
      grandTotal: finalTotal,
      totalAmount: finalTotal,
      couponCode,
      orderNumber,
      status,
      tracking: order.tracking || buildOrderTracking(status),
    };

    /* if this orderNumber already exists, treat the
         request as an idempotent retry — run the upsert
         but do NOT decrement stock a second time */
    const [existingOrder] = await db.execute(
      "SELECT id FROM orders WHERE order_id = ? LIMIT 1",
      [orderNumber],
    );
    const orderAlreadyExists = existingOrder.length > 0;

    const orderParams = [
      orderNumber,
      req.user?.id || null,
      status,
      customerName,
      email,
      phone,
      total,
      total,
      String(order.paymentMethod || order.payment || ""),
      String(order.paymentStatus || "Pending"),
      JSON.stringify(validatedItems),
      JSON.stringify(payload),
    ];

    const orderInsertSql = `INSERT INTO orders
          (order_id, user_id, status,
           customer_name, email, phone,
           total_price, total,
           payment_method, payment_status,
           items, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           status = VALUES(status),
           payload = VALUES(payload),
           updated_at = CURRENT_TIMESTAMP`;

    if (orderAlreadyExists) {
      /* idempotent retry — same order, no stock change */
      await db.execute(orderInsertSql, orderParams);
    } else {
      /* new order — transaction: atomically decrement
           stock per item, then insert the order. Any
           failure rolls everything back (no oversell) */
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        for (const item of validatedItems) {
          const [upd] = await conn.execute(
            `UPDATE products
               SET stock = stock - ?
               WHERE id = ? AND stock >= ?`,
            [
              Number(item.quantity),
              Number(item.productId),
              Number(item.quantity),
            ],
          );
          if (upd.affectedRows !== 1) {
            throw new Error(
              `INSUFFICIENT_STOCK:${item.name || item.productId}`,
            );
          }
        }

        await conn.execute(orderInsertSql, orderParams);
        await conn.commit();
      } catch (txErr) {
        await conn.rollback().catch(() => {});
        if (String(txErr?.message || "").startsWith("INSUFFICIENT_STOCK:")) {
          return res.status(400).json({
            success: false,
            message: `"${txErr.message.split(":")[1]}" went out of stock. Please update your cart.`,
          });
        }
        throw txErr;
      } finally {
        conn.release();
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order saved.",
      orderNumber,
      /* authoritative server-computed totals — the
           success page must display these, not the
           client's own math */
      total,
      subtotal,
      discount,
      shippingCharge,
      couponCode: couponCode || null,
      status,
      paymentMethod: order.paymentMethod || order.payment || null,
      paymentStatus: order.paymentStatus || "Pending",
    });
  } catch (error) {
    console.error("Order save error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save order.",
    });
  }
});

/* USER � apne orders */
app.get("/api/orders/my", authenticateToken, async (req, res) => {
  try {
    await ensureOrdersTable();

    const [rows] = await db.execute(
      `SELECT * FROM orders
         WHERE user_id = ?
         ORDER BY created_at DESC`,
      [req.user?.id || 0],
    );

    const orders = rows.map(parseOrderRow);
    await enrichOrderItemImages(orders);

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("My orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load orders.",
    });
  }
});

/* USER � order number se track (sirf apna order ya admin) */
app.get(
  "/api/orders/track/:orderNumber",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureOrdersTable();

      const [rows] = await db.execute(
        `SELECT * FROM orders
         WHERE order_id = ? LIMIT 1`,
        [String(req.params.orderNumber)],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const row = rows[0];
      const isAdmin = req.user?.role === "admin";
      const isOwner = Number(row.user_id) === Number(req.user?.id);

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "You can only track your own orders.",
        });
      }

      const parsed = parseOrderRow(row);
      await enrichOrderItemImages(parsed);

      return res.status(200).json({
        success: true,
        order: parsed,
      });
    } catch (error) {
      console.error("Track order error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to track order.",
      });
    }
  },
);

/* USER/ADMIN — cancel an order
   owner cancels own order; admin cancels any.
   Atomic: status flip + stock restore in one transaction.
   Idempotent: already-cancelled returns success without
   touching stock again. */
app.put(
  "/api/orders/:orderNumber/cancel",
  authenticateToken,
  async (req, res) => {
    const orderNumber = String(req.params.orderNumber || "");
    const reason = String(req.body?.reason || "")
      .trim()
      .slice(0, 500);

    try {
      await ensureOrdersTable();

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        /* lock the row — concurrent cancels serialize here */
        const [rows] = await conn.execute(
          `SELECT * FROM orders
           WHERE order_id = ? LIMIT 1 FOR UPDATE`,
          [orderNumber],
        );

        if (rows.length === 0) {
          await conn.rollback();
          return res.status(404).json({
            success: false,
            message: "Order not found.",
          });
        }

        const row = rows[0];
        const isAdmin = req.user?.role === "admin";
        const isOwner = Number(row.user_id) === Number(req.user?.id);

        if (!isAdmin && !isOwner) {
          await conn.rollback();
          return res.status(403).json({
            success: false,
            message: "You can only cancel your own orders.",
          });
        }

        /* idempotent — already cancelled */
        if (String(row.status).toLowerCase() === "cancelled") {
          await conn.rollback();
          return res.status(200).json({
            success: true,
            alreadyCancelled: true,
            message: "Order is already cancelled.",
            orderNumber,
            cancelledAt: row.cancelled_at || null,
            cancelledBy: row.cancelled_by || null,
            cancelReason: row.cancel_reason || null,
            refundStatus: row.refund_status || null,
          });
        }

        if (!isOrderCancellable(row.status)) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Order cannot be cancelled once it is "${row.status}".`,
          });
        }

        /* refund handling — COD / unpaid: nothing to refund.
           paid online: mark refund pending review, never
           claim a refund the provider hasn't confirmed */
        const paidOnline =
          !String(row.payment_method || "")
            .toLowerCase()
            .includes("cod") &&
          ["paid", "success", "succeeded", "captured"].includes(
            String(row.payment_status || "").toLowerCase(),
          );
        const refundStatus = paidOnline ? "Pending" : null;

        /* conditional update — also guards against races
           that slipped past the row lock's status check */
        const [upd] = await conn.execute(
          `UPDATE orders
           SET status = 'Cancelled',
               cancelled_at = CURRENT_TIMESTAMP,
               cancelled_by = ?,
               cancel_reason = ?,
               refund_status = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ?
             AND status = ?`,
          [
            isAdmin ? "admin" : "customer",
            reason || null,
            refundStatus,
            orderNumber,
            row.status,
          ],
        );

        if (upd.affectedRows !== 1) {
          await conn.rollback();
          return res.status(409).json({
            success: false,
            message: "Order status changed — please refresh and try again.",
          });
        }

        /* restore stock for every item exactly once */
        let items = [];
        try {
          items = JSON.parse(row.items || "[]");
        } catch {
          items = [];
        }

        for (const it of items) {
          const pid = Number(it?.productId || it?.product_id || it?.id);
          const qty = Number(it?.quantity) || 0;
          if (!pid || qty <= 0) continue;
          await conn.execute(
            `UPDATE products
             SET stock = stock + ?
             WHERE id = ?`,
            [qty, pid],
          );
        }

        /* read back the persisted cancellation fields so the
           response carries the real saved values */
        const [saved] = await conn.execute(
          `SELECT cancelled_at, cancelled_by, cancel_reason,
                  refund_status
           FROM orders WHERE order_id = ? LIMIT 1`,
          [orderNumber],
        );
        const savedRow = saved[0] || {};

        await conn.commit();

        return res.status(200).json({
          success: true,
          message: "Order cancelled successfully.",
          orderNumber,
          cancelledAt: savedRow.cancelled_at || null,
          cancelledBy: savedRow.cancelled_by || null,
          cancelReason: savedRow.cancel_reason || null,
          refundStatus: savedRow.refund_status || null,
        });
      } catch (txErr) {
        await conn.rollback().catch(() => {});
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("Cancel order error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to cancel order.",
      });
    }
  },
);

/* ADMIN � saare orders */
app.get(
  "/api/admin/orders",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureOrdersTable();

      const [rows] = await db.execute(
        "SELECT * FROM orders ORDER BY created_at DESC",
      );

      const orders = rows.map(parseOrderRow);
      await enrichOrderItemImages(orders);

      return res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("Admin orders error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load orders.",
      });
    }
  },
);

/* ADMIN � status update */
app.put(
  "/api/admin/orders/:orderNumber/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const orderNumber = String(req.params.orderNumber);
      const status = String(req.body?.status || "").trim();

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required.",
        });
      }

      await ensureOrdersTable();

      const [rows] = await db.execute(
        `SELECT * FROM orders
         WHERE order_id = ? LIMIT 1`,
        [orderNumber],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      let payload = {};
      try {
        payload = JSON.parse(rows[0].payload || "{}");
      } catch {
        payload = {};
      }

      payload.status = status;
      payload.tracking = buildOrderTracking(status);
      payload.updatedAt = new Date().toISOString();

      await db.execute(
        `UPDATE orders
         SET status = ?, payload = ?
         WHERE order_id = ?`,
        [status, JSON.stringify(payload), orderNumber],
      );

      return res.status(200).json({
        success: true,
        message: "Order status updated.",
        status,
      });
    } catch (error) {
      console.error("Order status update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update order status.",
      });
    }
  },
);

/* =========================================================
   DISCOUNT COUPONS
========================================================= */

async function ensureCouponsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT NOT NULL AUTO_INCREMENT,
      code VARCHAR(50) NOT NULL,
      type ENUM('percent','flat') NOT NULL DEFAULT 'percent',
      value DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_order DECIMAL(10,2) NOT NULL DEFAULT 0,
      valid_from DATETIME NOT NULL,
      valid_to DATETIME NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY coupon_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

const formatCoupon = (row) => ({
  id: row.id,
  code: row.code,
  type: row.type,
  value: Number(row.value),
  minOrder: Number(row.min_order),
  validFrom: row.valid_from,
  validTo: row.valid_to,
  active: Boolean(row.active),
  createdAt: row.created_at,
});

/* ADMIN � list */
app.get(
  "/api/admin/coupons",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureCouponsTable();
      const [rows] = await db.execute(
        "SELECT * FROM coupons ORDER BY created_at DESC",
      );
      return res.status(200).json({
        success: true,
        coupons: rows.map(formatCoupon),
      });
    } catch (error) {
      console.error("Coupons fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load coupons.",
      });
    }
  },
);

/* ADMIN � create */
app.post(
  "/api/admin/coupons",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const code = String(req.body?.code || "")
        .trim()
        .toUpperCase();
      const type = req.body?.type === "flat" ? "flat" : "percent";
      const value = Number(req.body?.value);
      const minOrder = Number(req.body?.minOrder) || 0;
      const validFrom = req.body?.validFrom;
      const validTo = req.body?.validTo;

      if (code.length < 3 || !/^[A-Z0-9]+$/.test(code)) {
        return res.status(400).json({
          success: false,
          message:
            "Code must be at least 3 characters (letters & numbers only).",
        });
      }

      if (!value || value <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be greater than 0.",
        });
      }

      if (type === "percent" && value > 100) {
        return res.status(400).json({
          success: false,
          message: "Percent discount cannot exceed 100.",
        });
      }

      const from = new Date(validFrom);
      const to = new Date(validTo);

      if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
        return res.status(400).json({
          success: false,
          message: "Valid To must be after Valid From.",
        });
      }

      await ensureCouponsTable();

      const [existing] = await db.execute(
        "SELECT id FROM coupons WHERE code = ? LIMIT 1",
        [code],
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Coupon code already exists.",
        });
      }

      const [result] = await db.execute(
        `INSERT INTO coupons
          (code, type, value, min_order,
           valid_from, valid_to, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [code, type, value, minOrder, from, to],
      );

      return res.status(201).json({
        success: true,
        message: "Coupon created.",
        coupon: {
          id: result.insertId,
          code,
          type,
          value,
          minOrder,
          validFrom: from,
          validTo: to,
          active: true,
        },
      });
    } catch (error) {
      console.error("Coupon create error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to create coupon.",
      });
    }
  },
);

/* ADMIN � update (edit / active toggle) */
app.put(
  "/api/admin/coupons/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await ensureCouponsTable();

      const [rows] = await db.execute(
        "SELECT * FROM coupons WHERE id = ? LIMIT 1",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found.",
        });
      }

      const current = rows[0];

      const code = String(req.body?.code || current.code)
        .trim()
        .toUpperCase();
      const type =
        req.body?.type === "flat"
          ? "flat"
          : req.body?.type === "percent"
            ? "percent"
            : current.type;
      const value =
        req.body?.value !== undefined
          ? Number(req.body.value)
          : Number(current.value);
      const minOrder =
        req.body?.minOrder !== undefined
          ? Number(req.body.minOrder)
          : Number(current.min_order);
      const validFrom = req.body?.validFrom
        ? new Date(req.body.validFrom)
        : current.valid_from;
      const validTo = req.body?.validTo
        ? new Date(req.body.validTo)
        : current.valid_to;
      const active =
        req.body?.active !== undefined
          ? req.body.active
            ? 1
            : 0
          : current.active;

      if (code.length < 3 || !/^[A-Z0-9]+$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code.",
        });
      }

      if (!value || value <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be greater than 0.",
        });
      }

      if (new Date(validTo) <= new Date(validFrom)) {
        return res.status(400).json({
          success: false,
          message: "Valid To must be after Valid From.",
        });
      }

      const [dup] = await db.execute(
        "SELECT id FROM coupons WHERE code = ? AND id != ? LIMIT 1",
        [code, id],
      );

      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Another coupon with this code exists.",
        });
      }

      await db.execute(
        `UPDATE coupons
         SET code = ?, type = ?, value = ?,
             min_order = ?, valid_from = ?,
             valid_to = ?, active = ?
         WHERE id = ?`,
        [code, type, value, minOrder, validFrom, validTo, active, id],
      );

      return res.status(200).json({
        success: true,
        message: "Coupon updated.",
      });
    } catch (error) {
      console.error("Coupon update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update coupon.",
      });
    }
  },
);

/* ADMIN � delete */
app.delete(
  "/api/admin/coupons/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await ensureCouponsTable();

      const [result] = await db.execute("DELETE FROM coupons WHERE id = ?", [
        id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Coupon deleted.",
      });
    } catch (error) {
      console.error("Coupon delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete coupon.",
      });
    }
  },
);

/* PUBLIC � currently live coupons (for the offer bar) */
app.get("/api/coupons/active", async (req, res) => {
  try {
    await ensureCouponsTable();

    const [rows] = await db.execute(
      `SELECT * FROM coupons
       WHERE active = 1
         AND valid_from <= NOW()
         AND valid_to >= NOW()
       ORDER BY value DESC`,
    );

    return res.status(200).json({
      success: true,
      coupons: rows.map(formatCoupon),
    });
  } catch (error) {
    console.error("Active coupons error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load offers.",
    });
  }
});

/* USER � coupon validate (checkout) */
app.post("/api/coupons/validate", async (req, res) => {
  try {
    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();
    const orderTotal = Number(req.body?.total) || 0;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Enter a coupon code.",
      });
    }

    await ensureCouponsTable();

    const [rows] = await db.execute(
      "SELECT * FROM coupons WHERE code = ? LIMIT 1",
      [code],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code.",
      });
    }

    const coupon = rows[0];
    const now = new Date();

    if (!coupon.active) {
      return res.status(400).json({
        success: false,
        message: "This coupon is no longer active.",
      });
    }

    if (now < new Date(coupon.valid_from)) {
      return res.status(400).json({
        success: false,
        message: `Coupon starts from ${new Date(coupon.valid_from).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
      });
    }

    if (now > new Date(coupon.valid_to)) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired.",
      });
    }

    if (orderTotal < Number(coupon.min_order)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ?${Number(coupon.min_order).toLocaleString("en-IN")} required for this coupon.`,
      });
    }

    const discount =
      coupon.type === "percent"
        ? Math.round((orderTotal * Number(coupon.value)) / 100)
        : Number(coupon.value);

    return res.status(200).json({
      success: true,
      message: "Coupon applied!",
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
      },
      discount: Math.min(discount, orderTotal),
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to validate coupon.",
    });
  }
});

/* =========================================================
   DELIVERY CHARGES — admin-managed per-pincode shipping

   NOTE: an explicitly configured charge of 0 is allowed and
   means free delivery for that pincode. There is NO default
   free-shipping rule — a missing or inactive row must block
   the pincode at delivery-check (Step 2 integration).
========================================================= */

let deliveryChargesEnsured = false;
async function ensureDeliveryChargesTable() {
  if (deliveryChargesEnsured) return;
  deliveryChargesEnsured = true;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_charges (
      id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      pincode    CHAR(6)       NOT NULL,
      city       VARCHAR(100)  NOT NULL,
      state      VARCHAR(100)  NOT NULL,
      charge     DECIMAL(10,2) NOT NULL,
      is_active  TINYINT(1)    NOT NULL DEFAULT 1,
      created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_delivery_pincode (pincode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

const formatDeliveryCharge = (row) => ({
  id: row.id,
  pincode: row.pincode,
  city: row.city,
  state: row.state,
  charge: Number(row.charge),
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/* shared payload validation — returns a clean payload or
   { error } for a 400 response. An explicitly configured
   charge of 0 is allowed (means free delivery); missing or
   non-numeric values are rejected */
function validateDeliveryCharge(body = {}) {
  const pincode = String(body.pincode || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
  const charge = Number(body.charge);

  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return {
      error: "Please enter a valid 6 digit Indian pincode.",
    };
  }
  if (city.length < 2) {
    return { error: "Please enter a valid city." };
  }
  if (state.length < 2) {
    return { error: "Please enter a valid state." };
  }
  if (
    body.charge === undefined ||
    body.charge === null ||
    String(body.charge).trim() === "" ||
    !Number.isFinite(charge) ||
    charge < 0
  ) {
    return {
      error: "Delivery charge must be a number, 0 or greater.",
    };
  }

  return { pincode, city, state, charge };
}

const validDeliveryId = (v) => /^[0-9]+$/.test(String(v || ""));

/* ADMIN — list */
app.get(
  "/api/admin/delivery-charges",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureDeliveryChargesTable();
      const [rows] = await db.execute(
        "SELECT * FROM delivery_charges ORDER BY pincode ASC",
      );
      return res.status(200).json({
        success: true,
        charges: rows.map(formatDeliveryCharge),
      });
    } catch (error) {
      console.error("Delivery charges fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load delivery charges.",
      });
    }
  },
);

/* ADMIN — create */
app.post(
  "/api/admin/delivery-charges",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureDeliveryChargesTable();
      const v = validateDeliveryCharge(req.body);
      if (v.error) {
        return res.status(400).json({ success: false, message: v.error });
      }

      const [dupe] = await db.execute(
        "SELECT id FROM delivery_charges WHERE pincode = ? LIMIT 1",
        [v.pincode],
      );
      if (dupe.length) {
        return res.status(409).json({
          success: false,
          message: "A delivery charge already exists for this pincode.",
        });
      }

      const [result] = await db.execute(
        `INSERT INTO delivery_charges
           (pincode, city, state, charge, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          v.pincode,
          v.city,
          v.state,
          v.charge,
          req.body.isActive === false ? 0 : 1,
        ],
      );

      return res.status(201).json({
        success: true,
        message: "Delivery charge added.",
        charge: formatDeliveryCharge({
          id: result.insertId,
          pincode: v.pincode,
          city: v.city,
          state: v.state,
          charge: v.charge,
          is_active: req.body.isActive === false ? 0 : 1,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });
    } catch (error) {
      if (
        error?.code === "ER_DUP_ENTRY" ||
        String(error?.message || "").includes("Duplicate")
      ) {
        return res.status(409).json({
          success: false,
          message: "A delivery charge already exists for this pincode.",
        });
      }
      console.error("Delivery charge create error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to save delivery charge.",
      });
    }
  },
);

/* ADMIN — update */
app.put(
  "/api/admin/delivery-charges/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureDeliveryChargesTable();
      if (!validDeliveryId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery charge id.",
        });
      }
      const id = Number(req.params.id);

      const v = validateDeliveryCharge(req.body);
      if (v.error) {
        return res.status(400).json({ success: false, message: v.error });
      }

      /* pincode uniqueness — excluding this row */
      const [dupe] = await db.execute(
        `SELECT id FROM delivery_charges
         WHERE pincode = ? AND id <> ? LIMIT 1`,
        [v.pincode, id],
      );
      if (dupe.length) {
        return res.status(409).json({
          success: false,
          message: "Another pincode entry already uses this pincode.",
        });
      }

      const [result] = await db.execute(
        `UPDATE delivery_charges
         SET pincode = ?, city = ?, state = ?, charge = ?
         WHERE id = ?`,
        [v.pincode, v.city, v.state, v.charge, id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Delivery charge not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Delivery charge updated.",
      });
    } catch (error) {
      console.error("Delivery charge update error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update delivery charge.",
      });
    }
  },
);

/* ADMIN — toggle active flag. Body { isActive } optional;
   omitted means flip the current value */
app.patch(
  "/api/admin/delivery-charges/:id/toggle",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureDeliveryChargesTable();
      if (!validDeliveryId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery charge id.",
        });
      }
      const id = Number(req.params.id);

      const [rows] = await db.execute(
        "SELECT is_active FROM delivery_charges WHERE id = ?",
        [id],
      );
      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Delivery charge not found.",
        });
      }

      const next =
        req.body.isActive === undefined
          ? !rows[0].is_active
          : Boolean(req.body.isActive);

      await db.execute(
        "UPDATE delivery_charges SET is_active = ? WHERE id = ?",
        [next ? 1 : 0, id],
      );

      return res.status(200).json({
        success: true,
        message: next
          ? "Delivery location activated."
          : "Delivery location deactivated.",
        isActive: next,
      });
    } catch (error) {
      console.error("Delivery toggle error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update delivery location.",
      });
    }
  },
);

/* ADMIN — delete. delivery_charges has no dependent rows,
   so a plain delete is safe; the row is gone permanently */
app.delete(
  "/api/admin/delivery-charges/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureDeliveryChargesTable();
      if (!validDeliveryId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery charge id.",
        });
      }
      const id = Number(req.params.id);

      const [result] = await db.execute(
        "DELETE FROM delivery_charges WHERE id = ?",
        [id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Delivery charge not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Delivery charge deleted.",
      });
    } catch (error) {
      console.error("Delivery charge delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete delivery charge.",
      });
    }
  },
);

/* =========================================================
   CONTACT INQUIRIES � customer "Get a Quote" form
========================================================= */

async function ensureContactInquiriesTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      company_name VARCHAR(200) DEFAULT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      product_id VARCHAR(50) DEFAULT NULL,
      product_name VARCHAR(255) DEFAULT NULL,
      product_options VARCHAR(255) DEFAULT NULL,
      quantity INT DEFAULT NULL,
      message TEXT NOT NULL,
      source VARCHAR(50) DEFAULT 'website',
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      admin_notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

/* lightweight spam guard � per-IP, min 20s between submissions,
   max 8 submissions per hour */
const inquiryRateMap = new Map();

function inquiryRateOk(ip) {
  const now = Date.now();
  const list = (inquiryRateMap.get(ip) || []).filter(
    (t) => now - t < 60 * 60 * 1000,
  );

  if (list.length >= 8) return false;
  if (list.length && now - list[list.length - 1] < 20000) return false;

  list.push(now);
  inquiryRateMap.set(ip, list);
  return true;
}

const VALID_INQUIRY_STATUS = ["new", "contacted", "in_progress", "resolved"];

app.post("/api/contact-inquiries", async (req, res) => {
  try {
    await ensureContactInquiriesTable();

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "unknown";

    if (!inquiryRateOk(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many submissions. Please wait a moment and try again.",
      });
    }

    const body = req.body || {};

    const name = String(body.name || "")
      .trim()
      .slice(0, 150);
    const companyName = String(body.companyName || "")
      .trim()
      .slice(0, 200);
    const email = String(body.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 200);
    const phone = String(body.phone || "")
      .trim()
      .replace(/[^\d+]/g, "")
      .slice(0, 30);
    const productId = String(body.productId || "")
      .trim()
      .slice(0, 50);
    const productName = String(body.productName || "")
      .trim()
      .slice(0, 255);
    const productOptions = String(body.productOptions || "")
      .trim()
      .slice(0, 255);
    const message = String(body.message || "").trim();
    const source = String(body.source || "website")
      .trim()
      .slice(0, 50);
    const quantity = Math.max(
      0,
      Math.floor(Number(body.quantity || 0)) || null,
    );

    /* validation */
    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your name.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10 digit phone number.",
      });
    }

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please tell us a bit more about your requirement.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO contact_inquiries
        (name, company_name, email, phone, product_id,
         product_name, product_options, quantity, message, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        companyName || null,
        email,
        phone,
        productId || null,
        productName || null,
        productOptions || null,
        quantity,
        message,
        source,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Inquiry received. Our team will contact you shortly.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("CONTACT INQUIRY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit inquiry right now.",
    });
  }
});

app.get(
  "/api/contact-inquiries",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureContactInquiriesTable();

      const status = String(req.query.status || "")
        .trim()
        .toLowerCase();
      const q = String(req.query.q || "").trim();
      const sort =
        String(req.query.sort || "newest") === "oldest" ? "ASC" : "DESC";

      let sql = "SELECT * FROM contact_inquiries";
      const params = [];
      const where = [];

      if (VALID_INQUIRY_STATUS.includes(status)) {
        where.push("status = ?");
        params.push(status);
      }

      if (q) {
        where.push(
          "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ? OR product_name LIKE ?)",
        );
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }

      if (where.length) {
        sql += ` WHERE ${where.join(" AND ")}`;
      }

      sql += ` ORDER BY created_at ${sort} LIMIT 500`;

      const [rows] = await db.execute(sql, params);

      const [counts] = await db.execute(
        "SELECT status, COUNT(*) AS total FROM contact_inquiries GROUP BY status",
      );

      return res.json({
        success: true,
        inquiries: rows,
        counts: Object.fromEntries(
          counts.map((c) => [c.status, Number(c.total)]),
        ),
      });
    } catch (error) {
      console.error("GET INQUIRIES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load inquiries.",
      });
    }
  },
);

app.patch(
  "/api/contact-inquiries/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureContactInquiriesTable();

      const status = String(req.body.status || "")
        .trim()
        .toLowerCase();
      const adminNotes = String(req.body.adminNotes || "").trim();

      if (status && !VALID_INQUIRY_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status.",
        });
      }

      const sets = [];
      const params = [];

      if (status) {
        sets.push("status = ?");
        params.push(status);
      }

      sets.push("admin_notes = ?");
      params.push(adminNotes || null);

      params.push(req.params.id);

      await db.execute(
        `UPDATE contact_inquiries SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );

      return res.json({
        success: true,
        message: "Inquiry updated.",
      });
    } catch (error) {
      console.error("UPDATE INQUIRY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to update inquiry.",
      });
    }
  },
);

app.delete(
  "/api/contact-inquiries/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureContactInquiriesTable();

      await db.execute("DELETE FROM contact_inquiries WHERE id = ?", [
        req.params.id,
      ]);

      return res.json({
        success: true,
        message: "Inquiry deleted.",
      });
    } catch (error) {
      console.error("DELETE INQUIRY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to delete inquiry.",
      });
    }
  },
);

/* =========================================================
   RAZORPAY PAYMENTS (TEST MODE)
   - amount kabhi client se trust nahi � orders.total
     server-side recalculated hai
   - signature HMAC-SHA256 verified
========================================================= */

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

let razorpayClient = null;

const getRazorpayClient = () => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return null;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};

const timingSafeCompare = (a, b) => {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/* ------------------------------------------------------------------
   POST /api/payments/razorpay/order
   local order ke server-stored total se razorpay order banao
   (idempotent � same order ka existing rzp order reuse)
------------------------------------------------------------------- */
app.post(
  "/api/payments/razorpay/order",
  authenticateToken,
  async (req, res) => {
    try {
      const client = getRazorpayClient();
      if (!client) {
        return res.status(503).json({
          success: false,
          message: "Payment gateway is not configured.",
        });
      }

      const orderNumber = String(req.body?.orderNumber || "").trim();
      if (!orderNumber) {
        return res.status(400).json({
          success: false,
          message: "orderNumber is required.",
        });
      }

      await ensureOrdersTable();

      const [rows] = await db.execute(
        `SELECT order_id, user_id, total,
                payment_status, payment_method,
                razorpay_order_id
         FROM orders WHERE order_id = ? LIMIT 1`,
        [orderNumber],
      );

      const order = rows?.[0];
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      /* sirf owner ya admin */
      const isAdmin = req.user?.role === "admin";
      if (!isAdmin && Number(order.user_id) !== Number(req.user?.id)) {
        return res.status(403).json({
          success: false,
          message: "This order does not belong to you.",
        });
      }

      if (String(order.payment_status).toLowerCase() === "paid") {
        return res.status(409).json({
          success: false,
          message: "Order is already paid.",
        });
      }

      const amountPaise = Math.round(Number(order.total) * 100);
      if (!amountPaise || amountPaise <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid order amount.",
        });
      }

      /* idempotent � reuse the previous razorpay order */
      if (order.razorpay_order_id) {
        return res.status(200).json({
          success: true,
          keyId: RAZORPAY_KEY_ID,
          razorpayOrderId: order.razorpay_order_id,
          amount: amountPaise,
          currency: "INR",
          orderNumber: order.order_id,
        });
      }

      const rzpOrder = await client.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: orderNumber.slice(0, 40),
        payment_capture: 1,
      });

      await db.execute(
        `UPDATE orders
         SET razorpay_order_id = ?,
             payment_attempts = payment_attempts + 1
         WHERE order_id = ?`,
        [rzpOrder.id, orderNumber],
      );

      console.log(
        `Razorpay order created: ${rzpOrder.id} -> ${orderNumber} (Rs.${order.total})`,
      );

      return res.status(200).json({
        success: true,
        keyId: RAZORPAY_KEY_ID,
        razorpayOrderId: rzpOrder.id,
        amount: amountPaise,
        currency: "INR",
        orderNumber: order.order_id,
      });
    } catch (error) {
      console.error("Razorpay order create error:", error?.message);
      return res.status(500).json({
        success: false,
        message: "Unable to create payment order.",
      });
    }
  },
);

/* ------------------------------------------------------------------
   POST /api/payments/razorpay/verify
   HMAC-SHA256(razorpay_order_id|razorpay_payment_id, secret)
------------------------------------------------------------------- */
app.post(
  "/api/payments/razorpay/verify",
  authenticateToken,
  async (req, res) => {
    try {
      if (!RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
          success: false,
          message: "Payment gateway is not configured.",
        });
      }

      const {
        orderNumber,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: rzpSignature,
      } = req.body || {};

      if (!orderNumber || !rzpOrderId || !rzpPaymentId || !rzpSignature) {
        return res.status(400).json({
          success: false,
          message: "Missing payment details.",
        });
      }

      await ensureOrdersTable();

      const [rows] = await db.execute(
        `SELECT order_id, user_id, payment_status,
                razorpay_order_id, razorpay_payment_id
         FROM orders WHERE order_id = ? LIMIT 1`,
        [String(orderNumber)],
      );

      const order = rows?.[0];
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const isAdmin = req.user?.role === "admin";
      if (!isAdmin && Number(order.user_id) !== Number(req.user?.id)) {
        return res.status(403).json({
          success: false,
          message: "This order does not belong to you.",
        });
      }

      /* rzp order id must come from the DB � do not trust arbitrary browser ids */
      if (
        !order.razorpay_order_id ||
        order.razorpay_order_id !== String(rzpOrderId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment order does not match.",
        });
      }

      /* idempotent � OK if the same payment is verified again */
      if (
        String(order.payment_status).toLowerCase() === "paid" &&
        order.razorpay_payment_id === String(rzpPaymentId)
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment already verified.",
          orderNumber: order.order_id,
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${rzpOrderId}|${rzpPaymentId}`)
        .digest("hex");

      if (!timingSafeCompare(expectedSignature, rzpSignature)) {
        console.log(
          `Razorpay verify FAILED (bad signature): ${orderNumber} / ${rzpOrderId}`,
        );
        return res.status(400).json({
          success: false,
          message: "Payment verification failed.",
        });
      }

      await db.execute(
        `UPDATE orders
         SET payment_status = 'Paid',
             razorpay_payment_id = ?,
             razorpay_signature = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [String(rzpPaymentId), String(rzpSignature), String(orderNumber)],
      );

      console.log(`Razorpay payment PAID: ${rzpPaymentId} -> ${orderNumber}`);

      return res.status(200).json({
        success: true,
        message: "Payment verified.",
        orderNumber: order.order_id,
      });
    } catch (error) {
      console.error("Razorpay verify error:", error?.message);
      return res.status(500).json({
        success: false,
        message: "Unable to verify payment.",
      });
    }
  },
);

/* ------------------------------------------------------------------
   POST /api/payments/razorpay/webhook
   - signature: x-razorpay-signature, HMAC webhook secret se
   - idempotent: payment.captured / payment.failed
------------------------------------------------------------------- */
app.post("/api/payments/razorpay/webhook", async (req, res) => {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Webhook is not configured.",
      });
    }

    const signature = req.headers["x-razorpay-signature"] || "";
    const raw = req.rawBody;

    if (!raw || !signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook request.",
      });
    }

    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");

    if (!timingSafeCompare(expected, signature)) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    const event = req.body || {};
    const eventName = event.event;
    const payment = event.payload?.payment?.entity || null;

    if (
      payment &&
      (eventName === "payment.captured" || eventName === "payment.failed")
    ) {
      const rzpOrderId = String(payment.order_id || "");

      const [rows] = await db.execute(
        `SELECT order_id, payment_status,
                  razorpay_payment_id
           FROM orders
           WHERE razorpay_order_id = ? LIMIT 1`,
        [rzpOrderId],
      );

      const order = rows?.[0];
      if (!order) {
        /* not our order � ack it, stop retries */
        return res.status(200).json({ success: true });
      }

      const paymentId = String(payment.id || "");

      if (eventName === "payment.captured") {
        if (
          String(order.payment_status).toLowerCase() !== "paid" ||
          order.razorpay_payment_id !== paymentId
        ) {
          await db.execute(
            `UPDATE orders
               SET payment_status = 'Paid',
                   razorpay_payment_id = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE order_id = ?`,
            [paymentId, order.order_id],
          );
          console.log(
            `Webhook: payment captured ${paymentId} -> ${order.order_id}`,
          );
        }
      } else if (String(order.payment_status).toLowerCase() !== "paid") {
        await db.execute(
          `UPDATE orders
             SET payment_status = 'Failed',
                 razorpay_payment_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
          [paymentId, order.order_id],
        );
        console.log(
          `Webhook: payment failed ${paymentId} -> ${order.order_id}`,
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error?.message);
    return res.status(500).json({ success: false });
  }
});

/* =========================================================
   404 HANDLER � sabse aakhir mein
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    path: req.originalUrl,
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number(error.status || error.statusCode) || 500;

  /* Malformed JSON body � client error, not server error */
  const isJsonParseError =
    error instanceof SyntaxError && error.type === "entity.parse.failed";

  const finalStatus = isJsonParseError ? 400 : status;

  console.error("GLOBAL ERROR:", error);

  return res.status(finalStatus).json({
    success: false,
    message: isJsonParseError
      ? "Malformed JSON request."
      : finalStatus < 500
        ? error.message || "Invalid request."
        : "Internal server error.",
  });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`Print Expert API running on http://localhost:${PORT}`);
  console.log("=================================");
});

/* =========================================================
   DAILY DATABASE BACKUP (runs while the API is up)

   - OPT-IN ONLY: requires BACKUP_SCHEDULE=on AND configured
     backup credentials (BACKUP_DB_USER or DB_USER) — never
     fires just because NODE_ENV/APP_ENV says "production"
   - runs ~03:00 local time and once at boot if no backup
     exists for today
   - script: backupDb.js (validated, gzip, retention, lock)
========================================================= */

const backupsExplicitlyEnabled =
  process.env.BACKUP_SCHEDULE === "on" &&
  !!(process.env.BACKUP_DB_USER || process.env.DB_USER);

if (backupsExplicitlyEnabled) {
  const { spawn } = require("child_process");
  const fs = require("fs");

  const backupDir =
    process.env.BACKUP_DIR ||
    require("path").join(
      process.env.USERPROFILE || "C:\\",
      "printexpert-db-backups",
    );

  const runBackup = (why) => {
    const child = spawn(
      process.execPath,
      [require("path").join(__dirname, "backupDb.js")],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    console.log(`backup scheduled (${why}) → ${backupDir}`);
  };

  const backupExistsToday = () => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      return fs
        .readdirSync(backupDir)
        .some((f) => f.endsWith(".sql.gz") && f.includes(day));
    } catch {
      return false;
    }
  };

  const scheduleDaily = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    setTimeout(() => {
      runBackup("daily 03:00");
      scheduleDaily();
    }, next - now);
  };

  if (!backupExistsToday()) runBackup("no backup today");
  scheduleDaily();
}
