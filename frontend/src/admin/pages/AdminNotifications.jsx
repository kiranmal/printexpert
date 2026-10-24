import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ShoppingBag,
  MailQuestion,
  CheckCheck,
  ChevronDown,
  RefreshCcw,
  Trash2,
} from "lucide-react";

import {
  fetchAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  clearAllNotifications,
} from "../../services/notificationApi";

import "./AdminNotifications.css";

const PAGE = 20;

const fmtTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AdminNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminNotifications();
      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (e) {
      setError(e.message || "Unable to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = (n) => {
    if (n.read) return;
    setNotifications((prev) =>
      prev.map((x) =>
        x.key === n.key ? { ...x, read: true } : x
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    markNotificationRead(n.key).catch(() => {});
  };

  const openNotification = (n) => {
    markRead(n);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setNotice("");
    try {
      await markAllNotificationsRead(
        notifications.map((n) => n.key)
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      setNotice("All notifications marked as read.");
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setMarkingAll(false);
    }
  };

  const dismiss = (n) => {
    setNotifications((prev) =>
      prev.filter((x) => x.key !== n.key)
    );
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
    dismissNotification(n.key).catch(() => {});
  };

  const clearAll = async () => {
    if (markingAll || notifications.length === 0) return;
    setMarkingAll(true);
    setNotice("");
    try {
      await clearAllNotifications(
        notifications.map((n) => n.key)
      );
      setNotifications([]);
      setUnreadCount(0);
      setNotice("All notifications cleared.");
    } catch (e) {
      setError(e.message || "Clear failed.");
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = notifications.filter((n) =>
    filter === "unread" ? !n.read : true
  );
  const shown = filtered.slice(0, visible);

  return (
    <div className="admin-notifications">
      <div className="an-head">
        <div>
          <h1>
            <Bell size={22} /> Notifications
          </h1>
          <p>
            {unreadCount} unread ·{" "}
            {notifications.length} total
          </p>
        </div>
        <div className="an-actions">
          <button
            className="an-btn ghost"
            onClick={load}
            disabled={loading}
          >
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            className="an-btn primary"
            onClick={markAll}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCheck size={14} />
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
          <button
            className="an-btn danger"
            onClick={clearAll}
            disabled={markingAll || notifications.length === 0}
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      {notice && (
        <div className="an-notice">{notice}</div>
      )}

      <div className="an-filters">
        {["all", "unread"].map((f) => (
          <button
            key={f}
            className={
              filter === f
                ? "an-filter active"
                : "an-filter"
            }
            onClick={() => {
              setFilter(f);
              setVisible(PAGE);
            }}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <div className="an-card">
        {loading ? (
          <div className="an-state">
            Loading notifications…
          </div>
        ) : error ? (
          <div className="an-state error">
            {error}
            <button className="an-btn" onClick={load}>
              Retry
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="an-state">
            {filter === "unread"
              ? "No unread notifications."
              : "No notifications yet."}
          </div>
        ) : (
          shown.map((n) => (
            <div
              key={n.key}
              className={`an-item${
                n.read ? " read" : " unread"
              }`}
              onClick={() => openNotification(n)}
              role="button"
              tabIndex={0}
            >
              <div className="an-icon">
                {n.type === "order" ? (
                  <ShoppingBag size={17} />
                ) : (
                  <MailQuestion size={17} />
                )}
              </div>
              <div className="an-body">
                <div className="an-row">
                  <strong>{n.title}</strong>
                  {!n.read && (
                    <span className="an-dot" />
                  )}
                </div>
                <p>{n.text}</p>
                <small>{fmtTime(n.time)}</small>
              </div>
              <button
                type="button"
                className="an-delete"
                aria-label="Delete notification"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n);
                }}
              >
                <Trash2 size={14} />
              </button>
              <span className="an-open">Open →</span>
            </div>
          ))
        )}

        {!loading && filtered.length > visible && (
          <button
            className="an-more"
            onClick={() =>
              setVisible((v) => v + PAGE)
            }
          >
            <ChevronDown size={14} /> Load more (
            {filtered.length - visible} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

export default AdminNotifications;
