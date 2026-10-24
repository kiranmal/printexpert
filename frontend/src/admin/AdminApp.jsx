import React from "react";
import { Routes, Route } from "react-router-dom";

// Admin Layout & Login
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/AdminLayout";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminCategories from "./pages/AdminCategories";
import AdminPayments from "./pages/AdminPayments";
import AdminInventory from "./pages/AdminInventory";
import AdminUsers from "./pages/AdminUsers";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetails from "./pages/AdminOrderDetails";
import AdminDelivery from "./pages/AdminDelivery";
import AdminReviews from "./pages/AdminReviews";
import AdminInquiries from "./pages/AdminInquiries";
import AdminCoupons from "./pages/AdminCoupons";
import AdminNotifications from "./pages/AdminNotifications";

// Product Pages
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";

export default function AdminApp() {
  return (
    <Routes>

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      <Route
        path="login"
        element={<AdminLogin />}
      />


      {/* =====================================================
          ADMIN PANEL
          All pages below use AdminLayout
      ===================================================== */}

      <Route
        element={<AdminLayout />}
      >

        {/* =================================================
            DASHBOARD
            URL: /admin
        ================================================= */}

        <Route
          index
          element={<AdminDashboard />}
        />


        {/* =================================================
            PRODUCTS
            URL: /admin/products
        ================================================= */}

        <Route
          path="products"
          element={<AdminProducts />}
        />


        {/* =================================================
            ADD PRODUCT
            URL: /admin/products/add
        ================================================= */}

        <Route
          path="products/add"
          element={<AddProduct />}
        />


        {/* =================================================
            EDIT PRODUCT
            URL: /admin/products/edit/:id
        ================================================= */}

        <Route
          path="products/edit/:id"
          element={<EditProduct />}
        />


        {/* =================================================
            CATEGORIES
            URL: /admin/categories
        ================================================= */}

        <Route
          path="categories"
          element={<AdminCategories />}
        />


        {/* =================================================
            ORDERS
            URL: /admin/orders
        ================================================= */}

        <Route
          path="orders"
          element={<AdminOrders />}
        />

        {/* =================================================
            ORDER DETAILS — full dedicated page
            URL: /admin/orders/:orderId
        ================================================= */}

        <Route
          path="orders/:orderId"
          element={<AdminOrderDetails />}
        />


        {/* =================================================
            NOTIFICATIONS — full notification history
            URL: /admin/notifications
        ================================================= */}

        <Route
          path="notifications"
          element={<AdminNotifications />}
        />


        {/* =================================================
            PAYMENTS
            URL: /admin/payments
        ================================================= */}

        <Route
          path="payments"
          element={<AdminPayments />}
        />


        {/* =================================================
            INVENTORY
            URL: /admin/inventory
        ================================================= */}

        <Route
          path="inventory"
          element={<AdminInventory />}
        />


        {/* =================================================
            USERS
            URL: /admin/users
        ================================================= */}

        <Route
          path="users"
          element={<AdminUsers />}
        />


        {/* =================================================
            DELIVERY MANAGEMENT
            URL: /admin/delivery
        ================================================= */}

        <Route
          path="delivery"
          element={<AdminDelivery />}
        />


        {/* =================================================
            FEEDBACK — OVERVIEW
            URL: /admin/feedback
        ================================================= */}

        <Route
          path="feedback"
          element={<AdminReviews />}
        />


        {/* =================================================
            CUSTOMER REVIEWS
            URL: /admin/reviews
        ================================================= */}

        <Route
          path="reviews"
          element={<AdminReviews />}
        />


        {/* =================================================
            CONTACT INQUIRIES — "Get a Quote" + Contact Us form
            URL: /admin/inquiries
        ================================================= */}

        <Route
          path="inquiries"
          element={<AdminInquiries />}
        />


        {/* =================================================
            DISCOUNT COUPONS
            URL: /admin/coupons
        ================================================= */}

        <Route
          path="coupons"
          element={<AdminCoupons />}
        />

      </Route>

    </Routes>
  );
}