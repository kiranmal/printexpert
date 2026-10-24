import { useEffect, useState } from "react";
import AdminTable from "../components/AdminTable";

import "./AdminUsers.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json",
});

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  /* =====================================================
     LOAD REAL USERS
  ===================================================== */

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `${API_URL}/admin/users`,
        { headers: authHeaders() }
      );

      const data = await response.json();

      if (
        response.ok &&
        Array.isArray(data.users)
      ) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error(
        "Users loading error:",
        error
      );

      setUsers([]);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadUsers();

    const handleStorage = () => {
      loadUsers();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    /*
      Same browser tab me signup hone par
      custom event se users refresh honge.
    */

    window.addEventListener(
      "usersUpdated",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "usersUpdated",
        handleStorage
      );
    };
  }, []);

  /* =====================================================
     BLOCK / UNBLOCK USER
  ===================================================== */

  const toggleUser = async (id) => {

    const user = users.find(
      (u) => String(u.id) === String(id)
    );

    if (!user) return;

    const newStatus =
      user.status === "Blocked"
        ? "Active"
        : "Blocked";

    try {

      const response = await fetch(
        `${API_URL}/admin/users/${id}/status`,
        {
          method: "PUT",

          headers: authHeaders(),

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
          "Unable to update user status."
        );
        return;
      }

      loadUsers();

    } catch (error) {
      console.error(
        "User status update error:",
        error
      );

      alert(
        "Server error. Please try again."
      );
    }
  };

  /* =====================================================
     SEARCH USERS
  ===================================================== */

  const filteredUsers = users.filter(
    (user) => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      if (!searchText) {
        return true;
      }

      return (
        String(
          user.name || ""
        )
          .toLowerCase()
          .includes(searchText) ||

        String(
          user.email || ""
        )
          .toLowerCase()
          .includes(searchText) ||

        String(
          user.phone || ""
        )
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  /* =====================================================
     ACTIVE / BLOCKED COUNT
  ===================================================== */

  const activeUsers =
    users.filter(
      (user) =>
        user.status !== "Blocked"
    ).length;

  const blockedUsers =
    users.filter(
      (user) =>
        user.status === "Blocked"
    ).length;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="admin-users-page">

      {/* =================================================
          PAGE HEADING
      ================================================= */}

      <div className="page-heading">

        <div>

          <h2>
            Users
          </h2>

          <p>
            Manage all registered customers
          </p>

        </div>

      </div>


      {/* =================================================
          USER STATS
      ================================================= */}

      <div className="user-stats">

        {/* TOTAL */}

        <div className="user-stat-card">

          <span className="user-stat-icon total">
            👥
          </span>

          <div>

            <small>
              Total Users
            </small>

            <strong>
              {users.length}
            </strong>

            <p>
              Registered customers
            </p>

          </div>

        </div>


        {/* ACTIVE */}

        <div className="user-stat-card">

          <span className="user-stat-icon active">
            ✅
          </span>

          <div>

            <small>
              Active Users
            </small>

            <strong>
              {activeUsers}
            </strong>

            <p>
              Currently active accounts
            </p>

          </div>

        </div>


        {/* BLOCKED */}

        <div className="user-stat-card">

          <span className="user-stat-icon blocked">
            🚫
          </span>

          <div>

            <small>
              Blocked Users
            </small>

            <strong>
              {blockedUsers}
            </strong>

            <p>
              Blocked accounts
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          USERS TABLE
      ================================================= */}

      <section className="panel">

        <div className="toolbar">

          <input
            className="search-input"
            placeholder="🔎 Search users..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <AdminTable
          headers={[
            "Customer",
            "Email",
            "Phone",
            "Orders",
            "Status",
            "Action",
          ]}
        >

          {filteredUsers.length === 0 ? (

            <tr>

              <td
                colSpan="6"
                className="users-empty-cell"
              >

                {users.length === 0
                  ? "👥 No registered users found."
                  : "No users found for your search."}

              </td>

            </tr>

          ) : (

            filteredUsers.map(
              (user) => (

                <tr
                  key={user.id}
                >

                  {/* CUSTOMER */}

                  <td>

                    <div className="user-cell">

                      <div className="user-avatar">

                        {user.name
                          ? user.name
                              .split(" ")
                              .map(
                                (word) =>
                                  word[0]
                              )
                              .join("")
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase()
                          : "U"}

                      </div>

                      <div>

                        <strong>
                          {user.name ||
                            "Unknown User"}
                        </strong>

                        <small>
                          {user.role === "admin"
                            ? "Admin"
                            : "Customer"}
                        </small>

                      </div>

                    </div>

                  </td>


                  {/* EMAIL */}

                  <td>
                    {user.email ||
                      "—"}
                  </td>


                  {/* PHONE */}

                  <td>
                    {user.phone ||
                      "—"}
                  </td>


                  {/* ORDERS */}

                  <td>

                    <span className="orders-count">
                      {user.orders ||
                        0}
                    </span>

                  </td>


                  {/* STATUS */}

                  <td>

                    <span
                      className={`status ${
                        user.status ===
                        "Blocked"
                          ? "cancelled"
                          : "delivered"
                      }`}
                    >

                      {user.status ||
                        "Active"}

                    </span>

                  </td>


                  {/* ACTION */}

                  <td>

                    <button
                      className={`user-action ${
                        user.status ===
                        "Blocked"
                          ? "unblock"
                          : "block"
                      }`}
                      onClick={() =>
                        toggleUser(
                          user.id
                        )
                      }
                    >

                      {user.status ===
                      "Blocked"
                        ? "Unblock"
                        : "Block"}

                    </button>

                  </td>

                </tr>

              )
            )

          )}

        </AdminTable>

      </section>

    </div>
  );
}