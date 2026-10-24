# Razorpay Online Payment Setup — Print Expert

The full payment flow is already implemented. This doc covers
how to configure it for **Test Mode** and later for Live Mode.

## How the flow works

```
Checkout (Online Payment)
  → POST /api/orders          order created server-side
                              (price/stock/auth validated,
                               stock decremented atomically)
  → POST /api/payments/razorpay/order
                              Razorpay order created with the
                              SERVER-STORED total (never the
                              client amount), idempotent
  → Razorpay Checkout popup   customer pays (UPI/Card/NetBanking)
  → POST /api/payments/razorpay/verify
                              HMAC-SHA256 signature verified,
                              order marked Paid (idempotent)
  → webhook /api/payments/razorpay/webhook
                              belt-and-suspenders: captured /
                              failed events update the order
                              even if the browser closed early
```

Security notes already enforced in code:

- `RAZORPAY_KEY_SECRET` never leaves the backend.
- Amount comes from the DB order total, not the request.
- Signature verified with `crypto.timingSafeEqual`.
- Owner-only order access; admin override.
- Duplicate verify/webhook calls are idempotent — no
  double-paid, no double stock decrement.
- Webhook verified against the raw request body.

## 1. Create a Razorpay account

1. Go to https://dashboard.razorpay.com and sign up.
2. Finish KYC only if you plan to go live — test mode works
   without it.
3. Make sure the top-left toggle says **Test Mode**.

## 2. Get Test keys

Dashboard → **Settings → API Keys → Generate Test Key**:

- `Key Id`     — looks like `rzp_test_xxxxxxxxxxxx`
- `Key Secret` — shown once; copy it immediately

## 3. Configure the backend

`backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<your test secret>
RAZORPAY_WEBHOOK_SECRET=<any random string you invent>
```

`.env` is git-ignored. `.env.example` holds empty
placeholders — never commit real keys.

The **webhook secret is your own string** — you invent it,
put it in `.env`, and configure the SAME value in the
dashboard (step 4). The backend uses it to verify webhook
signatures.

Restart the backend after editing `.env`:

```bash
node server.js
```

If the keys are missing, `/api/payments/razorpay/*` returns
`503 Payment gateway is not configured` and the customer
sees a clear message — COD keeps working regardless.

## 4. Configure the webhook (optional but recommended)

Localhost can't receive Razorpay webhooks directly. For
local testing either skip it (the browser verify call is
enough) or tunnel:

```bash
npx ngrok http 5000
```

Dashboard → **Settings → Webhooks → Add New Webhook**:

- URL: `https://<tunnel>/api/payments/razorpay/webhook`
  (or your production domain later)
- Secret: the SAME value as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`

## 5. Test payments

Checkout with **Online Payment** selected, then in the
Razorpay popup:

| Method | Test detail |
|---|---|
| UPI | `success@razorpay` (always succeeds) |
| Card | `4111 1111 1111 1111`, any future expiry, any CVV |
| Net Banking | pick any listed bank → Success/Failure |

Expected results:

- Success → order `Paid`, shows in My Orders + Admin Orders
- Dismiss popup → order stays `Pending` ("Payment was not
  completed" message; customer can retry — the same pending
  order is reused, no duplicate)
- Stock is deducted once, at order creation; payment
  failure does NOT re-deduct on retries

Automated coverage (signature, idempotency, webhook,
ownership, forged order id):

```bash
node testPayments.js    # 19/19 — spins a test instance :5001
node regression.js      # 62/62 full-suite
```

## 6. Going live (only after owner approval)

1. Razorpay Dashboard → switch to **Live Mode**
2. Settings → API Keys → **Generate Live Key**
3. Put `rzp_live_…` values in the **production** `.env`
   (never in code or git)
4. Configure the production webhook URL + secret
5. Make a real ₹1 payment and refund it from the dashboard
   to verify end-to-end

Until those steps are done and approved, the deployed
environment should keep the test keys or leave them empty
(COD still works).
