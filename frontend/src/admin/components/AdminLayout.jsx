import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { API_URL } from "../../services/apiConfig";

import {
  LayoutDashboard,
  Package,
  Tags,
  CreditCard,
  Warehouse,
  Users,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShoppingBag,
  MessageSquare,
  Star,
  MailQuestion,
  TicketPercent,
  Shield,
} from "lucide-react";

import "./AdminLayout.css";
import printExpertMark from "../../assets/logo-mark.png";

function AdminLayout() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [search, setSearch] = useState("");
  const [inquiryCount, setInquiryCount] =
    useState(0);
  const [notifications, setNotifications] =
    useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  /* =====================================================
     ADMIN DATA
  ===================================================== */

  const adminName = "Administrator";
  const adminEmail = "admin@printexpert.com";

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
    },

    {
      name: "Products",
      path: "/admin/products",
      icon: Package,
    },

    {
      name: "Categories",
      path: "/admin/categories",
      icon: Tags,
    },

    {
      name: "Orders",
      path: "/admin/orders",
      icon: ShoppingBag,
    },

    {
      name: "Coupons",
      path: "/admin/coupons",
      icon: TicketPercent,
    },

    {
      name: "Payments",
      path: "/admin/payments",
      icon: CreditCard,
    },

    {
      name: "Inventory",
      path: "/admin/inventory",
      icon: Warehouse,
    },

    {
      name: "Users",
      path: "/admin/users",
      icon: Users,
    },

    {
      name: "Customer Reviews",
      path: "/admin/reviews",
      icon: Star,
    },

    {
      name: "Inquiries",
      path: "/admin/inquiries",
      icon: MailQuestion,
      badge: "inquiries",
    },
  ];

  /* =====================================================
     CLOSE DROPDOWNS OUTSIDE
  ===================================================== */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const clearAdminSession = () => {
      localStorage.removeItem("adminLoggedIn");
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("printExpertUser");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("printExpertOrderSuccess");
      sessionStorage.removeItem("printExpertSessionAlive");
    };

    const verifyAdmin = async () => {
      /* "Remember me" unchecked → session dies with the
         browser. No alive-marker = previous session only. */
      const remembered =
        localStorage.getItem("rememberMe") === "true";
      if (
        !remembered &&
        !sessionStorage.getItem("printExpertSessionAlive") &&
        localStorage.getItem("authToken")
      ) {
        clearAdminSession();
        navigate("/admin/login", { replace: true });
        return;
      }

      const token = localStorage.getItem("authToken");
      const savedUser = localStorage.getItem("currentUser");
      const currentUser = (() => {
        try {
          return savedUser ? JSON.parse(savedUser) : null;
        } catch {
          return null;
        }
      })();

      if (!token || currentUser?.role !== "admin") {
        clearAdminSession();
        navigate("/admin/login", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });
        const data = await response.json();

        if (
          response.status === 401 ||
          response.status === 403 ||
          (response.ok && data.user?.role !== "admin")
        ) {
          clearAdminSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        if (response.ok && data.user?.role === "admin") {
          localStorage.setItem("adminLoggedIn", "true");
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          localStorage.setItem("printExpertUser", JSON.stringify(data.user));
        }

        /* server down / 5xx → keep the cached admin session
           instead of forcing a re-login on every restart */
        setAuthChecking(false);
      } catch (error) {
        if (error.name !== "AbortError") {
          /* network error — backend unreachable. Keep the
             session; the admin stays on the page with the
             cached credentials rather than being logged out */
          console.error(
            "Admin verify error (session kept):",
            error
          );
          setAuthChecking(false);
        }
      }
    };

    verifyAdmin();

    return () => controller.abort();
  }, [navigate]);

  /* =====================================================
     NEW INQUIRY COUNT (sidebar badge)
  ===================================================== */

  useEffect(() => {
    if (authChecking) return;

    const loadCount = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [notifRes, inquiriesRes] =
          await Promise.all([
            fetch(`${API_URL}/admin/notifications`, {
              headers,
            }),
            fetch(
              `${API_URL}/contact-inquiries?status=new`,
              { headers }
            ),
          ]);

        const notifData = await notifRes
          .json()
          .catch(() => ({}));
        const inquiriesData = await inquiriesRes
          .json()
          .catch(() => ({}));

        if (
          notifRes.ok &&
          Array.isArray(notifData.notifications)
        ) {
          setNotifications(notifData.notifications);
          setUnreadCount(
            Number(notifData.unreadCount) || 0
          );
        }

        if (
          inquiriesRes.ok &&
          Array.isArray(inquiriesData.inquiries)
        ) {
          setInquiryCount(
            inquiriesData.inquiries.length
          );
        }
      } catch {
        /* badge optional — ignore */
      }
    };

    loadCount();

    const interval = setInterval(loadCount, 60000);

    /* dropdown kholte hi latest state fetch karo */
    if (notificationOpen) loadCount();

    return () => clearInterval(interval);
  }, [authChecking, notificationOpen]);

  /* =====================================================
     NOTIFICATION READ STATE — server-persisted
  ===================================================== */

  const markNotificationRead = async (key) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.key === key ? { ...n, read: true } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(
        `${API_URL}/admin/notifications/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key }),
        }
      );
    } catch {
      /* optimistic UI already applied */
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || markingAll || !notifications.length)
      return;

    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
    setUnreadCount(0);

    try {
      await fetch(
        `${API_URL}/admin/notifications/read-all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keys: notifications.map((n) => n.key),
          }),
        }
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const dismissNotification = async (key) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setNotifications((prev) => {
      const target = prev.find((n) => n.key === key);
      if (target && !target.read)
        setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.key !== key);
    });

    try {
      await fetch(
        `${API_URL}/admin/notifications/dismiss`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key }),
        }
      );
    } catch {
      /* optimistic UI already applied */
    }
  };

  const openNotification = (n) => {
    if (!n.read) markNotificationRead(n.key);
    setNotificationOpen(false);
    if (n.link) navigate(n.link);
  };

  /* =====================================================
     CLOSE MOBILE SIDEBAR ON ROUTE CLICK
  ===================================================== */

  const handleNavigation = () => {
    setSidebarOpen(false);
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const handleSearch = (e) => {
    e.preventDefault();

    const value = search.trim();

    if (!value) return;

    console.log("Admin search:", value);

    /*
      Yahan future me global search functionality
      add kar sakte ho.
    */
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("printExpertUser");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("printExpertOrderSuccess");
    sessionStorage.removeItem("printExpertSessionAlive");

    setProfileOpen(false);

    navigate("/admin/login", { replace: true });
  };

  /* =====================================================
     NOTIFICATIONS — DB se real orders + inquiries
  ===================================================== */

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();

    if (Number.isNaN(diff) || diff < 0) {
      return "";
    }

    const mins = Math.floor(diff / 60000);

    if (mins < 1) {
      return "Just now";
    }

    if (mins < 60) {
      return `${mins} min ago`;
    }

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) {
      return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
    }

    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  if (authChecking) {
    return (
      <div className="admin-layout" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        Verifying admin access...
      </div>
    );
  }

  return (
    <div className="admin-layout">

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`admin-sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >

        {/* BRAND */}

        <div className="admin-brand">

          <div className="brand-logo">
            <img src={printExpertMark} alt="Print Expert" />
          </div>

          <div className="brand-text">

            <strong>
              PRINT EXPERT
            </strong>

            <span>
              ADMIN PANEL
            </span>

          </div>

          <button
            className="mobile-close-sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={20} />
          </button>

        </div>

        {/* SIDEBAR LABEL */}

        <div className="sidebar-label">
          MAIN MENU
        </div>

        {/* NAVIGATION */}

        <nav className="admin-nav">

          {menuItems.map(
            (item) => {

              const Icon = item.icon;

              if (item.children) {
                return (
                  <div key={item.name}>
                    <NavLink
                      to={item.path}
                      end
                      onClick={
                        handleNavigation
                      }
                      className={({ isActive }) =>
                        `admin-nav-link ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                      />
                      <span>
                        {item.name}
                      </span>
                    </NavLink>

                    <div style={{ paddingLeft: "18px" }}>
                      {item.children.map(
                        (child) => {
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.name}
                              to={child.path}
                              onClick={
                                handleNavigation
                              }
                              className={({ isActive }) =>
                                `admin-nav-link ${
                                  isActive
                                    ? "active"
                                    : ""
                                }`
                              }
                              style={{
                                fontSize: "13px",
                                padding: "8px 12px",
                              }}
                            >
                              <ChildIcon
                                size={15}
                                strokeWidth={1.8}
                              />
                              <span>
                                {child.name}
                              </span>
                            </NavLink>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={
                    item.path ===
                    "/admin"
                  }
                  onClick={
                    handleNavigation
                  }
                  className={({ isActive }) =>
                    `admin-nav-link ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />

                  <span>
                    {item.name}
                  </span>

                  {item.badge === "inquiries" &&
                    inquiryCount > 0 && (
                      <span className="nav-inquiry-badge">
                        {inquiryCount}
                      </span>
                    )}

                </NavLink>
              );
            }
          )}

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <div className="admin-mini-profile">

            <div className="admin-avatar">
              A
            </div>

            <div>

              <strong>
                Admin
              </strong>

              <span>
                Administrator
              </span>

            </div>

          </div>

          <button
            className="sidebar-logout"
            onClick={
              handleLogout
            }
          >
            <LogOut size={17} />

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="admin-main">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="admin-topbar">

          {/* MOBILE MENU */}

          <button
            className="mobile-menu-btn"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu size={21} />
          </button>

          {/* SEARCH */}

          <form
            className={`admin-search ${
              searchOpen
                ? "search-mobile-open"
                : ""
            }`}
            onSubmit={handleSearch}
          >

            <Search
              size={18}
              className="search-icon"
            />

            <input
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search products, orders, users..."
            />

            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={15} />
              </button>
            )}

          </form>

          {/* MOBILE SEARCH */}

          <button
            className="mobile-search-btn"
            onClick={() =>
              setSearchOpen(
                !searchOpen
              )
            }
          >
            <Search size={20} />
          </button>

          {/* RIGHT SIDE */}

          <div className="topbar-right">

            {/* NOTIFICATION */}

            <div
              className="topbar-dropdown"
              ref={
                notificationRef
              }
            >

              <button
                className={`topbar-icon-btn ${
                  notificationOpen
                    ? "opened"
                    : ""
                }`}
                onClick={() => {
                  setNotificationOpen(
                    !notificationOpen
                  );

                  setProfileOpen(
                    false
                  );
                }}
                aria-label="Notifications"
              >

                <Bell size={19} />

                {unreadCount > 0 && (
                  <span className="notification-dot">
                    {unreadCount}
                  </span>
                )}

              </button>

              {notificationOpen && (

                <div className="notification-dropdown">

                  <div className="dropdown-header">

                    <div>
                      <h3>
                        Notifications
                      </h3>

                      <span>
                        You have {unreadCount} new
                        notification
                        {unreadCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <button
                      onClick={markAllRead}
                      disabled={
                        markingAll || unreadCount === 0
                      }
                    >
                      {markingAll
                        ? "Marking…"
                        : "Mark all read"}
                    </button>

                  </div>

                  <div className="notification-list">

                    {notifications.length === 0 && (
                      <div className="notification-empty">
                        No notifications yet
                      </div>
                    )}

                    {notifications
                      .slice(0, 8)
                      .map((notification) => (

                        <div
                          className={`notification-item${
                            notification.read
                              ? " read"
                              : " unread"
                          }`}
                          key={notification.key}
                          onClick={() =>
                            openNotification(
                              notification
                            )
                          }
                          role="button"
                        >

                          <div className="notification-icon">
                            {notification.type ===
                              "order" && (
                              <ShoppingBag
                                size={16}
                              />
                            )}

                            {notification.type ===
                              "payment" && (
                              <CreditCard
                                size={16}
                              />
                            )}

                            {notification.type ===
                              "user" && (
                              <User
                                size={16}
                              />
                            )}

                            {notification.type ===
                              "inquiry" && (
                              <MailQuestion
                                size={16}
                              />
                            )}
                          </div>

                          <div className="notification-content">

                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <p>
                              {
                                notification.text
                              }
                            </p>

                            <small>
                              {timeAgo(
                                notification.time
                              )}
                            </small>

                          </div>

                          {!notification.read && (
                            <span className="notification-unread" />
                          )}

                          <button
                            type="button"
                            className="notification-dismiss"
                            aria-label="Delete notification"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(
                                notification.key
                              );
                            }}
                          >
                            <X size={12} />
                          </button>

                        </div>
                      ))}

                  </div>

                  <button
                    className="view-notifications"
                    onClick={() => {
                      setNotificationOpen(
                        false
                      );

                      navigate(
                        "/admin/notifications"
                      );
                    }}
                  >
                    View all notifications
                  </button>

                </div>

              )}

            </div>

            {/* DIVIDER */}

            <div className="topbar-divider" />

            {/* PROFILE */}

            <div
              className="topbar-dropdown"
              ref={profileRef}
            >

              <button
                className={`admin-profile-btn ${
                  profileOpen
                    ? "opened"
                    : ""
                }`}
                onClick={() => {
                  setProfileOpen(
                    !profileOpen
                  );

                  setNotificationOpen(
                    false
                  );
                }}
              >

                <div className="topbar-avatar">
                  {(adminName || "A").charAt(0).toUpperCase()}
                  <span className="avatar-online-sm" />
                </div>

                <div className="topbar-user">

                  <strong>
                    {adminName}
                  </strong>

                  <span>
                    Admin
                  </span>

                </div>

                <ChevronDown
                  size={16}
                  className={
                    profileOpen
                      ? "rotate"
                      : ""
                  }
                />

              </button>

              {profileOpen && (

                <div className="profile-dropdown">

                  <div className="profile-dropdown-head">

                    <div className="profile-large-avatar">
                      {(adminName || "A").charAt(0).toUpperCase()}
                      <span className="avatar-online" />
                    </div>

                    <div>

                      <strong>
                        {adminName}
                      </strong>

                      <span className="profile-email">
                        {adminEmail}
                      </span>

                      <span className="profile-role-badge">
                        <Shield size={10} />
                        Admin
                      </span>

                    </div>

                  </div>

                  <div className="profile-menu">

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/admin");
                      }}
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/admin/products");
                      }}
                    >
                      <Package size={16} />
                      Products
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/admin/orders");
                      }}
                    >
                      <ShoppingBag size={16} />
                      Orders
                    </button>

                    <button>
                      <Settings size={16} />
                      Settings
                    </button>

                    <div className="profile-menu-divider" />

                    <button
                      className="logout-menu"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default AdminLayout;