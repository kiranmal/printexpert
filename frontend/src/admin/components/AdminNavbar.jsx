import React from "react";
import { useLocation } from "react-router-dom";

export default function AdminNavbar() {

  const location = useLocation();

  const getPageTitle = () => {

    const path = location.pathname;

    if (path === "/admin") {
      return "Dashboard";
    }

    if (path.includes("/products")) {
      return "Products";
    }

    if (path.includes("/categories")) {
      return "Categories";
    }

    if (path.includes("/orders")) {
      return "Orders";
    }

    if (path.includes("/users")) {
      return "Users";
    }

    if (path.includes("/payments")) {
      return "Payments";
    }

    if (path.includes("/inventory")) {
      return "Inventory";
    }

    if (path.includes("/coupons")) {
      return "Coupons";
    }

    if (path.includes("/reviews")) {
      return "Reviews";
    }

    if (path.includes("/settings")) {
      return "Settings";
    }

    return "Admin Panel";
  };


  return (
    <header className="admin-navbar">

      {/* LEFT */}

      <div className="navbar-left">

        <div>

          <h1>
            {getPageTitle()}
          </h1>

          <p>
            Manage your Print Expert store
          </p>

        </div>

      </div>


      {/* RIGHT */}

      <div className="navbar-right">

        {/* SEARCH */}

        <div className="admin-search">

          <span>
            🔍
          </span>

          <input
            type="text"
            placeholder="Search..."
          />

        </div>


        {/* NOTIFICATION */}

        <button className="icon-btn">

          🔔

          <span className="notification-dot">
          </span>

        </button>


        {/* PROFILE */}

        <div className="admin-profile">

          <div className="profile-avatar">
            A
          </div>

          <div className="profile-info">

            <strong>
              Admin
            </strong>

            <span>
              Administrator
            </span>

          </div>

        </div>

      </div>

    </header>
  );
}