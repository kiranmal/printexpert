import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../pages/Login.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: true,
  });

  useEffect(() => {
    if (
      localStorage.getItem("adminLoggedIn") === "true" &&
      localStorage.getItem("authToken")
    ) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!password) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Invalid email or password!");
        return;
      }

      if (data.user?.role !== "admin") {
        alert("This account does not have admin access.");
        return;
      }

      login(data.user, data.token, formData.remember);
      localStorage.setItem("adminLoggedIn", "true");

      alert("Admin Login Successful!");
      navigate("/admin", { replace: true });
    } catch (error) {
      alert("Unable to connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">

        <div className="auth-left">
          <div className="auth-brand">
            <span>PRINT EXPERT</span>
            <strong>PRINTING SOLUTIONS, PERFECT RESULTS</strong>
          </div>

          <div className="auth-left-content">
            <span className="auth-label">ADMIN PANEL</span>
            <h1>
              Welcome back,
              <br />
              <span>Admin.</span>
            </h1>
            <p>
              Login to manage products, orders,
              users and your complete store.
            </p>

            <div className="auth-features">
              <div><span>✓</span><p>Manage Products</p></div>
              <div><span>✓</span><p>Track Orders</p></div>
              <div><span>✓</span><p>Secure Admin Access</p></div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">

            <div className="auth-heading">
              <h2>Admin Sign In</h2>
              <p>Enter admin credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@printexpert.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => alert("Forgot password coming soon.")}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <ArrowRight size={18} />}
              </button>

            </form>

            <div className="auth-switch">
              <span>Not an admin?</span>
              <Link to="/login">User Login</Link>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}