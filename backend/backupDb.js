/**
 * backupDb.js — timestamped, gzip-compressed, validated MySQL backups
 *
 * Usage:
 *   node backupDb.js              -> create + validate + apply retention
 *   node backupDb.js --verify     -> create, validate, AND restore-test into
 *                                    a separate throwaway database
 *   node backupDb.js --list       -> list existing backups
 *
 * Output: BACKUP_DIR env var, default C:\Users\<you>\printexpert-db-backups
 * Retention: last 14 daily backups + newest backup per ISO week for 8 weeks.
 * Old files are deleted ONLY after the newest backup passes validation.
 */

require("dotenv").config();
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 3306;
/* backups use elevated creds when provided (app user has no
   CREATE/DROP DATABASE so restore-tests need BACKUP_DB_*) */
const DB_USER = process.env.BACKUP_DB_USER || process.env.DB_USER || "root";
const DB_PASS =
  process.env.BACKUP_DB_PASS ?? process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME || "printexpert";

const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  path.join(process.env.USERPROFILE || "C:\\", "printexpert-db-backups");

const KEEP_DAILY = 14;
const KEEP_WEEKS = 8;
const LOG_FILE = path.join(BACKUP_DIR, "backup.log");
const LOCK_FILE = path.join(BACKUP_DIR, "backup.lock");
const LOCK_STALE_MS = 2 * 60 * 60 * 1000; // 2h — a crashed run leaves a stale lock

/* optional second destination — a mounted share / cloud-synced
   folder / another drive. Backups are copied there AFTER local
   validation, so a remote failure never loses the local copy. */
const REMOTE_DIR = process.env.BACKUP_REMOTE_DIR || "";

/* required tables — a dump missing these is not a valid backup */
const REQUIRED_TABLES = ["users", "products", "orders"];

/* ---------- helpers ---------- */

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    /* log failure is not fatal */
  }
}

/* ---------- run lock — prevents overlapping/concurrent runs ---------- */

function acquireLock() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  try {
    const st = fs.statSync(LOCK_FILE);
    if (Date.now() - st.mtimeMs < LOCK_STALE_MS) {
      log("backup SKIP: another run is in progress (lock held)");
      return false;
    }
    log("backup: stale lock found (>2h) — taking over");
  } catch {
    /* no lock — proceed */
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  return true;
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    /* best-effort */
  }
}

/* ---------- failure notification (optional, SMTP-based) ---------- */

async function notifyFailure(subject, detail) {
  const to =
    process.env.BACKUP_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  if (
    !to ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return; // notification settings not configured — log only
  }
  try {
    const nodemailer = require("nodemailer");
    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await mailer.sendMail({
      from:
        process.env.SMTP_FROM ||
        `"Print Expert Backups" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: `${subject}\n\n${detail}\n\n— backupDb.js`,
    });
    log(`failure notification sent → ${to}`);
  } catch (e) {
    log(`notification send failed: ${e.message}`);
  }
}

function findBin(name) {
  const candidates = [
    process.env.MYSQL_BIN_DIR &&
      path.join(process.env.MYSQL_BIN_DIR, name + ".exe"),
    `C:\\xampp1\\mysql\\bin\\${name}.exe`,
    `C:\\xampp\\mysql\\bin\\${name}.exe`,
    `C:\\Program Files\\MariaDB 13.0\\bin\\${name}.exe`,
  ].filter(Boolean);

  for (const c of candidates) if (fs.existsSync(c)) return c;
  return name; // hope it's on PATH
}

function tsName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${DB_NAME}_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.sql.gz`
  );
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return `${d.getUTCFullYear()}-W` +
    String(1 + Math.round((d - firstThu) / 604800000)).padStart(2, "0");
}

function listBackups() {
  try {
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql.gz"))
      .map((f) => {
        const p = path.join(BACKUP_DIR, f);
        return {
          file: f,
          path: p,
          size: fs.statSync(p).size,
          mtime: fs.statSync(p).mtime,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

/* ---------- create ---------- */

function createBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const out = path.join(BACKUP_DIR, tsName());

  const dump = execFileSync(findBin("mysqldump"), [
    "-h", DB_HOST,
    "-P", String(DB_PORT),
    "-u", DB_USER,
    ...(DB_PASS ? [`-p${DB_PASS}`] : []),
    "--single-transaction",
    "--routines",
    "--triggers",
    "--skip-lock-tables",
    "--databases", DB_NAME,
  ], { maxBuffer: 512 * 1024 * 1024 });

  fs.writeFileSync(out, zlib.gzipSync(dump));
  return { out, bytes: dump.length };
}

/* ---------- validation ---------- */

function validateBackup(filePath) {
  const raw = zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8");
  const missing = REQUIRED_TABLES.filter(
    (t) => !raw.includes(`CREATE TABLE \`${t}\``)
  );
  if (missing.length)
    return { ok: false, reason: `missing tables: ${missing.join(", ")}` };
  if (raw.length < 5000)
    return { ok: false, reason: `suspiciously small (${raw.length} bytes)` };
  return { ok: true, bytes: raw.length };
}

/* ---------- retention ---------- */

function applyRetention() {
  const all = listBackups();
  const now = Date.now();
  const keep = new Set();

  // newest KEEP_DAILY files always kept
  all.slice(0, KEEP_DAILY).forEach((b) => keep.add(b.file));

  // newest file per ISO week, for KEEP_WEEKS weeks
  const seenWeeks = new Set();
  for (const b of all) {
    const ageWeeks = (now - b.mtime.getTime()) / (7 * 86400000);
    if (ageWeeks > KEEP_WEEKS) continue;
    const w = isoWeek(b.mtime);
    if (!seenWeeks.has(w)) {
      seenWeeks.add(w);
      keep.add(b.file);
    }
  }

  const deleted = [];
  for (const b of all) {
    if (!keep.has(b.file)) {
      try {
        fs.unlinkSync(b.path);
        deleted.push(b.file);
      } catch (e) {
        log(`retention: could not delete ${b.file}: ${e.message}`);
      }
    }
  }
  return { kept: keep.size, deleted };
}

/* ---------- audit ---------- */

async function auditRun(status, detail) {
  try {
    const db = require("./config/db");
    await db.execute(`CREATE TABLE IF NOT EXISTS backup_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      status VARCHAR(16) NOT NULL,
      detail TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.execute(
      "INSERT INTO backup_runs (status, detail) VALUES (?, ?)",
      [status, String(detail).slice(0, 1000)]
    );
  } catch {
    /* audit best-effort */
  }
}

/* ---------- optional remote copy ---------- */

function copyToRemote(filePath) {
  if (!REMOTE_DIR) return null;
  try {
    fs.mkdirSync(REMOTE_DIR, { recursive: true });
    const dest = path.join(REMOTE_DIR, path.basename(filePath));
    fs.copyFileSync(filePath, dest);
    return dest;
  } catch (e) {
    return { error: e.message };
  }
}

/* ---------- verify (restore into throwaway DB) ---------- */

function verifyRestore(filePath) {
  const TEST_DB = "printexpert_restore_test";
  if (TEST_DB === DB_NAME) {
    throw new Error("restore-test DB name must differ from live DB");
  }
  const mysql = findBin("mysql");
  const args = (extra) => [
    "-h", DB_HOST, "-P", String(DB_PORT), "-u", DB_USER,
    ...(DB_PASS ? [`-p${DB_PASS}`] : []),
    ...extra,
  ];

  execFileSync(mysql, args(["-e",
    `DROP DATABASE IF EXISTS ${TEST_DB}; CREATE DATABASE ${TEST_DB}`]));

  try {
    const raw = zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8");
    // rewrite the database name inside the dump so it lands in the test db
    const esc = DB_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rewritten = raw
      .replace(
        new RegExp("CREATE DATABASE[^;]*`" + esc + "`", "gi"),
        `CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\``
      )
      .replace(
        new RegExp("USE `" + esc + "`", "gi"),
        `USE \`${TEST_DB}\``
      );

    const tmp = filePath + ".restore-test.sql";
    fs.writeFileSync(tmp, rewritten);
    execFileSync(mysql, args([
      "--default-character-set=utf8mb4",
      "-e", `source ${tmp.replace(/\\/g, "/")}`,
    ]));
    fs.unlinkSync(tmp);

    const counts = execFileSync(mysql, args([
      "-N", "-e",
      `SELECT CONCAT('products=',(SELECT COUNT(*) FROM ${TEST_DB}.products),
        ' orders=',(SELECT COUNT(*) FROM ${TEST_DB}.orders),
        ' users=',(SELECT COUNT(*) FROM ${TEST_DB}.users))`,
    ])).toString().trim();

    return { ok: true, detail: counts };
  } finally {
    try {
      execFileSync(mysql, args(["-e", `DROP DATABASE IF EXISTS ${TEST_DB}`]));
    } catch { /* cleanup best-effort */ }
  }
}

/* ---------- main ---------- */

(async () => {
  const arg = process.argv[2];

  if (arg === "--list") {
    for (const b of listBackups())
      console.log(
        `${b.mtime.toISOString()}  ${(b.size / 1024).toFixed(0).padStart(7)} KB  ${b.file}`
      );
    return;
  }

  if (!acquireLock()) process.exit(0); // another run in flight

  let code = 0;
  log(`backup start → ${DB_NAME}@${DB_HOST}:${DB_PORT}`);

  let created;
  try {
    created = createBackup();
  } catch (e) {
    log(`backup FAILED: ${e.message}`);
    await auditRun("fail", e.message);
    await notifyFailure(
      `[Print Expert] Backup FAILED — ${DB_NAME}`,
      e.message
    );
    code = 1;
  }

  let v = null;
  if (created) {
    v = validateBackup(created.out);
    if (!v.ok) {
      log(`backup INVALID: ${v.reason} — file kept for inspection: ${created.out}`);
      await auditRun("invalid", v.reason);
      await notifyFailure(
        `[Print Expert] Backup INVALID — ${DB_NAME}`,
        v.reason
      );
      code = 1;
      created = null;
    }
  }

  if (created) {
    log(`backup OK: ${created.out} (${(created.bytes / 1024).toFixed(0)} KB raw)`);

    /* remote/off-site copy — local copy survives any remote failure */
    const remote = copyToRemote(created.out);
    if (remote && remote.error) {
      log(`remote copy FAILED: ${remote.error} (local backup safe)`);
      await notifyFailure(
        `[Print Expert] Remote backup copy failed — ${DB_NAME}`,
        remote.error
      );
    } else if (remote) {
      log(`remote copy OK: ${remote}`);
    }

    if (arg === "--verify") {
      try {
        const vr = verifyRestore(created.out);
        log(`restore-test PASSED: ${vr.detail}`);
      } catch (e) {
        log(`restore-test FAILED: ${e.message}`);
        await auditRun("restore-fail", e.message);
        await notifyFailure(
          `[Print Expert] Restore-test FAILED — ${DB_NAME}`,
          e.message
        );
        code = 1;
      }
    }

    const r = applyRetention();
    log(`retention: kept ${r.kept}, deleted ${r.deleted.length}`);
    await auditRun("ok", path.basename(created.out));
  }

  releaseLock();
  process.exit(code);
})();
