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
  console.log("\nPersistent-login verification\n");
  const ts = Date.now();
  const email = `ap_${ts}@t.com`;
  const hash = await bcrypt.hash("Pass@1234", 10);
  await db.execute(
    "INSERT INTO users (name,email,phone,password,role,status) VALUES (?,?,?,?,?,?)",
    ["AP", email, "9000000060", hash, "user", "Active"]
  );

  try {
    /* login → token */
    let r = await req("POST", "/api/auth/login", { email, password: "Pass@1234" });
    assert(r.s === 200 && r.b.token, "Login returns token", JSON.stringify(r.b).slice(0, 120));
    const token = r.b.token;

    /* decode exp claim — should be ~30 days out */
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const days = (payload.exp - payload.iat) / 86400;
    console.log(`  token lifetime: ${days.toFixed(0)} days`);
    assert(days >= 29 && days <= 31, "Token lifetime ~30 days", `${days}d`);

    /* token works for /auth/me */
    r = await req("GET", "/api/auth/me", null, token);
    assert(r.s === 200 && r.b.user?.email === email, "/auth/me accepts the token");

    /* garbage token → 401/403 (real invalid → session should clear) */
    r = await req("GET", "/api/auth/me", null, "Bearer garbage.token.here");
    assert(r.s === 401 || r.s === 403, "Invalid token rejected", `status=${r.s}`);

    /* logout → token revoked → replay rejected */
    r = await req("POST", "/api/auth/logout", null, token);
    assert(r.s === 200, "POST /auth/logout succeeds", `status=${r.s}`);
    r = await req("GET", "/api/auth/me", null, token);
    assert(r.s === 401, "Revoked token rejected after logout", `status=${r.s}`);

    /* a second session of the same user is unaffected */
    r = await req("POST", "/api/auth/login", { email, password: "Pass@1234" });
    assert(r.s === 200, "New login works after logout");
    r = await req("GET", "/api/auth/me", null, r.b.token);
    assert(r.s === 200, "Fresh token valid");
  } finally {
    await db.execute("DELETE FROM users WHERE email=?", [email]);
    console.log(`\n  RESULTS: ${passed} passed, ${failed} failed\n`);
    process.exit(failed ? 1 : 0);
  }
})();
