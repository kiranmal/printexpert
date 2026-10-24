import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../services/apiConfig";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
} from "lucide-react";

import { getOrderById } from "../services/orderService";
import "./SupportPages.css";

const PageShell = ({ tag, title, subtitle, children }) => (
  <div className="support-page">
    <div className="support-container">
      <div className="support-head">
        <span className="support-tag">{tag}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

export function ContactUs() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSent(false);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const subject = String(
      formData.get("subject") || ""
    );

    const inquiry = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      productOptions: subject
        ? `Topic: ${subject}`
        : null,
      message: formData.get("message"),
      source: "contact-page",
    };

    try {
      const response = await fetch(
        `${API_URL}/contact-inquiries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inquiry),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to send your message. Please try again.");
      }

      setSent(true);
      form.reset();
    } catch (err) {
      setError(err.message || "Unable to send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell
      tag="GET IN TOUCH"
      title="Contact Us"
      subtitle="Questions, feedback, or a bulk order request? Our team is here to help."
    >
      <div className="contact-grid">
        <div className="contact-info-card">
          <div className="ci-icon"><Phone size={20} /></div>
          <strong>Call Us</strong>
          <span>+91 98765 43210</span>
        </div>
        <div className="contact-info-card">
          <div className="ci-icon"><Mail size={20} /></div>
          <strong>Email</strong>
          <span>support@printexpert.com</span>
        </div>
        <div className="contact-info-card">
          <div className="ci-icon"><MapPin size={20} /></div>
          <strong>Location</strong>
          <span>India</span>
        </div>
        <div className="contact-info-card">
          <div className="ci-icon"><Clock size={20} /></div>
          <strong>Hours</strong>
          <span>Mon–Sat, 9 AM – 7 PM</span>
        </div>
      </div>

      <div className="support-card">
        <h2>Send us a message</h2>

        {sent && (
          <div className="form-success">
            Your message has been sent. We will respond within 24 hours.
          </div>
        )}

        {error && (
          <div className="form-success" style={{ color: "red" }}>
            {error}
          </div>
        )}

        <form className="support-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div>
              <label>Your Name</label>
              <input type="text" name="name" placeholder="Full name" required />
            </div>
            <div>
              <label>Email</label>
              <input type="email" name="email" placeholder="you@email.com" required />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                placeholder="+91 XXXXX XXXXX"
                pattern="[0-9+ ]{10,15}"
                required
              />
            </div>
            <div>
              <label>Subject</label>
              <select name="subject" required>
                <option value="">Select a topic</option>
                <option>Order Related</option>
                <option>Product Question</option>
                <option>Custom Printing / Bulk Order</option>
                <option>Payment Issue</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <label>Message</label>
          <textarea name="message" placeholder="Tell us how we can help..." required />

          <button type="submit" className="support-submit" disabled={sending}>
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}

const TRACK_STEPS = [
  { key: "ordered", label: "Ordered", icon: "📦" },
  { key: "processing", label: "Processing", icon: "⚙️" },
  { key: "shipped", label: "Shipped", icon: "🚚" },
  { key: "outForDelivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "✅" },
];

const getCompletedTrackingStep = (order) => {
  const status = String(order?.status || "").toLowerCase();

  if (status.includes("deliver") && !status.includes("out")) return 4;
  if (status.includes("out for delivery")) return 3;
  if (status.includes("ship")) return 2;
  if (status.includes("process") || status.includes("confirm")) return 1;
  return 0;
};

const isTrackingStepComplete = (order, step, index) => {
  if (order?.tracking && step.key in order.tracking) {
    return Boolean(order.tracking[step.key]);
  }

  return index <= getCompletedTrackingStep(order);
};

export function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();

    const query = orderId.trim();
    setSearching(true);

    /* Pehle server pe dhundo (login required) — localStorage pe fallback */
    let found = null;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${API_URL}/orders/track/${encodeURIComponent(query)}`,
        token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {}
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) {
        found = data.order;
      }
    } catch {
      // offline — local fallback
    }

    if (!found) {
      found =
        getOrderById(query.toUpperCase()) ||
        getOrderById(query);
    }

    setSearching(false);

    if (!found) {
      setOrder(null);
      setError("Order not found. Please check the order ID and try again (e.g. ORD10001).");
      return;
    }

    setError("");
    setOrder(found);
  };

  return (
    <PageShell
      tag="ORDER TRACKING"
      title="Track Your Order"
      subtitle="Enter your order ID to view its latest delivery status."
    >
      <div className="support-card">
        <form className="track-form" onSubmit={handleTrack}>
          <input
            type="text"
            placeholder="Enter Order ID (e.g. ORD10001)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            required
          />
          <button type="submit" className="support-submit" disabled={searching}>
            {searching ? "Tracking..." : "Track Order"}
          </button>
        </form>
        {error && <div className="track-error">{error}</div>}
      </div>

      {order && (
        <div className="support-card">
          <div className="order-result-head">
            <strong>Order #{order.id}</strong>
            <span className="order-status-pill">{order.status}</span>
          </div>

          <div className="track-timeline">
            {TRACK_STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`track-step ${isTrackingStepComplete(order, step, index) ? "done" : ""}`}
              >
                <div className="track-dot">{step.icon}</div>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="order-items-mini">
            <p><strong>Order Date:</strong> {order.date || new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
            <p><strong>Expected Delivery:</strong> {order.deliveryDate || "Will be updated soon"}</p>
            <p><strong>Payment:</strong> {order.paymentMethod || order.payment || "Not available"}</p>
            <p><strong>Total:</strong> ₹{Number(order.total ?? order.grandTotal ?? order.totalPrice ?? 0).toLocaleString("en-IN")}</p>
            <p>
              <strong>Items:</strong>{" "}
              {(order.items || order.products || order.cart || [])
                .map((item) => `${item.name} ×${item.quantity || 1}`)
                .join(", ")}
            </p>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export function ShippingInfo() {
  return (
    <PageShell
      tag="DELIVERY INFO"
      title="Shipping Information"
      subtitle="Everything you need to know about delivery times, charges, and service coverage."
    >
      <div className="support-card">
        <h2>Delivery Timeline</h2>
        <ul>
          <li><strong>Metro cities:</strong> 2–4 business days</li>
          <li><strong>Other cities:</strong> 4–7 business days</li>
          <li><strong>Remote areas:</strong> 7–10 business days</li>
          <li><strong>Custom printed orders:</strong> Allow an additional 2–3 days for production</li>
        </ul>
      </div>

      <div className="support-card">
        <h2>Shipping Charges</h2>
        <ul>
          <li>Delivery charges are calculated at checkout based on your pincode and the total shipment weight</li>
          <li>Cash on Delivery orders may carry an additional COD charge, shown before you place the order</li>
          <li>The final payable amount — including shipping — is always confirmed on the checkout and payment screens</li>
        </ul>
      </div>

      <div className="support-card">
        <h2>Important Information</h2>
        <ul>
          <li>Your postal code is verified at checkout, and delivery is available only in serviceable areas.</li>
          <li>Tracking details are sent by SMS or email after dispatch.</li>
          <li>The delivery address can be changed only before the order is dispatched.</li>
        </ul>
      </div>
    </PageShell>
  );
}

export function Returns() {
  return (
    <PageShell
      tag="EASY RETURNS"
      title="Returns & Refunds"
      subtitle="A simple and transparent return process designed for your convenience."
    >
      <div className="support-card">
        <h2>Return Policy</h2>
        <ul>
          <li>Damaged or defective products may be returned within <strong>7 days</strong> of delivery.</li>
          <li>Customized or printed products cannot be returned unless they are defective.</li>
          <li>Products must be unused and returned in their original packaging.</li>
        </ul>
      </div>

      <div className="support-card">
        <h2>How to Request a Return</h2>
        <ul>
          <li><strong>Step 1:</strong> Email your order ID and product photos to support@printexpert.com.</li>
          <li><strong>Step 2:</strong> Our team will review your request within 24 hours.</li>
          <li><strong>Step 3:</strong> We will schedule a pickup or provide courier instructions.</li>
          <li><strong>Step 4:</strong> Your refund will be initiated after the returned product passes inspection.</li>
        </ul>
      </div>

      <div className="support-card">
        <h2>Refund Timeline</h2>
        <ul>
          <li>Approved refunds are processed within <strong>5–7 business days</strong>.</li>
          <li>Online payments are refunded to the original payment method.</li>
          <li>Cash on Delivery refunds are issued by bank transfer or store credit.</li>
        </ul>
      </div>
    </PageShell>
  );
}

const FAQS = [
  { q: "How long does delivery take?", a: "Delivery usually takes 2–4 business days in metro cities and 4–7 business days in other areas. Custom printed products may require an additional 2–3 days." },
  { q: "Is Cash on Delivery available?", a: "Yes. Cash on Delivery is available for eligible postal codes and includes an additional ₹49 fee." },
  { q: "How can I order a custom design?", a: "Use the Customize option on the product page, or submit your requirements through the Contact Us page. Our design team will assist you." },
  { q: "Can I cancel my order?", a: "Yes. An order can be cancelled before it is dispatched. After dispatch, the standard return process applies." },
  { q: "Do you offer discounts on bulk or corporate orders?", a: "Yes. Special pricing is available for quantities of 50 or more. Select Bulk Order on the Contact Us page to request a quote." },
  { q: "Which payment methods do you accept?", a: "We accept UPI, credit and debit cards, net banking, and Cash on Delivery through secure payment channels." },
  { q: "What should I do if I receive a defective product?", a: "Report the issue within 7 days by emailing product photos and your order ID to support@printexpert.com. We will arrange a replacement or refund." },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <PageShell
      tag="HELP"
      title="Frequently Asked Questions"
      subtitle="Find quick answers to the questions our customers ask most often."
    >
      {FAQS.map((faq, index) => (
        <div className="faq-item" key={index}>
          <button
            type="button"
            className="faq-question"
            onClick={() => setOpen(open === index ? -1 : index)}
          >
            {faq.q}
            <ChevronDown
              size={18}
              className="faq-icon"
              style={{
                transform: open === index ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
          {open === index && (
            <div className="faq-answer">{faq.a}</div>
          )}
        </div>
      ))}
    </PageShell>
  );
}

export function HelpCenter() {
  return (
    <PageShell
      tag="HELP CENTER"
      title="How can we help you?"
      subtitle="Choose a topic below or contact our support team directly."
    >
      <div className="help-grid">
        <Link to="/track-order" className="help-tile">
          <span className="help-icon">📦</span>
          <strong>Track Order</strong>
          <span>View the latest status of your order</span>
        </Link>
        <Link to="/shipping" className="help-tile">
          <span className="help-icon">🚚</span>
          <strong>Shipping Information</strong>
          <span>Review delivery times and shipping charges</span>
        </Link>
        <Link to="/returns" className="help-tile">
          <span className="help-icon">↩️</span>
          <strong>Returns & Refunds</strong>
          <span>Learn about returns and refund timelines</span>
        </Link>
        <Link to="/faq" className="help-tile">
          <span className="help-icon">❓</span>
          <strong>FAQs</strong>
          <span>Find answers to common questions</span>
        </Link>
        <Link to="/contact" className="help-tile">
          <span className="help-icon">✉️</span>
          <strong>Contact Us</strong>
          <span>Send a message or speak with our team</span>
        </Link>
        <Link to="/support" className="help-tile">
          <span className="help-icon">💬</span>
          <strong>Customer Support</strong>
          <span>Submit a ticket for priority assistance</span>
        </Link>
      </div>
    </PageShell>
  );
}

export function CustomerSupport() {
  const [raised, setRaised] = useState(false);

  const handleTicket = (e) => {
    e.preventDefault();
    setRaised(true);
    e.target.reset();
  };

  return (
    <PageShell
      tag="SUPPORT"
      title="Customer Support"
      subtitle="Get assistance by phone, email, or by submitting a support ticket."
    >
      <div className="channel-grid">
        <div className="channel-card">
          <span className="ch-icon">📞</span>
          <strong>Call Us</strong>
          <p>Mon–Sat, 9 AM – 7 PM</p>
          <a className="ch-btn" href="tel:+919876543210">+91 98765 43210</a>
        </div>
        <div className="channel-card">
          <span className="ch-icon">✉️</span>
          <strong>Email Us</strong>
          <p>Response within 24 hours</p>
          <a className="ch-btn" href="mailto:support@printexpert.com">Send Email</a>
        </div>
        <div className="channel-card">
          <span className="ch-icon">💬</span>
          <strong>Live Chat</strong>
          <p>Coming soon</p>
          <span className="ch-btn">WhatsApp Soon</span>
        </div>
      </div>

      <div className="support-card">
        <h2>Raise a Support Ticket</h2>

        {raised && (
          <div className="form-success">
            Your ticket has been created. Our support team will contact you shortly.
          </div>
        )}

        <form className="support-form" onSubmit={handleTicket}>
          <div className="form-row">
            <div>
              <label>Name</label>
              <input type="text" required />
            </div>
            <div>
              <label>Order ID (optional)</label>
              <input type="text" placeholder="ORD10001" />
            </div>
          </div>

          <label>Issue Type</label>
          <select required>
            <option value="">Select issue</option>
            <option>Order not received</option>
            <option>Damaged / wrong product</option>
            <option>Payment / refund issue</option>
            <option>Account problem</option>
            <option>Other</option>
          </select>

          <label>Describe your issue</label>
          <textarea required placeholder="Describe the issue in detail..." />

          <button type="submit" className="support-submit">
            Submit Ticket
          </button>
        </form>
      </div>
    </PageShell>
  );
}

export function PrivacyPolicy() {
  return (
    <PageShell
      tag="LEGAL"
      title="Privacy Policy"
      subtitle="A clear explanation of how we collect, use, and protect your information."
    >
      <div className="support-card">
        <p className="policy-meta">Last updated: September 2026</p>
        <h3>Information We Collect</h3>
        <p>
          When you create an account, we collect your name, email address,
          phone number, and delivery address. Payments are handled through a
          secure gateway, and we do not store your card details.
        </p>
        <h3>How We Use It</h3>
        <ul>
          <li>To process and deliver your orders</li>
          <li>To provide order updates and customer support</li>
          <li>To send offers or newsletters only when you subscribe</li>
        </ul>
        <h3>Data Security</h3>
        <p>
          Passwords are stored securely using hashing. We do not sell your
          personal information to third parties.
        </p>
        <h3>Your Rights</h3>
        <p>
          You may view, update, or request deletion of your information at any
          time through your profile or by contacting customer support.
        </p>
      </div>
    </PageShell>
  );
}

export function Terms() {
  return (
    <PageShell
      tag="LEGAL"
      title="Terms & Conditions"
      subtitle="Please review the terms that apply when using our website and services."
    >
      <div className="support-card">
        <p className="policy-meta">Last updated: September 2026</p>
        <h3>1. General</h3>
        <p>
          By using the Print Expert website, you agree to these
          terms. Prices and product availability may change without notice.
        </p>
        <h3>2. Orders</h3>
        <ul>
          <li>Orders are processed only after confirmation</li>
          <li>Your approval of a custom-print design is considered final</li>
          <li>We reserve the right to cancel or refuse an order when necessary</li>
        </ul>
        <h3>3. Custom Products</h3>
        <p>
          Customers are responsible for ensuring they have the right to use
          submitted designs. Custom products are non-returnable unless defective.
        </p>
        <h3>4. Limitation of Liability</h3>
        <p>
          Liability for delivery delays or third-party courier issues is
          limited to the value of the affected order.
        </p>
      </div>
    </PageShell>
  );
}

export function RefundPolicy() {
  return (
    <PageShell
      tag="LEGAL"
      title="Refund Policy"
      subtitle="Understand refund eligibility, exclusions, and processing times."
    >
      <div className="support-card">
        <p className="policy-meta">Last updated: September 2026</p>
        <h3>Refund Eligibility</h3>
        <ul>
          <li>You received a damaged, defective, or incorrect product</li>
          <li>You cancelled the order before dispatch</li>
          <li>Your payment was charged but the order was not created</li>
        </ul>
        <h3>Non-Refundable Items</h3>
        <ul>
          <li>Customized or personalized products, unless defective</li>
          <li>Used products or items damaged by the customer</li>
          <li>Cash on Delivery service charges</li>
        </ul>
        <h3>Processing Time</h3>
        <p>
          Approved refunds are processed within 5–7 business days. Banks and
          UPI providers may require an additional 2–3 days to post the credit.
        </p>
        <h3>Need Help?</h3>
        <p>
          Check your <Link to="/track-order">order status</Link> or submit a{" "}
          <Link to="/support">support ticket</Link> for refund assistance.
        </p>
      </div>
    </PageShell>
  );
}