
import React, { useState } from "react";

import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Mail,
  Phone,
  LockKeyhole,
} from "lucide-react";

import "./Signup.css";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


function Signup() {

  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });


  const handleChange = (e) => {

    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };


  const handleSubmit = async (e) => {

    e.preventDefault();

    if (loading) {
      return;
    }


    const name =
      formData.name.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const phone =
      formData.phone.trim();

    const password =
      formData.password;

    const confirmPassword =
      formData.confirmPassword;


    // ================= NAME =================

    if (name.length < 2) {

      alert(
        "Please enter your full name."
      );

      return;
    }


    // ================= EMAIL =================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {

      alert(
        "Please enter a valid email address."
      );

      return;
    }


    // ================= PHONE =================

    const phoneRegex =
      /^[6-9]\d{9}$/;

    if (!phoneRegex.test(phone)) {

      alert(
        "Please enter a valid 10-digit Indian mobile number."
      );

      return;
    }


    // ================= PASSWORD =================

    if (password.length < 6) {

      alert(
        "Password must be at least 6 characters."
      );

      return;
    }


    // ================= CONFIRM PASSWORD =================

    if (
      password !==
      confirmPassword
    ) {

      alert(
        "Passwords do not match!"
      );

      return;
    }


    // ================= TERMS =================

    if (!formData.terms) {

      alert(
        "Please accept Terms & Conditions and Privacy Policy."
      );

      return;
    }


    setLoading(true);


    try {

      // ================= API CALL =================

      const response = await fetch(
        `${API_URL}/auth/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            phone,
            password,
          }),
        }
      );


      const data =
        await response.json();


      // ================= ERROR =================

      if (!response.ok) {

        alert(
          data.message ||
          "Unable to create account."
        );

        return;
      }


      // ================= SUCCESS =================

      alert(
        data.message ||
        "Account created successfully!"
      );


      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        terms: false,
      });


      // Login page

      navigate("/login", { state: location.state });

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      alert(
        "Unable to connect to server. Please make sure Node.js backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  return (

    <main className="signup-page">

      <div className="signup-container">


        {/* ================= LEFT ================= */}

        <div className="signup-left">

          <div className="signup-brand">

            <span>
              PRINT EXPERT
            </span>

            <strong>
              PRINTING SOLUTIONS, PERFECT RESULTS
            </strong>

          </div>


          <div className="signup-left-content">

            <span className="signup-label">
              JOIN PRINT EXPERT
            </span>

            <h1>
              Create your
              <br />
              <span>
                account.
              </span>
            </h1>

            <p>
              Join Print Expert
              and discover premium products
              for your business and brand.
            </p>

          </div>

        </div>


        {/* ================= RIGHT ================= */}

        <div className="signup-right">

          <div className="signup-card">

            <div className="signup-heading">

              <h2>
                Create Account
              </h2>

              <p>
                Fill in your details to get started
              </p>

            </div>


            <form
              onSubmit={handleSubmit}
            >


              {/* ================= NAME ================= */}

              <div className="signup-input-group">

                <label>
                  Full Name
                </label>

                <div className="signup-input">

                  <User size={18} />

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />

                </div>

              </div>


              {/* ================= EMAIL ================= */}

              <div className="signup-input-group">

                <label>
                  Email Address
                </label>

                <div className="signup-input">

                  <Mail size={18} />

                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />

                </div>

              </div>


              {/* ================= PHONE ================= */}

              <div className="signup-input-group">

                <label>
                  Phone Number
                </label>

                <div className="signup-input">

                  <Phone size={18} />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    maxLength="10"
                    required
                  />

                </div>

              </div>


              {/* ================= PASSWORD ================= */}

              <div className="signup-input-group">

                <label>
                  Password
                </label>

                <div className="signup-input">

                  <LockKeyhole size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="signup-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                  >

                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* ================= CONFIRM PASSWORD ================= */}

              <div className="signup-input-group">

                <label>
                  Confirm Password
                </label>

                <div className="signup-input">

                  <LockKeyhole size={18} />

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="signup-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous
                      )
                    }
                  >

                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* ================= TERMS ================= */}

              <label className="signup-terms">

                <input
                  type="checkbox"
                  name="terms"
                  checked={
                    formData.terms
                  }
                  onChange={handleChange}
                />

                <span>
                  I agree to the Terms &
                  Conditions and Privacy Policy.
                </span>

              </label>


              {/* ================= BUTTON ================= */}

              <button
                type="submit"
                className="signup-submit"
                disabled={loading}
              >

                {loading
                  ? "Creating Account..."
                  : "Create Account"
                }

                {!loading && (
                  <ArrowRight size={18} />
                )}

              </button>

            </form>


            {/* ================= LOGIN ================= */}

            <div className="signup-switch">

              <span>
                Already have an account?
              </span>

              <Link to="/login">
                Sign In
              </Link>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}


export default Signup;
