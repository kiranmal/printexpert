import { useEffect, useRef, useState } from "react";
import {
  Printer,
  Package,
  Palette,
  Users,
  Send,
  CheckCircle2,
  Headset,
  Phone,
  Mail,
  Clock,
} from "lucide-react";

import "./ContactSection.css";
import { fetchProducts } from "../services/productApi";
import {
  submitInquiry,
  readInquiryContext,
} from "../services/inquiryApi";

const INITIAL_FORM = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  productId: "",
  productName: "",
  quantity: "",
  message: "",
};

const BENEFITS = [
  { icon: Users, text: "Product guidance" },
  { icon: Printer, text: "Custom printing" },
  { icon: Package, text: "Bulk orders" },
  { icon: Palette, text: "Design assistance" },
];

export default function ContactSection({ source = "homepage" }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState("");
  const contextRef = useRef(null);

  /* products for the requirement dropdown */
  useEffect(() => {
    fetchProducts()
      .then((list) => setProducts(list || []))
      .catch(() => setProducts([]));
  }, []);

  /* inquiry context — product detail / customizer se aaya ho */
  useEffect(() => {
    const ctx = readInquiryContext();

    if (ctx && !contextRef.current) {
      contextRef.current = ctx;

      setForm((prev) => ({
        ...prev,
        productId: String(ctx.productId || ""),
        productName: ctx.productName || "",
        quantity: ctx.quantity
          ? String(ctx.quantity)
          : "",
      }));

      /* product page se aaya — section pe scroll karo */
      setTimeout(() => {
        document
          .getElementById("contact-inquiry")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  }, []);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setApiError("");
  };

  const validate = () => {
    const errs = {};

    if (form.name.trim().length < 2) {
      errs.name = "Please enter your name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    const digits = form.phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      errs.phone = "Please enter a valid 10 digit phone number.";
    }

    if (form.message.trim().length < 10) {
      errs.message = "Please tell us a bit more about your requirement.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (sending || !validate()) return;

    setSending(true);
    setApiError("");

    try {
      const ctx = contextRef.current || {};

      const productLabel =
        form.productId === "other"
          ? "Other"
          : form.productName ||
            products.find(
              (p) => String(p.id) === form.productId
            )?.name ||
            "";

      await submitInquiry({
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        productId: form.productId || null,
        productName: productLabel || null,
        productOptions: ctx.size
          ? `Size: ${ctx.size}${
              ctx.color ? `, Color: ${ctx.color}` : ""
            }`
          : null,
        quantity: Number(form.quantity) || null,
        message: form.message.trim(),
        source,
      });

      setSent(true);
      setForm(INITIAL_FORM);
      contextRef.current = null;
      localStorage.removeItem("printExpertInquiryContext");
    } catch (err) {
      setApiError(
        err.message ||
          "Unable to send inquiry. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      className="contact-section"
      id="contact-inquiry"
    >
      <div className="contact-glow" />
      <div className="contact-deco contact-deco-1" />
      <div className="contact-deco contact-deco-2" />
      <div className="contact-dots" />

      <div className="contact-inner">
        {/* ============ LEFT — intro + benefits ============ */}
        <div className="contact-left">
          <span className="contact-tag">
            <Headset size={13} />
            GET IN TOUCH
          </span>

          <h2>
            Let's create something
            <br />
            amazing together.
          </h2>

          <p className="contact-sub">
            Have a custom requirement or need help
            choosing the right product? Tell us what
            you need and our team will get back to
            you.
          </p>

          <div className="contact-benefits">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="benefit-card">
                <span className="benefit-icon">
                  <Icon size={16} />
                </span>
                {text}
              </div>
            ))}
          </div>

          <div className="contact-help-card">
            <div className="help-icon">
              <Headset size={20} />
            </div>
            <div>
              <strong>Need help?</strong>
              <p>
                Tell us what you're looking for and
                we'll help you find the right
                product.
              </p>
            </div>
          </div>

          <div className="contact-direct">
            <a
              href="tel:+919876543210"
              className="direct-chip"
            >
              <Phone size={14} />
              +91 98765 43210
            </a>
            <a
              href="mailto:support@printexpert.com"
              className="direct-chip"
            >
              <Mail size={14} />
              support@printexpert.com
            </a>
            <span className="direct-chip direct-time">
              <Clock size={14} />
              Mon–Sat · 10am–7pm
            </span>
          </div>
        </div>

        {/* ============ RIGHT — form ============ */}
        <div className="contact-form-card">
          {sent ? (            <div className="inquiry-success">
              <span className="success-check">
                <CheckCircle2 size={44} />
              </span>

              <h3>Inquiry Sent Successfully</h3>

              <p>
                Thank you! Our team has received
                your request and will contact you
                shortly.
              </p>

              <button
                type="button"
                className="inquiry-again"
                onClick={() => setSent(false)}
              >
                Send another inquiry
              </button>
            </div>
          ) : (
            <>
              <div className="form-head">
                <h3>Get in touch</h3>
                <span className="form-head-note">
                  <Clock size={12} />
                  We reply within 24 hours
                </span>
              </div>

              <form
                className="inquiry-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="inquiry-field">
                  <label htmlFor="inq-name">
                    Full Name <em>*</em>
                  </label>
                  <input
                    id="inq-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={set("name")}
                    className={errors.name ? "field-error" : ""}
                  />
                  {errors.name && (
                    <small className="error-text">
                      {errors.name}
                    </small>
                  )}
                </div>

                <div className="inquiry-field">
                  <label htmlFor="inq-company">
                    Business / Company Name
                  </label>
                  <input
                    id="inq-company"
                    type="text"
                    placeholder="Your company name"
                    value={form.companyName}
                    onChange={set("companyName")}
                  />
                </div>

                <div className="inquiry-row">
                  <div className="inquiry-field">
                    <label htmlFor="inq-email">
                      Email <em>*</em>
                    </label>
                    <input
                      id="inq-email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={set("email")}
                      className={errors.email ? "field-error" : ""}
                    />
                    {errors.email && (
                      <small className="error-text">
                        {errors.email}
                      </small>
                    )}
                  </div>

                  <div className="inquiry-field">
                    <label htmlFor="inq-phone">
                      Phone <em>*</em>
                    </label>
                    <input
                      id="inq-phone"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.phone}
                      onChange={set("phone")}
                      className={errors.phone ? "field-error" : ""}
                    />
                    {errors.phone && (
                      <small className="error-text">
                        {errors.phone}
                      </small>
                    )}
                  </div>
                </div>

                <div className="inquiry-row">
                  <div className="inquiry-field">
                    <label htmlFor="inq-product">
                      Product / Requirement
                    </label>
                    <select
                      id="inq-product"
                      value={form.productId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const p = products.find(
                          (x) => String(x.id) === id
                        );
                        setForm((prev) => ({
                          ...prev,
                          productId: id,
                          productName: p?.name || "",
                        }));
                      }}
                    >
                      <option value="">
                        Select a product
                      </option>
                      {products.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                        >
                          {p.name}
                        </option>
                      ))}
                      <option value="other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div className="inquiry-field">
                    <label htmlFor="inq-qty">
                      Quantity
                    </label>
                    <input
                      id="inq-qty"
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={form.quantity}
                      onChange={set("quantity")}
                    />
                  </div>
                </div>

                <div className="inquiry-field">
                  <label htmlFor="inq-msg">
                    Message <em>*</em>
                  </label>
                  <textarea
                    id="inq-msg"
                    rows="4"
                    placeholder="Tell us what you need..."
                    value={form.message}
                    onChange={set("message")}
                    className={errors.message ? "field-error" : ""}
                  />
                  {errors.message && (
                    <small className="error-text">
                      {errors.message}
                    </small>
                  )}
                </div>

                {apiError && (
                  <p className="error-text api-error">
                    {apiError}
                  </p>
                )}

                <button
                  type="submit"
                  className="inquiry-submit"
                  disabled={sending}
                >
                  {sending ? (
                    "Sending..."
                  ) : (
                    <>
                      Send Inquiry
                      <Send size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
