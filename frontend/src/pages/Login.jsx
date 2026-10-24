
import { useState } from "react";

import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import "./Login.css";


/*
|--------------------------------------------------------------------------
| BACKEND API
|--------------------------------------------------------------------------
*/

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


/*
|--------------------------------------------------------------------------
| ADMIN LOGIN
|--------------------------------------------------------------------------
|
| Ye aapke existing admin credentials hain.
|
*/

function Login() {

  const navigate = useNavigate();

  const location = useLocation();

  const { login } = useAuth();


  /*
  |--------------------------------------------------------------------------
  | PASSWORD VISIBILITY
  |--------------------------------------------------------------------------
  */

  const [showPassword, setShowPassword] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | FORGOT PASSWORD (email OTP)
  |--------------------------------------------------------------------------
  */

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPass, setForgotPass] = useState("");
  const [forgotPass2, setForgotPass2] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const openForgot = () => {
    setForgotEmail(formData.email || "");
    setForgotOtp("");
    setForgotPass("");
    setForgotPass2("");
    setForgotMsg("");
    setForgotStep(1);
    setForgotOpen(true);
  };

  const sendResetOtp = async () => {
    const email = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotMsg("Enter a valid email address.");
      return;
    }
    setForgotBusy(true);
    setForgotMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setForgotStep(2);
        setForgotMsg("Reset code sent to your email.");
      } else {
        setForgotMsg(
          data.message || "Could not send the code. Try again."
        );
      }
    } catch {
      setForgotMsg("Server unreachable. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  };

  const submitNewPassword = async () => {
    const email = forgotEmail.trim().toLowerCase();
    const otp = forgotOtp.trim();

    if (!/^\d{6}$/.test(otp)) {
      setForgotMsg("Enter the 6-digit code from your email.");
      return;
    }
    if (forgotPass.length < 6) {
      setForgotMsg("Password must be at least 6 characters.");
      return;
    }
    if (forgotPass !== forgotPass2) {
      setForgotMsg("Passwords do not match.");
      return;
    }

    setForgotBusy(true);
    setForgotMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: forgotPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setForgotOpen(false);
        setFormData((p) => ({ ...p, email }));
        alert("Password updated. Please sign in with your new password.");
      } else {
        setForgotMsg(
          data.message || "Reset failed. Check the code and try again."
        );
      }
    } catch {
      setForgotMsg("Server unreachable. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: true,
  });


  /*
  |--------------------------------------------------------------------------
  | INPUT CHANGE
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | REDIRECT PATH
  |--------------------------------------------------------------------------
  */

  const getRedirectPath = () => {

    /*
    |--------------------------------------------------------------------------
    | Checkout se login
    |--------------------------------------------------------------------------
    */

    if (
      location.state?.from ===
      "/checkout" ||
      location.state?.redirectTo ===
        "/checkout"
    ) {
      return "/checkout";
    }


    /*
    |--------------------------------------------------------------------------
    | Generic redirectTo (Cart Buy Now etc.)
    |--------------------------------------------------------------------------
    */

    if (
      location.state?.redirectTo
    ) {
      return location.state.redirectTo;
    }


    /*
    |--------------------------------------------------------------------------
    | React Router location object
    |--------------------------------------------------------------------------
    */

    if (
      location.state?.from?.pathname
    ) {

      return (
        location.state.from.pathname
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Checkout pending
    |--------------------------------------------------------------------------
    */

    const checkoutPending =
      localStorage.getItem(
        "checkoutPending"
      );


    if (
      checkoutPending === "true"
    ) {

      localStorage.removeItem(
        "checkoutPending"
      );

      return "/checkout";
    }


    /*
    |--------------------------------------------------------------------------
    | Normal login
    |--------------------------------------------------------------------------
    */

    return "/profile";
  };


  /*
  |--------------------------------------------------------------------------
  | LOGIN SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {

    e.preventDefault();


    if (loading) {
      return;
    }


    const email =
      formData.email
        .trim()
        .toLowerCase();

    const password =
      formData.password;


    /*
    |--------------------------------------------------------------------------
    | EMAIL VALIDATION
    |--------------------------------------------------------------------------
    */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

      alert(
        "Please enter a valid email address."
      );

      return;
    }


    setLoading(true);


    try {

      /*
      |--------------------------------------------------------------------------
      | Node.js / MySQL API
      |--------------------------------------------------------------------------
      */

      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );


      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      const data =
        await response.json();


      /*
      |--------------------------------------------------------------------------
      | LOGIN ERROR
      |--------------------------------------------------------------------------
      */

      if (!response.ok) {

        alert(
          data.message ||
          "Invalid email or password!"
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | USER CHECK
      |--------------------------------------------------------------------------
      */

      if (!data.user) {

        alert(
          "User information was not received from server."
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | LOGIN CONTEXT
      |--------------------------------------------------------------------------
      */

      login(
        data.user,
        data.token,
        formData.remember
      );


      localStorage.setItem(
        "currentUser",
        JSON.stringify(data.user)
      );

      localStorage.setItem(
        "printExpertUser",
        JSON.stringify(data.user)
      );

      const isAdmin =
        data.user.role === "admin";

      if (isAdmin) {
        localStorage.setItem(
          "adminLoggedIn",
          "true"
        );
        localStorage.removeItem(
          "checkoutPending"
        );
      } else {
        localStorage.removeItem(
          "adminLoggedIn"
        );
      }

      alert(
        `Welcome back, ${
          data.user.name || "User"
        }!`
      );

      const redirectPath =
        isAdmin
          ? "/admin"
          : getRedirectPath();

      navigate(
        redirectPath,
        {
          replace: true,
          state:
            redirectPath ===
              "/checkout" &&
            location.state?.checkoutData
              ? {
                  cart:
                    location.state
                      .checkoutData.cart,
                  totalPrice:
                    location.state
                      .checkoutData.totalPrice,
                  totalQuantity:
                    location.state
                      .checkoutData
                      .totalQuantity,
                  user: data.user,
                }
              : location.state?.orderProduct
                ? {
                    orderProduct:
                      location.state
                        .orderProduct,
                  }
                : undefined,
        }
      );

    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      alert(
        "Unable to connect to server. Please make sure the Node.js backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (

    <main className="auth-page">

      <div className="auth-container">


        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="auth-left">


          {/* BRAND */}

          <div className="auth-brand">

            <span>
              PRINT EXPERT
            </span>

            <strong>
              PRINTING SOLUTIONS, PERFECT RESULTS
            </strong>

          </div>


          {/* CONTENT */}

          <div className="auth-left-content">

            <span className="auth-label">
              WELCOME BACK
            </span>


            <h1>

              Welcome back to

              <br />

              <span>
                Print Expert.
              </span>

            </h1>


            <p>

              Login to access your account,
              manage your orders and explore
              our premium products.

            </p>


            {/* FEATURES */}

            <div className="auth-features">


              <div>

                <span>
                  ✓
                </span>

                <p>
                  Premium Products
                </p>

              </div>


              <div>

                <span>
                  ✓
                </span>

                <p>
                  Secure Account
                </p>

              </div>


              <div>

                <span>
                  ✓
                </span>

                <p>
                  Easy Order Management
                </p>

              </div>


            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="auth-right">

          <div className="auth-card">


            {/* HEADING */}

            <div className="auth-heading">

              <h2>
                Sign In
              </h2>

              <p>

                {location.state?.from ===
                  "/checkout" ||
                location.state?.redirectTo ===
                  "/checkout"

                  ? "Login to continue with your order"

                  : "Enter your details to continue"}

              </p>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
            >


              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="input-group">

                <label>
                  Email Address
                </label>

                <div className="input-wrapper">

                  <Mail
                    size={18}
                  />

                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="email"
                    required
                  />

                </div>

              </div>


              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div className="input-group">

                <label>
                  Password
                </label>

                <div className="input-wrapper">

                  <LockKeyhole
                    size={18}
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Enter your password"
                    value={
                      formData.password
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="current-password"
                    required
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (

                      <EyeOff
                        size={18}
                      />

                    ) : (

                      <Eye
                        size={18}
                      />

                    )}

                  </button>

                </div>

              </div>


              {/* =================================================
                  OPTIONS
              ================================================= */}

              <div className="auth-options">

                <label
                  className="remember"
                >

                  <input
                    type="checkbox"
                    name="remember"
                    checked={
                      formData.remember
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span>
                    Remember me
                  </span>

                </label>


                <button
                  type="button"
                  className="forgot-password"
                  onClick={openForgot}
                >

                  Forgot Password?

                </button>

              </div>


              {/* =================================================
                  LOGIN BUTTON
              ================================================= */}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >

                {loading

                  ? "Signing In..."

                  : location.state?.from ===
                      "/checkout" ||
                    location.state?.redirectTo ===
                      "/checkout"

                    ? "Login & Continue"

                    : "Sign In"

                }


                {!loading && (
                  <ArrowRight
                    size={18}
                  />
                )}

              </button>


            </form>


            {/* =================================================
                SIGNUP
            ================================================= */}

            <div className="auth-switch">

              <span>
                Don't have an account?
              </span>


              <Link
                to="/signup"
                state={
                  location.state
                }
              >

                Create Account

              </Link>

            </div>


          </div>

        </div>

      </div>

      {/* =================================================
          FORGOT PASSWORD MODAL (email OTP)
      ================================================= */}

      {forgotOpen && (
        <div
          className="fp-overlay"
          onClick={(e) =>
            e.target === e.currentTarget &&
            !forgotBusy &&
            setForgotOpen(false)
          }
        >
          <div className="fp-modal">
            <h3>Reset Password</h3>

            {forgotStep === 1 ? (
              <>
                <p>
                  Enter your account email — we'll send a
                  6-digit reset code.
                </p>

                <input
                  type="email"
                  placeholder="Email address"
                  value={forgotEmail}
                  onChange={(e) =>
                    setForgotEmail(e.target.value)
                  }
                  autoFocus
                />
              </>
            ) : (
              <>
                <p>
                  Enter the code sent to{" "}
                  <strong>{forgotEmail}</strong> and choose
                  a new password.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={forgotOtp}
                  onChange={(e) =>
                    setForgotOtp(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  autoFocus
                />

                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={forgotPass}
                  onChange={(e) =>
                    setForgotPass(e.target.value)
                  }
                  autoComplete="new-password"
                />

                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={forgotPass2}
                  onChange={(e) =>
                    setForgotPass2(e.target.value)
                  }
                  autoComplete="new-password"
                />
              </>
            )}

            {forgotMsg && (
              <p className="fp-message">{forgotMsg}</p>
            )}

            <div className="fp-actions">
              <button
                type="button"
                className="fp-cancel"
                onClick={() => setForgotOpen(false)}
                disabled={forgotBusy}
              >
                Cancel
              </button>

              {forgotStep === 1 ? (
                <button
                  type="button"
                  className="fp-submit"
                  onClick={sendResetOtp}
                  disabled={forgotBusy}
                >
                  {forgotBusy ? "Sending..." : "Send Code"}
                </button>
              ) : (
                <button
                  type="button"
                  className="fp-submit"
                  onClick={submitNewPassword}
                  disabled={forgotBusy}
                >
                  {forgotBusy ? "Updating..." : "Reset Password"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}


export default Login;
