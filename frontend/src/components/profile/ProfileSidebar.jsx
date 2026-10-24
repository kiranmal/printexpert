import React from "react";

const ProfileSidebar = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  return (
    <div className="profile-sidebar">

      <div
        className={`profile-menu-item ${
          activeTab === "profile" ? "active" : ""
        }`}
        onClick={() => setActiveTab("profile")}
      >
        👤
        <span>My Profile</span>
      </div>

      <div
        className={`profile-menu-item ${
          activeTab === "orders" ? "active" : ""
        }`}
        onClick={() => setActiveTab("orders")}
      >
        📦
        <span>My Orders</span>
      </div>

      <div
        className={`profile-menu-item ${
          activeTab === "tracking" ? "active" : ""
        }`}
        onClick={() => setActiveTab("tracking")}
      >
        🚚
        <span>Track Order</span>
      </div>

      <div
        className={`profile-menu-item ${
          activeTab === "address" ? "active" : ""
        }`}
        onClick={() => setActiveTab("address")}
      >
        📍
        <span>My Address</span>
      </div>

      <div
        className={`profile-menu-item ${
          activeTab === "edit" ? "active" : ""
        }`}
        onClick={() => setActiveTab("edit")}
      >
        ✏️
        <span>Edit Profile</span>
      </div>

      <div
        className="profile-menu-item logout-item"
        onClick={onLogout}
      >
        🚪
        <span>Logout</span>
      </div>

    </div>
  );
};

export default ProfileSidebar;