import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
} from "lucide-react";
import "./Footer.css";
import printExpertLogo from "../assets/logo-mark.png";

/* Social brand icons — lucide v1 removed them, inline SVGs */
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1C16.4 3 15.4 3 14.3 3c-2.3 0-3.8 1.4-3.8 3.9v2.7H7.7v3.2h2.8V21h3Z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M17.5 3h3.1l-6.8 7.8L21.9 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.7 3H8l4.4 5.9L17.5 3Zm-1.1 16.1h1.7L7.1 4.8H5.3l11.1 14.3Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 4 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1Zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.5c0-1.3 0-3-1.9-3-1.8 0-2.1 1.4-2.1 2.9V21h-4V9Z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.5.4 7.8.4 7.8.4s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
  </svg>
);

/* real catalog categories — /category?category= filter */
const FOOTER_CATEGORIES = [
  "Visiting Cards",
  "Stationery & Office",
  "Marketing Materials",
  "Stickers & Labels",
  "Packaging",
  "Clothing & Bags",
  "Mugs & Gifts",
  "Pens & Drinkware",
];

function Footer() {
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value.trim();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
    e.target.reset();
  };

  return (
    <footer className="premium-footer">

      {/* Newsletter Section */}
      <div className="footer-newsletter">
        <div className="newsletter-content">
          <div>
            <span className="newsletter-small">STAY CONNECTED</span>
            <h2>Get the latest offers & updates</h2>
            <p>
              Subscribe to our newsletter and get exclusive deals,
              new product updates and special offers.
            </p>
          </div>

          <form
            className="newsletter-form"
            onSubmit={handleSubscribe}
          >
            <input
              name="email"
              type="email"
              placeholder="Enter your email address"
              required
            />
            <button type="submit">
              {subscribed ? "Subscribed ✓" : "Subscribe"}
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">

        {/* Company */}
        <div className="footer-column footer-company">
          <img
            src={printExpertLogo}
            alt="Print Expert Logo"
            className="footer-logo"
          />
          <h2>PRINT <b>EXPERT</b></h2>
          <h3>PRINTING SOLUTIONS, PERFECT RESULTS</h3>

          <p>
            Your trusted destination for premium printing,
            customized products and quality lifestyle solutions.
          </p>

          <div className="footer-contact">
            <p>
              <strong>
                <MapPin size={15} />
              </strong>
              India
            </p>

            <p>
              <strong>
                <Phone size={15} />
              </strong>
              +91 98765 43210
            </p>

            <p>
              <strong>
                <Mail size={15} />
              </strong>
              support@printexpert.com
            </p>
          </div>

          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
              <XIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <LinkedinIcon />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <YoutubeIcon />
            </a>
          </div>
        </div>

        {/* Shop */}
        <div className="footer-column">
          <h3>Shop</h3>

          <Link to="/category">All Products</Link>
          <Link to="/category?type=new">New Arrivals</Link>
          <Link to="/category">Best Sellers</Link>
          <Link to="/category">Featured Products</Link>
          <Link to="/category">Special Offers</Link>
          <Link to="/category">Customized Products</Link>
        </div>

        {/* Categories */}
        <div className="footer-column">
          <h3>Categories</h3>

          {FOOTER_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/category?category=${encodeURIComponent(cat)}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Customer Service */}
        <div className="footer-column">
          <h3>Customer Service</h3>

          <Link to="/contact">Contact Us</Link>
          <Link to="/track-order">Track Your Order</Link>
          <Link to="/shipping">Shipping Information</Link>
          <Link to="/returns">Returns & Refunds</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/help">Help Center</Link>
          <Link to="/support">Customer Support</Link>
        </div>

        {/* Account */}
        <div className="footer-column">
          <h3>My Account</h3>

          <Link to="/profile">My Profile</Link>
          <Link to="/orders">My Orders</Link>
          <Link to="/favorites">Wishlist</Link>
          <Link to="/cart">Shopping Cart</Link>
          <Link to="/login">Login</Link>
          <Link to="/signup">Create Account</Link>
        </div>

      </div>

      {/* Trust Section */}
      <div className="footer-trust">

        <div className="trust-item">
          <span>
            <Truck size={22} />
          </span>
          <div>
            <strong>Fast Delivery</strong>
            <p>Quick & reliable shipping</p>
          </div>
        </div>

        <div className="trust-item">
          <span>
            <ShieldCheck size={22} />
          </span>
          <div>
            <strong>Secure Payment</strong>
            <p>100% secure transactions</p>
          </div>
        </div>

        <div className="trust-item">
          <span>
            <RotateCcw size={22} />
          </span>
          <div>
            <strong>Easy Returns</strong>
            <p>Simple return process</p>
          </div>
        </div>

        <div className="trust-item">
          <span>
            <Headphones size={22} />
          </span>
          <div>
            <strong>24/7 Support</strong>
            <p>We're here to help</p>
          </div>
        </div>

      </div>

      {/* Bottom Footer */}
      <div className="footer-bottom">

        <div className="footer-bottom-left">
          <p>
            © 2026 <strong>Print Expert</strong>.
            All Rights Reserved.
          </p>
        </div>

        <div className="footer-policies">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/refund">Refund Policy</Link>
          <Link to="/shipping">Shipping Policy</Link>
        </div>

        <div className="payment-methods">
          <span>VISA</span>
          <span>Mastercard</span>
          <span>UPI</span>
          <span>COD</span>
        </div>

      </div>

    </footer>
  );
}

export default Footer;
