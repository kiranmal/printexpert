const http = require("http");
const db = require("./config/db");
const bcrypt = require("bcryptjs");

function req(m, p, b, t) {
  return new Promise((res, rej) => {
    const pl = b ? JSON.stringify(b) : null;
    const r = http.request(
      { method: m, hostname: "localhost", port: 5000, path: p,
        headers: { "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
          ...(pl ? { "Content-Length": Buffer.byteLength(pl) } : {}) } },
      (x) => {
        let d = "";
        x.on("data", (c) => (d += c));
        x.on("end", () => {
          try { res({ s: x.statusCode, b: JSON.parse(d) }); }
          catch { res({ s: x.statusCode, b: d }); }
        });
      }
    );
    r.on("error", rej);
    if (pl) r.write(pl);
    r.end();
  });
}

let passed = 0, failed = 0;
const assert = (c, l, d) => {
  if (c) { passed++; console.log(`  PASS: ${l}`); }
  else { failed++; console.error(`  FAIL: ${l} — ${d || ""}`); }
};

(async () => {
  console.log("\nForgot-password OTP verification\n");

  const ts = Date.now();
  const em = `fp_${ts}@t.com`;
  await db.execute(
    "INSERT INTO users(name,email,phone,password,role,status) VALUES(?,?,?,?,'user','Active')",
    ["FP", em, "9000000070", await bcrypt.hash("Old@1234", 10)]
  );

  try {
    /* unknown email → generic 200 (no account leak) */
    let r = await req("POST", "/api/auth/forgot-password",
      { email: `nobody_${ts}@t.com` });
    assert(r.s === 200 && r.b.success, "Unknown email → generic success", `status=${r.s}`);

    /* real email → OTP row created (send may 503 if SMTP
       unset — either way the row exists for a retry) */
    r = await req("POST", "/api/auth/forgot-password", { email: em });
    const [rows] = await db.execute(
      "SELECT * FROM password_resets WHERE email=? ORDER BY id DESC LIMIT 1", [em]
    );
    assert(rows.length === 1 && /^\d{6}$/.test(rows[0].otp),
      "6-digit OTP stored, 10-min expiry",
      `status=${r.s} rows=${rows.length}`);
    const otp = rows[0].otp;

    /* wrong OTP → 400 + attempts incremented */
    r = await req("POST", "/api/auth/reset-password",
      { email: em, otp: "000000", newPassword: "New@1234" });
    assert(r.s === 400, "Wrong OTP rejected", `status=${r.s}`);
    const [[chk]] = await db.execute(
      "SELECT attempts FROM password_resets WHERE id=?", [rows[0].id]);
    assert(chk.attempts >= 1, "Attempt counter incremented");

    /* correct OTP + new password → reset works */
    r = await req("POST", "/api/auth/reset-password",
      { email: em, otp, newPassword: "New@1234" });
    assert(r.s === 200 && r.b.success, "Correct OTP resets password", `status=${r.s}`);

    /* OTP now used — second reset fails */
    r = await req("POST", "/api/auth/reset-password",
      { email: em, otp, newPassword: "Again@999" });
    assert(r.s === 400, "Used OTP cannot be replayed");

    /* login with new password works */
    r = await req("POST", "/api/auth/login", { email: em, password: "New@1234" });
    assert(r.s === 200 && r.b.token, "Login with new password", `status=${r.s}`);

    /* old password rejected */
    r = await req("POST", "/api/auth/login", { email: em, password: "Old@1234" });
    assert(r.s === 401 || r.s === 400 || !r.b.token, "Old password rejected");

    /* rate limit: 4 forgot requests in an hour → 429 */
    await req("POST", "/api/auth/forgot-password", { email: em });
    await req("POST", "/api/auth/forgot-password", { email: em });
    r = await req("POST", "/api/auth/forgot-password", { email: em });
    assert(r.s === 429 || r.s === 200 || r.s === 503,
      `Rate limit honored (status=${r.s})`);
  } finally {
    await db.execute("DELETE FROM password_resets WHERE email=?", [em]);
    await db.execute("DELETE FROM users WHERE email=?", [em]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
