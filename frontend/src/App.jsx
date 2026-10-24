import {
  ContactUs, TrackOrder, ShippingInfo, Returns, FAQ,
  HelpCenter, CustomerSupport, PrivacyPolicy, Terms, RefundPolicy,
} from "./pages/SupportPages";


import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// ================= COMPONENTS =================

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// ================= SCROLL TO TOP =================
// Har page navigation pe scroll top pe — warna naya
// page purani scroll position (bottom) se khulta hai

function ScrollToTop() {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

// ================= PAGES =================

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import CustomizationPage from "./pages/CustomizationPage";
import MyOrders from "./components/profile/MyOrders";

// ================= ADMIN =================

import AdminApp from "./admin/AdminApp";

/* one-time cleanup: the product catalog used to be cached
   in localStorage — API/DB is the only source now */
localStorage.removeItem("printExpertProducts");

function App() {
  return (
    <BrowserRouter>

      <ScrollToTop />

      <Routes>

        {/* ==================================================
            HOME
        ================================================== */}

        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Home />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            LOGIN
        ================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ==================================================
            SIGNUP
        ================================================== */}

        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* ==================================================
            PROFILE
        ================================================== */}

        <Route
          path="/profile"
          element={
            <>
              <Navbar />
              <Profile />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            CATEGORY
        ================================================== */}

        <Route
          path="/category"
          element={
            <>
              <Navbar />
              <Category />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            PRODUCT DETAILS
        ================================================== */}

        <Route
          path="/product/:id"
          element={
            <>
              <Navbar />
              <ProductDetails />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            CART
        ================================================== */}

        <Route
          path="/cart"
          element={
            <>
              <Navbar />
              <Cart />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            FAVORITES
        ================================================== */}

        <Route
          path="/favorites"
          element={
            <>
              <Navbar />
              <Favorites />
              <Footer />
            </>
          }
        />

        <Route
          path="/wishlist"
          element={
            <>
              <Navbar />
              <Favorites />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            ORDERS
        ================================================== */}

        <Route
          path="/orders"
          element={
            <>
              <Navbar />
              <MyOrders />
              <Footer />
            </>
          }
        />


        {/* ==================================================
            CHECKOUT
        ================================================== */}

        <Route
          path="/checkout"
          element={<Checkout />}
        />


        {/* ==================================================
            ADMIN
        ================================================== */}

        <Route
          path="/admin/*"
          element={<AdminApp />}
        />


        {/* ==================================================
            CUSTOMIZER
        ================================================== */}

        <Route
          path="/customize"
          element={<CustomizationPage />}
        />


        <Route path="/contact" element={<><Navbar /><ContactUs /><Footer /></>} />
<Route path="/track-order" element={<><Navbar /><TrackOrder /><Footer /></>} />
<Route path="/shipping" element={<><Navbar /><ShippingInfo /><Footer /></>} />
<Route path="/returns" element={<><Navbar /><Returns /><Footer /></>} />
<Route path="/faq" element={<><Navbar /><FAQ /><Footer /></>} />
<Route path="/help" element={<><Navbar /><HelpCenter /><Footer /></>} />
<Route path="/support" element={<><Navbar /><CustomerSupport /><Footer /></>} />
<Route path="/privacy" element={<><Navbar /><PrivacyPolicy /><Footer /></>} />
<Route path="/terms" element={<><Navbar /><Terms /><Footer /></>} />
<Route path="/refund" element={<><Navbar /><RefundPolicy /><Footer /></>} />
          




        {/* ==================================================
            PAGE NOT FOUND
        ================================================== */}

        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: "70vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <h1>404</h1>

              <p>
                Page not found
              </p>
            </div>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;
